import { DEFAULT_PAGE_LIMIT } from "@/constants/pagination";

import { ApiError, apiRequest } from "./client";
import { collectPaginated } from "./collectPages";
import type { ApiOrder } from "./types";
import { normalizePaginatedList, pickNamedEntity } from "./normalize";

export type CreateOrderItemPayload = {
  productId: string;
  quantity: number;
  frequency?: "one_time" | "weekly";
};

export type OrderStatus =
  | "requested"
  | "packing"
  | "cooler_ready"
  | "loaded"
  | "on_route"
  | "delivered"
  | "cooler_pickup"
  | "return"
  | "cancelled"
  | "archived";

export type CreateDistributorOrderPayload = {
  type: "distributor";
  distributorId: string;
  communicationChannel?: "quickbooks";
  deliveryDate?: string;
  deliveryCode?: string;
  items: CreateOrderItemPayload[];
};

export type CreateStandardOrderPayload = {
  type: "standard";
  customerId: string;
  deliveryDate?: string;
  deliveryCode?: string;
  items: CreateOrderItemPayload[];
};

export type CreateOrderPayload =
  CreateDistributorOrderPayload | CreateStandardOrderPayload;

export type UpdateOrderPayload = {
  distributorId?: string;
  communicationChannel?: "quickbooks";
  status?: OrderStatus;
  deliveryCode?: string;
  items?: CreateOrderItemPayload[];
};

export type OrdersListParams = {
  category?: string;
  page?: number;
  limit?: number;
  status?: string;
  type?: string;
  /**
   * Delivered distributor orders that have no inventory records yet.
   * They leave this list after POST /inventory/store.
   */
  pendingStorage?: boolean;
  /** Calendar day `YYYY-MM-DD`. Backend `getOrdersQuerySchema.deliveryDate`. */
  deliveryDate?: string;
  /**
   * Open orders still in the workflow (In Progress).
   * Backend `getOrdersQuerySchema.active`.
   */
  active?: boolean;
  /** Skip in-flight dedupe so a refresh is not the response from before a create. */
  fresh?: boolean;
};

/** One line inside GET /orders/distributor/aggregate-demand. Prices are integer cents. */
export type AggregateDemandItem = {
  itemId?: string;
  /** Sellable product UUID for POST /orders. */
  productId?: string;
  itemCode?: string;
  itemName?: string;
  categoryId?: string;
  categoryName?: string;
  customerOrderTotal?: number;
  inStock?: number | null;
  quantityReceiving?: number;
  qtyPerUnit?: number;
  /** Integer cents. */
  buyingPrice?: number;
  /** Present on the live API. Often null. */
  buyingUnit?: string | null;
  singleItemUnit?: string | null;
  qtyNeeded?: number;
  /** Integer cents. */
  lineSubtotal?: number;
  unit?: string;
  dateReceivingBy?: string | null;
  distributorId?: string;
  distributorName?: string;
  sourceId?: string;
  sourceName?: string;
};

export type AggregateDemandCategory = {
  id?: string;
  name?: string;
  items?: AggregateDemandItem[];
};

export type AggregateDemandSource = {
  id?: string;
  name?: string;
  /** Integer cents. */
  subtotal?: number;
  categories?: AggregateDemandCategory[];
};

export type AggregateDemandDistributor = {
  id?: string;
  name?: string;
  /** Integer cents. */
  subtotal?: number;
  sources?: AggregateDemandSource[];
};

export type AggregateDemandDate = {
  /** `YYYY-MM-DD HH:mm:ss` on the live API. */
  deliveryDate?: string;
  orderCount?: number;
};

export type AggregateDemand = {
  /**
   * Live API: `{ deliveryDate, orderCount }`.
   * Older docs used display strings such as "Wed, Jul 14".
   */
  dates?: Array<string | AggregateDemandDate>;
  distributors?: AggregateDemandDistributor[];
  /** Integer cents. */
  grandTotal?: number;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function normalizeAggregateDemand(payload: unknown): AggregateDemand {
  const record = asRecord(payload);
  if (!record) return { dates: [], distributors: [] };
  if (Array.isArray(record.distributors) || Array.isArray(record.dates)) {
    return record as AggregateDemand;
  }
  const nested = asRecord(record.data);
  if (
    nested &&
    (Array.isArray(nested.distributors) || Array.isArray(nested.dates))
  ) {
    return nested as AggregateDemand;
  }
  return { dates: [], distributors: [] };
}

export const ordersApi = {
  create(body: CreateOrderPayload) {
    return apiRequest<unknown>("/orders", {
      method: "POST",
      body: JSON.stringify(body),
    }).then(
      (payload) =>
        pickNamedEntity<ApiOrder>(payload, "order") ?? (payload as ApiOrder),
    );
  },

  list(params: OrdersListParams = {}) {
    const page = params.page ?? 1;
    const limit = params.limit ?? DEFAULT_PAGE_LIMIT;
    const search = new URLSearchParams();
    if (params.category) search.set("category", params.category);
    search.set("page", String(page));
    search.set("limit", String(limit));
    if (params.status) search.set("status", params.status);
    if (params.type) search.set("type", params.type);
    if (params.pendingStorage) search.set("pendingStorage", "true");
    if (typeof params.active === "boolean") {
      search.set("active", params.active ? "true" : "false");
    }
    // The server matches the whole UTC day. Day chips use the local calendar
    // day, so pages still filter locally.
    if (params.deliveryDate) search.set("deliveryDate", params.deliveryDate);
    const qs = search.toString();
    return apiRequest<unknown>(`/orders?${qs}`, {
      preserveEnvelope: true,
      dedupe: params.fresh ? false : undefined,
    }).then((payload) =>
      normalizePaginatedList<ApiOrder>(
        payload,
        ["orders", "items", "data", "results"],
        { page, limit },
      ),
    );
  },

  getById(id: string) {
    return apiRequest<unknown>(`/orders/${id}`).then(
      (payload) =>
        pickNamedEntity<ApiOrder>(payload, "order") ?? (payload as ApiOrder),
    );
  },

  assign(id: string, assignedStaffId: string) {
    return apiRequest<unknown>(`/orders/${id}/assign`, {
      method: "PATCH",
      body: JSON.stringify({ assignedStaffId }),
    }).then(
      (payload) =>
        pickNamedEntity<ApiOrder>(payload, "order") ?? (payload as ApiOrder),
    );
  },

  updateStatus(id: string, status: OrderStatus) {
    return apiRequest<unknown>(`/orders/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }).then(
      (payload) =>
        pickNamedEntity<ApiOrder>(payload, "order") ?? (payload as ApiOrder),
    );
  },

  assignPacker(id: string, packerId: string) {
    return apiRequest<unknown>(`/orders/${id}/packer`, {
      method: "PATCH",
      body: JSON.stringify({ packerId }),
    }).then(
      (payload) =>
        pickNamedEntity<ApiOrder>(payload, "order") ?? (payload as ApiOrder),
    );
  },

  assignOrderCoolers(
    id: string,
    coolers: { coolerId: string; productIds: string[] }[],
  ) {
    return apiRequest<unknown>(`/orders/${id}/cooler`, {
      method: "PATCH",
      body: JSON.stringify({ coolers }),
    }).then(
      (payload) =>
        pickNamedEntity<ApiOrder>(payload, "order") ?? (payload as ApiOrder),
    );
  },

  /**
   * PATCH /orders/:id/items/:productId/pack. Saves the line's cooler and
   * inventory lot; the server marks that lot `picked`.
   */
  packItem(
    id: string,
    productId: string,
    body: { coolerId?: string; inventoryRecordId?: string; packed?: boolean },
  ) {
    return apiRequest<unknown>(`/orders/${id}/items/${productId}/pack`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }).then(
      (payload) =>
        pickNamedEntity<ApiOrder>(payload, "order") ?? (payload as ApiOrder),
    );
  },

  /**
   * PATCH /orders/:id/items/:productId/unpack. Clears the line's cooler, lot,
   * and packed flag, and returns the lot to `in_stock`.
   */
  unpackItem(id: string, productId: string) {
    return apiRequest<unknown>(`/orders/${id}/items/${productId}/unpack`, {
      method: "PATCH",
    }).then(
      (payload) =>
        pickNamedEntity<ApiOrder>(payload, "order") ?? (payload as ApiOrder),
    );
  },

  startPacking(id: string) {
    return apiRequest<unknown>(`/orders/${id}/start-packing`, {
      method: "PATCH",
    }).then(
      (payload) =>
        pickNamedEntity<ApiOrder>(payload, "order") ?? (payload as ApiOrder),
    );
  },

  coolerReady(id: string) {
    return apiRequest<unknown>(`/orders/${id}/ready`, {
      method: "PATCH",
    }).then(
      (payload) =>
        pickNamedEntity<ApiOrder>(payload, "order") ?? (payload as ApiOrder),
    );
  },

  /**
   * PATCH /orders/:id/load rejects `cooler_ready` orders (it checks for an
   * `on_route` transition). On a 400, fall back to PATCH /orders/:id/status,
   * which allows `cooler_ready → loaded` and sets `loadedAt`, but only for
   * users with `manage:orders`.
   */
  async loaded(id: string) {
    try {
      const payload = await apiRequest<unknown>(`/orders/${id}/load`, {
        method: "PATCH",
      });
      return (
        pickNamedEntity<ApiOrder>(payload, "order") ?? (payload as ApiOrder)
      );
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 400) throw error;
      return ordersApi.updateStatus(id, "loaded");
    }
  },

  edit(id: string, body: UpdateOrderPayload) {
    return apiRequest<unknown>(`/orders/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }).then(
      (payload) =>
        pickNamedEntity<ApiOrder>(payload, "order") ?? (payload as ApiOrder),
    );
  },

  /**
   * Delivered distributor orders still waiting for POST /inventory/store.
   * GET /orders?type=distributor&status=delivered&pendingStorage=true
   */
  listPendingStorage() {
    return collectPaginated((page, limit) =>
      ordersApi.list({
        page,
        limit,
        type: "distributor",
        status: "delivered",
        pendingStorage: true,
      }),
    );
  },

  /** Open distributor demand, grouped distributor → source → category → item. */
  aggregateDemand(deliveryDate?: string) {
    const search = new URLSearchParams();
    if (deliveryDate) search.set("deliveryDate", deliveryDate);
    const qs = search.toString();
    return apiRequest<unknown>(
      `/orders/distributor/aggregate-demand${qs ? `?${qs}` : ""}`,
    ).then(normalizeAggregateDemand);
  },
};

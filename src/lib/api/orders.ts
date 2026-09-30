import { DEFAULT_PAGE_LIMIT } from "@/constants/pagination";

import { apiRequest } from "./client";
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
  | CreateDistributorOrderPayload
  | CreateStandardOrderPayload;

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
  /** Calendar day `YYYY-MM-DD`. Backend `getOrdersQuerySchema.deliveryDate`. */
  deliveryDate?: string;
};

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
    // Exact match on the stored timestamp. A calendar day (YYYY-MM-DD) does not
    // match values like 2026-09-30T02:00:00.000Z, so day chips filter locally.
    if (params.deliveryDate) search.set("deliveryDate", params.deliveryDate);
    const qs = search.toString();
    return apiRequest<unknown>(`/orders?${qs}`).then((payload) =>
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
    return apiRequest<unknown>(`/orders/${id}/assign-packer`, {
      method: "POST",
      body: JSON.stringify({ packerId }),
    }).then(
      (payload) =>
        pickNamedEntity<ApiOrder>(payload, "order") ?? (payload as ApiOrder),
    );
  },

  assignCooler(id: string, coolerId: string) {
    return apiRequest<unknown>(`/orders/${id}/assign-cooler`, {
      method: "POST",
      body: JSON.stringify({ coolerId }),
    }).then(
      (payload) =>
        pickNamedEntity<ApiOrder>(payload, "order") ?? (payload as ApiOrder),
    );
  },

  startPacking(id: string) {
    return apiRequest<unknown>(`/orders/${id}/start-packing`, {
      method: "POST",
    }).then(
      (payload) =>
        pickNamedEntity<ApiOrder>(payload, "order") ?? (payload as ApiOrder),
    );
  },

  coolerReady(id: string) {
    return apiRequest<unknown>(`/orders/${id}/cooler-ready`, {
      method: "POST",
    }).then(
      (payload) =>
        pickNamedEntity<ApiOrder>(payload, "order") ?? (payload as ApiOrder),
    );
  },

  loaded(id: string) {
    return apiRequest<unknown>(`/orders/${id}/loaded`, {
      method: "POST",
    }).then(
      (payload) =>
        pickNamedEntity<ApiOrder>(payload, "order") ?? (payload as ApiOrder),
    );
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
};

import { DEFAULT_PAGE_LIMIT } from "@/constants/pagination";

import { apiRequest } from "./client";
import type { ApiOrder } from "./types";
import { normalizePaginatedList, pickNamedEntity } from "./normalize";

export type CreateOrderItemPayload = {
  productId: string;
  quantity: number;
  frequency?: "one_time" | "weekly";
};

export type CreateDistributorOrderPayload = {
  type: "distributor";
  distributorId: string;
  communicationChannel?: string;
  deliveryDate?: string;
  items: CreateOrderItemPayload[];
};

export type CreateStandardOrderPayload = {
  type: "standard";
  customerId: string;
  deliveryDate?: string;
  items: CreateOrderItemPayload[];
};

export type CreateOrderPayload =
  | CreateDistributorOrderPayload
  | CreateStandardOrderPayload;

export type UpdateOrderPayload = {
  distributorId?: string;
  customerId?: string;
  communicationChannel?: string;
  status?: string;
  deliveryDate?: string;
  items?: CreateOrderItemPayload[];
};

export type OrdersListParams = {
  category?: string;
  page?: number;
  limit?: number;
  status?: string;
  type?: string;
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

  updateStatus(id: string, status: string) {
    return apiRequest<unknown>(`/orders/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
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

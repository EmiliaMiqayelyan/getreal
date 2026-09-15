import { apiRequest } from "./client";
import type { ApiOrder } from "./types";

export type CreateOrderPayload = {
  type: string;
  distributorId: string;
  communicationChannel: string;
  items: Array<{ productId: string; quantity: number }>;
};

export type UpdateOrderPayload = {
  distributorId?: string;
  communicationChannel?: string;
  status?: string;
  items?: Array<{ productId: string; quantity: number }>;
};

export type OrdersListParams = {
  category?: string;
  page?: number;
  limit?: number;
  status?: string;
};

export const ordersApi = {
  create(body: CreateOrderPayload) {
    return apiRequest<ApiOrder>("/orders", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  list(params: OrdersListParams = {}) {
    const search = new URLSearchParams();
    if (params.category) search.set("category", params.category);
    if (params.page != null) search.set("page", String(params.page));
    if (params.limit != null) search.set("limit", String(params.limit));
    if (params.status) search.set("status", params.status);
    const qs = search.toString();
    return apiRequest<ApiOrder[]>(`/orders${qs ? `?${qs}` : ""}`);
  },

  getById(id: string) {
    return apiRequest<ApiOrder>(`/orders/${id}`);
  },

  assign(id: string, assignedStaffId: string) {
    return apiRequest<ApiOrder>(`/orders/${id}/assign`, {
      method: "PATCH",
      body: JSON.stringify({ assignedStaffId }),
    });
  },

  updateStatus(id: string, status: string) {
    return apiRequest<ApiOrder>(`/orders/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  },

  edit(id: string, body: UpdateOrderPayload) {
    return apiRequest<ApiOrder>(`/orders/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  },
};

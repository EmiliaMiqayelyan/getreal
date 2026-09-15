import { apiRequest } from "./client";
import type { ApiUser, PaginatedUsers } from "./types";

export type CreateUserPayload = {
  email: string;
  password: string;
  name: string;
  role: string;
  status?: string;
};

export type UpdateUserPayload = {
  isBlocked?: boolean;
  status?: string;
  role?: string;
  name?: string;
  email?: string;
  password?: string;
};

export type UsersListParams = {
  page?: number;
  limit?: number;
  role?: string;
};

export const usersApi = {
  list(params: UsersListParams = {}) {
    const search = new URLSearchParams();
    if (params.page != null) search.set("page", String(params.page));
    if (params.limit != null) search.set("limit", String(params.limit));
    if (params.role) search.set("role", params.role);
    const qs = search.toString();
    return apiRequest<PaginatedUsers | ApiUser[]>(
      `/users${qs ? `?${qs}` : ""}`,
    );
  },

  getById(id: string) {
    return apiRequest<ApiUser>(`/users/${id}`);
  },

  create(body: CreateUserPayload) {
    return apiRequest<ApiUser>("/users", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  update(id: string, body: UpdateUserPayload) {
    return apiRequest<ApiUser>(`/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  },
};

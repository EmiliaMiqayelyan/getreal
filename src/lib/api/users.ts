import { DEFAULT_PAGE_LIMIT } from "@/constants/pagination";

import { apiRequest } from "./client";
import type { ApiUser } from "./types";
import { normalizePaginatedList, pickNamedEntity } from "./normalize";

export type CreateUserPayload = {
  email: string;
  password: string;
  name: string;
  role: string;
  status?: string;
  heardFrom?: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  address?: string;
  aptUnit?: string;
  city?: string;
  state?: string;
  zipCode?: string;
};

export type UpdateUserPayload = {
  isBlocked?: boolean;
  status?: string;
  role?: string;
  name?: string;
  email?: string;
  password?: string;
  heardFrom?: string;
};

export type UsersListParams = {
  page?: number;
  limit?: number;
  role?: string;
  roleId?: string;
  search?: string;
};

export const usersApi = {
  list(params: UsersListParams = {}) {
    const page = params.page ?? 1;
    const limit = params.limit ?? DEFAULT_PAGE_LIMIT;
    const search = new URLSearchParams();
    search.set("page", String(page));
    search.set("limit", String(limit));
    if (params.role) search.set("role", params.role);
    if (params.roleId) search.set("roleId", params.roleId);
    if (params.search) search.set("search", params.search);
    const qs = search.toString();
    return apiRequest<unknown>(`/users?${qs}`).then((payload) =>
      normalizePaginatedList<ApiUser>(
        payload,
        ["users", "items", "data", "results"],
        { page, limit },
      ),
    );
  },

  getById(id: string) {
    return apiRequest<unknown>(`/users/${id}`).then(
      (payload) =>
        pickNamedEntity<ApiUser>(payload, "user") ?? (payload as ApiUser),
    );
  },

  create(body: CreateUserPayload) {
    return apiRequest<unknown>("/users", {
      method: "POST",
      body: JSON.stringify(body),
    }).then(
      (payload) =>
        pickNamedEntity<ApiUser>(payload, "user") ?? (payload as ApiUser),
    );
  },

  update(id: string, body: UpdateUserPayload) {
    return apiRequest<unknown>(`/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }).then(
      (payload) =>
        pickNamedEntity<ApiUser>(payload, "user") ?? (payload as ApiUser),
    );
  },

  block(id: string, reason: string) {
    return apiRequest<unknown>(`/users/${id}/block`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    });
  },

  unblock(id: string) {
    return apiRequest<unknown>(`/users/${id}/unblock`, {
      method: "POST",
    });
  },
};

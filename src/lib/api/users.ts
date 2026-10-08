import { DEFAULT_PAGE_LIMIT } from "@/constants/pagination";

import { apiRequest } from "./client";
import type { ApiUser } from "./types";
import { normalizePaginatedList, pickNamedEntity } from "./normalize";

export type CreateUserPayload = {
  email: string;
  password: string;
  name: string;
  role?: string;
  roleId?: string;
  status?: string;
  isSubscribed?: boolean;
  heardFrom?: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  address?: string;
  aptUnit?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  distributorId?: string;
};

export type AdminAddUserPayload = {
  email?: string;
  name: string;
  role: string;
  roleId?: string;
  status?: string;
  isSubscribed?: boolean;
  isBlocked?: boolean;
  heardFrom?: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  address?: string;
  aptUnit?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  distributorId?: string;
};

export type UpdateUserPayload = {
  email?: string;
  /** Min 8 characters. The server hashes it. */
  password?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  address?: string;
  aptUnit?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  heardFrom?: string;
  role?: string;
  roleId?: string;
  status?: string;
  isSubscribed?: boolean;
  isBlocked?: boolean;
  distributorId?: string;
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

  adminAdd(body: AdminAddUserPayload) {
    return apiRequest<unknown>("/users/admin-add", {
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

  /**
   * PATCH /users/:id/permissions. Sets permissions for this user only; the
   * role is unchanged. `null` drops the override so the user follows the role.
   */
  updatePermissions(id: string, permissions: string[] | null) {
    return apiRequest<unknown>(`/users/${id}/permissions`, {
      method: "PATCH",
      body: JSON.stringify({ permissions }),
    }).then(
      (payload) =>
        pickNamedEntity<ApiUser>(payload, "user") ?? (payload as ApiUser),
    );
  },

  /** DELETE /users/:id. The server only sets `status: inactive`. */
  deactivate(id: string) {
    return apiRequest<void>(`/users/${id}`, { method: "DELETE" });
  },

  /**
   * PATCH /users/:id `{ isBlocked }`. Blocked users cannot sign in and are
   * left out of GET /users; GET /roles flags them with `isBlocked`.
   */
  setBlocked(id: string, isBlocked: boolean) {
    return usersApi.update(id, { isBlocked });
  },
};

import { DEFAULT_PAGE_LIMIT } from "@/constants/pagination";

import { apiRequest } from "./client";
import { CATALOG_LIST_CACHE_MS } from "./requestDedupe";
import type { ApiRole } from "./types";
import { normalizePaginatedList, pickNamedEntity } from "./normalize";

export type RolesListParams = {
  page?: number;
  limit?: number;
  /** Bypass the short list cache after a create, update, or delete. */
  fresh?: boolean;
};

export type CreateRolePayload = {
  name: string;
  roleCode?: string;
  description?: string;
  permissions: string[];
};

export type UpdateRolePayload = {
  name?: string;
  description?: string;
  permissions?: string[];
};

export const rolesApi = {
  list(params: RolesListParams = {}) {
    const page = params.page ?? 1;
    const limit = params.limit ?? DEFAULT_PAGE_LIMIT;
    const search = new URLSearchParams();
    search.set("page", String(page));
    search.set("limit", String(limit));
    return apiRequest<unknown>(`/roles?${search.toString()}`, {
      cacheTtlMs: params.fresh ? 0 : CATALOG_LIST_CACHE_MS,
      dedupe: params.fresh ? false : undefined,
      preserveEnvelope: true,
    }).then((payload) =>
      normalizePaginatedList<ApiRole>(
        payload,
        ["roles", "items", "data", "results"],
        { page, limit },
      ),
    );
  },

  getById(id: string) {
    return apiRequest<unknown>(`/roles/${id}`).then(
      (payload) =>
        pickNamedEntity<ApiRole>(payload, "role") ?? (payload as ApiRole),
    );
  },

  create(body: CreateRolePayload) {
    return apiRequest<unknown>("/roles", {
      method: "POST",
      body: JSON.stringify(body),
    }).then(
      (payload) =>
        pickNamedEntity<ApiRole>(payload, "role") ?? (payload as ApiRole),
    );
  },

  update(id: string, body: UpdateRolePayload) {
    return apiRequest<unknown>(`/roles/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }).then(
      (payload) =>
        pickNamedEntity<ApiRole>(payload, "role") ?? (payload as ApiRole),
    );
  },

  remove(id: string) {
    return apiRequest<void>(`/roles/${id}`, { method: "DELETE" });
  },
};

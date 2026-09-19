import { apiRequest } from "./client";
import { CATALOG_LIST_CACHE_MS } from "./requestDedupe";
import type { ApiRole } from "./types";
import { normalizeNamedList, pickNamedEntity } from "./normalize";

export type CreateRolePayload = {
  name: string;
  description?: string;
  permissions: string[];
};

export type UpdateRolePayload = {
  name?: string;
  description?: string;
  permissions?: string[];
};

export const rolesApi = {
  list() {
    return apiRequest<unknown>("/roles", {
      cacheTtlMs: CATALOG_LIST_CACHE_MS,
    }).then((payload) =>
      normalizeNamedList<ApiRole>(payload, ["roles", "items", "data", "results"]),
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

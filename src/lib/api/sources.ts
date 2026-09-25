import { apiRequest } from "./client";
import { CATALOG_LIST_CACHE_MS } from "./requestDedupe";
import type { ApiSource } from "./types";
import { normalizeNamedList, pickNamedEntity } from "./normalize";

export type CreateSourcePayload = {
  name: string;
  sourceCode?: string;
  distributorId: string;
  description?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  logoUrl?: string | null;
};

export type UpdateSourcePayload = Partial<
  Omit<CreateSourcePayload, "distributorId">
> & {
  /** Pass null to clear the distributor link. */
  distributorId?: string | null;
};

export const sourcesApi = {
  list() {
    return apiRequest<unknown>("/sources", {
      cacheTtlMs: CATALOG_LIST_CACHE_MS,
    }).then((payload) =>
      normalizeNamedList<ApiSource>(payload, ["sources", "data", "results"]),
    );
  },

  getById(id: string) {
    return apiRequest<unknown>(`/sources/${id}`).then(
      (payload) =>
        pickNamedEntity<ApiSource>(payload, "source") ??
        (payload as ApiSource),
    );
  },

  create(body: CreateSourcePayload) {
    return apiRequest<unknown>("/sources", {
      method: "POST",
      body: JSON.stringify(body),
    }).then(
      (payload) =>
        pickNamedEntity<ApiSource>(payload, "source") ??
        (payload as ApiSource),
    );
  },

  update(id: string, body: UpdateSourcePayload) {
    return apiRequest<unknown>(`/sources/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }).then(
      (payload) =>
        pickNamedEntity<ApiSource>(payload, "source") ??
        (payload as ApiSource),
    );
  },

  remove(id: string) {
    return apiRequest<void>(`/sources/${id}`, { method: "DELETE" });
  },
};

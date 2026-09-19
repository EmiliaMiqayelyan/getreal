import { apiRequest } from "./client";
import { CATALOG_LIST_CACHE_MS } from "./requestDedupe";
import type { ApiSubcategory } from "./types";
import { normalizeNamedList, pickNamedEntity } from "./normalize";

export type CreateSubcategoryPayload = {
  name: string;
  categoryId: string;
};

export type UpdateSubcategoryPayload = {
  name?: string;
  categoryId?: string;
};

export const subcategoriesApi = {
  list(params?: { categoryId?: string }) {
    const query = new URLSearchParams();
    if (params?.categoryId) query.set("categoryId", params.categoryId);
    const suffix = query.toString() ? `?${query.toString()}` : "";
    return apiRequest<unknown>(`/subcategories${suffix}`, {
      cacheTtlMs: CATALOG_LIST_CACHE_MS,
    }).then((payload) =>
      normalizeNamedList<ApiSubcategory>(payload, [
        "subcategories",
        "data",
        "results",
      ]),
    );
  },

  getById(id: string) {
    return apiRequest<unknown>(`/subcategories/${id}`).then(
      (payload) =>
        pickNamedEntity<ApiSubcategory>(payload, "subcategory") ??
        (payload as ApiSubcategory),
    );
  },

  create(body: CreateSubcategoryPayload) {
    return apiRequest<unknown>("/subcategories", {
      method: "POST",
      body: JSON.stringify(body),
    }).then(
      (payload) =>
        pickNamedEntity<ApiSubcategory>(payload, "subcategory") ??
        (payload as ApiSubcategory),
    );
  },

  update(id: string, body: UpdateSubcategoryPayload) {
    return apiRequest<unknown>(`/subcategories/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }).then(
      (payload) =>
        pickNamedEntity<ApiSubcategory>(payload, "subcategory") ??
        (payload as ApiSubcategory),
    );
  },

  remove(id: string) {
    return apiRequest<void>(`/subcategories/${id}`, { method: "DELETE" });
  },
};

import { apiRequest } from "./client";
import { CATALOG_LIST_CACHE_MS } from "./requestDedupe";
import type { ApiCategory } from "./types";
import { normalizeNamedList, pickNamedEntity } from "./normalize";

export const categoriesApi = {
  list() {
    return apiRequest<unknown>("/categories", {
      cacheTtlMs: CATALOG_LIST_CACHE_MS,
    }).then((payload) =>
      normalizeNamedList<ApiCategory>(payload, [
        "categories",
        "data",
        "results",
      ]),
    );
  },

  create(body: { name: string }) {
    return apiRequest<unknown>("/categories", {
      method: "POST",
      body: JSON.stringify(body),
    }).then(
      (payload) =>
        pickNamedEntity<ApiCategory>(payload, "category") ??
        (payload as ApiCategory),
    );
  },
};

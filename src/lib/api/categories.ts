import { apiRequest } from "./client";
import { catalogListCacheOptions } from "./requestDedupe";
import type { ApiCategory } from "./types";
import { normalizeNamedList, pickNamedEntity } from "./normalize";

export const categoriesApi = {
  list(options?: { fresh?: boolean }) {
    return apiRequest<unknown>(
      "/categories",
      catalogListCacheOptions(options?.fresh),
    ).then((payload) =>
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

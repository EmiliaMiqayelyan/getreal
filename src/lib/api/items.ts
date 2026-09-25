import { apiRequest } from "./client";
import { CATALOG_LIST_CACHE_MS } from "./requestDedupe";
import type { ApiItem } from "./types";
import { normalizeNamedList, pickNamedEntity } from "./normalize";

export type CreateItemPayload = {
  name: string;
  categoryId: string;
  subcategoryId?: string | null;
  distributorId: string;
  sourceId?: string;
  /** Integer cents. */
  buyingPrice: number;
  contents: number;
  buyingUnit?: string;
  singleItemUnit?: string;
  description?: string;
  /** Uploaded image URLs. */
  photos?: string[];
};

export type UpdateItemPayload = Partial<
  Omit<CreateItemPayload, "distributorId">
> & {
  /** Pass null to clear the distributor link. */
  distributorId?: string | null;
};

const inflightCreates = new Map<string, Promise<ApiItem>>();

export const itemsApi = {
  list() {
    return apiRequest<unknown>("/items", {
      cacheTtlMs: CATALOG_LIST_CACHE_MS,
    }).then((payload) =>
      normalizeNamedList<ApiItem>(payload, ["items", "data", "results"]),
    );
  },

  getById(id: string) {
    return apiRequest<unknown>(`/items/${id}`).then(
      (payload) =>
        pickNamedEntity<ApiItem>(payload, "item") ?? (payload as ApiItem),
    );
  },

  create(body: CreateItemPayload) {
    const key = JSON.stringify(body);
    const pending = inflightCreates.get(key);
    if (pending) return pending;

    const request = apiRequest<unknown>("/items", {
      method: "POST",
      body: JSON.stringify(body),
    })
      .then(
        (payload) =>
          pickNamedEntity<ApiItem>(payload, "item") ?? (payload as ApiItem),
      )
      .finally(() => {
        inflightCreates.delete(key);
      });

    inflightCreates.set(key, request);
    return request;
  },

  update(id: string, body: UpdateItemPayload) {
    return apiRequest<unknown>(`/items/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }).then(
      (payload) =>
        pickNamedEntity<ApiItem>(payload, "item") ?? (payload as ApiItem),
    );
  },

  remove(id: string) {
    return apiRequest<void>(`/items/${id}`, { method: "DELETE" });
  },
};

import { apiRequest } from "./client";
import { catalogListCacheOptions } from "./requestDedupe";
import type { ApiItem, ApiItemPhoto } from "./types";
import { normalizeNamedList, pickNamedEntity } from "./normalize";

export type CreateItemPayload = {
  name: string;
  /** Category name, e.g. Fruits or Vegetables. */
  category: string;
  subcategoryId?: string;
  distributorId: string;
  sourceId?: string;
  /** Integer cents. */
  buyingPrice: number;
  contents: number;
  buyingUnit?: string;
  singleItemUnit?: string;
  /**
   * Label from the merchandise weight dropdown.
   * Null clears a stored value.
   */
  merchandiseWeight?: string | null;
  description?: string;
  /** Stored as items.pre_order_information. */
  preOrderInformation?: string | null;
  /** Uploaded photos. Exactly one should have isPrimary when the list is non-empty. */
  photos?: ApiItemPhoto[];
};

export type UpdateItemPayload = Partial<
  Omit<CreateItemPayload, "distributorId">
> & {
  /** Pass null to clear the distributor link. */
  distributorId?: string | null;
};

const inflightCreates = new Map<string, Promise<ApiItem>>();

export const itemsApi = {
  list(options?: { fresh?: boolean }) {
    return apiRequest<unknown>(
      "/items",
      catalogListCacheOptions(options?.fresh),
    ).then((payload) =>
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

import { apiRequest } from "./client";
import type { ApiItem } from "./types";
import { normalizeNamedList, pickNamedEntity } from "./normalize";

export type CreateItemPayload = {
  name: string;
  categoryId: string;
  distributorId: string;
  buyingPrice: number;
  contents: number;
};

export type UpdateItemPayload = Partial<CreateItemPayload>;

export const itemsApi = {
  list() {
    return apiRequest<unknown>("/items").then((payload) =>
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
    return apiRequest<unknown>("/items", {
      method: "POST",
      body: JSON.stringify(body),
    }).then(
      (payload) =>
        pickNamedEntity<ApiItem>(payload, "item") ?? (payload as ApiItem),
    );
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

import { apiRequest } from "./client";
import type { ApiInventory } from "./types";
import { normalizeNamedList, pickNamedEntity } from "./normalize";

export type CreateInventoryPayload = {
  itemId: string;
  quantity: number;
  location?: string;
};

export type UpdateInventoryPayload = Partial<CreateInventoryPayload>;

export const inventoryApi = {
  list() {
    return apiRequest<unknown>("/inventory").then((payload) =>
      normalizeNamedList<ApiInventory>(payload, [
        "inventory",
        "items",
        "data",
        "results",
      ]),
    );
  },

  getById(id: string) {
    return apiRequest<unknown>(`/inventory/${id}`).then(
      (payload) =>
        pickNamedEntity<ApiInventory>(payload, "inventory") ??
        (payload as ApiInventory),
    );
  },

  create(body: CreateInventoryPayload) {
    return apiRequest<unknown>("/inventory", {
      method: "POST",
      body: JSON.stringify(body),
    }).then(
      (payload) =>
        pickNamedEntity<ApiInventory>(payload, "inventory") ??
        (payload as ApiInventory),
    );
  },

  update(id: string, body: UpdateInventoryPayload) {
    return apiRequest<unknown>(`/inventory/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }).then(
      (payload) =>
        pickNamedEntity<ApiInventory>(payload, "inventory") ??
        (payload as ApiInventory),
    );
  },

  remove(id: string) {
    return apiRequest<void>(`/inventory/${id}`, { method: "DELETE" });
  },
};

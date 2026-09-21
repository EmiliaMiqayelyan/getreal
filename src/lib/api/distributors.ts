import { apiRequest } from "./client";
import { CATALOG_LIST_CACHE_MS } from "./requestDedupe";
import type { ApiDistributor } from "./types";
import { normalizeNamedList, pickNamedEntity } from "./normalize";

import type { ApiDeliverySchedule, ApiDistributorDocument } from "./types";

export type ApiDistributorContactPayload = {
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
  title?: string;
};

export type CreateDistributorPayload = {
  name: string;
  distributorCode?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  paymentTerms?: string;
  notes?: string;
  contacts: ApiDistributorContactPayload[];
  /** `{ Mon: "08:00", Wed: "08:00" }` - object, not an array. */
  deliverySchedule?: ApiDeliverySchedule;
  documents?: ApiDistributorDocument[];
};

export type UpdateDistributorPayload = Partial<CreateDistributorPayload>;

export const distributorsApi = {
  list() {
    return apiRequest<unknown>("/distributors", {
      cacheTtlMs: CATALOG_LIST_CACHE_MS,
    }).then((payload) =>
      normalizeNamedList<ApiDistributor>(payload, [
        "distributors",
        "data",
        "results",
      ]),
    );
  },

  getById(id: string) {
    return apiRequest<unknown>(`/distributors/${id}`).then(
      (payload) =>
        pickNamedEntity<ApiDistributor>(payload, "distributor") ??
        (payload as ApiDistributor),
    );
  },

  create(body: CreateDistributorPayload) {
    return apiRequest<unknown>("/distributors", {
      method: "POST",
      body: JSON.stringify(body),
    }).then(
      (payload) =>
        pickNamedEntity<ApiDistributor>(payload, "distributor") ??
        (payload as ApiDistributor),
    );
  },

  update(id: string, body: UpdateDistributorPayload) {
    return apiRequest<unknown>(`/distributors/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }).then(
      (payload) =>
        pickNamedEntity<ApiDistributor>(payload, "distributor") ??
        (payload as ApiDistributor),
    );
  },

  remove(id: string) {
    return apiRequest<void>(`/distributors/${id}`, { method: "DELETE" });
  },
};

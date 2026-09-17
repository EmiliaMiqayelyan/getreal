import { apiRequest } from "./client";
import type { ApiDistributor } from "./types";
import { normalizeNamedList, pickNamedEntity } from "./normalize";

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
};

export type UpdateDistributorPayload = Partial<CreateDistributorPayload>;

export const distributorsApi = {
  list() {
    return apiRequest<unknown>("/distributors").then((payload) =>
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

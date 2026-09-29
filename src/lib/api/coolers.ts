import { apiRequest } from "./client";
import { normalizeNamedList } from "./normalize";

export type ApiCooler = {
  id?: string;
  status?: string;
  customerId?: string;
  createdAt?: string;
  updatedAt?: string;
};

export const coolersApi = {
  list() {
    return apiRequest<unknown>("/coolers").then((payload) =>
      normalizeNamedList<ApiCooler>(payload, [
        "coolers",
        "items",
        "data",
        "results",
      ]),
    );
  },
};

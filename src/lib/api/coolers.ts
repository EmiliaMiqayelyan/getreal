import { apiRequest } from "./client";
import { normalizeNamedList } from "./normalize";

export type ApiCooler = {
  id?: string;
  /** Public cooler code, e.g. CLR-A01. Swagger's example omits this; the live list sends it. */
  coolerCode?: string | null;
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

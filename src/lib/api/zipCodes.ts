import { apiRequest } from "./client";
import { normalizeNamedList, pickNamedEntity } from "./normalize";

export type ApiZipCode = {
  id: string;
  zipCode: string;
  city?: string | null;
  state?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type ListZipCodesParams = {
  search?: string;
  zipCode?: string;
  signal?: AbortSignal;
};

export type CreateZipCodePayload = {
  zipCode?: string;
  zipCodes?: string[];
  city?: string | null;
  state?: string | null;
};

export type CreateZipCodeResult = {
  zipCode: ApiZipCode;
  zipCodes: ApiZipCode[];
};

function parseCreateResult(payload: unknown): CreateZipCodeResult {
  if (payload && typeof payload === "object") {
    const single = pickNamedEntity<ApiZipCode>(payload, "zipCode");
    const list = normalizeNamedList<ApiZipCode>(payload, [
      "zipCodes",
      "codes",
    ]);
    if (single) {
      return { zipCode: single, zipCodes: list.length ? list : [single] };
    }
    if (list.length) {
      return { zipCode: list[0], zipCodes: list };
    }
  }

  throw new Error("Unexpected zip code response.");
}

export const zipCodesApi = {
  list(params: ListZipCodesParams = {}) {
    const query = new URLSearchParams();
    if (params.search?.trim()) query.set("search", params.search.trim());
    if (params.zipCode?.trim()) query.set("zipCode", params.zipCode.trim());
    const suffix = query.toString() ? `?${query.toString()}` : "";
    return apiRequest<unknown>(`/zip-codes${suffix}`, {
      signal: params.signal,
    }).then((payload) =>
      normalizeNamedList<ApiZipCode>(payload, [
        "zipCodes",
        "codes",
        "data",
        "results",
      ]),
    );
  },

  create(body: CreateZipCodePayload) {
    return apiRequest<unknown>("/zip-codes", {
      method: "POST",
      body: JSON.stringify(body),
    }).then(parseCreateResult);
  },

  remove(idOrZipCode: string) {
    return apiRequest<void>(
      `/zip-codes/${encodeURIComponent(idOrZipCode)}`,
      { method: "DELETE" },
    );
  },
};

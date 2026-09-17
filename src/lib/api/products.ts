import { apiRequest } from "./client";
import type { ApiProduct } from "./types";
import { normalizeNamedList, pickNamedEntity } from "./normalize";

export type CreateProductPayload = {
  itemId: string;
  merchandisingName: string;
  sellingPrice: number;
  description?: string;
  marginSugPrice?: number;
  finalMargin?: string;
  isLive?: boolean;
  position?: number;
};

export type UpdateProductPayload = Partial<CreateProductPayload>;

export type ProductsListParams = {
  category?: string;
  type?: string;
  search?: string;
  isLive?: boolean;
  distributorId?: string;
  sourceId?: string;
};

export const productsApi = {
  list(params: ProductsListParams = {}) {
    const search = new URLSearchParams();
    if (params.category) search.set("category", params.category);
    if (params.type) search.set("type", params.type);
    if (params.search) search.set("search", params.search);
    if (params.isLive != null) search.set("isLive", String(params.isLive));
    if (params.distributorId) search.set("distributorId", params.distributorId);
    if (params.sourceId) search.set("sourceId", params.sourceId);
    const qs = search.toString();
    return apiRequest<unknown>(`/products${qs ? `?${qs}` : ""}`).then(
      (payload) =>
        normalizeNamedList<ApiProduct>(payload, [
          "products",
          "items",
          "data",
          "results",
        ]),
    );
  },

  create(body: CreateProductPayload) {
    return apiRequest<unknown>("/products", {
      method: "POST",
      body: JSON.stringify(body),
    }).then(
      (payload) =>
        pickNamedEntity<ApiProduct>(payload, "product") ??
        (payload as ApiProduct),
    );
  },

  update(id: string, body: UpdateProductPayload) {
    return apiRequest<unknown>(`/products/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }).then(
      (payload) =>
        pickNamedEntity<ApiProduct>(payload, "product") ??
        (payload as ApiProduct),
    );
  },

  reorder(products: Array<{ id: string; position: number }>) {
    return apiRequest<unknown>("/products/reorder", {
      method: "PATCH",
      body: JSON.stringify({ products }),
    });
  },

  listAllSuppliersHistory() {
    return apiRequest<unknown>("/products/suppliers");
  },

  listProductSuppliers(productId: string) {
    return apiRequest<unknown>(`/products/${productId}/suppliers`);
  },
};

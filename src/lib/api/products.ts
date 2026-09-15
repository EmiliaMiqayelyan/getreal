import { apiRequest } from "./client";
import type { ApiProduct } from "./types";

export type CreateProductPayload = {
  name: string;
  categoryNames: string[];
  type: string;
  price: number;
  description: string;
};

export const productsApi = {
  list(params?: { category?: string }) {
    const query = params?.category
      ? `?category=${encodeURIComponent(params.category)}`
      : "";
    return apiRequest<ApiProduct[]>(`/products${query}`);
  },

  create(body: CreateProductPayload) {
    return apiRequest<ApiProduct>("/products", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  listAllSuppliersHistory() {
    return apiRequest<unknown>("/products/suppliers");
  },

  listProductSuppliers(productId: string) {
    return apiRequest<unknown>(`/products/${productId}/suppliers`);
  },
};

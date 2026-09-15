import { apiRequest } from "./client";
import type { ApiCategory } from "./types";

export const categoriesApi = {
  list() {
    return apiRequest<ApiCategory[]>("/categories");
  },

  create(body: { name: string }) {
    return apiRequest<ApiCategory>("/categories", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },
};

import { apiRequest } from "./client";
import type { ApiRole } from "./types";

export type CreateRolePayload = {
  name: string;
  description?: string;
  permissions: string[];
};

export type UpdateRolePayload = {
  name?: string;
  description?: string;
  permissions?: string[];
};

export const rolesApi = {
  list() {
    return apiRequest<ApiRole[]>("/roles");
  },

  getById(id: string) {
    return apiRequest<ApiRole>(`/roles/${id}`);
  },

  create(body: CreateRolePayload) {
    return apiRequest<ApiRole>("/roles", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  update(id: string, body: UpdateRolePayload) {
    return apiRequest<ApiRole>(`/roles/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    });
  },

  remove(id: string) {
    return apiRequest<void>(`/roles/${id}`, { method: "DELETE" });
  },
};

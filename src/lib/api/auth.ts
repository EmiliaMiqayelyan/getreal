import { apiRequest } from "./client";
import type { LoginResponse } from "./types";

export type RegisterPayload = {
  email: string;
  password: string;
  name: string;
  role: string;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export type SocialLoginPayload = {
  email: string;
  name: string;
  provider: string;
  providerId: string;
};

export const authApi = {
  register(body: RegisterPayload) {
    return apiRequest<LoginResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify(body),
      auth: false,
    });
  },

  login(body: LoginPayload) {
    return apiRequest<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(body),
      auth: false,
    });
  },

  socialLogin(body: SocialLoginPayload) {
    return apiRequest<LoginResponse>("/auth/social-login", {
      method: "POST",
      body: JSON.stringify(body),
      auth: false,
    });
  },

  logout() {
    return apiRequest<void>("/auth/logout", { method: "POST" });
  },
};

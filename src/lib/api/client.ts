import { env } from "@/lib/env";

import type { ApiEnvelope } from "./types";

export const AUTH_TOKEN_KEY = "getreal.authToken";

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

export function getApiBaseUrl(): string {
  return (env.apiUrl ?? "").replace(/\/$/, "");
}

export function isApiConfigured(): boolean {
  return getApiBaseUrl().length > 0;
}

export function getAuthToken(): string | null {
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAuthToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(AUTH_TOKEN_KEY, token);
    else localStorage.removeItem(AUTH_TOKEN_KEY);
  } catch {
    // no-op
  }
}

function buildUrl(path: string): string {
  const base = getApiBaseUrl();
  if (path.startsWith("http")) return path;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalized}`;
}

function unwrapData<T>(json: unknown): T {
  if (json && typeof json === "object" && "data" in json) {
    return (json as ApiEnvelope<T>).data as T;
  }
  return json as T;
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit & { auth?: boolean } = {},
): Promise<T> {
  if (!isApiConfigured()) {
    throw new ApiError("API URL is not configured", 0, null);
  }

  const headers = new Headers(options.headers);
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const useAuth = options.auth !== false;
  if (useAuth) {
    const token = getAuthToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(buildUrl(path), {
    ...options,
    headers,
  });

  const text = await response.text();
  let json: unknown = null;
  if (text) {
    try {
      json = JSON.parse(text) as unknown;
    } catch {
      json = text;
    }
  }

  if (!response.ok) {
    const message =
      (json && typeof json === "object" && "message" in json
        ? String((json as { message?: string }).message)
        : null) ?? response.statusText;
    throw new ApiError(message || "Request failed", response.status, json);
  }

  return unwrapData<T>(json);
}

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

function clearLocalSession() {
  setAuthToken(null);
  try {
    localStorage.removeItem("getreal.auth");
    localStorage.removeItem("getreal.role");
    localStorage.removeItem("getreal.lastActive");
    localStorage.removeItem("getreal.userName");
  } catch {
    // no-op
  }
}

export type ApiRequestOptions = RequestInit & {
  auth?: boolean;
  /**
   * Keep the raw JSON body. List endpoints put `total` next to `data`,
   * and the default unwrap drops that pagination field.
   */
  preserveEnvelope?: boolean;
};

async function executeFetch<T>(
  url: string,
  options: ApiRequestOptions,
): Promise<T> {
  const headers = new Headers(options.headers);
  const isFormData =
    typeof FormData !== "undefined" && options.body instanceof FormData;
  // Let the browser set multipart boundary for FormData; JSON otherwise.
  if (options.body && !isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const useAuth = options.auth !== false;
  if (useAuth) {
    const token = getAuthToken();
    if (!token) {
      throw new ApiError(
        "You must be signed in to continue.",
        401,
        null,
      );
    }
    headers.set("Authorization", `Bearer ${token}`);
  }

  const {
    auth: _auth,
    preserveEnvelope,
    cache: cacheMode,
    ...fetchOptions
  } = options;
  void _auth;

  let response: Response;
  try {
    response = await fetch(url, {
      ...fetchOptions,
      // Always bypass the browser HTTP cache for API reads/writes.
      cache: cacheMode ?? "no-store",
      headers,
    });
  } catch (error) {
    if (options.signal?.aborted) {
      throw error instanceof Error
        ? error
        : new DOMException("Aborted", "AbortError");
    }
    throw new ApiError(
      "Unable to reach the server. Check your connection.",
      0,
      null,
    );
  }

  const text = await response.text();
  let json: unknown = null;
  if (text) {
    try {
      json = JSON.parse(text) as unknown;
    } catch {
      json = text;
    }
  }

  if (response.status === 401 && useAuth) {
    clearLocalSession();
  }

  if (!response.ok) {
    let message =
      (json && typeof json === "object" && "message" in json
        ? String((json as { message?: string }).message)
        : null) ?? response.statusText;

    // Prefer first validation detail when message is generic.
    if (json && typeof json === "object" && "errors" in json) {
      const errors = (json as { errors?: unknown }).errors;
      if (Array.isArray(errors) && errors[0] && typeof errors[0] === "object") {
        const first = errors[0] as { message?: string; field?: string };
        if (first.message) {
          message = first.field
            ? `${first.field}: ${first.message}`
            : first.message;
        }
      } else if (errors && typeof errors === "object") {
        const firstEntry = Object.entries(errors as Record<string, unknown>)[0];
        if (firstEntry) {
          const [field, value] = firstEntry;
          const detail = Array.isArray(value) ? value[0] : value;
          if (typeof detail === "string" && detail) {
            message = `${field}: ${detail}`;
          }
        }
      }
    }

    throw new ApiError(message || "Request failed", response.status, json);
  }

  if (preserveEnvelope) return json as T;
  return unwrapData<T>(json);
}

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  if (!isApiConfigured()) {
    throw new ApiError("API URL is not configured", 0, null);
  }

  return executeFetch<T>(buildUrl(path), options);
}

function filenameFromContentDisposition(header: string | null): string | null {
  if (!header) return null;
  const utf8 = /filename\*\s*=\s*UTF-8''([^;]+)/i.exec(header);
  if (utf8?.[1]) {
    try {
      return decodeURIComponent(utf8[1].trim().replace(/^"|"$/g, ""));
    } catch {
      return utf8[1].trim().replace(/^"|"$/g, "");
    }
  }
  const plain = /filename\s*=\s*("?)([^";]+)\1/i.exec(header);
  return plain?.[2]?.trim() ?? null;
}

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/** Fetch a binary/file response (e.g. CSV export) and trigger a browser download. */
export async function apiDownload(
  path: string,
  options: RequestInit & { auth?: boolean; filename?: string } = {},
): Promise<void> {
  if (!isApiConfigured()) {
    throw new ApiError("API URL is not configured", 0, null);
  }

  const headers = new Headers(options.headers);
  const useAuth = options.auth !== false;
  if (useAuth) {
    const token = getAuthToken();
    if (!token) {
      throw new ApiError(
        "You must be signed in to continue.",
        401,
        null,
      );
    }
    headers.set("Authorization", `Bearer ${token}`);
  }

  const { filename: fallbackFilename, ...fetchOptions } = options;

  let response: Response;
  try {
    response = await fetch(buildUrl(path), {
      ...fetchOptions,
      cache: "no-store",
      headers,
    });
  } catch {
    throw new ApiError(
      "Unable to reach the server. Check your connection.",
      0,
      null,
    );
  }

  if (response.status === 401 && useAuth) {
    clearLocalSession();
  }

  if (!response.ok) {
    const text = await response.text();
    let json: unknown = null;
    if (text) {
      try {
        json = JSON.parse(text) as unknown;
      } catch {
        json = text;
      }
    }
    const message =
      (json && typeof json === "object" && "message" in json
        ? String((json as { message?: string }).message)
        : null) ?? response.statusText;
    throw new ApiError(message || "Request failed", response.status, json);
  }

  const blob = await response.blob();
  const filename =
    filenameFromContentDisposition(
      response.headers.get("Content-Disposition"),
    ) ?? fallbackFilename ?? "export.csv";
  triggerBlobDownload(blob, filename);
}

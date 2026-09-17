import { ApiError } from "./client";

export type ApiFieldErrors = Record<string, string>;

function firstString(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (Array.isArray(value)) {
    for (const entry of value) {
      const text = firstString(entry);
      if (text) return text;
    }
  }
  if (value && typeof value === "object" && "message" in value) {
    return firstString((value as { message?: unknown }).message);
  }
  return null;
}

/**
 * Parse backend validation payloads into a flat field → message map.
 * Supports:
 * - `{ errors: [{ field, message }] }`
 * - `{ errors: { email: ["Required"], "photos.0": ["..."] } }`
 */
export function getApiFieldErrors(error: unknown): ApiFieldErrors {
  const body =
    error instanceof ApiError
      ? error.body
      : error && typeof error === "object"
        ? error
        : null;

  if (!body || typeof body !== "object") return {};

  const errors = (body as { errors?: unknown }).errors;
  const result: ApiFieldErrors = {};

  if (Array.isArray(errors)) {
    for (const entry of errors) {
      if (!entry || typeof entry !== "object") continue;
      const record = entry as { field?: unknown; message?: unknown; path?: unknown };
      const field =
        firstString(record.field) ||
        firstString(record.path) ||
        "form";
      const message = firstString(record.message);
      if (field && message && !result[field]) result[field] = message;
    }
    return result;
  }

  if (errors && typeof errors === "object") {
    for (const [field, value] of Object.entries(errors as Record<string, unknown>)) {
      const message = firstString(value);
      if (message) result[field] = message;
    }
  }

  return result;
}

function statusFallback(status: number): string {
  if (status === 0) return "Unable to reach the server. Check your connection.";
  if (status === 400) return "Invalid request. Please check the form and try again.";
  if (status === 401) return "Your session expired. Please sign in again.";
  if (status === 403) return "You do not have permission to do that.";
  if (status === 404) return "The requested resource was not found.";
  if (status === 409) return "This conflicts with existing data.";
  if (status === 422) return "Validation failed. Please check your input.";
  if (status >= 500) return "Server error. Please try again later.";
  return "Request failed. Please try again.";
}

/**
 * Build a user-facing message from any thrown API/network error.
 */
export function formatApiError(
  error: unknown,
  fallback = "Something went wrong. Please try again.",
): string {
  if (error instanceof ApiError) {
    const fieldErrors = getApiFieldErrors(error);
    const fieldMessages = Object.entries(fieldErrors).map(([field, message]) => {
      if (field === "form" || field === "body") return message;
      return `${field}: ${message}`;
    });

    if (fieldMessages.length === 1) return fieldMessages[0]!;
    if (fieldMessages.length > 1) {
      const summary =
        error.message && error.message !== "Validation failed"
          ? error.message
          : "Validation failed";
      return `${summary}. ${fieldMessages.slice(0, 3).join("; ")}`;
    }

    if (error.message && error.message !== "Validation failed") {
      return error.message;
    }

    return statusFallback(error.status);
  }

  if (error instanceof TypeError) {
    return "Unable to reach the server. Check your connection.";
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
}

export function isUnauthorizedError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401;
}

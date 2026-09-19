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

const TABLE_SINGULAR: Record<string, string> = {
  distributors: "distributor",
  items: "item",
  sources: "source",
  products: "product",
  categories: "category",
  subcategories: "subcategory",
  customers: "customer",
  orders: "order",
  users: "user",
  roles: "role",
};

const TABLE_PLURAL: Record<string, string> = {
  distributors: "distributors",
  items: "items",
  sources: "sources",
  products: "products",
  categories: "categories",
  subcategories: "subcategories",
  customers: "customers",
  orders: "orders",
  users: "users",
  roles: "roles",
};

function singularLabel(table: string): string {
  return TABLE_SINGULAR[table] ?? table.replace(/_/g, " ").replace(/s$/, "");
}

function pluralLabel(table: string): string {
  return TABLE_PLURAL[table] ?? table.replace(/_/g, " ");
}

/**
 * Turn leaked Postgres / ORM constraint text into actionable copy.
 * Prefer fixing these on the backend; this is a safety net only.
 */
export function humanizeConstraintError(message: string): string | null {
  const text = message.trim();
  if (!text) return null;

  const deleteMatch = text.match(
    /update or delete on table ["']?(\w+)["']? violates foreign key constraint ["']?[\w]+["']? on table ["']?(\w+)["']?/i,
  );
  if (deleteMatch) {
    const parent = singularLabel(deleteMatch[1]!);
    const children = pluralLabel(deleteMatch[2]!);
    return `Cannot change or delete this ${parent} because it is still linked to one or more ${children}. Remove or reassign those ${children} first.`;
  }

  const insertMatch = text.match(
    /insert or update on table ["']?(\w+)["']? violates foreign key constraint/i,
  );
  if (insertMatch) {
    const child = singularLabel(insertMatch[1]!);
    return `Cannot save this ${child} because a related record is missing or invalid. Check the linked fields and try again.`;
  }

  if (/unique constraint|duplicate key/i.test(text)) {
    return "This record already exists. Use a different value and try again.";
  }

  if (/violates .* constraint|foreign key|relation ["'].*["'] does not exist/i.test(text)) {
    return "This action conflicts with related data. Check linked records and try again.";
  }

  return null;
}

function toUserMessage(message: string): string {
  return humanizeConstraintError(message) ?? message;
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
      const readable = toUserMessage(message);
      if (field === "form" || field === "body") return readable;
      return `${field}: ${readable}`;
    });

    if (fieldMessages.length === 1) return fieldMessages[0]!;
    if (fieldMessages.length > 1) {
      const summary =
        error.message && error.message !== "Validation failed"
          ? toUserMessage(error.message)
          : "Validation failed";
      return `${summary}. ${fieldMessages.slice(0, 3).join("; ")}`;
    }

    if (error.message && error.message !== "Validation failed") {
      return toUserMessage(error.message);
    }

    return statusFallback(error.status);
  }

  if (error instanceof TypeError) {
    return "Unable to reach the server. Check your connection.";
  }

  if (error instanceof Error && error.message.trim()) {
    return toUserMessage(error.message);
  }

  return fallback;
}

export function isUnauthorizedError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401;
}

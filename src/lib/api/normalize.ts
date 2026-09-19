import { DEFAULT_PAGE_LIMIT } from "@/constants/pagination";
import type { PaginatedResult } from "./types";

/** Normalize list payloads that may be arrays or `{ [key]: T[] }` objects. */
export function normalizeNamedList<T>(
  payload: unknown,
  keys: string[],
): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    for (const key of keys) {
      const value = record[key];
      if (Array.isArray(value)) return value as T[];
    }
  }
  return [];
}

function asPositiveInt(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Math.floor(value);
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0) return Math.floor(parsed);
  }
  return undefined;
}

function asNonNegInt(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return Math.floor(value);
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed >= 0) return Math.floor(parsed);
  }
  return undefined;
}

function readPaginationMeta(
  record: Record<string, unknown> | null,
): { page?: number; limit?: number; total?: number } {
  if (!record) return {};

  const nested =
    (record.meta && typeof record.meta === "object"
      ? (record.meta as Record<string, unknown>)
      : null) ??
    (record.pagination && typeof record.pagination === "object"
      ? (record.pagination as Record<string, unknown>)
      : null);

  const source = nested ?? record;

  return {
    page: asPositiveInt(source.page) ?? asPositiveInt(source.currentPage),
    limit:
      asPositiveInt(source.limit) ??
      asPositiveInt(source.pageSize) ??
      asPositiveInt(source.perPage),
    total:
      asNonNegInt(source.total) ??
      asNonNegInt(source.totalCount) ??
      asNonNegInt(source.totalItems) ??
      asNonNegInt(source.count),
  };
}

/**
 * Normalize a paginated list response.
 * Uses backend `page` / `limit` / `total` when present; otherwise falls back
 * to the request params and the items length.
 */
export function normalizePaginatedList<T>(
  payload: unknown,
  keys: string[],
  fallback: { page?: number; limit?: number } = {},
): PaginatedResult<T> {
  const items = normalizeNamedList<T>(payload, keys);
  const record =
    payload && typeof payload === "object" && !Array.isArray(payload)
      ? (payload as Record<string, unknown>)
      : null;
  const meta = readPaginationMeta(record);

  const page = meta.page ?? fallback.page ?? 1;
  const limit = meta.limit ?? fallback.limit ?? DEFAULT_PAGE_LIMIT;
  const total = meta.total ?? items.length;

  return { items, total, page, limit };
}

/** Pick a nested entity from `{ [key]: T }` create/update responses. */
export function pickNamedEntity<T>(
  payload: unknown,
  key: string,
): T | null {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;
  const value = record[key];
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as T;
  }
  return null;
}

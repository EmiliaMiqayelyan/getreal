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

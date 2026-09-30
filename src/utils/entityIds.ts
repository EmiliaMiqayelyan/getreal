/** Entities that may carry a business code `id` plus an optional API record UUID. */
export type IdentifiedEntity = {
  id: string;
  recordId?: string;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string | null | undefined): boolean {
  const trimmed = value?.trim();
  return Boolean(trimmed && UUID_PATTERN.test(trimmed));
}

/** First candidate that is a business code, never a UUID. */
export function publicCode(
  ...candidates: Array<string | null | undefined>
): string | undefined {
  for (const candidate of candidates) {
    const trimmed = candidate?.trim();
    if (trimmed && !isUuid(trimmed)) return trimmed;
  }
  return undefined;
}

function snakeCase(key: string) {
  return key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

function readStringField(
  record: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = record[key] ?? record[snakeCase(key)];
  return typeof value === "string" ? value : undefined;
}

export function codeFrom(
  record: object | null | undefined,
  keys: string[],
  depth = 0,
): string | undefined {
  if (!record || typeof record !== "object") return undefined;
  const raw = record as Record<string, unknown>;
  const direct = publicCode(...keys.map((key) => readStringField(raw, key)));
  if (direct) return direct;
  if (depth > 0) return undefined;

  for (const value of Object.values(raw)) {
    if (!value || typeof value !== "object" || Array.isArray(value)) continue;
    const nested = codeFrom(value, keys, depth + 1);
    if (nested) return nested;
  }
  return undefined;
}

/**
 * Public identifier for a record.
 * Uses the model code when the API provides one, and keeps the UUID only
 * when no code exists so existing routes can still resolve.
 */
export function preferModelId(
  record: object | null | undefined,
  codeKeys: string[],
  fallback: string,
): string {
  return codeFrom(record, codeKeys) ?? fallback;
}

/** Record UUID for API paths and foreign keys. Model codes stay on screen. */
export function apiId(entity: IdentifiedEntity): string {
  return recordRef(entity) ?? entity.id;
}

/** Backend record UUID. Item foreign keys must use this, not the public code. */
export function recordRef(entity: IdentifiedEntity): string | undefined {
  if (isUuid(entity.recordId)) return entity.recordId!.trim();
  if (isUuid(entity.id)) return entity.id.trim();
  return undefined;
}

/** Match a ref that may be either a business code or a record UUID. */
export function matchesEntityRef(
  entity: IdentifiedEntity,
  ref: string | null | undefined,
): boolean {
  if (!ref) return false;
  return entity.id === ref || entity.recordId === ref;
}

export function findByEntityRef<T extends IdentifiedEntity>(
  entities: T[],
  ref: string | null | undefined,
): T | undefined {
  if (!ref) return undefined;
  return entities.find((entity) => matchesEntityRef(entity, ref));
}

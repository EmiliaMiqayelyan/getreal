/** Entities that may carry a business `id` plus an optional API record UUID. */
export type IdentifiedEntity = {
  id: string;
  recordId?: string;
};

/** Prefer the backend UUID for API path params and FK payloads. */
export function apiId(entity: IdentifiedEntity): string {
  return entity.recordId ?? entity.id;
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

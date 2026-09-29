import { publicCode } from "@/utils/entityIds";

import { ApiError, apiRequest } from "./client";
import { itemsApi } from "./items";
import { CATALOG_LIST_CACHE_MS } from "./requestDedupe";
import { sourcesApi } from "./sources";
import type { ApiDistributor } from "./types";
import { normalizeNamedList, pickNamedEntity } from "./normalize";

import type { ApiDeliverySchedule, ApiDistributorDocument } from "./types";

export type ApiDistributorContactPayload = {
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
  title?: string;
};

export type CreateDistributorPayload = {
  name: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  paymentTerms?: string;
  notes?: string;
  contacts: ApiDistributorContactPayload[];
  /** `{ Mon: "08:00", Wed: "08:00" }` - object, not an array. */
  deliverySchedule?: ApiDeliverySchedule;
  documents?: ApiDistributorDocument[];
};

export type UpdateDistributorPayload = Partial<CreateDistributorPayload>;

function isLinkConstraint(error: unknown): boolean {
  if (!(error instanceof ApiError)) return false;
  return /foreign key|violates .* constraint|still linked/i.test(error.message);
}

async function unlinkRecord(
  update: () => Promise<unknown>,
  remove: () => Promise<unknown>,
) {
  try {
    await update();
  } catch {
    await remove();
  }
}

/** Drop item and source links so the distributor row can be deleted. */
async function clearDistributorLinks(distributorRef: string) {
  const [items, sources, distributors] = await Promise.all([
    itemsApi.list().catch(() => []),
    sourcesApi.list().catch(() => []),
    distributorsApi.list().catch(() => []),
  ]);

  const match = distributors.find(
    (entry) =>
      entry.id === distributorRef || entry.distributorCode === distributorRef,
  );
  const refs = new Set(
    [distributorRef, match?.id, match?.distributorCode].filter(
      (value): value is string => Boolean(value),
    ),
  );

  await Promise.all([
    ...items
      .filter((item) => item.id && item.distributorId && refs.has(item.distributorId))
      .map((item) => {
        const id = publicCode(item.itemCode) ?? item.id!;
        return unlinkRecord(
          () => itemsApi.update(id, { distributorId: null }),
          () => itemsApi.remove(id),
        );
      }),
    ...sources
      .filter(
        (source) =>
          source.id && source.distributorId && refs.has(source.distributorId),
      )
      .map((source) => {
        const id = publicCode(source.sourceCode) ?? source.id!;
        return unlinkRecord(
          () => sourcesApi.update(id, { distributorId: null }),
          () => sourcesApi.remove(id),
        );
      }),
  ]);
}

export const distributorsApi = {
  list() {
    return apiRequest<unknown>("/distributors", {
      cacheTtlMs: CATALOG_LIST_CACHE_MS,
    }).then((payload) =>
      normalizeNamedList<ApiDistributor>(payload, [
        "distributors",
        "data",
        "results",
      ]),
    );
  },

  getById(id: string) {
    return apiRequest<unknown>(`/distributors/${id}`).then(
      (payload) =>
        pickNamedEntity<ApiDistributor>(payload, "distributor") ??
        (payload as ApiDistributor),
    );
  },

  create(body: CreateDistributorPayload) {
    return apiRequest<unknown>("/distributors", {
      method: "POST",
      body: JSON.stringify(body),
    }).then(
      (payload) =>
        pickNamedEntity<ApiDistributor>(payload, "distributor") ??
        (payload as ApiDistributor),
    );
  },

  update(id: string, body: UpdateDistributorPayload) {
    return apiRequest<unknown>(`/distributors/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }).then(
      (payload) =>
        pickNamedEntity<ApiDistributor>(payload, "distributor") ??
        (payload as ApiDistributor),
    );
  },

  async remove(id: string) {
    try {
      await apiRequest<void>(`/distributors/${id}`, { method: "DELETE" });
    } catch (error) {
      if (!isLinkConstraint(error)) throw error;
      await clearDistributorLinks(id);
      await apiRequest<void>(`/distributors/${id}`, { method: "DELETE" });
    }
  },
};

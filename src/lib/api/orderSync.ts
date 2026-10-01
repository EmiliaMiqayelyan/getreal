import type { Distributor } from "@/types/distributor";
import type { Item } from "@/types/item";
import type { ProductForSale } from "@/types/productForSale";
import type {
  ManualOrderDraft,
  ReviewGroup,
} from "@/types/distributorOrder";

import { isApiConfigured } from "./client";
import { formatApiError } from "./errors";
import { ordersApi, type CreateOrderItemPayload } from "./orders";
import type { ApiOrder } from "./types";
import { toastFromApi } from "@/lib/toastBridge";
import { apiId, findByEntityRef, isUuid } from "@/utils/entityIds";

function findDistributor(
  nameOrId: string,
  distributors: Distributor[],
): Distributor | undefined {
  return (
    distributors.find(
      (entry) =>
        entry.name === nameOrId ||
        entry.id === nameOrId ||
        entry.recordId === nameOrId,
    ) ?? findByEntityRef(distributors, nameOrId)
  );
}

function findProductForLine(
  line: { sku?: string; itemName: string },
  products: ProductForSale[],
  catalogItems: Item[] = [],
): ProductForSale | undefined {
  const catalogItem =
    catalogItems.find(
      (item) => item.id === line.sku || item.recordId === line.sku,
    ) ?? null;

  return products.find((entry) => {
    if (
      line.sku &&
      (entry.itemId === line.sku ||
        entry.id === line.sku ||
        entry.recordId === line.sku)
    ) {
      return true;
    }
    if (
      catalogItem &&
      (entry.itemId === catalogItem.id ||
        entry.itemId === catalogItem.recordId)
    ) {
      return true;
    }
    return (
      entry.merchandisingName === line.itemName ||
      entry.id === line.itemName ||
      entry.recordId === line.itemName
    );
  });
}

function toOrderItemPayloads(
  lines: Array<{
    sku?: string;
    itemName: string;
    quantity: number;
    productId?: string;
  }>,
  products: ProductForSale[],
  catalogItems: Item[] = [],
): CreateOrderItemPayload[] {
  const payloads: CreateOrderItemPayload[] = [];
  for (const line of lines) {
    if (line.productId && isUuid(line.productId)) {
      payloads.push({
        productId: line.productId,
        quantity: Math.max(0.01, Number(line.quantity) || 1),
        frequency: "one_time",
      });
      continue;
    }
    const product = findProductForLine(line, products, catalogItems);
    if (!product) continue;
    const productId = product.recordId && isUuid(product.recordId)
      ? product.recordId
      : isUuid(product.id)
        ? product.id
        : apiId(product);
    if (!isUuid(productId)) continue;
    payloads.push({
      productId,
      quantity: Math.max(0.01, Number(line.quantity) || 1),
      frequency: "one_time",
    });
  }
  return payloads;
}

function distributorRecordId(
  distributor: Distributor | undefined,
  explicitId?: string,
) {
  if (explicitId && isUuid(explicitId)) return explicitId;
  if (!distributor) return undefined;
  if (isUuid(distributor.recordId)) return distributor.recordId;
  if (isUuid(distributor.id)) return distributor.id;
  return undefined;
}

async function postDistributorOrder(input: {
  distributorId: string;
  items: CreateOrderItemPayload[];
  deliveryDate?: string;
}): Promise<ApiOrder | null> {
  const distributorId = input.distributorId;
  if (!distributorId) {
    toastFromApi(
      "Could not sync order: distributor has no server id.",
      "error",
    );
    return null;
  }
  const body: Parameters<typeof ordersApi.create>[0] = {
    type: "distributor",
    distributorId,
    communicationChannel: "quickbooks",
    items: input.items,
  };
  if (input.deliveryDate) {
    const parsed = Date.parse(input.deliveryDate);
    body.deliveryDate = Number.isNaN(parsed)
      ? input.deliveryDate
      : new Date(parsed).toISOString();
  }

  try {
    return await ordersApi.create(body);
  } catch (error) {
    toastFromApi(
      formatApiError(error, "Failed to sync distributor order."),
      "error",
    );
    return null;
  }
}

/**
 * Push one source group to POST /orders.
 * `distributorId` and each `productId` must be UUIDs.
 */
export async function syncReviewGroupOrder(
  group: ReviewGroup,
  distributors: Distributor[],
  products: ProductForSale[],
  catalogItems: Item[] = [],
  deliveryDate?: string,
): Promise<ApiOrder | null> {
  if (!isApiConfigured()) return null;

  const distributor = findDistributor(group.distributor, distributors);
  const distributorId = distributorRecordId(distributor, group.distributorId);
  if (!distributorId) {
    toastFromApi(
      `Could not sync order: distributor "${group.distributor}" has no API id.`,
      "error",
    );
    return null;
  }

  const items = toOrderItemPayloads(group.items, products, catalogItems);
  if (items.length === 0) {
    toastFromApi(
      "Could not sync order: no matching products for sale were found.",
      "error",
    );
    return null;
  }

  return postDistributorOrder({ distributorId, items, deliveryDate });
}

/**
 * Persist a Create Manual Order draft via POST /orders so it survives refresh.
 */
export async function syncManualDistributorOrder(
  draft: ManualOrderDraft,
  distributors: Distributor[],
  products: ProductForSale[],
  catalogItems: Item[] = [],
): Promise<ApiOrder | null> {
  if (!isApiConfigured()) return null;

  const distributor = findDistributor(draft.distributor, distributors);
  const distributorId = distributorRecordId(distributor);
  if (!distributorId) {
    toastFromApi(
      `Could not sync order: distributor "${draft.distributor}" has no API id.`,
      "error",
    );
    return null;
  }

  const items = toOrderItemPayloads(draft.items, products, catalogItems);
  if (items.length === 0) {
    toastFromApi(
      "Could not sync order: add matching products for sale for these items first.",
      "error",
    );
    return null;
  }

  return postDistributorOrder({
    distributorId,
    items,
    deliveryDate: draft.deliveryDateIso,
  });
}

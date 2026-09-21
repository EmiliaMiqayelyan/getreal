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
import { toastFromApi } from "@/lib/toastBridge";
import { apiId, findByEntityRef } from "@/utils/entityIds";

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
  lines: Array<{ sku?: string; itemName: string; quantity: number }>,
  products: ProductForSale[],
  catalogItems: Item[] = [],
): CreateOrderItemPayload[] {
  const payloads: CreateOrderItemPayload[] = [];
  for (const line of lines) {
    const product = findProductForLine(line, products, catalogItems);
    if (!product) continue;
    payloads.push({
      productId: apiId(product),
      quantity: Math.max(1, line.quantity),
      frequency: "one_time",
    });
  }
  return payloads;
}

function postDistributorOrder(input: {
  distributor: Distributor;
  items: CreateOrderItemPayload[];
  deliveryDate?: string;
}) {
  void ordersApi
    .create({
      type: "distributor",
      distributorId: apiId(input.distributor),
      communicationChannel: "quickbooks",
      deliveryDate: input.deliveryDate,
      items: input.items,
    })
    .catch((error) => {
      toastFromApi(
        formatApiError(error, "Failed to sync distributor order."),
        "error",
      );
    });
}

/**
 * Push a distributor review group to POST /orders.
 * Uses product record UUIDs as `productId` (backend expects product UUIDs).
 */
export function syncReviewGroupOrder(
  group: ReviewGroup,
  distributors: Distributor[],
  products: ProductForSale[],
  catalogItems: Item[] = [],
): void {
  if (!isApiConfigured()) return;

  const distributor = findDistributor(group.distributor, distributors);
  if (!distributor) {
    toastFromApi(
      `Could not sync order: distributor "${group.distributor}" has no API id.`,
      "error",
    );
    return;
  }

  const items = toOrderItemPayloads(group.items, products, catalogItems);
  if (items.length === 0) {
    toastFromApi(
      "Could not sync order: no matching products for sale were found.",
      "error",
    );
    return;
  }

  postDistributorOrder({ distributor, items });
}

/**
 * Persist a Create Manual Order draft via POST /orders so it survives refresh.
 */
export function syncManualDistributorOrder(
  draft: ManualOrderDraft,
  distributors: Distributor[],
  products: ProductForSale[],
  catalogItems: Item[] = [],
): void {
  if (!isApiConfigured()) return;

  const distributor = findDistributor(draft.distributor, distributors);
  if (!distributor) {
    toastFromApi(
      `Could not sync order: distributor "${draft.distributor}" has no API id.`,
      "error",
    );
    return;
  }

  const items = toOrderItemPayloads(draft.items, products, catalogItems);
  if (items.length === 0) {
    toastFromApi(
      "Could not sync order: add matching products for sale for these items first.",
      "error",
    );
    return;
  }

  postDistributorOrder({
    distributor,
    items,
    deliveryDate: draft.deliveryDateIso,
  });
}

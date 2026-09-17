import type { Distributor } from "@/types/distributor";
import type { ProductForSale } from "@/types/productForSale";
import type { ReviewGroup } from "@/types/distributorOrder";

import { isApiConfigured } from "./client";
import { formatApiError } from "./errors";
import { ordersApi } from "./orders";
import { toastFromApi } from "@/lib/toastBridge";

/**
 * Push a distributor review group to POST /orders.
 * Uses Products for Sale IDs as `productId` (backend expects product UUIDs).
 */
export function syncReviewGroupOrder(
  group: ReviewGroup,
  distributors: Distributor[],
  products: ProductForSale[],
): void {
  if (!isApiConfigured()) return;

  const distributor = distributors.find(
    (entry) =>
      entry.name === group.distributor || entry.id === group.distributor,
  );
  if (!distributor?.id) {
    toastFromApi(
      `Could not sync order: distributor "${group.distributor}" has no API id.`,
      "error",
    );
    return;
  }

  const items = group.items
    .map((line) => {
      const product =
        products.find(
          (entry) =>
            entry.merchandisingName === line.itemName ||
            entry.id === line.itemName,
        ) ?? null;
      if (!product?.id) return null;
      return {
        productId: product.id,
        quantity: Math.max(1, line.quantity),
        frequency: "one_time" as const,
      };
    })
    .filter(
      (
        entry,
      ): entry is {
        productId: string;
        quantity: number;
        frequency: "one_time";
      } => Boolean(entry),
    );

  if (items.length === 0) {
    toastFromApi(
      "Could not sync order: no matching products for sale were found.",
      "error",
    );
    return;
  }

  void ordersApi
    .create({
      type: "distributor",
      distributorId: distributor.id,
      communicationChannel: "quickbooks",
      items,
    })
    .catch((error) => {
      toastFromApi(formatApiError(error, "Failed to sync distributor order."), "error");
    });
}

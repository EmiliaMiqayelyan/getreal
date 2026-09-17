import type { Distributor } from "@/types/distributor";
import type { ProductForSale } from "@/types/productForSale";
import type { ReviewGroup } from "@/types/distributorOrder";

import { isApiConfigured } from "./client";
import { ordersApi } from "./orders";

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
    (entry) => entry.name === group.distributor || entry.id === group.distributor,
  );
  if (!distributor?.id) return;

  const items = group.items
    .map((line) => {
      const product =
        products.find(
          (entry) =>
            entry.merchandisingName === line.itemName ||
            entry.id === line.itemName,
        ) ?? products[0];
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

  if (items.length === 0) return;

  void ordersApi
    .create({
      type: "distributor",
      distributorId: distributor.id,
      communicationChannel: "quickbooks",
      items,
    })
    .catch(() => {
      // UI keeps local order state if API fails.
    });
}

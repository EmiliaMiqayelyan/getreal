import type { Distributor } from "@/types/distributor";
import type { Item } from "@/types/item";
import type { ReviewGroup } from "@/types/distributorOrder";

import { isApiConfigured } from "./client";
import { ordersApi } from "./orders";

export function syncReviewGroupOrder(
  group: ReviewGroup,
  distributors: Distributor[],
  catalogItems: Item[],
): void {
  if (!isApiConfigured()) return;

  const distributor = distributors.find(
    (entry) => entry.name === group.distributor,
  );
  if (!distributor?.id) return;

  const items = group.items
    .map((line) => {
      const productId =
        catalogItems.find((item) => item.name === line.itemName)?.id ??
        catalogItems[0]?.id;
      if (!productId) return null;
      return {
        productId,
        quantity: Math.max(1, line.quantity),
      };
    })
    .filter((entry): entry is { productId: string; quantity: number } =>
      Boolean(entry),
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

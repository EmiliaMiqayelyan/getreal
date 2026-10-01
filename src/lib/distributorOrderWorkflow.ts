import type { Distributor } from "@/types/distributor";
import type { Item } from "@/types/item";
import type { ProductForSale } from "@/types/productForSale";
import type { Source } from "@/types/source";
import type {
  PreviewRow,
  ReviewGroup,
  ReviewLine,
  WorkingOrderRow,
} from "@/types/distributorOrder";
import {
  formatExpectedDelivery,
  toDeliveryDateId,
  upcomingWednesday,
} from "@/utils/deliveryCalendar";

/**
 * Frontend stand-in for the Distributor Order Workflow.
 *
 * INTEGRATION: Delete `sampleDemandOrder` and stop calling
 * `buildLocalDemandOrders` once customer orders and inventory are wired.
 * Replace the local list with:
 *
 * 1. GET /orders?type=customer for orders that still need a distributor
 *    purchase. One customer order (ORD001) is one Order List row. Sum line
 *    quantities into `custOrderTotal`.
 * 2. On-hand stock for each product → `inStock`. QTY NEEDED is
 *    max(0, custOrderTotal - inStock). See `calculateNeededQuantity`.
 * 3. Distributor, source, and unit cost come from the item / product-for-sale
 *    record (`buyingPrice` until the API returns a distributor unit cost).
 * 4. Order Now for one source: POST /orders
 *    { type: "distributor", distributorId, deliveryDate, items: [{ productId, quantity }] }.
 *    Keep the parent customer order in the Order List (`phase: "partial"`)
 *    and remember which distributors were sent so Review Order can reopen.
 * 5. Order All: POST only the distributors not already sent, then mark the
 *    parent batch ordered so it leaves the Order List and its source orders
 *    show under In Progress.
 * 6. Cancel Order leaves the screen only. It does not cancel the customer
 *    order and does not void source orders already sent. Confirm that last
 *    rule with product before deleting sent distributor orders on cancel.
 * 7. Delivered tab: GET /orders?type=distributor&status=delivered.
 *    This module does not load it.
 * 8. Manual orders use the same POST, with a deliveryDate that is in the
 *    future and on that distributor's delivery schedule. See `manualOrder.ts`.
 */

export type DemandPhase = "open" | "partial";

export type DemandOrder = {
  id: string;
  deliveryDateId: string;
  deliveryLabel: string;
  phase: DemandPhase;
  lines: WorkingOrderRow[];
  sentDistributors: string[];
  /** Snapshot of each source order at the moment Order Now was clicked. */
  sentGroups: ReviewGroup[];
};

/** Offline order so the workflow can be used before customer orders exist. */
function sampleDemandOrder(deliveryDate = upcomingWednesday()): DemandOrder {
  const deliveryDateId = toDeliveryDateId(deliveryDate);
  const deliveryLabel = formatExpectedDelivery(deliveryDate);
  const lines: WorkingOrderRow[] = [
    {
      id: "sample-lemons",
      sku: "LEM-001",
      itemName: "Lemons",
      category: "Fruits",
      custOrderTotal: 9,
      inStock: 3,
      qtyReceiving: 0,
      dateReceivingBy: deliveryLabel,
      suggestedQty: 6,
      quantity: 0,
      options: [
        {
          distributor: "Green Valley",
          source: "Hudson Farm",
          price: 1.5,
          unit: "Each",
          qtyPerUnit: 1,
        },
      ],
    },
    {
      id: "sample-rice",
      sku: "RCE-001",
      itemName: "Rice",
      category: "Grains",
      custOrderTotal: 4,
      inStock: 6,
      qtyReceiving: 0,
      dateReceivingBy: deliveryLabel,
      suggestedQty: 0,
      quantity: 0,
      options: [
        {
          distributor: "Metro Foods",
          source: "Valley Mill",
          price: 3,
          unit: "lb",
          qtyPerUnit: 1,
        },
      ],
    },
    {
      id: "sample-chicken",
      sku: "CHK-001",
      itemName: "Chicken",
      category: "Meat",
      custOrderTotal: 5,
      inStock: 1,
      qtyReceiving: 0,
      dateReceivingBy: deliveryLabel,
      suggestedQty: 4,
      quantity: 0,
      options: [
        {
          distributor: "Metro Foods",
          source: "North Ranch",
          price: 8,
          unit: "lb",
          qtyPerUnit: 1,
        },
      ],
    },
  ];

  return {
    id: "ORD001",
    deliveryDateId,
    deliveryLabel,
    phase: "open",
    lines,
    sentDistributors: [],
    sentGroups: [],
  };
}

/**
 * Order List until customer orders are connected.
 *
 * INTEGRATION: Replace this sample with one DemandOrder per open customer
 * order from GET /orders?type=customer. Attach distributor, source, unit
 * cost, and productId from the item and product-for-sale records. Set
 * inStock from inventory on-hand. Suggested qty is max(0, demand - stock).
 */
export function buildLocalDemandOrders(input: {
  items: Item[];
  products: ProductForSale[];
  sources: Source[];
  distributors: Distributor[];
}): DemandOrder[] {
  void input;
  return [sampleDemandOrder()];
}

export function demandOrdersForDate(orders: DemandOrder[], dateId: string) {
  return orders.filter((order) => order.deliveryDateId === dateId);
}

export function countDemandForDate(orders: DemandOrder[], dateId: string) {
  return demandOrdersForDate(orders, dateId).length;
}

export function previewRowsForOrder(order: DemandOrder): PreviewRow[] {
  return order.lines.map((line) => ({
    id: line.id,
    itemName: line.itemName,
    custOrderTotal: line.custOrderTotal,
    inStock: line.inStock,
    qtyReceiving: line.suggestedQty,
    dateReceivingBy: line.dateReceivingBy,
  }));
}

/** Stable id for one source order inside a customer batch. */
export function reviewGroupKey(group: { distributor: string; source: string }) {
  return `${group.distributor}::${group.source}`;
}

export function buildReviewGroups(
  rows: WorkingOrderRow[],
  emailForDistributor: (name: string) => string,
): ReviewGroup[] {
  const map = new Map<string, ReviewGroup>();

  for (const row of rows) {
    if (row.quantity <= 0) continue;
    const option = row.options[0];
    if (!option) continue;

    const lineTotal = option.price * row.quantity;
    const line: ReviewLine = {
      itemName: row.itemName,
      source: option.source,
      quantity: row.quantity,
      price: option.price,
      unit: option.unit,
      lineTotal,
      sku: row.sku,
      productId: row.productId,
    };

    const key = reviewGroupKey(option);
    const existing = map.get(key);
    if (!existing) {
      map.set(key, {
        distributor: option.distributor,
        source: option.source,
        email: emailForDistributor(option.distributor),
        items: [line],
        itemCount: 1,
        totalPrice: lineTotal,
      });
      continue;
    }

    existing.items.push(line);
    existing.totalPrice += lineTotal;
  }

  return Array.from(map.values()).map((group) => ({
    ...group,
    itemCount: group.items.length,
  }));
}

export function categorySections(rows: WorkingOrderRow[]) {
  const order: string[] = [];
  const groups = new Map<string, WorkingOrderRow[]>();
  for (const row of rows) {
    const category = row.category.trim() || "Other";
    if (!groups.has(category)) {
      groups.set(category, []);
      order.push(category);
    }
    groups.get(category)!.push(row);
  }
  return order.map((category) => ({
    category,
    rows: groups.get(category) ?? [],
  }));
}

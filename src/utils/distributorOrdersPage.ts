import {
  ORDER_DEMAND_BY_DATE,
  ORDER_ITEM_CATEGORIES,
  ORDER_LIST_ITEMS,
} from "@/constants/distributorOrders";
import type {
  DeliveredOrder,
  ManualOrderDraft,
  OrderListItem,
  PlacedOrder,
  PreviewRow,
  ReviewGroup,
  WorkingOrderRow,
} from "@/types/distributorOrder";

export type OrderDemandFilterCriteria = {
  query: string;
  productFilter: string;
};

export function nextDeliveryId(existing: PlacedOrder[]) {
  const numbers = existing
    .map((order) => Number(order.deliveryId))
    .filter((value) => Number.isFinite(value));
  const max = numbers.length ? Math.max(...numbers) : 802;
  return String(max + 1).padStart(4, "0");
}

export function formatOrderTimestamp(date = new Date()) {
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function createPlacedOrderFromReviewGroup(
  group: ReviewGroup,
  deliveryId: string,
  deliveryDate: string,
): PlacedOrder {
  return {
    id: `placed-${group.distributor}-${Date.now()}`,
    deliveryId,
    distributor: group.distributor,
    orderDate: formatOrderTimestamp(),
    deliveryDate,
    totalPrice: group.totalPrice,
    items: group.items.map((item, index) => ({
      sku: `OPE-${18048 + index}`,
      itemName: item.itemName,
      source: item.source,
      quantity: item.quantity,
      price: item.price,
      unit: item.unit,
    })),
  };
}

export function createPlacedOrderFromManualDraft(
  draft: ManualOrderDraft,
  deliveryId: string,
): PlacedOrder {
  return {
    id: `manual-${Date.now()}`,
    deliveryId,
    distributor: draft.distributor,
    orderDate: formatOrderTimestamp(),
    deliveryDate: draft.deliveryDate,
    totalPrice: draft.totalPrice,
    items: draft.items.map((item) => ({ ...item })),
  };
}

export function appendInProgressOrders(
  previous: PlacedOrder[],
  created: PlacedOrder[],
  seed?: PlacedOrder,
) {
  const createdIds = new Set(created.map((order) => order.id));
  const base =
    previous.length === 0 && seed && !createdIds.has(seed.id)
      ? [seed]
      : previous.filter((order) => !createdIds.has(order.id));

  return [...created, ...base];
}

function moneyLabel(value: number) {
  if (Number.isInteger(value)) return `$${value}`;
  return `$${value.toFixed(2)}`;
}

/** Builds a downloadable invoice text file from the latest saved order state. */
export function downloadOrderInvoice(order: PlacedOrder) {
  const lines = [
    `Invoice — Delivery ${order.deliveryId}`,
    `Distributor: ${order.distributor}`,
    `Order Date: ${order.orderDate}`,
    `Delivery Date: ${order.deliveryDate}`,
    "",
    "Items",
    "----",
    ...order.items.map(
      (item) =>
        `${item.sku} | ${item.itemName} | ${item.source} | Qty ${item.quantity} | ${moneyLabel(item.price)}/${item.unit} | ${moneyLabel(item.price * item.quantity)}`,
    ),
    "",
    `Total: ${moneyLabel(order.totalPrice)}`,
  ];

  const blob = new Blob([lines.join("\n")], {
    type: "text/plain;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `invoice-${order.deliveryId}.txt`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function getOrderDemandForDate(dateId: string): PreviewRow[] {
  return ORDER_DEMAND_BY_DATE[dateId] ?? [];
}

/** Products needing a distributor order for a delivery date (sidebar chips). */
export function getOrderDemandCountForDate(dateId: string): number {
  return getOrderDemandForDate(dateId).length;
}

/** Total products awaiting distributor orders across all delivery dates. */
export function getTotalOrderDemandCount(): number {
  return Object.values(ORDER_DEMAND_BY_DATE).reduce(
    (sum, rows) => sum + rows.length,
    0,
  );
}

export function filterOrderDemandRows(
  rows: PreviewRow[],
  criteria: OrderDemandFilterCriteria,
): PreviewRow[] {
  const query = criteria.query.trim().toLowerCase();

  return rows.filter((row) => {
    if (criteria.productFilter) {
      const category = ORDER_ITEM_CATEGORIES[row.id];
      if (category !== criteria.productFilter) return false;
    }

    if (query && !row.itemName.toLowerCase().includes(query)) {
      return false;
    }

    return true;
  });
}

export function calculateNeededQuantity(row: OrderListItem): number {
  const option = row.options[0];
  if (!option || option.qtyPerUnit <= 0) return 0;

  const availableStock = row.inStock ?? 0;
  const netDemand = row.custOrderTotal - availableStock;
  if (netDemand <= 0) return 0;

  return Math.ceil(netDemand / option.qtyPerUnit);
}

export function applyCalculatedQuantitiesForCategory(
  rows: WorkingOrderRow[],
  category: OrderListItem["category"],
): WorkingOrderRow[] {
  return rows.map((row) =>
    row.category === category
      ? { ...row, quantity: calculateNeededQuantity(row) }
      : row,
  );
}

export function makeWorkingRowsForDate(dateId: string): WorkingOrderRow[] {
  const previewIds = new Set(
    getOrderDemandForDate(dateId).map((row) => row.id),
  );

  return ORDER_LIST_ITEMS.filter((row) => previewIds.has(row.id)).map(
    (row) => ({
      ...row,
      quantity: calculateNeededQuantity(row),
    }),
  );
}

export function productFilterOptions(items: OrderListItem[]) {
  const categories = Array.from(
    new Set(items.map((item) => item.category)),
  ).sort();

  return categories.map((category) => ({
    value: category,
    label: category,
  }));
}

export function getOrderDemandEmptyMessage(
  criteria: OrderDemandFilterCriteria,
) {
  if (criteria.query.trim() || criteria.productFilter) {
    return "No order demand matches your search or filters.";
  }
  return "No product demand for this delivery date.";
}

export type DeliveredFilterCriteria = {
  query: string;
  zipCode: string;
  deliveryDate: string;
  status: string;
  sortBy: "newest" | "oldest" | "distributor" | "total";
};

export type DeliveredGroup = {
  week: string;
  days: {
    day: string;
    orders: DeliveredOrder[];
  }[];
};

export function uniqueDeliveredFieldValues(
  orders: DeliveredOrder[],
  field: "zipCode" | "day" | "status",
) {
  return Array.from(new Set(orders.map((order) => order[field]))).sort();
}

export function filterDeliveredOrders(
  orders: DeliveredOrder[],
  criteria: DeliveredFilterCriteria,
) {
  const query = criteria.query.trim().toLowerCase();

  return orders.filter((order) => {
    if (criteria.zipCode && order.zipCode !== criteria.zipCode) return false;
    if (criteria.deliveryDate && order.day !== criteria.deliveryDate) {
      return false;
    }
    if (criteria.status && order.status !== criteria.status) return false;

    if (!query) return true;

    return (
      order.distributor.toLowerCase().includes(query) ||
      order.deliveryId.includes(query) ||
      order.zipCode.includes(query) ||
      order.items.some((item) => item.itemName.toLowerCase().includes(query))
    );
  });
}

export function sortDeliveredOrders(
  orders: DeliveredOrder[],
  sortBy: DeliveredFilterCriteria["sortBy"],
) {
  const sorted = [...orders];

  sorted.sort((left, right) => {
    switch (sortBy) {
      case "oldest":
        return left.sortTimestamp - right.sortTimestamp;
      case "distributor":
        return left.distributor.localeCompare(right.distributor);
      case "total":
        return right.totalPrice - left.totalPrice;
      case "newest":
      default:
        return right.sortTimestamp - left.sortTimestamp;
    }
  });

  return sorted;
}

export function groupDeliveredOrders(orders: DeliveredOrder[]): DeliveredGroup[] {
  const weeks = new Map<string, Map<string, DeliveredOrder[]>>();

  for (const order of orders) {
    if (!weeks.has(order.week)) weeks.set(order.week, new Map());
    const days = weeks.get(order.week)!;
    if (!days.has(order.day)) days.set(order.day, []);
    days.get(order.day)!.push(order);
  }

  return Array.from(weeks.entries())
    .sort(([left], [right]) => right.localeCompare(left))
    .map(([week, days]) => ({
      week,
      days: Array.from(days.entries())
        .sort(([left], [right]) => right.localeCompare(left))
        .map(([day, dayOrders]) => ({
          day,
          orders: dayOrders,
        })),
    }));
}

export function getDeliveredEmptyMessage(criteria: DeliveredFilterCriteria) {
  if (
    criteria.query.trim() ||
    criteria.zipCode ||
    criteria.deliveryDate ||
    criteria.status
  ) {
    return "No delivered orders match your search or filters.";
  }
  return "No delivered orders yet.";
}

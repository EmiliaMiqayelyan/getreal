import {
  ORDER_DEMAND_BY_DATE,
  ORDER_ITEM_CATEGORIES,
  ORDER_LIST_ITEMS,
} from "@/constants/distributorOrders";
import type { ApiInventory } from "@/lib/api/types";
import type {
  DeliveredOrder,
  ManualOrderDraft,
  OrderListItem,
  PlacedOrder,
  PreviewRow,
  ReviewGroup,
  WorkingOrderRow,
} from "@/types/distributorOrder";
import { downloadCsvFile, exportFilename } from "@/utils/csvExport";
import { deliveryDateIdFromValue } from "@/utils/deliveryCalendar";

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
  deliveryDateId = "",
): PlacedOrder {
  return {
    id: `placed-${group.distributor}-${group.source}-${Date.now()}`,
    deliveryId,
    distributor: group.distributor,
    orderDate: formatOrderTimestamp(),
    deliveryDate,
    deliveryDateId,
    totalPrice: group.totalPrice,
    items: group.items.map((item, index) => ({
      sku: item.sku || `OPE-${18048 + index}`,
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
    deliveryDateId:
      deliveryDateIdFromValue(draft.deliveryDateIso) ||
      deliveryDateIdFromValue(draft.deliveryDate),
    totalPrice: draft.totalPrice,
    items: draft.items.map((item) => ({ ...item })),
  };
}

export function appendInProgressOrders(
  previous: PlacedOrder[],
  created: PlacedOrder[],
) {
  const createdIds = new Set(created.map((order) => order.id));
  const base = previous.filter((order) => !createdIds.has(order.id));
  return [...created, ...base];
}

function moneyLabel(value: number) {
  if (Number.isInteger(value)) return `$${value}`;
  return `$${value.toFixed(2)}`;
}

function invoiceText(order: PlacedOrder) {
  return [
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
  ].join("\n");
}

/**
 * Opens the order invoice in a new tab.
 *
 * INTEGRATION: The button label is "Download order" and the spec text calls
 * the file an invoice. Confirm with product whether this opens, downloads, or
 * both, and whether the server returns a PDF invoice or a purchase order.
 * Replace this local text file with that document URL. Do not invent a PDF here.
 */
export function openOrderInvoice(order: PlacedOrder) {
  const blob = new Blob([invoiceText(order)], {
    type: "text/plain;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const opened = window.open(url, "_blank", "noopener,noreferrer");
  if (!opened) {
    const link = document.createElement("a");
    link.href = url;
    link.download = `invoice-${order.deliveryId}.txt`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/** @deprecated Use openOrderInvoice. Kept so older call sites keep working. */
export function downloadOrderInvoice(order: PlacedOrder) {
  openOrderInvoice(order);
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
      const matchesCategory = category === criteria.productFilter;
      const matchesName = row.itemName === criteria.productFilter;
      if (!matchesCategory && !matchesName) return false;
    }

    if (query && !row.itemName.toLowerCase().includes(query)) {
      return false;
    }

    return true;
  });
}

/**
 * QTY NEEDED = customer demand minus on-hand stock.
 * Stock that covers demand yields 0. The admin may still type a higher number.
 * Plain difference: 9 ordered and 3 in stock means order 6.
 */
export function calculateNeededQuantity(
  row: Pick<OrderListItem, "custOrderTotal" | "inStock">,
): number {
  const availableStock = row.inStock ?? 0;
  const netDemand = row.custOrderTotal - availableStock;
  return Math.max(0, netDemand);
}

const NOT_ON_HAND = new Set(["wasted", "shipped"]);

function stockText(value: string | null | undefined) {
  const text = value?.trim().toLowerCase() ?? "";
  return text;
}

/** Sum of inventory still on hand for this order line. Null when nothing matches. */
export function onHandForOrderLine(
  records: ApiInventory[],
  line: Pick<OrderListItem, "catalogItemId" | "sku" | "itemName">,
): number | null {
  const itemId = line.catalogItemId?.trim() ?? "";
  const code = line.sku?.trim().toLowerCase() ?? "";
  const name = line.itemName.trim().toLowerCase();

  function available(record: ApiInventory) {
    if (NOT_ON_HAND.has(stockText(record.status))) return 0;
    const quantity = record.quantity ?? 0;
    return Number.isFinite(quantity) && quantity > 0 ? quantity : 0;
  }

  function sumWhere(match: (record: ApiInventory) => boolean) {
    let total = 0;
    let found = false;
    for (const record of records) {
      if (!match(record)) continue;
      found = true;
      total += available(record);
    }
    return found ? total : null;
  }

  if (itemId) {
    const byId = sumWhere((record) => record.itemId?.trim() === itemId);
    if (byId != null) return byId;
  }

  if (code) {
    const byCode = sumWhere((record) => {
      const recordCode = record.itemCode?.trim().toLowerCase() ?? "";
      const recordId = record.itemId?.trim().toLowerCase() ?? "";
      return recordCode === code || recordId === code;
    });
    if (byCode != null) return byCode;
  }

  if (!name) return null;
  return sumWhere(
    (record) => (record.itemName?.trim().toLowerCase() ?? "") === name,
  );
}

function sameOrderCategory(rowCategory: string, category: string) {
  return (rowCategory.trim() || "Other") === (category.trim() || "Other");
}

/**
 * Fill QTY Needed for one category: customer order total minus on-hand stock.
 * `onHand` returns inventory for that line, or null when inventory has no match
 * and the row's existing stock figure should be kept.
 */
export function applyCalculatedQuantitiesForCategory(
  rows: WorkingOrderRow[],
  category: string,
  onHand?: (row: WorkingOrderRow) => number | null,
): WorkingOrderRow[] {
  return rows.map((row) => {
    if (!sameOrderCategory(row.category, category)) return row;
    const counted = onHand?.(row);
    const inStock = counted == null ? row.inStock : counted;
    const next = { ...row, inStock };
    const quantity = calculateNeededQuantity(next);
    return { ...next, quantity, suggestedQty: quantity };
  });
}

export function makeWorkingRowsForDate(dateId: string): WorkingOrderRow[] {
  const previewIds = new Set(
    getOrderDemandForDate(dateId).map((row) => row.id),
  );

  return ORDER_LIST_ITEMS.filter((row) => previewIds.has(row.id)).map(
    (row) => ({
      ...row,
      quantity: 0,
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

export function groupDeliveredOrders(
  orders: DeliveredOrder[],
): DeliveredGroup[] {
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

/** Matches the price text in the distributor order tables. */
function tableMoney(value: number) {
  if (!Number.isFinite(value)) return "—";
  if (Number.isInteger(value)) return `$${value}`;
  return `$${value.toFixed(2).replace(/0$/, "").replace(/\.$/, "")}`;
}

const IN_PROGRESS_HEADERS = [
  "Delivery ID",
  "Distributor",
  "Order Date",
  "Delivery Date",
  "Total Price",
] as const;

const ORDER_LIST_HEADERS = [
  "Item Name",
  "Cust. Order Total",
  "In Stock",
  "Quantity Receiving",
  "Date Receiving By",
] as const;

const DELIVERED_HEADERS = [
  "Week",
  "Day",
  "Delivery ID",
  "Distributor",
  "Order Date",
  "Delivery Date",
  "Total Price",
] as const;

/** CSV of the In Progress and Order List tables on the Orders tab. */
export function downloadDistributorOrdersCsv(
  inProgress: PlacedOrder[],
  orderList: PreviewRow[],
  filename = exportFilename("distributor-orders"),
) {
  const rows: string[][] = [
    ["In Progress"],
    [...IN_PROGRESS_HEADERS],
    ...inProgress.map((order) => [
      order.deliveryId,
      order.distributor,
      order.orderDate || "—",
      order.deliveryDate || "—",
      tableMoney(order.totalPrice),
    ]),
    [],
    ["Order List"],
    [...ORDER_LIST_HEADERS],
    ...orderList.map((row) => [
      row.itemName,
      String(row.custOrderTotal),
      row.inStock == null ? "—" : String(row.inStock),
      String(row.qtyReceiving),
      row.dateReceivingBy || "—",
    ]),
  ];
  downloadCsvFile(filename, rows);
}

/** CSV of the Delivered tab, including the week and day headings. */
export function downloadDeliveredOrdersCsv(
  groups: DeliveredGroup[],
  filename = exportFilename("delivered-orders"),
) {
  const rows: string[][] = [[...DELIVERED_HEADERS]];
  for (const group of groups) {
    for (const day of group.days) {
      for (const order of day.orders) {
        rows.push([
          group.week,
          day.day,
          order.deliveryId,
          order.distributor,
          order.orderDate || "—",
          order.deliveryDate || "—",
          tableMoney(order.totalPrice),
        ]);
      }
    }
  }
  downloadCsvFile(filename, rows);
}

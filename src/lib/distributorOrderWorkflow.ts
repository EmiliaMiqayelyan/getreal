import type { Item } from "@/types/item";
import type { ProductForSale } from "@/types/productForSale";
import type {
  PreviewRow,
  ReviewGroup,
  ReviewLine,
  WorkingOrderRow,
} from "@/types/distributorOrder";
import type { AggregateDemand } from "@/lib/api/orders";
import { centsToDollars } from "@/lib/api/mappers";
import { recordRef } from "@/utils/entityIds";
import {
  deliveryDateIdFromValue,
  formatExpectedDelivery,
  isWednesdayDateId,
  parseDeliveryDateId,
  startOfLocalDay,
  toDeliveryDateId,
  upcomingWednesday,
} from "@/utils/deliveryCalendar";

const MONTH_INDEX: Record<string, number> = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dec: 11,
};

/**
 * Order List demand comes from GET /orders/distributor/aggregate-demand.
 * Placed orders come from GET /orders?type=distributor.
 * Order Now / Order All / Create Order call POST /orders.
 */

export type DemandPhase = "open" | "partial";

export type DemandOrder = {
  id: string;
  deliveryDateId: string;
  /**
   * Every delivery label from aggregate-demand. The payload does not split
   * items by date, so the same lines are shown for each of these dates.
   */
  appliesToDateIds: string[];
  deliveryLabel: string;
  phase: DemandPhase;
  lines: WorkingOrderRow[];
  sentDistributors: string[];
  /** Snapshot of each source order at the moment Order Now was clicked. */
  sentGroups: ReviewGroup[];
};

function readNumber(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function readOptionalNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

/** "Wed, Jul 14" or "2026-07-14" → `YYYY-MM-DD`. Year is inferred when omitted. */
export function parseAggregateDateLabel(label: string, today = new Date()) {
  const trimmed = label.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    const [year, month, day] = trimmed.slice(0, 10).split("-").map(Number);
    if (!year || !month || !day) return "";
    return toDeliveryDateId(new Date(year, month - 1, day));
  }

  const match = trimmed.match(
    /(?:[A-Za-z]{3},?\s+)?([A-Za-z]{3})\s+(\d{1,2})(?:,?\s+(\d{4}))?$/,
  );
  if (!match) return "";
  const month = MONTH_INDEX[match[1].toLowerCase()];
  const day = Number(match[2]);
  const explicitYear = match[3] ? Number(match[3]) : undefined;
  if (month == null || !day) return "";

  if (explicitYear) {
    return toDeliveryDateId(new Date(explicitYear, month, day));
  }

  const start = startOfLocalDay(today).getTime();
  const thisYear = new Date(today.getFullYear(), month, day);
  if (thisYear.getTime() >= start - 30 * 24 * 60 * 60 * 1000) {
    return toDeliveryDateId(thisYear);
  }
  return toDeliveryDateId(new Date(today.getFullYear() + 1, month, day));
}

function calendarDayId(value: string) {
  const match = value.trim().match(/^(\d{4}-\d{2}-\d{2})/);
  if (match) return match[1];
  return deliveryDateIdFromValue(value);
}

function dateIdFromAggregateEntry(
  entry: string | { deliveryDate?: string } | null | undefined,
  today: Date,
) {
  if (!entry) return "";
  if (typeof entry === "string") {
    return calendarDayId(entry) || parseAggregateDateLabel(entry, today);
  }
  const value = entry.deliveryDate?.trim() ?? "";
  if (!value) return "";
  return calendarDayId(value) || parseAggregateDateLabel(value, today);
}

function uniqueWednesdayIds(ids: string[]) {
  return [...new Set(ids.filter((id) => id && isWednesdayDateId(id)))];
}

function resolveOrderProductId(
  itemId: string,
  itemCode: string,
  products: ProductForSale[],
) {
  const refs = [itemId, itemCode].filter(Boolean);
  const product = products.find((entry) =>
    refs.some(
      (ref) =>
        entry.itemId === ref || entry.id === ref || entry.recordId === ref,
    ),
  );
  return product ? recordRef(product) : undefined;
}

function resolveUnit(
  itemId: string,
  itemCode: string,
  items: Item[],
  apiUnit?: string,
) {
  if (apiUnit?.trim()) return apiUnit.trim();
  const match = items.find(
    (item) =>
      item.recordId === itemId ||
      item.id === itemId ||
      item.id === itemCode ||
      item.recordId === itemCode,
  );
  return match?.singleItemUnit?.trim() || "";
}

function formatReceivingBy(value: string | null | undefined, fallback: string) {
  const raw = value?.trim() ?? "";
  if (!raw) return fallback;
  const dayId = calendarDayId(raw);
  const date = dayId ? parseDeliveryDateId(dayId) : null;
  if (!date) return fallback;
  return formatExpectedDelivery(date);
}

/**
 * One Order List batch per item `dateReceivingBy`.
 * `dates` on the payload is a separate chip list and is not used to place lines.
 */
export function mapAggregateDemand(input: {
  demand: AggregateDemand;
  products: ProductForSale[];
  items: Item[];
  today?: Date;
}): { orders: DemandOrder[]; dateIds: string[] } {
  const today = input.today ?? new Date();
  const announcedDateIds = uniqueWednesdayIds(
    (input.demand.dates ?? []).map((entry) =>
      dateIdFromAggregateEntry(entry, today),
    ),
  );
  const buckets = new Map<string, WorkingOrderRow[]>();

  for (const distributor of input.demand.distributors ?? []) {
    const distributorName = distributor.name?.trim() || "Distributor";
    for (const source of distributor.sources ?? []) {
      const sourceName = source.name?.trim() || "Source";
      for (const category of source.categories ?? []) {
        const categoryName = category.name?.trim() || "Other";
        for (const item of category.items ?? []) {
          const itemId = item.itemId?.trim() || "";
          const itemCode = item.itemCode?.trim() || "";
          const itemName = item.itemName?.trim() || "Item";
          const custOrderTotal = readNumber(item.customerOrderTotal);
          const inStock = readOptionalNumber(item.inStock);
          const qtyNeeded = readOptionalNumber(item.qtyNeeded);
          const suggestedQty =
            qtyNeeded ?? Math.max(0, custOrderTotal - (inStock ?? 0));
          const lineDateId =
            calendarDayId(item.dateReceivingBy?.trim() || "") ||
            announcedDateIds[0] ||
            toDeliveryDateId(upcomingWednesday(today));
          const lineDate =
            parseDeliveryDateId(lineDateId) ?? upcomingWednesday(today);
          const row: WorkingOrderRow = {
            id: [
              distributor.id || distributorName,
              source.id || sourceName,
              itemId || itemCode || itemName,
            ].join("::"),
            sku: itemCode || itemId,
            itemName,
            category: item.categoryName?.trim() || categoryName,
            custOrderTotal,
            inStock,
            qtyReceiving: readNumber(item.quantityReceiving),
            dateReceivingBy: formatReceivingBy(
              item.dateReceivingBy,
              formatExpectedDelivery(lineDate),
            ),
            suggestedQty,
            quantity: 0,
            productId: resolveOrderProductId(itemId, itemCode, input.products),
            options: [
              {
                distributor: distributorName,
                distributorId:
                  item.distributorId?.trim() ||
                  distributor.id?.trim() ||
                  undefined,
                source: item.sourceName?.trim() || sourceName,
                price: centsToDollars(readNumber(item.buyingPrice)),
                unit: resolveUnit(
                  itemId,
                  itemCode,
                  input.items,
                  item.buyingUnit || item.unit,
                ),
                qtyPerUnit: Math.max(0, readNumber(item.qtyPerUnit)),
              },
            ],
          };
          const bucket = buckets.get(lineDateId) ?? [];
          bucket.push(row);
          buckets.set(lineDateId, bucket);
        }
      }
    }
  }

  const orders = [...buckets.entries()]
    .filter(([, lines]) => lines.length > 0)
    .map(([dateId, lines]) => {
      const date = parseDeliveryDateId(dateId) ?? upcomingWednesday(today);
      return {
        id: `aggregate-${dateId}`,
        deliveryDateId: dateId,
        appliesToDateIds: [dateId],
        deliveryLabel: formatExpectedDelivery(date),
        phase: "open" as const,
        lines,
        sentDistributors: [],
        sentGroups: [],
      };
    });

  return {
    orders,
    dateIds: uniqueWednesdayIds([
      ...announcedDateIds,
      ...orders.map((order) => order.deliveryDateId),
    ]),
  };
}

export function demandDateIds(order: DemandOrder) {
  return order.appliesToDateIds.length > 0
    ? order.appliesToDateIds
    : [order.deliveryDateId];
}

export function demandVisibleOnDate(order: DemandOrder, dateId: string) {
  return demandDateIds(order).includes(dateId);
}

export function demandOrdersForDate(orders: DemandOrder[], dateId: string) {
  return orders.filter((order) => demandVisibleOnDate(order, dateId));
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
    qtyReceiving: line.qtyReceiving,
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
        distributorId: option.distributorId,
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

import { centsToDollars, orderRecordId } from "@/lib/api/mappers";
import { ordersApi } from "@/lib/api/orders";
import type { ApiOrder, ApiOrderItem } from "@/lib/api/types";
import { isUuid } from "@/utils/entityIds";
import { formatPurchased } from "@/utils/inventoryView";
import { formatReceivedAt } from "@/utils/receivingHandoff";

export type PendingStorageLine = {
  id: string;
  orderId: string;
  deliveryId: string;
  catalogItemId: string;
  itemName: string;
  source: string;
  purchased: string;
  qty: number;
  unit: string;
  qtyAfterUnpack: string;
  expDate: string;
  expirationIso: string;
  location: string;
  splits: Array<{ qty: number; location: string }>;
};

export type PendingStorageSection = {
  id: string;
  group: string;
  title: string;
  items: PendingStorageLine[];
};

/** One green Order Received banner and its Stock Items page. */
export type PendingStorageOrder = {
  /** Distributor order UUID sent as distributorOrderId on POST /inventory/store. */
  id: string;
  /** Public code such as ORD-BCBC2800. Several orders can share a distributor and time. */
  orderCode: string;
  /** Backend order number, used when two rows share an order code. */
  orderNumber: string;
  supplier: string;
  itemsCount: string;
  receivedAt: string;
  sections: PendingStorageSection[];
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function textOf(value: unknown): string | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function readText(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const text = textOf(record[key]);
    if (text) return text;
  }
  return undefined;
}

function nestedName(value: unknown) {
  const record = asRecord(value);
  if (!record) return textOf(value);
  return textOf(record.name) ?? textOf(record.label);
}

function centsOf(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string" || !value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function formatExp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function expirationIso(value: string) {
  const text = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return `${text}T00:00:00.000Z`;
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString();
}

function distributorName(order: ApiOrder) {
  const raw = order as ApiOrder & Record<string, unknown>;
  return (
    readText(raw, ["distributorName"]) ??
    nestedName(raw.distributor) ??
    "Distributor"
  );
}

function receivedAt(order: ApiOrder) {
  const raw = order as ApiOrder & Record<string, unknown>;
  const stamp =
    order.receivedAt ||
    order.validatedAt ||
    readText(raw, ["deliveredAt"]) ||
    order.deliveryDate ||
    order.updatedAt ||
    order.createdAt ||
    "";
  const date = stamp ? new Date(stamp) : null;
  if (!date || Number.isNaN(date.getTime())) return stamp || "—";
  return formatReceivedAt(date);
}

function orderLines(order: ApiOrder): ApiOrderItem[] {
  const raw = order as ApiOrder & Record<string, unknown>;
  if (Array.isArray(order.items)) return order.items;
  if (Array.isArray(raw.lines)) return raw.lines as ApiOrderItem[];
  if (Array.isArray(raw.orderItems)) return raw.orderItems as ApiOrderItem[];
  return [];
}

function lineItemUuid(line: ApiOrderItem) {
  const raw = line as ApiOrderItem & Record<string, unknown>;
  const nested = asRecord(raw.item);
  const candidates = [
    textOf(raw.itemId),
    nested ? textOf(nested.id) : undefined,
    textOf(line.productId),
  ];
  return candidates.find((value) => value && isUuid(value)) ?? "";
}

function linePriceLabel(line: ApiOrderItem) {
  const raw = line as ApiOrderItem & Record<string, unknown>;
  const cents =
    centsOf(raw.buyingPrice) ?? centsOf(line.price) ?? centsOf(raw.unitPrice);
  if (cents == null) return "—";
  return formatPurchased(centsToDollars(cents));
}

/**
 * Delivered distributor orders with no inventory yet.
 * Detail is loaded when the list row has no lines, so Stock Items can be filled.
 */
export async function loadPendingStorageOrders(): Promise<
  PendingStorageOrder[]
> {
  const listed = await ordersApi.listPendingStorage();
  const detailed = await Promise.all(
    listed.map(async (order) => {
      if (orderLines(order).length > 0) return order;
      const id = orderRecordId(order);
      if (!id) return order;
      try {
        return await ordersApi.getById(id);
      } catch {
        return order;
      }
    }),
  );
  const seen = new Set<string>();
  return detailed
    .map(mapPendingStorageOrder)
    .filter((order): order is PendingStorageOrder => {
      if (!order || seen.has(order.id)) return false;
      seen.add(order.id);
      return true;
    });
}

/**
 * Session handoffs use the order code as their id, while pending-storage rows
 * use the order UUID. Drop a handoff once that order is already in the API list.
 */
export function withoutStoredHandoffs<
  T extends { id: string; orderCode?: string },
>(handoffs: T[], waiting: Array<{ id: string; orderCode?: string }>): T[] {
  const keys = new Set<string>();
  for (const order of waiting) {
    keys.add(order.id);
    if (order.orderCode) keys.add(order.orderCode);
  }
  return handoffs.filter((order) => {
    if (keys.has(order.id)) return false;
    if (order.orderCode && keys.has(order.orderCode)) return false;
    return true;
  });
}

export function mapPendingStorageOrder(
  order: ApiOrder,
): PendingStorageOrder | null {
  const id = orderRecordId(order);
  if (!id) return null;
  const raw = order as ApiOrder & Record<string, unknown>;
  const code = order.orderCode?.trim() || order.code?.trim() || id;
  const orderNumber = readText(raw, ["orderNumber"]) ?? "";
  const sections = new Map<string, PendingStorageSection>();

  orderLines(order).forEach((line, index) => {
    const raw = line as ApiOrderItem & Record<string, unknown>;
    const category =
      readText(raw, ["category", "categoryName"]) ??
      nestedName(raw.category) ??
      "Uncategorized";
    const title =
      readText(raw, ["subcategory", "subcategoryName"]) ??
      nestedName(raw.subcategory) ??
      category;
    const sectionId = `${category}::${title}`;
    const section = sections.get(sectionId) ?? {
      id: sectionId,
      group: category,
      title,
      items: [],
    };
    const itemId = lineItemUuid(line);
    const lineId = textOf(raw.id) || `${id}-${itemId || index}`;
    const expiration =
      readText(raw, ["expirationDate", "expiration", "expDate"]) ?? "";
    const quantity = Number(line.quantity);
    section.items.push({
      id: lineId,
      orderId: code,
      deliveryId: id,
      catalogItemId: itemId,
      itemName:
        line.itemName?.trim() ||
        line.name?.trim() ||
        readText(raw, ["merchandisingName"]) ||
        "Item",
      source: nestedName(raw.source) ?? readText(raw, ["sourceName"]) ?? "",
      purchased: linePriceLabel(line),
      qty: Number.isFinite(quantity) ? quantity : 0,
      unit: line.unit?.trim() || readText(raw, ["singleItemUnit"]) || "—",
      qtyAfterUnpack: "",
      expDate: expiration ? formatExp(expiration) : "—",
      expirationIso: expiration ? expirationIso(expiration) : "",
      location: "",
      splits: [],
    });
    sections.set(sectionId, section);
  });

  const count = [...sections.values()].reduce(
    (total, section) => total + section.items.length,
    0,
  );

  return {
    id,
    orderCode: code,
    orderNumber,
    supplier: distributorName(order),
    itemsCount: `${count} item${count === 1 ? "" : "s"}`,
    receivedAt: receivedAt(order),
    sections: [...sections.values()],
  };
}

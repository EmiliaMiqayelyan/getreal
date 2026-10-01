import { isUuid } from "@/utils/entityIds";

import { apiRequest } from "./client";
import type { ApiInventory } from "./types";
import { normalizeNamedList, pickNamedEntity } from "./normalize";

export type InventoryStatus =
  "in_stock" | "reserved" | "picked" | "shipped" | "wasted";

export type CreateInventoryPayload = {
  itemId: string;
  quantity: number;
  location?: string;
  /** ISO date-time. */
  expirationDate?: string;
  distributorOrderId?: string;
  status?: InventoryStatus;
};

export type UpdateInventoryPayload = Partial<CreateInventoryPayload>;

export type StoreInventoryItemPayload = {
  /** Catalog item UUID. The store contract uses `itemId`, not `productId`. */
  itemId: string;
  quantity: number;
  location: string;
  /** Date only, `YYYY-MM-DD`, as documented for POST /inventory/store. */
  expirationDate?: string;
};

export type StoreInventoryPayload = {
  distributorOrderId: string;
  items: StoreInventoryItemPayload[];
};

export type SplitInventoryPayload = {
  splits: Array<{ quantity: number; location: string }>;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function snakeCase(key: string) {
  return key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

function readRaw(record: Record<string, unknown>, key: string) {
  return record[key] ?? record[snakeCase(key)];
}

function labelOf(value: unknown): string | undefined {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || undefined;
  }
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  const record = asRecord(value);
  if (!record) return undefined;
  for (const key of ["name", "label", "title", "merchandisingName"]) {
    const nested = labelOf(readRaw(record, key));
    if (nested) return nested;
  }
  return undefined;
}

function readLabel(
  record: Record<string, unknown> | null,
  keys: string[],
): string | undefined {
  if (!record) return undefined;
  for (const key of keys) {
    const exact = key in record ? labelOf(record[key]) : undefined;
    if (exact) return exact;
    const label = labelOf(readRaw(record, key));
    if (label) return label;
  }
  return undefined;
}

function readMoney(
  record: Record<string, unknown> | null,
  keys: string[],
): string | number | undefined {
  if (!record) return undefined;
  for (const key of keys) {
    const value = readRaw(record, key);
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value !== "string") continue;
    const text = value.trim();
    if (!text || /^\d{4}-\d{2}-\d{2}/.test(text)) continue;
    return text;
  }
  return undefined;
}

function firstLabel(
  ...values: Array<string | null | undefined>
): string | undefined {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) return trimmed;
  }
  return undefined;
}

/** Copy nested item, order, distributor, and source objects onto the flat fields the list uses. */
export function flattenInventory(row: ApiInventory): ApiInventory {
  const raw = row as Record<string, unknown>;
  const item = asRecord(raw.item) ?? asRecord(raw.catalogItem);
  const order =
    asRecord(raw.order) ??
    asRecord(raw.distributorOrder) ??
    asRecord(raw.distributor_order);
  const distributor =
    asRecord(raw.distributor) ??
    (item ? asRecord(readRaw(item, "distributor")) : null);
  const source =
    asRecord(raw.source) ??
    asRecord(raw.farmer) ??
    (item ? asRecord(readRaw(item, "source")) : null) ??
    (item ? asRecord(readRaw(item, "farmer")) : null);

  const locationRecord =
    asRecord(raw.location) ?? asRecord(raw.storageLocation);
  const location = locationRecord
    ? readLabel(locationRecord, ["name", "label"])
    : readLabel(raw, ["location", "storageLocation", "locationName"]);
  const address =
    (locationRecord ? readLabel(locationRecord, ["address"]) : undefined) ??
    readLabel(raw, ["address", "locationAddress"]);

  const itemId =
    firstLabel(row.itemId, item ? readLabel(item, ["id"]) : undefined) ??
    row.itemId;
  const quantityRaw =
    row.quantity ?? readRaw(raw, "quantity") ?? readRaw(raw, "qty");
  const quantity =
    typeof quantityRaw === "number" && Number.isFinite(quantityRaw)
      ? quantityRaw
      : typeof quantityRaw === "string" && quantityRaw.trim()
        ? Number(quantityRaw)
        : row.quantity;

  return {
    ...row,
    itemId,
    quantity:
      typeof quantity === "number" && Number.isFinite(quantity)
        ? quantity
        : row.quantity,
    itemName:
      firstLabel(
        row.itemName,
        item ? readLabel(item, ["merchandisingName", "name"]) : undefined,
        readLabel(raw, ["itemName", "name"]),
      ) ?? null,
    category:
      firstLabel(
        row.category,
        item ? readLabel(item, ["category", "categoryName"]) : undefined,
      ) ?? null,
    subcategory:
      firstLabel(
        row.subcategory,
        item ? readLabel(item, ["subcategory", "subcategoryName"]) : undefined,
      ) ?? null,
    inventoryCode:
      firstLabel(
        row.inventoryCode,
        readLabel(raw, ["inventoryCode", "code"]),
      ) ?? row.inventoryCode,
    location: location ?? row.location ?? null,
    address: address ?? row.address ?? null,
    distributorOrderId:
      firstLabel(
        row.distributorOrderId,
        order ? readLabel(order, ["id"]) : undefined,
        readLabel(raw, ["distributorOrderId", "orderId"]),
      ) ?? null,
    orderCode:
      firstLabel(
        row.orderCode,
        readLabel(raw, ["OrderCode", "orderCode"]),
        order
          ? readLabel(order, ["orderCode", "OrderCode", "code"])
          : undefined,
      ) ?? null,
    distributorName:
      firstLabel(
        row.distributorName,
        readLabel(raw, ["Distributor name", "distributorName"]),
        distributor ? readLabel(distributor, ["name"]) : undefined,
        typeof raw.distributor === "string" ? raw.distributor : undefined,
      ) ?? null,
    sourceName:
      firstLabel(
        row.sourceName,
        readLabel(raw, ["source name", "Source name", "sourceName"]),
        source ? readLabel(source, ["name"]) : undefined,
        typeof raw.source === "string" ? raw.source : undefined,
        typeof raw.farmer === "string" ? raw.farmer : undefined,
        readLabel(raw, ["farmerName"]),
      ) ?? null,
    deliveryDate:
      firstLabel(
        typeof row.deliveryDate === "string" ? row.deliveryDate : undefined,
        readLabel(raw, ["Delivery Date", "deliveryDate", "receivedAt"]),
        order
          ? readLabel(order, ["deliveryDate", "Delivery Date", "receivedAt"])
          : undefined,
      ) ?? null,
    purchased: (() => {
      const current = row.purchased ?? raw.purchased;
      if (typeof current === "number" && Number.isFinite(current))
        return current;
      if (typeof current === "string" && current.trim()) return current.trim();
      return (
        readMoney(raw, [
          "purchasedPrice",
          "purchasePrice",
          "unitPrice",
          "price",
        ]) ??
        (order
          ? readMoney(order, ["purchased", "unitPrice", "price"])
          : undefined) ??
        null
      );
    })(),
    unit:
      firstLabel(
        row.unit,
        readLabel(raw, ["unit"]),
        item ? readLabel(item, ["singleItemUnit", "unit"]) : undefined,
      ) ?? null,
    expirationDate:
      firstLabel(
        row.expirationDate,
        readLabel(raw, ["expirationDate", "expDate", "expiration"]),
      ) ?? null,
  };
}

function unwrapInventory(payload: unknown): ApiInventory {
  const entity =
    pickNamedEntity<ApiInventory>(payload, "inventory") ??
    (payload as ApiInventory);
  return flattenInventory(entity);
}

function cleanText(value: string | null | undefined) {
  const trimmed = value?.trim();
  if (!trimmed || trimmed === "—") return undefined;
  return trimmed;
}

function isoDateTime(value: string | null | undefined) {
  const text = cleanText(value);
  if (!text) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return `${text}T00:00:00.000Z`;
  const parsed = Date.parse(text);
  if (Number.isNaN(parsed)) return undefined;
  return new Date(parsed).toISOString();
}

export function moneyAmount(
  value: string | number | null | undefined,
): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.round(value * 100) / 100;
  }
  const text = cleanText(typeof value === "string" ? value : undefined);
  if (!text || /^\d{4}-\d{2}-\d{2}/.test(text)) return undefined;
  const parsed = Number(text.replace(/[$,]/g, ""));
  if (!Number.isFinite(parsed)) return undefined;
  return Math.round(parsed * 100) / 100;
}

/** Build the inventory write body from the stock workflow, skipping empty values. */
export function buildInventoryPayload(input: {
  itemId: string;
  quantity: number;
  location?: string | null;
  expirationDate?: string | null;
  distributorOrderId?: string | null;
  status?: InventoryStatus | null;
}): CreateInventoryPayload {
  const body: CreateInventoryPayload = {
    itemId: input.itemId,
    quantity: Math.max(0, Math.round(input.quantity)),
  };
  const location = cleanText(input.location);
  if (location) body.location = location;
  const expirationDate = isoDateTime(input.expirationDate);
  if (expirationDate) body.expirationDate = expirationDate;
  const orderId = cleanText(input.distributorOrderId);
  if (orderId && isUuid(orderId)) body.distributorOrderId = orderId;
  if (input.status) body.status = input.status;
  return body;
}

/** Live `GET /inventory` returns `{ inventory: [{ category, items: [...] }] }`, not a flat list. */
function expandInventoryGroups(rows: ApiInventory[]): ApiInventory[] {
  const flat: ApiInventory[] = [];
  for (const row of rows) {
    const raw = row as Record<string, unknown>;
    if (!Array.isArray(raw.items)) {
      flat.push(row);
      continue;
    }
    const groupCategory =
      typeof raw.category === "string" ? raw.category : undefined;
    for (const entry of raw.items) {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
      const item = { ...(entry as ApiInventory) };
      if (groupCategory && !item.category) item.category = groupCategory;
      flat.push(item);
    }
  }
  return flat;
}

async function writeInventory(
  method: "POST" | "PATCH",
  path: string,
  body: CreateInventoryPayload | UpdateInventoryPayload,
) {
  const payload = await apiRequest<unknown>(path, {
    method,
    body: JSON.stringify(body),
  });
  return unwrapInventory(payload);
}

export const inventoryApi = {
  list() {
    return apiRequest<unknown>("/inventory").then((payload) =>
      expandInventoryGroups(
        normalizeNamedList<ApiInventory>(payload, [
          "inventory",
          "items",
          "data",
          "results",
        ]),
      ).map((row) => flattenInventory(row)),
    );
  },

  getById(id: string) {
    return apiRequest<unknown>(`/inventory/${id}`).then((payload) =>
      unwrapInventory(payload),
    );
  },

  create(body: CreateInventoryPayload) {
    return writeInventory("POST", "/inventory", body);
  },

  update(id: string, body: UpdateInventoryPayload) {
    return writeInventory("PATCH", `/inventory/${id}`, body);
  },

  remove(id: string) {
    return apiRequest<void>(`/inventory/${id}`, { method: "DELETE" });
  },

  store(body: StoreInventoryPayload) {
    return apiRequest<unknown>("/inventory/store", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  split(id: string, body: SplitInventoryPayload) {
    return apiRequest<unknown>(`/inventory/${id}/split`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },
};

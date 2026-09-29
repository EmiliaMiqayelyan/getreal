import { isUuid, publicCode } from "@/utils/entityIds";

import { ApiError, apiRequest } from "./client";
import type { ApiInventory } from "./types";
import { normalizeNamedList, pickNamedEntity } from "./normalize";

export type CreateInventoryPayload = {
  itemId: string;
  quantity: number;
  location?: string;
  expirationDate?: string;
  unit?: string;
  purchased?: number;
  deliveryDate?: string;
  distributorOrderId?: string;
  orderCode?: string;
  distributorName?: string;
  sourceName?: string;
};

export type UpdateInventoryPayload = Partial<CreateInventoryPayload>;

const DOCUMENTED_WRITE_KEYS = ["itemId", "quantity", "location"] as const;

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

function isoDate(value: string | null | undefined) {
  const text = cleanText(value);
  if (!text || !/^\d{4}-\d{2}-\d{2}/.test(text)) return undefined;
  return text.slice(0, 10);
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
  unit?: string | null;
  purchased?: string | number | null;
  deliveryDate?: string | null;
  distributorOrderId?: string | null;
  orderCode?: string | null;
  distributorName?: string | null;
  sourceName?: string | null;
}): CreateInventoryPayload {
  const body: CreateInventoryPayload = {
    itemId: input.itemId,
    quantity: Math.max(1, Math.round(input.quantity)),
  };
  const location = cleanText(input.location);
  if (location) body.location = location;
  const expirationDate = isoDate(input.expirationDate);
  if (expirationDate) body.expirationDate = expirationDate;
  const unit = cleanText(input.unit);
  if (unit) body.unit = unit;
  const purchased = moneyAmount(input.purchased);
  if (purchased != null) body.purchased = purchased;
  const deliveryDate = isoDate(input.deliveryDate);
  if (deliveryDate) body.deliveryDate = deliveryDate;
  const orderId = cleanText(input.distributorOrderId);
  if (orderId && isUuid(orderId)) body.distributorOrderId = orderId;
  const orderCode = publicCode(cleanText(input.orderCode), orderId);
  if (orderCode) body.orderCode = orderCode;
  const distributorName = cleanText(input.distributorName);
  if (distributorName) body.distributorName = distributorName;
  const sourceName = cleanText(input.sourceName);
  if (sourceName) body.sourceName = sourceName;
  return body;
}

function documentedBody(
  body: CreateInventoryPayload | UpdateInventoryPayload,
): UpdateInventoryPayload {
  const next: UpdateInventoryPayload = {};
  for (const key of DOCUMENTED_WRITE_KEYS) {
    const value = body[key];
    if (value != null && value !== "") next[key] = value as never;
  }
  return next;
}

function rejectsExtraFields(error: unknown) {
  if (!(error instanceof ApiError)) return false;
  if (error.status !== 400 && error.status !== 422) return false;
  const text =
    `${error.message} ${JSON.stringify(error.body ?? "")}`.toLowerCase();
  return (
    text.includes("should not exist") ||
    text.includes("not allowed") ||
    text.includes("unknown field") ||
    text.includes("unknown property") ||
    text.includes("additional propert")
  );
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

async function mapPool<T, R>(
  items: T[],
  size: number,
  mapper: (item: T) => Promise<R>,
): Promise<R[]> {
  if (!items.length) return [];
  const results = new Array<R>(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await mapper(items[index]);
    }
  }
  const workers = Math.min(size, items.length);
  await Promise.all(Array.from({ length: workers }, () => worker()));
  return results;
}

async function fetchInventoryRecord(id: string): Promise<ApiInventory | null> {
  try {
    const payload = await apiRequest<unknown>(`/inventory/${id}`);
    return unwrapInventory(payload);
  } catch {
    return null;
  }
}

/**
 * The list payload omits `itemId`. The detail endpoint has it, which is how
 * a row is tied to the catalog item name.
 */
async function hydrateInventoryRows(
  rows: ApiInventory[],
): Promise<ApiInventory[]> {
  const missing = rows.filter((row) => row.id && !row.itemId);
  if (!missing.length) return rows;
  const details = await mapPool(missing, 6, (row) =>
    fetchInventoryRecord(row.id as string),
  );
  const byId = new Map(
    details
      .filter((row): row is ApiInventory => Boolean(row?.id))
      .map((row) => [row.id as string, row]),
  );
  return rows.map((row) => {
    const detail = row.id ? byId.get(row.id) : undefined;
    if (!detail) return row;
    return flattenInventory({
      ...row,
      itemId: row.itemId || detail.itemId,
      distributorOrderId: row.distributorOrderId || detail.distributorOrderId,
      expirationDate: row.expirationDate ?? detail.expirationDate,
      location: row.location || detail.location,
      quantity: row.quantity ?? detail.quantity,
    });
  });
}

async function writeInventory(
  method: "POST" | "PATCH",
  path: string,
  body: CreateInventoryPayload | UpdateInventoryPayload,
) {
  try {
    const payload = await apiRequest<unknown>(path, {
      method,
      body: JSON.stringify(body),
    });
    return unwrapInventory(payload);
  } catch (error) {
    if (!rejectsExtraFields(error)) throw error;
    const payload = await apiRequest<unknown>(path, {
      method,
      body: JSON.stringify(documentedBody(body)),
    });
    return unwrapInventory(payload);
  }
}

export const inventoryApi = {
  list() {
    return apiRequest<unknown>("/inventory").then((payload) =>
      hydrateInventoryRows(
        expandInventoryGroups(
          normalizeNamedList<ApiInventory>(payload, [
            "inventory",
            "items",
            "data",
            "results",
          ]),
        ).map((row) => flattenInventory(row)),
      ),
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
};

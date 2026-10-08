import type { ApiInventory, ApiProduct } from "@/lib/api/types";
import type { PackingSourceOption } from "@/types/packing";

export type PackingLineLookup = {
  productId?: string;
  name?: string;
  itemCode?: string | null;
};

type SourceGroup = {
  category: string;
  options: PackingSourceOption[];
};

export type PackingCatalog = {
  optionsFor(line: PackingLineLookup): SourceGroup;
  /** Any lot by id, including ones already picked for this order. */
  optionForRecord?(inventoryRecordId: string): PackingSourceOption | undefined;
};

function formatExpDate(value?: string | null) {
  if (!value?.trim()) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function optionFromRecord(row: ApiInventory): PackingSourceOption | null {
  if ((row.quantity ?? 0) <= 0) return null;
  const status = row.status?.trim().toLowerCase();
  if (status && status !== "in_stock" && status !== "reserved") return null;
  return describeRecord(row);
}

function describeRecord(row: ApiInventory): PackingSourceOption | null {
  const inventoryRecordId = row.id?.trim();
  if (!inventoryRecordId) return null;
  const location = row.location?.trim() || "";
  return {
    inventoryRecordId,
    itemId: row.itemCode?.trim() || inventoryRecordId,
    distributor: row.distributorName?.trim() || "N/A",
    source: row.sourceName?.trim() || "N/A",
    expDate: formatExpDate(row.expirationDate),
    expirationIso: row.expirationDate?.trim() || "",
    location,
    address: row.address?.trim() || location,
  };
}

/**
 * Inventory lots the packer can pick, keyed the way an order line can refer
 * to them. Order lines send the product-for-sale id; inventory rows use the
 * catalog item id, so `productItemIds` bridges GET /products.
 */
export function buildPackingCatalog(
  rows: ApiInventory[],
  productItemIds: ReadonlyMap<string, string> = new Map(),
): PackingCatalog {
  const byItemId = new Map<string, SourceGroup>();
  const byName = new Map<string, SourceGroup>();
  const byCode = new Map<string, SourceGroup>();
  const byRecordId = new Map<string, ApiInventory>();
  for (const row of rows) {
    const id = row.id?.trim();
    if (id) byRecordId.set(id, row);
  }

  function add(map: Map<string, SourceGroup>, key: string, group: SourceGroup, option: PackingSourceOption) {
    const existing = map.get(key);
    if (!existing) {
      map.set(key, { category: group.category, options: [option] });
      return;
    }
    if (existing.options.some((entry) => entry.inventoryRecordId === option.inventoryRecordId)) {
      return;
    }
    existing.options.push(option);
  }

  for (const row of rows) {
    const option = optionFromRecord(row);
    if (!option) continue;
    const category = row.subcategory?.trim() || row.category?.trim() || "Items";
    const group = { category, options: [option] };
    const itemId = row.itemId?.trim();
    if (itemId) add(byItemId, itemId, group, option);
    const name = row.itemName?.trim().toLowerCase();
    if (name) add(byName, name, group, option);
    const code = row.itemCode?.trim().toLowerCase();
    if (code) add(byCode, code, group, option);
  }

  return {
    optionsFor(line) {
      const productId = line.productId?.trim();
      const catalogItemId = productId ? productItemIds.get(productId) : undefined;
      const byId = catalogItemId ? byItemId.get(catalogItemId) : undefined;
      const byLineCode = line.itemCode?.trim().toLowerCase();
      const byItemCode = byLineCode ? byCode.get(byLineCode) : undefined;
      const byLineName = line.name?.trim().toLowerCase();
      const named = byLineName ? byName.get(byLineName) : undefined;
      return byId ?? byItemCode ?? named ?? { category: "Items", options: [] };
    },
    optionForRecord(inventoryRecordId) {
      const row = byRecordId.get(inventoryRecordId.trim());
      return row ? (describeRecord(row) ?? undefined) : undefined;
    },
  };
}

export function productItemIdMap(products: ApiProduct[]) {
  const map = new Map<string, string>();
  for (const product of products) {
    const itemId = product.itemId?.trim();
    if (!itemId) continue;
    if (product.id?.trim()) map.set(product.id.trim(), itemId);
    if (product.productId?.trim()) map.set(product.productId.trim(), itemId);
  }
  return map;
}

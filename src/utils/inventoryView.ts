import type { ApiInventory } from "@/lib/api/types";
import type { Item } from "@/types/item";
import { ITEM_CATEGORIES, ITEM_SUBCATEGORIES } from "@/types/item";
import { codeFrom, findByEntityRef, isUuid } from "@/utils/entityIds";

export type InventoryLot = {
  /** Inventory record id used for PATCH. */
  recordId: string;
  /** Catalog item UUID used for POST /inventory. */
  catalogItemId: string;
  orderId: string;
  distributor: string;
  source: string;
  deliveryDate: string;
  purchased: string;
  qty: number;
  unit: string;
  location: string;
  /** Address revealed when the location cell is hovered. */
  address: string;
};

export type InventoryProduct = {
  id: string;
  name: string;
  distributor: string;
  unit: string;
  lots: InventoryLot[];
};

export type InventorySection = {
  id: string;
  /** Parent category, e.g. Protein. */
  category: string;
  /** Subcategory table title, e.g. Meat. */
  title: string;
  sourceLabel: "Farmer" | "Source";
  products: InventoryProduct[];
};

const CATEGORY_RANK = new Map<string, number>(
  ITEM_CATEGORIES.map((name, index) => [name, index]),
);

const SUBCATEGORY_PARENT = new Map<string, string>();
for (const [category, subs] of Object.entries(ITEM_SUBCATEGORIES)) {
  for (const sub of subs) {
    if (sub === "Other") continue;
    SUBCATEGORY_PARENT.set(sub, category);
  }
}

export function parentCategory(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return "Uncategorized";
  if (CATEGORY_RANK.has(trimmed)) return trimmed;
  return SUBCATEGORY_PARENT.get(trimmed) ?? trimmed;
}

export function sourceColumnLabel(subcategory: string): "Farmer" | "Source" {
  return subcategory.trim().toLowerCase() === "poultry" ? "Farmer" : "Source";
}

export function formatInventoryDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const datePart = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${datePart}, ${hours}:${minutes}`;
}

export function formatPurchased(amount?: number) {
  if (amount == null || !Number.isFinite(amount)) return "—";
  const rounded = Math.round(amount * 100) / 100;
  const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
  return `$${text}`;
}

function readString(record: object, key: string) {
  const raw = record as Record<string, unknown>;
  const snake = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
  const value = raw[key] ?? raw[snake];
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function inventoryOrderLabel(row: ApiInventory) {
  const code =
    readString(row, "orderCode") ||
    codeFrom(row, ["inventoryCode", "orderCode", "code"]);
  if (code && !isUuid(code)) return code;
  const orderId = row.distributorOrderId?.trim();
  if (orderId && !isUuid(orderId)) return orderId;
  return "—";
}

function formatPurchasedField(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return formatPurchased(value);
  }
  if (typeof value !== "string") return "—";
  const text = value.trim();
  if (!text) return "—";
  if (text.startsWith("$")) return text;
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return formatInventoryDate(text);
  const numeric = Number(text);
  if (Number.isFinite(numeric)) return formatPurchased(numeric);
  return text;
}

export function findCatalogItem(
  items: Item[],
  ref: string | undefined,
  name?: string,
) {
  const byRef = findByEntityRef(items, ref);
  if (byRef) return byRef;
  const normalized = name?.trim().toLowerCase();
  if (!normalized) return undefined;
  return items.find((item) => {
    const merch = item.merchandisingName.trim().toLowerCase();
    const raw = item.name.trim().toLowerCase();
    return merch === normalized || raw === normalized;
  });
}

export function catalogItemUuid(item: Item | undefined, fallback?: string) {
  if (item?.recordId && isUuid(item.recordId)) return item.recordId;
  if (fallback && isUuid(fallback)) return fallback;
  return "";
}

function categoryRank(name: string) {
  if (name === "Uncategorized") return 10_000;
  return CATEGORY_RANK.get(name) ?? 1_000;
}

function subcategoryRank(category: string, subcategory: string) {
  const list = ITEM_SUBCATEGORIES[category] ?? [];
  const index = list.indexOf(subcategory);
  return index === -1 ? 1_000 : index;
}

function productIdFor(item: Item) {
  return item.recordId || item.id;
}

function lotFromRow(
  row: ApiInventory,
  item: Item | undefined,
  index: number,
  catalogItemId = catalogItemUuid(item, row.itemId),
): InventoryLot {
  const location = readString(row, "location") || "—";
  const address = readString(row, "address") || location;
  return {
    recordId: row.id?.trim() || `inv-${index}`,
    catalogItemId,
    orderId: inventoryOrderLabel(row),
    distributor:
      readString(row, "distributorName") || item?.distributor?.trim() || "—",
    source: readString(row, "sourceName") || item?.source?.trim() || "—",
    deliveryDate: formatInventoryDate(readString(row, "deliveryDate")),
    purchased: formatPurchasedField(row.purchased),
    qty: row.quantity ?? 0,
    unit: readString(row, "unit") || item?.singleItemUnit?.trim() || "—",
    location,
    address,
  };
}

function sameCatalogIdentity(matches: Item[]) {
  const first = matches[0];
  if (!first) return false;
  const name = first.merchandisingName.trim() || first.name.trim();
  return matches.every((item) => {
    const itemName = item.merchandisingName.trim() || item.name.trim();
    return (
      itemName === name &&
      item.category === first.category &&
      item.subcategory === first.subcategory
    );
  });
}

function catalogMatches(items: Item[], row: ApiInventory) {
  if (row.itemId) {
    const linked = findCatalogItem(items, row.itemId);
    if (linked) return [linked];
  }
  const distributor = row.distributorName?.trim().toLowerCase();
  const source = row.sourceName?.trim().toLowerCase();
  const unit = row.unit?.trim().toLowerCase();
  if (!distributor && !source && !unit) return [];
  return items.filter((item) => {
    if (distributor && item.distributor.trim().toLowerCase() !== distributor) {
      return false;
    }
    if (source && item.source.trim().toLowerCase() !== source) return false;
    if (unit && item.singleItemUnit.trim().toLowerCase() !== unit) return false;
    return true;
  });
}

/**
 * Catalog items grouped the way the inventory screen is designed:
 * category heading, subcategory table, product row, then one lot per inventory record.
 * Items with no stock stay in the table so the empty state can show.
 */
export function buildInventorySections(
  items: Item[],
  rows: ApiInventory[],
): InventorySection[] {
  const lotsByProduct = new Map<string, InventoryLot[]>();
  const productMeta = new Map<
    string,
    {
      name: string;
      category: string;
      subcategory: string;
      distributor: string;
      unit: string;
    }
  >();

  rows.forEach((row, index) => {
    const matches = catalogMatches(items, row);
    const grouped = sameCatalogIdentity(matches);
    const item = grouped ? matches[0] : undefined;
    const catalogItemId =
      matches.length === 1 ? catalogItemUuid(matches[0], row.itemId) : "";
    const lot = lotFromRow(row, item, index, catalogItemId);
    const apiName = row.itemName?.trim();
    const name = item
      ? item.merchandisingName?.trim() || item.name?.trim() || apiName || "Item"
      : apiName || "Item";
    const category = parentCategory(row.category || item?.category || "");
    const subcategory =
      row.subcategory?.trim() ||
      item?.subcategory?.trim() ||
      (category === "Uncategorized" ? "Inventory" : category);
    const key =
      matches.length === 1 && item
        ? productIdFor(item)
        : `${category}::${subcategory}::${name}`;
    const list = lotsByProduct.get(key) ?? [];
    list.push(lot);
    lotsByProduct.set(key, list);
    if (!productMeta.has(key)) {
      productMeta.set(key, {
        name,
        category,
        subcategory,
        distributor: lot.distributor,
        unit: lot.unit,
      });
    }
  });

  const sections = new Map<string, InventorySection>();

  function ensureSection(category: string, title: string) {
    const id = `${category}::${title}`;
    const existing = sections.get(id);
    if (existing) return existing;
    const section: InventorySection = {
      id,
      category,
      title,
      sourceLabel: sourceColumnLabel(title),
      products: [],
    };
    sections.set(id, section);
    return section;
  }

  for (const [id, meta] of productMeta) {
    const section = ensureSection(meta.category, meta.subcategory);
    section.products.push({
      id,
      name: meta.name,
      distributor: meta.distributor,
      unit: meta.unit,
      lots: lotsByProduct.get(id) ?? [],
    });
  }

  const list = [...sections.values()];
  list.sort((a, b) => {
    const byCategory = categoryRank(a.category) - categoryRank(b.category);
    if (byCategory !== 0) return byCategory;
    if (a.category !== b.category) return a.category.localeCompare(b.category);
    const bySub =
      subcategoryRank(a.category, a.title) -
      subcategoryRank(b.category, b.title);
    if (bySub !== 0) return bySub;
    return a.title.localeCompare(b.title);
  });

  for (const section of list) {
    section.products.sort((a, b) => a.name.localeCompare(b.name));
  }

  return list;
}

export function groupInventorySections(sections: InventorySection[]) {
  const groups: Array<{ title: string; sections: InventorySection[] }> = [];
  for (const section of sections) {
    const current = groups.find((group) => group.title === section.category);
    if (current) current.sections.push(section);
    else groups.push({ title: section.category, sections: [section] });
  }
  return groups;
}

import type { ApiInventory } from "@/lib/api/types";
import type { Item } from "@/types/item";
import { ITEM_CATEGORIES, ITEM_SUBCATEGORIES } from "@/types/item";
import { findByEntityRef, isUuid } from "@/utils/entityIds";

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

function inventoryOrderLabel(
  row: {
    inventoryCode?: string;
    distributorOrderId?: string | null;
    id?: string;
  },
  index: number,
) {
  const code = row.inventoryCode?.trim();
  if (code) return code;
  const orderId = row.distributorOrderId?.trim();
  if (orderId && !isUuid(orderId)) return orderId;
  return row.id?.trim() || `INV-${index + 1}`;
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

function lotFromRow(row: ApiInventory, item: Item | undefined, index: number): InventoryLot {
  const location = row.location?.trim() || "—";
  return {
    recordId: row.id?.trim() || `inv-${index}`,
    catalogItemId: catalogItemUuid(item, row.itemId),
    orderId: inventoryOrderLabel(row, index),
    distributor: item?.distributor?.trim() || "—",
    source: item?.source?.trim() || "—",
    deliveryDate: formatInventoryDate(row.createdAt || row.updatedAt),
    purchased: formatPurchased(item?.buyingPrice),
    qty: row.quantity ?? 0,
    unit: item?.singleItemUnit?.trim() || "—",
    location,
  };
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
  const orphans: Array<{ name: string; lot: InventoryLot }> = [];

  rows.forEach((row, index) => {
    const item = findCatalogItem(items, row.itemId);
    const lot = lotFromRow(row, item, index);
    if (!item) {
      orphans.push({
        name: row.itemId?.trim() || lot.orderId || "Item",
        lot,
      });
      return;
    }
    const key = productIdFor(item);
    const list = lotsByProduct.get(key) ?? [];
    list.push(lot);
    lotsByProduct.set(key, list);
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

  for (const item of items) {
    const category = parentCategory(item.category || "");
    const title = item.subcategory?.trim() || category;
    const section = ensureSection(category, title);
    section.products.push({
      id: productIdFor(item),
      name: item.merchandisingName?.trim() || item.name?.trim() || "Item",
      distributor: item.distributor?.trim() || "—",
      unit: item.singleItemUnit?.trim() || "—",
      lots: lotsByProduct.get(productIdFor(item)) ?? [],
    });
  }

  if (orphans.length) {
    const section = ensureSection("Uncategorized", "Stock");
    for (const orphan of orphans) {
      section.products.push({
        id: orphan.lot.recordId,
        name: orphan.name,
        distributor: orphan.lot.distributor,
        unit: orphan.lot.unit,
        lots: [orphan.lot],
      });
    }
  }

  const list = [...sections.values()];
  list.sort((a, b) => {
    const byCategory = categoryRank(a.category) - categoryRank(b.category);
    if (byCategory !== 0) return byCategory;
    if (a.category !== b.category) return a.category.localeCompare(b.category);
    const bySub =
      subcategoryRank(a.category, a.title) - subcategoryRank(b.category, b.title);
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

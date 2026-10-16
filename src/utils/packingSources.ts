import type {
  ApiAvailableLocation,
  ApiInventory,
  ApiItemPick,
  ApiProduct,
} from "@/lib/api/types";
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
    quantity:
      typeof row.quantity === "number" && Number.isFinite(row.quantity)
        ? row.quantity
        : null,
    available: null,
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

type OrderLineStock = {
  productId?: string;
  name?: string;
  itemCode?: string | null;
  quantity?: number;
  packed?: boolean;
  inventoryRecordId?: string | null;
  availableLocations?: ApiAvailableLocation[] | null;
  picks?: ApiItemPick[] | null;
};

function stockHeldByLine(line: OrderLineStock) {
  const held = new Map<string, number>();
  if (!line.packed) return held;
  const picks = line.picks ?? [];
  if (picks.length) {
    for (const pick of picks) {
      const id = pick.inventoryRecordId?.trim();
      if (!id || !(pick.quantity > 0)) continue;
      held.set(id, (held.get(id) ?? 0) + pick.quantity);
    }
    return held;
  }
  const id = line.inventoryRecordId?.trim();
  if (id && (line.quantity ?? 0) > 0) held.set(id, line.quantity ?? 0);
  return held;
}

function optionFromLocation(
  location: ApiAvailableLocation,
  stock: number,
  onHand: number,
  enriched: PackingSourceOption | undefined,
  fallbackLocation: string,
): PackingSourceOption {
  const id = location.id.trim();
  const name = location.location?.trim() || enriched?.location || fallbackLocation;
  return {
    inventoryRecordId: id,
    itemId: enriched?.itemId || id,
    distributor: enriched?.distributor || "N/A",
    source: enriched?.source || "N/A",
    expDate: formatExpDate(location.expirationDate) || enriched?.expDate || "",
    expirationIso: location.expirationDate?.trim() || enriched?.expirationIso || "",
    quantity: stock,
    available: onHand,
    location: name,
    address: enriched?.address || name,
  };
}

/**
 * Fridges the packer can take this line from.
 * Prefers `availableLocations` (already FIFO). Falls back to the inventory
 * catalog when the order payload has no fridge list.
 * Packed quantities are added back so a saved split can be edited: the
 * server restores those units before it applies the next pack.
 */
export function orderLineOptions(
  line: OrderLineStock,
  catalog: PackingCatalog,
): SourceGroup {
  const match = catalog.optionsFor(line);
  const locations = (line.availableLocations ?? []).filter((location) =>
    location.id?.trim(),
  );
  if (!locations.length) {
    const recordId = line.inventoryRecordId?.trim() || "";
    const selected = recordId
      ? (match.options.find((option) => option.inventoryRecordId === recordId) ??
        catalog.optionForRecord?.(recordId))
      : undefined;
    const options =
      selected &&
      !match.options.some(
        (option) => option.inventoryRecordId === selected.inventoryRecordId,
      )
        ? [selected, ...match.options]
        : match.options;
    return { category: match.category, options };
  }

  const held = stockHeldByLine(line);
  const options: PackingSourceOption[] = [];
  const seen = new Set<string>();

  for (const location of locations) {
    const id = location.id.trim();
    const onHand = typeof location.quantity === "number" ? location.quantity : 0;
    const stock = onHand + (held.get(id) ?? 0);
    if (stock <= 0) continue;
    seen.add(id);
    options.push(
      optionFromLocation(
        location,
        stock,
        onHand,
        catalog.optionForRecord?.(id),
        "",
      ),
    );
  }

  for (const [id, quantity] of held) {
    if (seen.has(id) || quantity <= 0) continue;
    const pick = line.picks?.find((entry) => entry.inventoryRecordId?.trim() === id);
    options.push(
      optionFromLocation(
        {
          id,
          location: pick?.location?.trim() || "",
          quantity: 0,
          expirationDate: null,
        },
        quantity,
        0,
        catalog.optionForRecord?.(id),
        pick?.location?.trim() || "",
      ),
    );
  }

  return { category: match.category, options };
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

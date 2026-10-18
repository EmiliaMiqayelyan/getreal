import type {
  ApiAvailableLocation,
  ApiDistributor,
  ApiInventory,
  ApiItem,
  ApiItemPick,
  ApiProduct,
  ApiSource,
} from "@/lib/api/types";
import type { PackingSourceOption } from "@/types/packing";

export type PackingLineLookup = {
  productId?: string;
  name?: string;
  itemCode?: string | null;
  itemId?: string | null;
  distributorName?: string | null;
  sourceName?: string | null;
};

export type PackingParty = {
  distributor: string;
  source: string;
};

type SourceGroup = {
  category: string;
  options: PackingSourceOption[];
};

export type PackingCatalog = {
  optionsFor(line: PackingLineLookup): SourceGroup;
  /** Any lot by id, including ones already picked for this order. */
  optionForRecord?(inventoryRecordId: string): PackingSourceOption | undefined;
  /** Catalog distributor and source for this order line. */
  partyFor?(line: PackingLineLookup): PackingParty | undefined;
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

function partyName(value?: string | null) {
  const text = value?.trim() ?? "";
  if (!text || text === "N/A" || text === "—" || text === "-") return "";
  return text;
}

function preferParty(...values: Array<string | null | undefined>) {
  for (const value of values) {
    const text = partyName(value);
    if (text) return text;
  }
  return "N/A";
}

function nestedName(value: unknown) {
  if (typeof value === "string") return value.trim();
  if (!value || typeof value !== "object") return "";
  const name = (value as { name?: unknown }).name;
  return typeof name === "string" ? name.trim() : "";
}

function rememberParty(
  map: Map<string, PackingParty>,
  key: string | null | undefined,
  party: PackingParty,
) {
  const trimmed = key?.trim().toLowerCase();
  if (!trimmed || map.has(trimmed)) return;
  map.set(trimmed, party);
}

/**
 * Distributor and source for each catalog item.
 * Inventory lots often omit the names, so packing resolves them from the
 * item, then from the distributor and source lists.
 */
export function packingParties(input: {
  items: readonly ApiItem[];
  distributors: readonly ApiDistributor[];
  sources: readonly ApiSource[];
}) {
  const distributorsById = new Map<string, string>();
  for (const row of input.distributors) {
    const id = row.id?.trim();
    const name = row.name?.trim();
    if (id && name) distributorsById.set(id, name);
  }
  const sourcesById = new Map<string, string>();
  for (const row of input.sources) {
    const id = row.id?.trim();
    const name = row.name?.trim();
    if (id && name) sourcesById.set(id, name);
  }

  const map = new Map<string, PackingParty>();
  for (const item of input.items) {
    const raw = item as ApiItem & {
      distributor?: unknown;
      source?: unknown;
    };
    const distributor =
      nestedName(raw.distributor) ||
      (item.distributorId
        ? distributorsById.get(item.distributorId) || ""
        : "");
    const source =
      nestedName(raw.source) ||
      (item.sourceId ? sourcesById.get(item.sourceId) || "" : "");
    if (!distributor && !source) continue;
    const party = { distributor, source };
    rememberParty(map, item.id, party);
    rememberParty(map, item.itemCode, party);
    rememberParty(map, item.name ? `name:${item.name}` : "", party);
    rememberParty(
      map,
      item.merchandisingName ? `name:${item.merchandisingName}` : "",
      party,
    );
  }
  return map;
}

function optionFromRecord(
  row: ApiInventory,
  parties: ReadonlyMap<string, PackingParty>,
): PackingSourceOption | null {
  if ((row.quantity ?? 0) <= 0) return null;
  const status = row.status?.trim().toLowerCase();
  if (status && status !== "in_stock" && status !== "reserved") return null;
  return describeRecord(row, parties);
}

function describeRecord(
  row: ApiInventory,
  parties: ReadonlyMap<string, PackingParty>,
): PackingSourceOption | null {
  const inventoryRecordId = row.id?.trim();
  if (!inventoryRecordId) return null;
  const location = row.location?.trim() || "";
  const party = partyForKeys(parties, [
    row.itemId,
    row.itemCode,
    row.itemName ? `name:${row.itemName}` : "",
  ]);
  return {
    inventoryRecordId,
    itemId: row.itemCode?.trim() || inventoryRecordId,
    distributor: preferParty(row.distributorName, party?.distributor),
    source: preferParty(row.sourceName, party?.source),
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

function partyForKeys(
  parties: ReadonlyMap<string, PackingParty>,
  keys: Array<string | null | undefined>,
) {
  for (const key of keys) {
    const trimmed = key?.trim().toLowerCase();
    if (!trimmed) continue;
    const party = parties.get(trimmed);
    if (party && (party.distributor || party.source)) return party;
  }
  return undefined;
}

/**
 * Inventory lots the packer can pick, keyed the way an order line can refer
 * to them. Order lines send the product-for-sale id; inventory rows use the
 * catalog item id, so `productItemIds` bridges GET /products.
 */
export function buildPackingCatalog(
  rows: ApiInventory[],
  productItemIds: ReadonlyMap<string, string> = new Map(),
  parties: ReadonlyMap<string, PackingParty> = new Map(),
): PackingCatalog {
  const byItemId = new Map<string, SourceGroup>();
  const byName = new Map<string, SourceGroup>();
  const byCode = new Map<string, SourceGroup>();
  const byRecordId = new Map<string, ApiInventory>();
  for (const row of rows) {
    const id = row.id?.trim();
    if (id) byRecordId.set(id, row);
  }

  function add(
    map: Map<string, SourceGroup>,
    key: string,
    group: SourceGroup,
    option: PackingSourceOption,
  ) {
    const existing = map.get(key);
    if (!existing) {
      map.set(key, { category: group.category, options: [option] });
      return;
    }
    if (
      existing.options.some(
        (entry) => entry.inventoryRecordId === option.inventoryRecordId,
      )
    ) {
      return;
    }
    existing.options.push(option);
  }

  for (const row of rows) {
    const option = optionFromRecord(row, parties);
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
      const catalogItemId = productId
        ? productItemIds.get(productId)
        : undefined;
      const byId = catalogItemId ? byItemId.get(catalogItemId) : undefined;
      const byLineCode = line.itemCode?.trim().toLowerCase();
      const byItemCode = byLineCode ? byCode.get(byLineCode) : undefined;
      const byLineName = line.name?.trim().toLowerCase();
      const named = byLineName ? byName.get(byLineName) : undefined;
      return byId ?? byItemCode ?? named ?? { category: "Items", options: [] };
    },
    optionForRecord(inventoryRecordId) {
      const row = byRecordId.get(inventoryRecordId.trim());
      return row ? (describeRecord(row, parties) ?? undefined) : undefined;
    },
    partyFor(line) {
      const productId = line.productId?.trim();
      const catalogItemId = productId
        ? productItemIds.get(productId)
        : undefined;
      return partyForKeys(parties, [
        line.itemId,
        catalogItemId,
        line.itemCode,
        line.name ? `name:${line.name}` : "",
      ]);
    },
  };
}

type OrderLineStock = PackingLineLookup & {
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
  party: PackingParty | undefined,
  line: PackingLineLookup,
): PackingSourceOption {
  const id = location.id.trim();
  const name =
    location.location?.trim() || enriched?.location || fallbackLocation;
  return {
    inventoryRecordId: id,
    itemId: enriched?.itemId || id,
    distributor: preferParty(
      location.distributorName,
      enriched?.distributor,
      line.distributorName,
      party?.distributor,
    ),
    source: preferParty(
      location.sourceName,
      enriched?.source,
      line.sourceName,
      party?.source,
    ),
    expDate: formatExpDate(location.expirationDate) || enriched?.expDate || "",
    expirationIso:
      location.expirationDate?.trim() || enriched?.expirationIso || "",
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
  const party = catalog.partyFor?.(line);
  const locations = (line.availableLocations ?? []).filter((location) =>
    location.id?.trim(),
  );
  if (!locations.length) {
    const recordId = line.inventoryRecordId?.trim() || "";
    const selected = recordId
      ? (match.options.find(
          (option) => option.inventoryRecordId === recordId,
        ) ?? catalog.optionForRecord?.(recordId))
      : undefined;
    const options = (
      selected &&
      !match.options.some(
        (option) => option.inventoryRecordId === selected.inventoryRecordId,
      )
        ? [selected, ...match.options]
        : match.options
    ).map((option) => ({
      ...option,
      distributor: preferParty(
        option.distributor,
        line.distributorName,
        party?.distributor,
      ),
      source: preferParty(option.source, line.sourceName, party?.source),
    }));
    return { category: match.category, options };
  }

  const held = stockHeldByLine(line);
  const options: PackingSourceOption[] = [];
  const seen = new Set<string>();

  for (const location of locations) {
    const id = location.id.trim();
    const onHand =
      typeof location.quantity === "number" ? location.quantity : 0;
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
        party,
        line,
      ),
    );
  }

  for (const [id, quantity] of held) {
    if (seen.has(id) || quantity <= 0) continue;
    const pick = line.picks?.find(
      (entry) => entry.inventoryRecordId?.trim() === id,
    );
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
        party,
        line,
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

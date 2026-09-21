import type { Distributor } from "@/types/distributor";
import type { ManualCatalogItem, ManualLine } from "@/types/distributorOrder";
import type { Item } from "@/types/item";
import type { Source } from "@/types/source";
import { findByEntityRef, matchesEntityRef } from "@/utils/entityIds";
import { getItemDisplayName } from "@/utils/items";

function resolveItemSourceName(item: Item, sources: Source[]) {
  if (item.source.trim()) return item.source;
  if (!item.sourceId) return "";
  return findByEntityRef(sources, item.sourceId)?.name ?? "";
}

function itemBelongsToDistributor(
  item: Item,
  distributorName: string,
  distributor: Distributor | undefined,
) {
  if (item.distributor === distributorName) return true;
  if (!distributor || !item.distributorId) return false;
  return matchesEntityRef(distributor, item.distributorId);
}

export function toManualCatalogItem(
  item: Item,
  sources: Source[] = [],
): ManualCatalogItem {
  const source = resolveItemSourceName(item, sources);
  return {
    id: item.id,
    sku: item.id,
    name: getItemDisplayName(item),
    distributor: item.distributor,
    source: source || "Unassigned source",
    inStock: 0,
    price: item.buyingPrice,
    unit: item.singleItemUnit || "Each",
  };
}

/** Catalog lines for Create Manual Order, built from live Items for the selected distributor. */
export function getManualCatalogForDistributor(
  distributorName: string,
  items: Item[],
  sources: Source[] = [],
  distributors: Distributor[] = [],
) {
  const distributor = distributors.find(
    (entry) => entry.name === distributorName,
  );

  return items
    .filter((item) =>
      itemBelongsToDistributor(item, distributorName, distributor),
    )
    .map((item) => toManualCatalogItem(item, sources));
}

export function getAddableManualItems(
  distributorName: string,
  lines: ManualLine[],
  items: Item[],
  sources: Source[] = [],
  distributors: Distributor[] = [],
) {
  const visibleIds = new Set(lines.map((line) => line.id));
  return getManualCatalogForDistributor(
    distributorName,
    items,
    sources,
    distributors,
  ).filter((item) => !visibleIds.has(item.id));
}

export function createManualLines(items: ManualCatalogItem[]): ManualLine[] {
  return items.map((item) => ({ ...item, quantity: 0 }));
}

export function formatManualDeliveryLabel(
  deliveryDate: string,
  timeSlot: string,
) {
  if (!deliveryDate) return "Select delivery date and time";

  const date = new Date(`${deliveryDate}T12:00:00`);
  const day = date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  if (!timeSlot) return day;
  return `${day}, ${timeSlot}`;
}

/** Build a full ISO datetime for POST /orders from YYYY-MM-DD + optional slot. */
export function toOrderDeliveryDateIso(
  dateYmd: string,
  timeSlot = "",
): string | undefined {
  if (!dateYmd.trim()) return undefined;

  const [year, month, day] = dateYmd.split("-").map(Number);
  if (!year || !month || !day) return undefined;

  const match = timeSlot.match(/^(\d{1,2}):(\d{2})/);
  const hours = match ? Number(match[1]) : 12;
  const minutes = match ? Number(match[2]) : 0;

  const date = new Date(year, month - 1, day, hours, minutes, 0, 0);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
}

import type { Distributor } from "@/types/distributor";
import type { ManualCatalogItem, ManualLine } from "@/types/distributorOrder";
import type { Item } from "@/types/item";
import type { Source } from "@/types/source";
import { findByEntityRef, matchesEntityRef } from "@/utils/entityIds";
import { parseDeliveryDateId } from "@/utils/deliveryCalendar";
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

const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

function parseSlotStart(timeSlot: string) {
  const match = timeSlot
    .trim()
    .match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?/i);
  if (!match) return null;
  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const meridiem = match[3]?.toUpperCase();
  if (meridiem === "PM" && hours < 12) hours += 12;
  if (meridiem === "AM" && hours === 12) hours = 0;
  if (hours > 23 || minutes > 59) return null;
  return { hours, minutes };
}

/**
 * INTEGRATION: POST /orders `deliveryDate` must be this instant. The server
 * should reject a time that is not in the future or not listed on
 * `distributor.deliverySchedule` for that weekday.
 */
export function toOrderDeliveryDateIso(
  dateYmd: string,
  timeSlot = "",
): string | undefined {
  if (!dateYmd.trim()) return undefined;

  const [year, month, day] = dateYmd.split("-").map(Number);
  if (!year || !month || !day) return undefined;

  const parsed = parseSlotStart(timeSlot);
  const hours = parsed?.hours ?? 12;
  const minutes = parsed?.minutes ?? 0;

  const date = new Date(year, month - 1, day, hours, minutes, 0, 0);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
}

export function weekdayKeyForDateId(dateYmd: string) {
  const date = parseDeliveryDateId(dateYmd);
  if (!date) return "";
  return WEEKDAY_SHORT[date.getDay()] ?? "";
}

/** Times for the selected day, or the distributor's times when that day has none. */
export function deliveryTimesForDate(
  distributor: Distributor | undefined,
  dateYmd: string,
) {
  if (!distributor || !dateYmd) return [];
  const slots = distributor.deliveryDays ?? [];
  const weekday = weekdayKeyForDateId(dateYmd);
  const forDay = weekday
    ? slots
        .filter((slot) => slot.day === weekday && slot.time.trim())
        .map((slot) => slot.time.trim())
    : [];
  const times =
    forDay.length > 0
      ? forDay
      : slots.map((slot) => slot.time.trim()).filter(Boolean);
  return Array.from(new Set(times));
}

/**
 * Manual orders must be scheduled in the future. Any calendar day is allowed.
 */
export function manualDeliveryError(input: {
  distributor: Distributor | undefined;
  dateYmd: string;
  timeSlot: string;
  now?: Date;
}) {
  const slots = input.distributor?.deliveryDays ?? [];
  if (!input.distributor) return "Select a distributor.";
  if (slots.length === 0 || slots.every((slot) => !slot.time.trim())) {
    return "This distributor has no delivery days and times. Add them before creating an order.";
  }
  if (!input.dateYmd) return "Select a delivery date.";
  const times = deliveryTimesForDate(input.distributor, input.dateYmd);
  if (times.length === 0) {
    return "This distributor has no delivery times.";
  }
  if (!input.timeSlot) return "Select a delivery time.";
  if (!times.includes(input.timeSlot)) {
    return "That time is not on this distributor's delivery schedule.";
  }
  const iso = toOrderDeliveryDateIso(input.dateYmd, input.timeSlot);
  const when = iso ? new Date(iso) : null;
  const now = input.now ?? new Date();
  if (!when || when.getTime() <= now.getTime()) {
    return "Delivery date and time must be in the future.";
  }
  return "";
}

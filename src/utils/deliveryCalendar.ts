import type { Distributor } from "@/types/distributor";

const WEEKDAY_TO_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

export const CALENDAR_WEEKDAY_HEADERS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export function toDeliveryDateId(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Calendar-day id for an API timestamp or `YYYY-MM-DD` value. Date-only strings stay on that day. */
export function deliveryDateIdFromValue(value?: string | null) {
  if (!value?.trim()) return "";
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return "";
  return toDeliveryDateId(parsed);
}

export function parseDeliveryDateId(id: string) {
  const [year, month, day] = id.split("-").map(Number);
  if (!year || !month || !day) return null;
  const date = new Date(year, month - 1, day);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function formatDeliveryChipLabel(date: Date) {
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function formatCalendarMonth(date: Date) {
  return date.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

/** Label for a delivery day chosen in the admin calendar. No invented time window. */
export function formatExpectedDelivery(deliveryDate: Date) {
  if (Number.isNaN(deliveryDate.getTime())) return "N/A";
  return deliveryDate.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatTodayLabel(date = new Date()) {
  const formatted = date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return `Today, ${formatted}`;
}

function distributorsForFilter(
  distributors: Distributor[],
  distributorName?: string,
) {
  const normalized = distributorName?.trim();
  if (!normalized) return distributors;

  const matches = distributors.filter(
    (entry) =>
      entry.name === normalized ||
      entry.name.includes(normalized) ||
      normalized.includes(entry.name),
  );
  return matches.length > 0 ? matches : distributors;
}

/** JavaScript weekday indices (0 = Sun) where at least one distributor delivers. */
export function getDeliveryWeekdayIndices(
  distributors: Distributor[],
  distributorName?: string,
) {
  const scoped = distributorsForFilter(distributors, distributorName);
  const indices = new Set<number>();

  for (const distributor of scoped) {
    for (const slot of distributor.deliveryDays ?? []) {
      const index = WEEKDAY_TO_INDEX[slot.day];
      if (index !== undefined) indices.add(index);
    }
  }

  return indices;
}

export function isDeliveryWeekday(
  date: Date,
  deliveryWeekdays: Set<number>,
) {
  return deliveryWeekdays.has(date.getDay());
}

export function startOfLocalDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

/** Customer and distributor order chips are weekly Wednesdays (JS weekday 3). */
export const WEDNESDAY_WEEKDAYS = new Set([3]);

export function isWednesdayDateId(dateId: string) {
  const date = parseDeliveryDateId(dateId);
  return date != null && date.getDay() === 3;
}

/** Today when it is Wednesday, otherwise the next Wednesday. */
export function upcomingWednesday(from = new Date()) {
  const date = startOfLocalDay(from);
  const delta = (3 - date.getDay() + 7) % 7;
  date.setDate(date.getDate() + delta);
  return date;
}

/** Wednesday chip for a delivery day: that day if Wednesday, otherwise the next one. */
export function deliveryWeekId(dayId: string) {
  const day = dayId ? parseDeliveryDateId(dayId) : null;
  return day ? toDeliveryDateId(upcomingWednesday(day)) : dayId;
}

export type WednesdayOrderChip = {
  id: string;
  label: string;
  count: number;
};

/** Move a calendar-day id by `days`. Invalid ids start from `fallback`. */
export function shiftDateId(dateId: string, days: number, fallback = new Date()) {
  const date = parseDeliveryDateId(dateId) ?? startOfLocalDay(fallback);
  date.setDate(date.getDate() + days);
  return toDeliveryDateId(date);
}

/**
 * Three chips centered on `centerDateId`: one week before, that day, and one week after.
 * A new calendar selection replaces this window instead of appending another chip.
 */
export function weekWindowChips(
  centerDateId: string,
  counts: ReadonlyMap<string, number> = new Map(),
  fallback = new Date(),
): WednesdayOrderChip[] {
  const center = parseDeliveryDateId(centerDateId)
    ? centerDateId
    : toDeliveryDateId(startOfLocalDay(fallback));

  return [-7, 0, 7].map((offset) => {
    const id = offset === 0 ? center : shiftDateId(center, offset);
    const date = parseDeliveryDateId(id);
    return {
      id,
      label: date ? formatDeliveryChipLabel(date) : id,
      count: counts.get(id) ?? 0,
    };
  });
}

/** Today, otherwise the next chip, otherwise the most recent one. */
export function pickDefaultDeliveryChipId(
  chips: { id: string }[],
  from = new Date(),
) {
  if (chips.length === 0) return "";
  const today = toDeliveryDateId(from);
  const upcoming = chips.find((chip) => chip.id >= today);
  return (upcoming ?? chips[chips.length - 1]).id;
}

/** Delivery days from today through the next several months. */
export function getUpcomingDeliveryDates(
  deliveryWeekdays: Set<number>,
  from = new Date(),
  horizonDays = 180,
) {
  const start = startOfLocalDay(from);
  const end = new Date(start);
  end.setDate(end.getDate() + horizonDays);
  return getDeliveryDatesInRange(start, end, deliveryWeekdays);
}

export function getDeliveryDatesInRange(
  start: Date,
  end: Date,
  deliveryWeekdays: Set<number>,
) {
  const dates: Date[] = [];
  const cursor = new Date(start);
  cursor.setHours(0, 0, 0, 0);

  const endTime = end.getTime();
  while (cursor.getTime() <= endTime) {
    if (isDeliveryWeekday(cursor, deliveryWeekdays)) {
      dates.push(new Date(cursor));
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return dates;
}

export function getMonthGridCells(year: number, month: number) {
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: Array<number | null> = [];

  for (let i = 0; i < firstWeekday; i += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) cells.push(day);
  while (cells.length % 7 !== 0) cells.push(null);

  return cells;
}

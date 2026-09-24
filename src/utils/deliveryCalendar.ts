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

export function formatExpectedDelivery(deliveryDate: Date) {
  const expected = new Date(deliveryDate);
  expected.setDate(expected.getDate() - 2);

  const dayLabel = expected.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  return `${dayLabel}, 06:00–08:00 AM`;
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

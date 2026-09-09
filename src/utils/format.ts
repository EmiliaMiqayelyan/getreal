export const WEEK_DAYS = [
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
  "Sun",
] as const;

export function formatClock(value: string) {
  const [hoursRaw, minutesRaw] = value.split(":");
  const hours = Number(hoursRaw);
  const minutes = Number(minutesRaw);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return value;
  const suffix = hours >= 12 ? "PM" : "AM";
  const hour = ((hours + 11) % 12) + 1;
  return `${hour}:${String(minutes).padStart(2, "0")} ${suffix}`;
}

export function locationFromAddress(address: string) {
  const parts = address
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length >= 3) {
    const city = parts[parts.length - 2];
    const state = (parts[parts.length - 1] ?? "").split(/\s+/)[0];
    return [city, state].filter(Boolean).join(", ");
  }
  return address.trim() || "—";
}

/** Prefer street-level address; fall back to the short location string. */
export function resolveFullAddress(
  fullAddress?: string | null,
  fallback?: string | null,
) {
  const full = fullAddress?.trim();
  if (full) return full;
  const short = fallback?.trim();
  if (short && short !== "—") return short;
  return "";
}

export function formatDeliveryLabel(
  slots: Array<{ day: string; time: string }>,
) {
  if (!slots.length) return { days: "—", time: "" };
  const sorted = [...slots].sort(
    (a, b) =>
      WEEK_DAYS.indexOf(a.day as (typeof WEEK_DAYS)[number]) -
      WEEK_DAYS.indexOf(b.day as (typeof WEEK_DAYS)[number]),
  );
  const days = sorted.map((slot) => slot.day).join(", ");
  const times = [...new Set(sorted.map((slot) => formatClock(slot.time)))];
  return { days, time: times.join(", ") };
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

export function formatPricePerUnit(price: number, unit: string): string {
  return `${formatCurrency(price)} / ${unit}`;
}

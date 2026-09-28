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

export type AddressParts = {
  street: string;
  apt: string;
  city: string;
  state: string;
  zip: string;
};

const ZIP_PATTERN = /^\d{5}(?:-\d{4})?$/;
const STATE_PATTERN = /^[A-Za-z]{2}$/;
const STATE_ZIP_PATTERN = /^([A-Za-z]{2})\s+(\d{5}(?:-\d{4})?)$/;

/**
 * Splits a US address into street, apt, city, state, and ZIP.
 * Accepts "1523 Astoria Blvd, 748, Queens, NY, 11102" and
 * "123 Main St, Queens, NY 11102".
 */
export function parseAddressParts(value: string, location = ""): AddressParts {
  const parts = value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  const empty: AddressParts = {
    street: "",
    apt: "",
    city: "",
    state: "",
    zip: "",
  };
  if (parts.length === 0) {
    if (!location.trim()) return empty;
    return parseAddressParts(location);
  }

  const working = [...parts];
  let state = "";
  let zip = "";
  const last = working[working.length - 1] ?? "";
  const stateZip = last.match(STATE_ZIP_PATTERN);

  if (stateZip) {
    state = stateZip[1].toUpperCase();
    zip = stateZip[2];
    working.pop();
  } else if (ZIP_PATTERN.test(last)) {
    zip = last;
    working.pop();
    const maybeState = working[working.length - 1] ?? "";
    if (STATE_PATTERN.test(maybeState)) {
      state = maybeState.toUpperCase();
      working.pop();
    }
  } else if (STATE_PATTERN.test(last) && working.length >= 2) {
    state = last.toUpperCase();
    working.pop();
  }

  let city = "";
  if (state && working.length >= 1) {
    city = working.pop() ?? "";
  }

  const street = working[0] ?? "";
  const apt = working.slice(1).join(", ");
  const parsed = { street, apt, city, state, zip };
  if (parsed.city || parsed.state || !location.trim()) return parsed;

  const fromLocation = parseAddressParts(location);
  return {
    ...parsed,
    city: fromLocation.city,
    state: fromLocation.state,
    zip: parsed.zip || fromLocation.zip,
  };
}

export function formatCityState(city: string, state: string) {
  return [city.trim(), state.trim()].filter(Boolean).join(", ");
}

/** "1523 Astoria Blvd, 748, Queens, NY, 11102" */
export function formatAddressParts(parts: Partial<AddressParts>) {
  return [parts.street, parts.apt, parts.city, parts.state, parts.zip]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(", ");
}

export function formatFullAddress(parts: Partial<AddressParts>) {
  return formatAddressParts(parts);
}

export function locationFromAddress(address: string) {
  const { city, state } = parseAddressParts(address);
  const location = formatCityState(city, state);
  if (location) return location;
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

/** US national digits, dropping a leading country code when present. */
function nationalPhoneDigits(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length >= 11 && digits.startsWith("1")) return digits.slice(1, 11);
  return digits.slice(0, 10);
}

/**
 * Generic US phone mask: (212) 555-1234.
 * Partial input is masked the same way while the user is typing.
 */
export function formatPhone(value: string) {
  const digits = nationalPhoneDigits(value);
  if (!digits) return "";
  if (digits.length < 4) return `(${digits}`;
  if (digits.length < 7) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

/**
 * Apply the generic phone mask, including backspace through a separator
 * so deleting ")" or "-" also removes the digit behind it.
 */
export function formatPhoneInput(previous: string, next: string) {
  let digits = next.replace(/\D/g, "");
  if (digits.length >= 11 && digits.startsWith("1")) {
    digits = digits.slice(1, 11);
  } else {
    digits = digits.slice(0, 10);
  }

  const previousDigits = nationalPhoneDigits(previous);
  if (
    next.length < previous.length &&
    digits === previousDigits &&
    previousDigits.length > 0
  ) {
    digits = previousDigits.slice(0, -1);
  }

  return formatPhone(digits);
}

/** Stored value: generic US format when the number is complete, otherwise unchanged. */
export function formatPhoneValue(value: string) {
  const digits = value.replace(/\D/g, "");
  const national =
    digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  if (national.length !== 10) return value;
  return `(${national.slice(0, 3)}) ${national.slice(3, 6)}-${national.slice(6)}`;
}

/** Table display: full generic format for a complete number, otherwise the raw value. */
export function formatPhoneDisplay(value: string) {
  const formatted = formatPhoneValue(value).trim();
  return formatted || "—";
}

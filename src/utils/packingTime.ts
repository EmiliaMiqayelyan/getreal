/** Operational packing timestamp, e.g. `7/29/26, 8:45am`. */
export function formatOperationalTimestamp(date = new Date()): string {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const year = String(date.getFullYear()).slice(-2);
  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const suffix = hours >= 12 ? "pm" : "am";
  hours = hours % 12 || 12;
  return `${month}/${day}/${year}, ${hours}:${minutes}${suffix}`;
}

const DISPLAY_STAMP = /^\d{1,2}\/\d{1,2}\/\d{2}, \d{1,2}:\d{2}(am|pm)$/i;

/**
 * Show a stored packing timestamp.
 * Display strings are kept as recorded. ISO values are formatted once.
 * Empty and unparseable values stay blank so a refresh cannot invent a time.
 */
export function displayOperationalTimestamp(
  value?: string | null,
): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  if (DISPLAY_STAMP.test(trimmed)) return trimmed;
  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) return undefined;
  return formatOperationalTimestamp(date);
}

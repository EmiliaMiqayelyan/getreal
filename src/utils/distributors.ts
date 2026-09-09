import type { Distributor, DistributorContact } from "@/types/distributor";
import { locationFromAddress, resolveFullAddress } from "@/utils/format";

/** Next sequential ID in DIS-10001 format. */
export function nextDistributorId(rows: Distributor[]) {
  const numbers = rows
    .map((row) => Number(row.id.replace(/\D/g, "")))
    .filter((value) => Number.isFinite(value));
  const max = numbers.length ? Math.max(...numbers) : 10000;
  return `DIS-${max + 1}`;
}

/** Primary contact only — used for Contact Info and Phone columns. */
export function getPrimaryContact(
  distributor: Distributor,
): DistributorContact | null {
  const contacts = distributor.contacts ?? [];
  return contacts.find((contact) => contact.primary) ?? contacts[0] ?? null;
}

/** City and state derived from the distributor's saved full address. */
export function getDistributorLocation(distributor: Distributor) {
  const address = distributor.fullAddress?.trim();
  if (address) return locationFromAddress(address);
  return distributor.location.trim() || "—";
}

/** Street-level address for hover tooltips (falls back to city/state). */
export function getDistributorFullAddress(distributor: Distributor) {
  return resolveFullAddress(
    distributor.fullAddress,
    getDistributorLocation(distributor),
  );
}

export function getPrimaryContactName(distributor: Distributor) {
  const primary = getPrimaryContact(distributor);
  if (!primary) return "—";
  return `${primary.firstName} ${primary.lastName}`.trim() || "—";
}

export function getPrimaryContactPhone(distributor: Distributor) {
  const primary = getPrimaryContact(distributor);
  return primary?.phone.trim() || "—";
}

export type DistributorFilterCriteria = {
  query?: string;
  location?: string;
  weekday?: string;
};

/**
 * Search by distributor name, filter by location, and match any configured
 * delivery weekday. Active criteria are combined (AND).
 */
export function filterDistributors(
  distributors: Distributor[],
  { query = "", location = "", weekday = "" }: DistributorFilterCriteria,
): Distributor[] {
  const normalized = query.trim().toLowerCase();

  return distributors.filter((distributor) => {
    const matchesName =
      !normalized || distributor.name.toLowerCase().includes(normalized);
    const matchesLocation =
      !location || getDistributorLocation(distributor) === location;
    const matchesWeekday =
      !weekday ||
      (distributor.deliveryDays ?? []).some((slot) => slot.day === weekday);
    return matchesName && matchesLocation && matchesWeekday;
  });
}

export function uniqueDistributorLocations(distributors: Distributor[]) {
  return Array.from(
    new Set(
      distributors
        .map((distributor) => getDistributorLocation(distributor))
        .filter((location) => location !== "—"),
    ),
  ).sort();
}

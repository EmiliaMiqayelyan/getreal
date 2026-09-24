import type { Distributor, DistributorContact } from "@/types/distributor";
import {
  formatDeliveryLabel,
  formatPhoneDisplay,
  locationFromAddress,
  resolveFullAddress,
} from "@/utils/format";

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
  return formatPhoneDisplay(primary?.phone ?? distributor.phone ?? "");
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

/** Column order and labels match the Distributors table. */
const DISTRIBUTOR_EXPORT_HEADERS = [
  "Distr. ID",
  "Name",
  "Location",
  "Contact Info",
  "Phone",
  "Delivery Info",
  "Documents",
  "Notes",
] as const;

function csvCell(value: string) {
  if (/[",\n\r]/.test(value)) return `"${value.replaceAll('"', '""')}"`;
  return value;
}

function distributorExportCells(distributor: Distributor) {
  const delivery = formatDeliveryLabel(distributor.deliveryDays ?? []);
  const deliveryInfo = [delivery.days, delivery.time]
    .filter((part) => part && part !== "—")
    .join(" ");
  const documents = (distributor.documents ?? [])
    .map((doc) => doc.name.trim())
    .filter(Boolean);

  const name = distributor.name.trim() || "—";
  const terms = distributor.paymentTerms?.trim();
  const nameCell = terms ? `${name}\n${terms}` : name;

  return [
    distributor.id,
    nameCell,
    getDistributorLocation(distributor),
    getPrimaryContactName(distributor),
    getPrimaryContactPhone(distributor),
    deliveryInfo || "—",
    documents.length ? documents.join("; ") : "—",
    distributor.notes?.trim() || "—",
  ];
}

/** CSV of the rows and columns shown on the Distributors screen. */
export function distributorsToCsv(distributors: Distributor[]) {
  const lines = [
    DISTRIBUTOR_EXPORT_HEADERS.join(","),
    ...distributors.map((distributor) =>
      distributorExportCells(distributor).map(csvCell).join(","),
    ),
  ];
  return lines.join("\r\n");
}

export function downloadDistributorsCsv(
  distributors: Distributor[],
  filename = "distributors.csv",
) {
  const blob = new Blob([`\uFEFF${distributorsToCsv(distributors)}`], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

import type { Distributor, DistributorContact } from "@/types/distributor";
import { downloadCsvFile, exportFilename } from "@/utils/csvExport";
import {
  formatCityState,
  formatDeliveryLabel,
  formatFullAddress,
  formatPhoneDisplay,
  parseAddressParts,
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

function cityStateFrom(value: string) {
  const { city, state } = parseAddressParts(value);
  return formatCityState(city, state);
}

/** City and state only, e.g. "Queens, NY". */
export function getDistributorLocation(distributor: Distributor) {
  const fromParts = formatCityState(
    distributor.city ?? "",
    distributor.state ?? "",
  );
  if (fromParts) return fromParts;

  const fromAddress = cityStateFrom(distributor.fullAddress ?? "");
  if (fromAddress) return fromAddress;

  const stored = distributor.location.trim();
  const fromLocation = cityStateFrom(stored);
  if (fromLocation) return fromLocation;
  return stored || "—";
}

/** Whole address for hover, e.g. "1523 Astoria Blvd, 748, Queens, NY, 11102". */
export function getDistributorFullAddress(distributor: Distributor) {
  const composed = formatFullAddress({
    street: distributor.street,
    apt: distributor.apt,
    city: distributor.city,
    state: distributor.state,
    zip: distributor.zip,
  });
  const stored = distributor.fullAddress?.trim() ?? "";
  if (composed && stored) {
    return composed.length >= stored.length ? composed : stored;
  }
  if (composed) return composed;
  return resolveFullAddress(stored, getDistributorLocation(distributor));
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

function distributorExportCells(distributor: Distributor) {
  const delivery = formatDeliveryLabel(distributor.deliveryDays ?? []);
  const deliveryInfo = [delivery.days, delivery.time]
    .filter((part) => part && part !== "—")
    .join("\n");
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
export function downloadDistributorsCsv(
  distributors: Distributor[],
  filename = exportFilename("distributors"),
) {
  downloadCsvFile(filename, [
    [...DISTRIBUTOR_EXPORT_HEADERS],
    ...distributors.map((distributor) => distributorExportCells(distributor)),
  ]);
}

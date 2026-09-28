import type { Source } from "@/types/source";
import { downloadCsvFile, exportFilename } from "@/utils/csvExport";
import { apiId, findByEntityRef } from "@/utils/entityIds";
import {
  formatCityState,
  formatFullAddress,
  parseAddressParts,
  resolveFullAddress,
} from "@/utils/format";

export type SourceFilterCriteria = {
  query?: string;
  location?: string;
  distributor?: string;
};

/** True when the source has a linked distributor record (not self-as-distributor). */
export function sourceHasExternalDistributor(source: Source) {
  if (source.distributorId) return true;
  const distributor = source.distributor?.trim();
  if (!distributor || distributor === "—") return false;
  return distributor !== source.name.trim();
}

/** Dropdown value when editing a source in the modal. */
export function getSourceDistributorSelection(source: Source) {
  return sourceHasExternalDistributor(source) ? source.distributor : "";
}

/** Distributor column and downstream flows when no external distributor is linked. */
export function getSourceDistributorDisplay(source: Source) {
  if (sourceHasExternalDistributor(source)) return source.distributor;
  return source.name;
}

export function getSourceEffectiveDistributor(source: Source) {
  if (sourceHasExternalDistributor(source)) {
    return {
      name: source.distributor,
      id: source.distributorId,
    };
  }

  return {
    name: source.name,
    id: undefined,
  };
}

export function normalizeSourceDistributor(source: Source): Source {
  if (sourceHasExternalDistributor(source)) return source;
  return {
    ...source,
    distributor: "",
    distributorId: undefined,
  };
}

/** Whether a Source is linked to the given Distributor name. */
export function sourceBelongsToDistributor(
  source: Source,
  distributorName: string,
) {
  const distributor = distributorName.trim();
  if (!distributor) return false;
  return getSourceDistributorDisplay(source) === distributor;
}

export function sourceNamesForDistributor(
  sources: Source[],
  distributorName: string,
) {
  return sources
    .filter((source) => sourceBelongsToDistributor(source, distributorName))
    .map((source) => source.name)
    .sort();
}

/** Search by source name; location and distributor filters combine with AND. */
export function filterSources(
  sources: Source[],
  { query = "", location = "", distributor = "" }: SourceFilterCriteria,
) {
  const normalized = query.trim().toLowerCase();

  return sources.filter((source) => {
    const matchesName =
      !normalized || source.name.toLowerCase().includes(normalized);
    const matchesLocation = !location || getSourceLocation(source) === location;
    const matchesDistributor =
      !distributor || getSourceDistributorDisplay(source) === distributor;
    return matchesName && matchesLocation && matchesDistributor;
  });
}

function cityStateFrom(value: string) {
  const { city, state } = parseAddressParts(value);
  return formatCityState(city, state);
}

/** City and state only, e.g. "Queens, NY". */
export function getSourceLocation(source: Source) {
  const fromParts = formatCityState(source.city ?? "", source.state ?? "");
  if (fromParts) return fromParts;

  const fromAddress = cityStateFrom(source.fullAddress ?? "");
  if (fromAddress) return fromAddress;

  const stored = source.location.trim();
  const fromLocation = cityStateFrom(stored);
  if (fromLocation) return fromLocation;
  return stored || "—";
}

/** Whole address for hover, e.g. "1523 Astoria Blvd, 748, Queens, NY, 11102". */
export function getSourceFullAddress(source: Source) {
  const composed = formatFullAddress({
    street: source.street,
    apt: source.apt,
    city: source.city,
    state: source.state,
    zip: source.zip,
  });
  const stored = source.fullAddress?.trim() ?? "";
  const normalizedStored = stored
    ? formatFullAddress(parseAddressParts(stored)) || stored
    : "";
  if (composed && normalizedStored) {
    return composed.length >= normalizedStored.length
      ? composed
      : normalizedStored;
  }
  if (composed) return composed;
  return resolveFullAddress(normalizedStored, getSourceLocation(source));
}

export function uniqueSourceLocations(sources: Source[]) {
  return Array.from(
    new Set(sources.map((source) => getSourceLocation(source)).filter(Boolean)),
  ).sort();
}

export function nextSourceId(sources: Source[]) {
  const numbers = sources
    .map((row) => Number(row.id.replace(/\D/g, "")))
    .filter((value) => Number.isFinite(value));
  const max = numbers.length ? Math.max(...numbers) : 0;
  return `SOR-${String(max + 1).padStart(5, "0")}`;
}

const SOURCE_EXPORT_HEADERS = [
  "Source ID",
  "Photo",
  "Name",
  "Location",
  "Distributor",
  "Description",
] as const;

function sourcePhotoExportValue(logoUrl: string | null) {
  if (!logoUrl) return "—";
  if (logoUrl.startsWith("http://") || logoUrl.startsWith("https://")) {
    return logoUrl;
  }
  return "Image";
}

/** CSV of the rows and columns shown on the Source screen. */
export function downloadSourcesCsv(
  sources: Source[],
  filename = exportFilename("sources"),
) {
  downloadCsvFile(filename, [
    [...SOURCE_EXPORT_HEADERS],
    ...sources.map((source) => [
      source.id,
      sourcePhotoExportValue(source.logoUrl),
      source.name,
      getSourceLocation(source),
      getSourceDistributorDisplay(source),
      source.description.trim() || "—",
    ]),
  ]);
}

type SourceLinked = {
  source: string;
  sourceId?: string;
};

export function resolveSourceId(sourceName: string, sources: Source[]) {
  const normalized = sourceName.trim();
  if (!normalized) return undefined;
  const match = sources.find((source) => source.name === normalized);
  return match ? apiId(match) : undefined;
}

export function attachSourceIds<T extends SourceLinked>(
  records: T[],
  sources: Source[],
): T[] {
  return records.map((record) => ({
    ...record,
    sourceId: record.sourceId ?? resolveSourceId(record.source, sources),
  }));
}

export function findSourceForRecord(
  record: SourceLinked,
  sources: Source[],
  previousSources: Source[] = [],
) {
  if (record.sourceId) {
    return findByEntityRef(sources, record.sourceId);
  }

  const previousById = new Map(
    previousSources.map((source) => [source.id, source]),
  );

  return sources.find((source) => {
    if (source.name === record.source) return true;
    const previous = previousById.get(source.id);
    return previous?.name === record.source;
  });
}

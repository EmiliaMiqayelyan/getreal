import type { Item, ItemPhoto } from "@/types/item";
import { downloadCsvFile, exportFilename } from "@/utils/csvExport";

const PLACEHOLDER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96"><rect width="96" height="96" rx="12" fill="#F3E6A8"/><path d="M28 62l12-16 10 12 8-8 14 12H28z" fill="#D4C56A"/><circle cx="38" cy="36" r="6" fill="#D4C56A"/></svg>`;

export const ITEM_PHOTO_PLACEHOLDER = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
  PLACEHOLDER_SVG,
)}`;

export function getItemDisplayName(item: Item) {
  return item.merchandisingName.trim() || item.name;
}

/**
 * Buying / inventory unit label.
 * Case items leave `singleItemUnit` empty and use `caseBy` (from buyingUnit).
 */
export function getItemUnitLabel(
  item: Pick<Item, "singleItemUnit" | "sourcePer" | "caseBy"> | undefined,
) {
  if (!item) return "";
  const single = item.singleItemUnit.trim();
  if (single) return single;
  if (item.sourcePer === "Case") return item.caseBy.trim() || "Case";
  return item.sourcePer.trim();
}

/** Unit of Sales: merchandise weight, then piece/case buying label. */
export function getItemSaleUnit(item: Item) {
  return (
    item.merchandiseWeight.trim() ||
    getItemUnitLabel(item) ||
    "—"
  );
}

export function getItemPrimaryPhoto(item: Item) {
  const primary =
    item.photos.find((photo) => photo.isPrimary) ?? item.photos[0];
  return primary?.url || ITEM_PHOTO_PLACEHOLDER;
}

/** Mark one photo primary and keep it first. Defaults to the current primary. */
export function selectPrimaryPhoto(photos: ItemPhoto[], primaryId?: string) {
  if (photos.length === 0) return [];
  const selectedId =
    primaryId && photos.some((photo) => photo.id === primaryId)
      ? primaryId
      : (photos.find((photo) => photo.isPrimary)?.id ?? photos[0].id);
  const next = photos.map((photo) => ({
    ...photo,
    isPrimary: photo.id === selectedId,
  }));
  const index = next.findIndex((photo) => photo.id === selectedId);
  if (index > 0) {
    const [primary] = next.splice(index, 1);
    next.unshift(primary);
  }
  return next;
}

export function nextItemId(rows: Item[]) {
  const numbers = rows
    .map((row) => Number(row.id.replace(/\D/g, "")))
    .filter((value) => Number.isFinite(value));
  const max = numbers.length ? Math.max(...numbers) : 0;
  return `IT-${String(max + 1).padStart(6, "0")}`;
}

const ITEM_EXPORT_HEADERS = [
  "Item ID",
  "Photo",
  "Name / Description",
  "Category",
  "Sub-Category",
  "Sale Price",
  "Source",
  "Distributor",
] as const;

function itemPhotoExportValue(url: string | undefined) {
  if (!url || url.startsWith("data:")) return "—";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return "Image";
}

/** CSV of the rows and columns shown on the Items screen. */
export function downloadItemsCsv(
  items: Item[],
  salePrice: (item: Item) => string,
  filename = exportFilename("items"),
) {
  const rows: string[][] = [
    [...ITEM_EXPORT_HEADERS],
    ...items.map((item) => [
      item.id,
      itemPhotoExportValue(getItemPrimaryPhoto(item)),
      `${getItemDisplayName(item)}\n${item.description.trim() || "—"}`,
      item.category || "—",
      item.subcategory?.trim() || "—",
      `${salePrice(item)}\n${getItemSaleUnit(item)}`,
      item.source?.trim() || "—",
      item.distributor?.trim() || "—",
    ]),
  ];
  downloadCsvFile(filename, rows);
}

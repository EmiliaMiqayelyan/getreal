import type { Item } from "@/types/item";

const PLACEHOLDER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96"><rect width="96" height="96" rx="12" fill="#F3E6A8"/><path d="M28 62l12-16 10 12 8-8 14 12H28z" fill="#D4C56A"/><circle cx="38" cy="36" r="6" fill="#D4C56A"/></svg>`;

export const ITEM_PHOTO_PLACEHOLDER = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
  PLACEHOLDER_SVG,
)}`;

export function getItemDisplayName(item: Item) {
  return item.merchandisingName.trim() || item.name;
}

export function getItemPrimaryPhoto(item: Item) {
  return item.photos[0]?.url ?? ITEM_PHOTO_PLACEHOLDER;
}

export function nextItemId(rows: Item[]) {
  const numbers = rows
    .map((row) => Number(row.id.replace(/\D/g, "")))
    .filter((value) => Number.isFinite(value));
  const max = numbers.length ? Math.max(...numbers) : 0;
  return `IT-${String(max + 1).padStart(6, "0")}`;
}

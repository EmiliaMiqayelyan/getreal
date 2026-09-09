import { ITEMS } from "@/constants/items";
import type { ProductForSale } from "@/types/productForSale";
import type { Item } from "@/types/item";

function fromItem(
  item: Item,
  id: string,
  sortOrder: number,
  live = true,
): ProductForSale {
  return {
    id,
    itemId: item.id,
    sortOrder,
    live,
    merchandisingName: item.merchandisingName,
    category: item.category,
    subcategory: item.subcategory,
    source: item.source,
    sourceId: item.sourceId,
    distributor: item.distributor,
    distributorId: item.distributorId,
    salesPrice: item.sellingPrice,
    unitOfSales: item.singleItemUnit,
    photos: item.photos.map((photo) => ({ ...photo })),
    description: item.description,
  };
}

function requireItem(id: string) {
  const item = ITEMS.find((entry) => entry.id === id);
  if (!item) throw new Error(`Missing item ${id}`);
  return item;
}

/** Seeded list matching Figma Products For Sale protein tables. */
export const PRODUCTS_FOR_SALE: ProductForSale[] = [
  fromItem(requireItem("IT-000009"), "PR-001", 0),
  fromItem(requireItem("IT-000003"), "PR-002", 1),
  fromItem(requireItem("IT-000011"), "PR-003", 2),
  fromItem(requireItem("IT-000012"), "PR-004", 3),
  fromItem(requireItem("IT-000014"), "PR-005", 4),
  fromItem(requireItem("IT-000015"), "PR-006", 5),
];

export function productFromItem(
  item: Item,
  id: string,
  sortOrder: number,
): ProductForSale {
  return fromItem(item, id, sortOrder, true);
}

/** Re-link a product to another item while preserving identity and live status. */
export function relinkProductToItem(
  product: ProductForSale,
  item: Item,
): ProductForSale {
  return {
    ...productFromItem(item, product.id, product.sortOrder),
    live: product.live,
  };
}

export function nextProductId(rows: ProductForSale[]) {
  const numbers = rows
    .map((row) => Number(row.id.replace(/\D/g, "")))
    .filter((value) => Number.isFinite(value));
  const max = numbers.length ? Math.max(...numbers) : 0;
  return `PR-${String(max + 1).padStart(3, "0")}`;
}

export function nextProductSortOrder(rows: ProductForSale[]) {
  if (rows.length === 0) return 0;
  return Math.max(...rows.map((row) => row.sortOrder)) + 1;
}

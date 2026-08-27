import { ITEMS } from "@/constants/items";
import type { ProductForSale } from "@/types/productForSale";
import type { Item } from "@/types/item";

function fromItem(
  item: Item,
  id: string,
  live = true,
): ProductForSale {
  return {
    id,
    itemId: item.id,
    live,
    merchandisingName: item.merchandisingName,
    category: item.category,
    subcategory: item.subcategory,
    source: item.source,
    distributor: item.distributor,
    salesPrice: item.sellingPrice,
    unitOfSales: item.singleItemUnit,
    photos: item.photos,
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
  fromItem(requireItem("IT-000009"), "PR-001"),
  fromItem(requireItem("IT-000003"), "PR-002"),
  fromItem(requireItem("IT-000011"), "PR-003"),
  fromItem(requireItem("IT-000012"), "PR-004"),
  fromItem(requireItem("IT-000014"), "PR-005"),
  fromItem(requireItem("IT-000015"), "PR-006"),
];

export function productFromItem(item: Item, id: string): ProductForSale {
  return fromItem(item, id, true);
}

export function nextProductId(rows: ProductForSale[]) {
  const numbers = rows
    .map((row) => Number(row.id.replace(/\D/g, "")))
    .filter((value) => Number.isFinite(value));
  const max = numbers.length ? Math.max(...numbers) : 0;
  return `PR-${String(max + 1).padStart(3, "0")}`;
}

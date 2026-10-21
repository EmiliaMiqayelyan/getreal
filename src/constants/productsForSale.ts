import type { ProductForSale } from "@/types/productForSale";
import type { Item } from "@/types/item";
import { getItemSaleUnit } from "@/utils/items";

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
    unitOfSales: getItemSaleUnit(item),
    photos: item.photos.map((photo) => ({ ...photo })),
    description: item.description,
  };
}

export const PRODUCTS_FOR_SALE: ProductForSale[] = [];

export function productFromItem(
  item: Item,
  id: string,
  sortOrder: number,
): ProductForSale {
  return fromItem(item, id, sortOrder, true);
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

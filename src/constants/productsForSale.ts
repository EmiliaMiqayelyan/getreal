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

export const PRODUCTS_FOR_SALE: ProductForSale[] = [];

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

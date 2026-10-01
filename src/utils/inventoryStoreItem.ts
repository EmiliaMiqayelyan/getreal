import { productsApi } from "@/lib/api";
import { isUuid, recordRef } from "@/utils/entityIds";

type ProductRef = {
  id?: string;
  recordId?: string;
  itemId?: string;
};

function rememberProduct(
  productIds: Set<string>,
  productToItem: Map<string, string>,
  productId: string | undefined,
  itemId: string | undefined,
) {
  const product = productId?.trim() ?? "";
  const item = itemId?.trim() ?? "";
  if (!isUuid(product)) return;
  productIds.add(product);
  if (isUuid(item) && item !== product) productToItem.set(product, item);
}

/**
 * POST /inventory/store requires `items.id`.
 * Order and delivery lines often carry the sellable product UUID instead.
 * Known catalog item ids stay as they are. Product ids are replaced with
 * the linked `product.itemId`.
 */
export async function resolveInventoryStoreItemIds(
  candidates: string[],
  knownItemIds: Iterable<string>,
  knownProducts: ProductRef[],
): Promise<Map<string, string>> {
  const items = new Set(
    [...knownItemIds].map((id) => id.trim()).filter((id) => isUuid(id)),
  );
  const productIds = new Set<string>();
  const productToItem = new Map<string, string>();

  for (const product of knownProducts) {
    const itemId = product.itemId;
    if (product.id) {
      rememberProduct(
        productIds,
        productToItem,
        recordRef({ id: product.id, recordId: product.recordId }),
        itemId,
      );
    }
    rememberProduct(productIds, productToItem, product.id, itemId);
    rememberProduct(productIds, productToItem, product.recordId, itemId);
  }

  const needsLookup = candidates.some((candidate) => {
    const id = candidate.trim();
    return isUuid(id) && !items.has(id) && !productToItem.has(id);
  });

  if (needsLookup) {
    const listed = await productsApi.list();
    for (const product of listed) {
      rememberProduct(productIds, productToItem, product.id, product.itemId);
    }
  }

  const resolved = new Map<string, string>();
  for (const candidate of candidates) {
    const id = candidate.trim();
    if (!isUuid(id)) continue;
    if (items.has(id)) {
      resolved.set(candidate, id);
      continue;
    }
    const linked = productToItem.get(id);
    if (linked) {
      resolved.set(candidate, linked);
      continue;
    }
    if (!productIds.has(id)) resolved.set(candidate, id);
  }
  return resolved;
}

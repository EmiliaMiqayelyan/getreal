import type { Item } from "@/types/item";
import type { ProductForSale } from "@/types/productForSale";
import { matchesEntityRef } from "@/utils/entityIds";

export type AddProductForSaleInput = {
  selectedItemId: string;
  catalog: Item[];
  existingProducts: ProductForSale[];
  editingProductId?: string | null;
};

export type AddProductForSaleErrors = {
  item?: string;
};

export function validateAddProductForSale(
  input: AddProductForSaleInput,
): AddProductForSaleErrors {
  const errors: AddProductForSaleErrors = {};
  const selectedItemId = input.selectedItemId.trim();

  if (!selectedItemId) {
    errors.item = "Select an item merchandise name.";
    return errors;
  }

  const item = input.catalog.find((entry) => entry.id === selectedItemId);
  if (!item) {
    errors.item = "The selected item must exist in Item Setup.";
    return errors;
  }

  const duplicate = input.existingProducts.find(
    (product) =>
      matchesEntityRef(item, product.itemId) &&
      product.id !== (input.editingProductId ?? null),
  );
  if (duplicate) {
    errors.item = "This item is already on the Products For Sale list.";
  }

  return errors;
}

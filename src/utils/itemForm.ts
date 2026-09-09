import {
  BUYING_UNITS,
  ITEM_CATEGORIES,
  ITEM_SUBCATEGORIES,
  SINGLE_ITEM_UNITS,
} from "@/types/item";
import {
  isValidMoneyInput,
  parseContentsInput,
} from "@/utils/itemPricing";

export const ITEM_DESCRIPTION_MAX = 320;
export const ITEM_PHOTO_MAX = 3;

export type ItemFormInput = {
  name: string;
  merchandisingName: string;
  distributor: string;
  source: string;
  category: string;
  subcategory: string;
  description: string;
  photosCount: number;
  buyingUnit: string;
  buyingPrice: string;
  contents: string;
  singleItemUnit: string;
  sellingPrice: string;
  distributorOptions: string[];
  sourceOptions: string[];
};

export type ItemFormErrors = {
  name?: string;
  merchandisingName?: string;
  distributor?: string;
  source?: string;
  category?: string;
  subcategory?: string;
  description?: string;
  photos?: string;
  buyingUnit?: string;
  buyingPrice?: string;
  contents?: string;
  singleItemUnit?: string;
  sellingPrice?: string;
};

function subcategoryBelongsToCategory(category: string, subcategory: string) {
  if (!subcategory.trim()) return true;

  const options = ITEM_SUBCATEGORIES[category] ?? [];
  return options.includes(subcategory);
}

export function validateItemForm(input: ItemFormInput): ItemFormErrors {
  const errors: ItemFormErrors = {};

  if (!input.name.trim()) {
    errors.name = "Item name is required.";
  }

  if (!input.merchandisingName.trim()) {
    errors.merchandisingName = "Merchandising name is required.";
  }

  if (!input.distributor) {
    errors.distributor = "Select a distributor.";
  } else if (!input.distributorOptions.includes(input.distributor)) {
    errors.distributor = "Select a valid distributor.";
  }

  if (!input.distributor) {
    if (!input.source) {
      errors.source = "Select a source.";
    }
  } else if (!input.source) {
    errors.source = "Select a source.";
  } else if (!input.sourceOptions.includes(input.source)) {
    errors.source =
      "Select a source associated with the selected distributor.";
  }

  if (!input.category) {
    errors.category = "Select a category.";
  } else if (!(ITEM_CATEGORIES as readonly string[]).includes(input.category)) {
    errors.category = "Select a valid category.";
  } else if (!subcategoryBelongsToCategory(input.category, input.subcategory)) {
    errors.subcategory = "Select a subcategory for the selected category.";
  }

  if (input.description.length > ITEM_DESCRIPTION_MAX) {
    errors.description = `Description must be ${ITEM_DESCRIPTION_MAX} characters or fewer.`;
  }

  if (input.photosCount > ITEM_PHOTO_MAX) {
    errors.photos = `No more than ${ITEM_PHOTO_MAX} photos can be uploaded.`;
  }

  if (!input.buyingUnit) {
    errors.buyingUnit = "Select a buying unit.";
  } else if (!(BUYING_UNITS as readonly string[]).includes(input.buyingUnit)) {
    errors.buyingUnit = "Select a valid buying unit.";
  }

  if (!isValidMoneyInput(input.buyingPrice)) {
    errors.buyingPrice = "Enter a valid monetary value.";
  }

  const contents = parseContentsInput(input.contents);
  if (!input.contents.trim() || contents <= 0) {
    errors.contents = "Contents must be greater than zero.";
  }

  if (!input.singleItemUnit) {
    errors.singleItemUnit = "Select a single item unit.";
  } else if (
    !(SINGLE_ITEM_UNITS as readonly string[]).includes(input.singleItemUnit)
  ) {
    errors.singleItemUnit = "Select a valid single item unit.";
  }

  if (!isValidMoneyInput(input.sellingPrice)) {
    errors.sellingPrice = "Enter a valid monetary value.";
  }

  return errors;
}

export function hasItemFormErrors(errors: ItemFormErrors) {
  return Object.values(errors).some(Boolean);
}

export function firstItemFormErrorField(errors: ItemFormErrors) {
  const order: (keyof ItemFormErrors)[] = [
    "name",
    "merchandisingName",
    "distributor",
    "source",
    "category",
    "subcategory",
    "description",
    "photos",
    "buyingUnit",
    "buyingPrice",
    "contents",
    "singleItemUnit",
    "sellingPrice",
  ];

  for (const field of order) {
    if (errors[field]) return field;
  }

  return null;
}

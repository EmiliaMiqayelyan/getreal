import {
  CASE_BY_OPTIONS,
  ITEM_CATEGORIES,
  PIECE_WEIGHT_OPTIONS,
  SINGLE_ITEM_UNITS,
  SOURCE_PER_OPTIONS,
  type CaseBy,
  type SourcePer,
} from "@/types/item";
import {
  isValidMoneyInput,
  isValidPositiveDecimalInput,
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
  sourcePer: string;
  caseBy: string;
  pieceWeightOz: string;
  caseWeightLbs: string;
  buyingPrice: string;
  contents: string;
  singleItemUnit: string;
  sellingPrice: string;
  distributorOptions: string[];
  sourceOptions: string[];
  subcategoryOptions: string[];
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
  sourcePer?: string;
  caseBy?: string;
  pieceWeightOz?: string;
  caseWeightLbs?: string;
  buyingPrice?: string;
  contents?: string;
  singleItemUnit?: string;
  sellingPrice?: string;
};

function subcategoryBelongsToCategory(
  subcategory: string,
  options: string[],
) {
  if (!subcategory.trim()) return true;
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
  } else if (
    !subcategoryBelongsToCategory(input.subcategory, input.subcategoryOptions)
  ) {
    errors.subcategory = "Select a subcategory for the selected category.";
  }

  if (input.description.length > ITEM_DESCRIPTION_MAX) {
    errors.description = `Description must be ${ITEM_DESCRIPTION_MAX} characters or fewer.`;
  }

  if (input.photosCount < 1) {
    errors.photos = "Upload at least one item photo.";
  } else if (input.photosCount > ITEM_PHOTO_MAX) {
    errors.photos = `No more than ${ITEM_PHOTO_MAX} photos can be uploaded.`;
  }

  const sourcePer = input.sourcePer as SourcePer | "";
  if (!sourcePer) {
    errors.sourcePer = "Select how this item is sourced.";
    return errors;
  }

  if (!(SOURCE_PER_OPTIONS as readonly string[]).includes(sourcePer)) {
    errors.sourcePer = "Select a valid source type.";
    return errors;
  }

  if (sourcePer === "Unit") {
    if (!isValidMoneyInput(input.buyingPrice)) {
      errors.buyingPrice = "Enter a valid monetary value.";
    }

    const oz = Number(input.pieceWeightOz);
    const validOz = PIECE_WEIGHT_OPTIONS.some((entry) => entry.oz === oz);
    if (!validOz) {
      errors.pieceWeightOz = "Select a piece weight.";
    }

    if (!isValidMoneyInput(input.sellingPrice)) {
      errors.sellingPrice = "Enter a valid monetary value.";
    }

    return errors;
  }

  // Case path: Case by must be chosen before other case fields apply.
  const caseBy = input.caseBy as CaseBy | "";
  if (!caseBy) {
    errors.caseBy = "Select how the case is measured.";
    return errors;
  }

  if (!(CASE_BY_OPTIONS as readonly string[]).includes(caseBy)) {
    errors.caseBy = "Select a valid case measure.";
    return errors;
  }

  if (!isValidMoneyInput(input.buyingPrice)) {
    errors.buyingPrice = "Enter a valid monetary value.";
  }

  if (caseBy === "Lbs / case") {
    if (!isValidPositiveDecimalInput(input.caseWeightLbs)) {
      errors.caseWeightLbs = "Enter total case weight in lbs.";
    }
  }

  const contents = parseContentsInput(input.contents);
  if (!input.contents.trim() || contents <= 0) {
    errors.contents = "Pieces per case must be greater than zero.";
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
    "sourcePer",
    "caseBy",
    "buyingPrice",
    "pieceWeightOz",
    "caseWeightLbs",
    "contents",
    "singleItemUnit",
    "sellingPrice",
  ];

  for (const field of order) {
    if (errors[field]) return field;
  }

  return null;
}

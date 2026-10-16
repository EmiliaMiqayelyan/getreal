export type ItemPhoto = {
  id: string;
  url: string;
  name: string;
  /** Primary photo shown in lists. The item form keeps this photo first. */
  isPrimary?: boolean;
  /** Pending local file from the upload picker; cleared once uploaded to the API. */
  file?: File;
};

export type SourcePer = "Unit" | "Case";
export type CaseBy = "Lbs / case" | "Units / case";

export type Item = {
  id: string;
  /** Backend record UUID when known. API paths use the business code in `id`. */
  recordId?: string;
  name: string;
  merchandisingName: string;
  description: string;
  preorderInfo: string;
  category: string;
  subcategory: string;
  subcategoryId?: string;
  distributor: string;
  distributorId?: string;
  source: string;
  sourceId?: string;
  /** How the item is sourced for cost: per unit (lb) or per case. */
  sourcePer: SourcePer;
  /** Required when sourcePer is Case. */
  caseBy: CaseBy | "";
  /** Piece weight in ounces when sourcePer is Unit. */
  pieceWeightOz: number;
  /** Customer-facing weight label. Independent of piece weight, which is used for cost. */
  merchandiseWeight: string;
  /** Total case weight in lbs when caseBy is Lbs / case. */
  caseWeightLbs: number;
  /** Price per lb (Unit) or case price (Case). */
  buyingPrice: number;
  /** Pieces per case when sourcing by Case; 1 when Unit. */
  contents: number;
  /** Piece label for Unit and Lbs / case. Units / case does not use one. */
  singleItemUnit: string;
  sellingPrice: number;
  photos: ItemPhoto[];
};

export const ITEM_CATEGORIES = [
  "Protein",
  "Vegetables",
  "Fruits",
  "Grain",
  "Pantry",
] as const;

export const ITEM_SUBCATEGORIES: Record<string, string[]> = {
  Protein: ["Meat", "Poultry", "Seafood", "Eggs"],
  Vegetables: ["Leafy", "Root", "Nightshade", "Other"],
  Fruits: ["Citrus", "Stone", "Berry", "Other"],
  Grain: ["Rice", "Wheat", "Oats", "Other"],
  Pantry: ["Oil", "Spice", "Canned", "Other"],
};

export const SOURCE_PER_OPTIONS = ["Unit", "Case"] as const;

export const CASE_BY_OPTIONS = ["Lbs / case", "Units / case"] as const;

export const PIECE_WEIGHT_OPTIONS = [
  { label: "2 oz", oz: 2 },
  { label: "4 oz (1/4 lb)", oz: 4 },
  { label: "6 oz", oz: 6 },
  { label: "8 oz (1/2 lb)", oz: 8 },
  { label: "10 oz", oz: 10 },
  { label: "12 oz (3/4 lb)", oz: 12 },
  { label: "16 oz = lb", oz: 16 },
] as const;

/** Same weight choices as piece weight. Sent to the API as the option label. */
export const MERCHANDISE_WEIGHT_OPTIONS = PIECE_WEIGHT_OPTIONS;

export const SINGLE_ITEM_UNITS = [
  "1 steak (12 oz)",
  "1 lb",
  "Dozen",
  "Bunch",
  "Each",
] as const;

export function pieceWeightLabel(oz: number) {
  const match = PIECE_WEIGHT_OPTIONS.find((entry) => entry.oz === oz);
  return match?.label ?? "";
}

export function pieceWeightOzFromLabel(label: string) {
  const match = PIECE_WEIGHT_OPTIONS.find((entry) => entry.label === label);
  return match?.oz ?? 0;
}

export function isMerchandiseWeightLabel(label: string) {
  return MERCHANDISE_WEIGHT_OPTIONS.some((entry) => entry.label === label);
}

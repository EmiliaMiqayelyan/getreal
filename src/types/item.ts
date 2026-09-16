export type ItemPhoto = {
  id: string;
  url: string;
  name: string;
};

export type SourcePer = "Unit" | "Case";
export type CaseBy = "Lbs / case" | "Units / case";

export type Item = {
  id: string;
  name: string;
  merchandisingName: string;
  description: string;
  preorderInfo: string;
  category: string;
  subcategory: string;
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
  /** Total case weight in lbs when caseBy is Lbs / case. */
  caseWeightLbs: number;
  /** Price per lb (Unit) or case price (Case). */
  buyingPrice: number;
  /** Pieces per case when sourcing by Case; 1 when Unit. */
  contents: number;
  /** Sellable unit label shown in catalogs. */
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

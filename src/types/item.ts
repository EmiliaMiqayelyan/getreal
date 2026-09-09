export type ItemPhoto = {
  id: string;
  url: string;
  name: string;
};

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
  buyingUnit: string;
  buyingPrice: number;
  contents: number;
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

export const BUYING_UNITS = ["Case/Box", "Crate", "Bag", "Pallet"] as const;

export const SINGLE_ITEM_UNITS = [
  "1 steak (12 oz)",
  "1 lb",
  "Dozen",
  "Bunch",
  "Each",
] as const;

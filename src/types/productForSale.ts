import type { ItemPhoto } from "@/types/item";

export type ProductForSale = {
  id: string;
  /** Backend record UUID when known; used for API paths and FK payloads. */
  recordId?: string;
  itemId: string;
  sortOrder: number;
  live: boolean;
  merchandisingName: string;
  category: string;
  subcategory: string;
  source: string;
  sourceId?: string;
  distributor: string;
  distributorId?: string;
  salesPrice: number;
  unitOfSales: string;
  photos: ItemPhoto[];
  description: string;
};

export const PRODUCT_TABS = [
  "All",
  "Protein",
  "Vegetables",
  "Fruits",
  "Grain",
  "Pantry",
] as const;

export type ProductTab = (typeof PRODUCT_TABS)[number];

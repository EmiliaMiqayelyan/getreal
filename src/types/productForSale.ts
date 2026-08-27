import type { ItemPhoto } from "@/types/item";

export type ProductForSale = {
  id: string;
  itemId: string;
  live: boolean;
  merchandisingName: string;
  category: string;
  subcategory: string;
  source: string;
  distributor: string;
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

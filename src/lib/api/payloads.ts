import type { Distributor } from "@/types/distributor";
import type { Item } from "@/types/item";
import type { ProductForSale } from "@/types/productForSale";
import type { Source } from "@/types/source";

import type { CreateDistributorPayload } from "./distributors";
import type { CreateItemPayload } from "./items";
import {
  dollarsToCents,
  findCategoryIdByName,
  findSubcategoryIdByName,
} from "./mappers";
import type { CreateProductPayload, UpdateProductPayload } from "./products";
import type { CreateSourcePayload } from "./sources";
import type { ApiCategory, CatalogSubcategory } from "./types";

function splitAddress(fullAddress: string): {
  address: string;
  city?: string;
  state?: string;
  zipCode?: string;
} {
  const parts = fullAddress
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length === 0) return { address: "" };
  if (parts.length === 1) return { address: parts[0] };

  const zipMatch = parts[parts.length - 1]?.match(/\b(\d{5}(?:-\d{4})?)\b/);
  const zipCode = zipMatch?.[1];
  let state: string | undefined;
  let city: string | undefined;

  if (parts.length >= 3) {
    city = parts[parts.length - 2];
    const stateZip = parts[parts.length - 1];
    state = stateZip.replace(/\b\d{5}(?:-\d{4})?\b/, "").trim() || undefined;
  } else if (parts.length === 2) {
    city = parts[0];
    const stateZip = parts[1];
    state = stateZip.replace(/\b\d{5}(?:-\d{4})?\b/, "").trim() || undefined;
  }

  return {
    address: parts.slice(0, Math.max(1, parts.length - 2)).join(", ") || parts[0],
    city,
    state,
    zipCode,
  };
}

export function toCreateDistributorPayload(
  distributor: Distributor,
): CreateDistributorPayload {
  const parsed = splitAddress(distributor.fullAddress || distributor.location);
  return {
    name: distributor.name.trim(),
    address: parsed.address || distributor.fullAddress || undefined,
    city: parsed.city,
    state: parsed.state,
    zipCode: parsed.zipCode,
    paymentTerms: distributor.paymentTerms || undefined,
    notes: distributor.notes || undefined,
    contacts: (distributor.contacts ?? []).map((contact) => ({
      firstName: contact.firstName.trim(),
      lastName: contact.lastName.trim() || undefined,
      email: contact.email.trim() || undefined,
      phone: contact.phone.trim() || undefined,
      title: contact.title.trim() || undefined,
    })),
  };
}

export function toCreateSourcePayload(source: Source): CreateSourcePayload {
  if (!source.distributorId) {
    throw new Error("Source requires a distributorId for the API");
  }
  const parsed = splitAddress(source.fullAddress || source.location);
  return {
    name: source.name.trim(),
    distributorId: source.distributorId,
    description: source.description || undefined,
    address: parsed.address || source.fullAddress || undefined,
    city: parsed.city,
    state: parsed.state,
    zipCode: parsed.zipCode,
    logoUrl: source.logoUrl,
  };
}

export function toCreateItemPayload(
  item: Item,
  categories: ApiCategory[],
  subcategories: CatalogSubcategory[] = [],
): CreateItemPayload {
  const categoryId =
    findCategoryIdByName(categories, item.category) ??
    categories[0]?.id;
  if (!categoryId) {
    throw new Error("No category available for item create");
  }
  if (!item.distributorId) {
    throw new Error("Item requires a distributorId for the API");
  }

  const subcategoryId =
    item.subcategoryId ||
    findSubcategoryIdByName(subcategories, item.category, item.subcategory) ||
    null;

  return {
    name: item.name.trim() || item.merchandisingName.trim(),
    categoryId,
    subcategoryId,
    distributorId: item.distributorId,
    buyingPrice: dollarsToCents(item.buyingPrice),
    contents: Math.max(1, item.contents || 1),
  };
}

export function toCreateProductPayload(
  product: ProductForSale,
): CreateProductPayload {
  return {
    itemId: product.itemId,
    merchandisingName: product.merchandisingName.trim(),
    sellingPrice: dollarsToCents(product.salesPrice),
    description: product.description || undefined,
    isLive: product.live,
    position: product.sortOrder,
  };
}

export function toUpdateProductPayload(
  product: ProductForSale,
): UpdateProductPayload {
  return toCreateProductPayload(product);
}

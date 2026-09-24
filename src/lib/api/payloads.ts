import type { Distributor, DistributorDocument } from "@/types/distributor";
import type { Item } from "@/types/item";
import type { ProductForSale } from "@/types/productForSale";
import type { Source } from "@/types/source";
import { apiId, findByEntityRef } from "@/utils/entityIds";

import type { CreateDistributorPayload } from "./distributors";
import type { CreateItemPayload } from "./items";
import {
  dollarsToCents,
  findCategoryIdByName,
  findSubcategoryIdByName,
} from "./mappers";
import type { CreateProductPayload, UpdateProductPayload } from "./products";
import type { CreateSourcePayload } from "./sources";
import type {
  ApiCategory,
  ApiDeliverySchedule,
  ApiDistributorDocument,
  CatalogSubcategory,
} from "./types";
import { persistDocumentFile } from "./upload";

function businessCodeOrUndefined(id: string | undefined) {
  const trimmed = id?.trim() ?? "";
  if (!trimmed || trimmed.endsWith("-TEMP")) return undefined;
  return trimmed;
}

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

export function deliveryDaysToSchedule(
  slots: Array<{ day: string; time: string }>,
): ApiDeliverySchedule {
  const schedule: ApiDeliverySchedule = {};
  for (const slot of slots) {
    const day = slot.day.trim();
    const time = slot.time.trim();
    if (!day || !time) continue;
    schedule[day] = time;
  }
  return schedule;
}

function isPersistableDocumentUrl(url: string | undefined): url is string {
  if (!url) return false;
  return (
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("data:")
  );
}

/** Upload / data-URL encode pending files so documents survive refresh. */
export async function resolveDistributorDocuments(
  documents: DistributorDocument[],
): Promise<DistributorDocument[]> {
  const resolved: DistributorDocument[] = [];
  for (const doc of documents) {
    if (doc.file) {
      const url = await persistDocumentFile(doc.file);
      resolved.push({
        id: doc.id,
        name: doc.name,
        size: doc.size,
        url,
      });
      continue;
    }
    if (isPersistableDocumentUrl(doc.url)) {
      resolved.push({
        id: doc.id,
        name: doc.name,
        size: doc.size,
        url: doc.url,
      });
    }
  }
  return resolved;
}

function toApiDocuments(
  documents: DistributorDocument[],
): ApiDistributorDocument[] {
  return documents
    .filter((doc) => isPersistableDocumentUrl(doc.url))
    .map((doc) => ({
      id: doc.id,
      name: doc.name,
      url: doc.url,
      size: doc.size,
    }));
}

export function toCreateDistributorPayload(
  distributor: Distributor,
): CreateDistributorPayload {
  const parsed = splitAddress(distributor.fullAddress || distributor.location);
  const deliverySchedule = deliveryDaysToSchedule(
    distributor.deliveryDays ?? [],
  );
  return {
    name: distributor.name.trim(),
    distributorCode: businessCodeOrUndefined(distributor.id),
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
    deliverySchedule,
    documents: toApiDocuments(distributor.documents ?? []),
  };
}

function persistableLogoUrl(
  url: string | null | undefined,
): string | null | undefined {
  if (url == null || url === "") return url === "" ? undefined : url;
  if (url.startsWith("blob:") || url.startsWith("data:")) return undefined;
  return url;
}

export function toCreateSourcePayload(source: Source): CreateSourcePayload {
  if (!source.distributorId) {
    throw new Error("Source requires a distributorId for the API");
  }
  const parsed = splitAddress(source.fullAddress || source.location);
  return {
    name: source.name.trim(),
    sourceCode: businessCodeOrUndefined(source.id),
    distributorId: source.distributorId,
    description: source.description || undefined,
    address: parsed.address || source.fullAddress || undefined,
    city: parsed.city,
    state: parsed.state,
    zipCode: parsed.zipCode,
    logoUrl: persistableLogoUrl(source.logoUrl),
  };
}

export function toCreateItemPayload(
  item: Item,
  categories: ApiCategory[],
  subcategories: CatalogSubcategory[] = [],
  photoUrls: string[] = [],
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

  const contents = Math.max(1, Math.round(item.contents || 1));
  const buyingPriceCents = dollarsToCents(item.buyingPrice);

  return {
    name: item.name.trim() || item.merchandisingName.trim(),
    categoryId,
    subcategoryId,
    distributorId: item.distributorId,
    ...(item.sourceId ? { sourceId: item.sourceId } : {}),
    buyingPrice: buyingPriceCents,
    contents,
    buyingUnit: item.sourcePer || undefined,
    singleItemUnit: item.singleItemUnit || undefined,
    description: item.description.trim() || undefined,
    photos: photoUrls,
  };
}

export function toCreateProductPayload(
  product: ProductForSale,
  catalogItems: Item[] = [],
): CreateProductPayload {
  const linked = findByEntityRef(catalogItems, product.itemId);
  return {
    itemId: linked ? apiId(linked) : product.itemId,
    merchandisingName: product.merchandisingName.trim(),
    sellingPrice: dollarsToCents(product.salesPrice),
    description: product.description || undefined,
    isLive: product.live,
    position: product.sortOrder,
  };
}

export function toUpdateProductPayload(
  product: ProductForSale,
  catalogItems: Item[] = [],
): UpdateProductPayload {
  return toCreateProductPayload(product, catalogItems);
}

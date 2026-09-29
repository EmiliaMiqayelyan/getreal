import type { Distributor, DistributorDocument } from "@/types/distributor";
import type { Item } from "@/types/item";
import type { ProductForSale } from "@/types/productForSale";
import type { Source } from "@/types/source";
import { findByEntityRef, isUuid, recordRef } from "@/utils/entityIds";
import { parseAddressParts } from "@/utils/format";

import type { CreateDistributorPayload } from "./distributors";
import type { CreateItemPayload } from "./items";
import { dollarsToCents, findSubcategoryIdByName } from "./mappers";
import type { CreateProductPayload, UpdateProductPayload } from "./products";
import type { CreateSourcePayload } from "./sources";
import type {
  ApiDeliverySchedule,
  ApiDistributorDocument,
  CatalogSubcategory,
} from "./types";
import { persistDocumentFile } from "./upload";

function splitAddress(fullAddress: string): {
  address: string;
  city?: string;
  state?: string;
  zipCode?: string;
} {
  const parsed = parseAddressParts(fullAddress);
  const address = [parsed.street, parsed.apt].filter(Boolean).join(", ");
  return {
    address,
    city: parsed.city || undefined,
    state: parsed.state || undefined,
    zipCode: parsed.zip || undefined,
  };
}

function distributorAddressPayload(distributor: Distributor) {
  const street = distributor.street?.trim() ?? "";
  const apt = distributor.apt?.trim() ?? "";
  const city = distributor.city?.trim() ?? "";
  const state = distributor.state?.trim() ?? "";
  const zip = distributor.zip?.trim() ?? "";
  if (street || apt || city || state || zip) {
    return {
      address: [street, apt].filter(Boolean).join(", ") || undefined,
      city: city || undefined,
      state: state || undefined,
      zipCode: zip || undefined,
    };
  }
  return splitAddress(distributor.fullAddress || distributor.location);
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
  const parsed = distributorAddressPayload(distributor);
  const deliverySchedule = deliveryDaysToSchedule(
    distributor.deliveryDays ?? [],
  );
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

function sourceAddressPayload(source: Source) {
  const street = source.street?.trim() ?? "";
  const apt = source.apt?.trim() ?? "";
  const city = source.city?.trim() ?? "";
  const state = source.state?.trim() ?? "";
  const zip = source.zip?.trim() ?? "";
  if (street || apt || city || state || zip) {
    return {
      address: [street, apt].filter(Boolean).join(", ") || undefined,
      city: city || undefined,
      state: state || undefined,
      zipCode: zip || undefined,
    };
  }
  return splitAddress(source.fullAddress || source.location);
}

export function toCreateSourcePayload(
  source: Source,
  distributors: Distributor[] = [],
): CreateSourcePayload {
  const distributorId = relationRecordId(
    source.distributorId,
    source.distributor,
    distributors,
  );
  if (!distributorId) {
    throw new Error(
      "This distributor is not linked to a server record. Reload the page and try again.",
    );
  }
  const parsed = sourceAddressPayload(source);
  return {
    name: source.name.trim(),
    distributorId,
    description: source.description || undefined,
    address: parsed.address || undefined,
    city: parsed.city,
    state: parsed.state,
    zipCode: parsed.zipCode,
    logoUrl: persistableLogoUrl(source.logoUrl),
  };
}

function relationRecordId<T extends { id: string; recordId?: string; name: string }>(
  ref: string | undefined,
  name: string | undefined,
  entities: T[],
): string | undefined {
  const trimmedRef = ref?.trim();
  if (trimmedRef && isUuid(trimmedRef)) return trimmedRef;

  const match =
    (trimmedRef ? findByEntityRef(entities, trimmedRef) : undefined) ??
    (name?.trim()
      ? entities.find((entry) => entry.name === name.trim())
      : undefined);

  return match ? recordRef(match) : undefined;
}

export function toCreateItemPayload(
  item: Item,
  subcategories: CatalogSubcategory[] = [],
  photoUrls: string[] = [],
  relations: {
    distributors?: Distributor[];
    sources?: Source[];
  } = {},
): CreateItemPayload {
  const category = item.category.trim();
  if (!category) {
    throw new Error("No category available for item create");
  }

  const distributorId = relationRecordId(
    item.distributorId,
    item.distributor,
    relations.distributors ?? [],
  );
  if (!distributorId) {
    throw new Error(
      "This distributor is not linked to a server record. Reload the page and try again.",
    );
  }

  const sourceId = relationRecordId(
    item.sourceId,
    item.source,
    relations.sources ?? [],
  );
  if ((item.source.trim() || item.sourceId) && !sourceId) {
    throw new Error(
      "This source is not linked to a server record. Reload the page and try again.",
    );
  }

  const subcategoryRef =
    item.subcategoryId ||
    findSubcategoryIdByName(subcategories, item.category, item.subcategory) ||
    "";
  const subcategoryId = isUuid(subcategoryRef) ? subcategoryRef : undefined;

  const contents = Math.max(1, Math.round(item.contents || 1));
  const buyingPriceCents = dollarsToCents(item.buyingPrice);

  return {
    name: item.name.trim() || item.merchandisingName.trim(),
    category,
    ...(subcategoryId ? { subcategoryId } : {}),
    distributorId,
    ...(sourceId ? { sourceId } : {}),
    buyingPrice: buyingPriceCents,
    contents,
    buyingUnit: item.sourcePer || undefined,
    singleItemUnit: item.singleItemUnit || undefined,
    description: item.description.trim() || undefined,
    photos: photoUrls.filter((url) => typeof url === "string"),
  };
}

export function toCreateProductPayload(
  product: ProductForSale,
  catalogItems: Item[] = [],
): CreateProductPayload {
  const linked = findByEntityRef(catalogItems, product.itemId);
  const itemId = linked
    ? recordRef(linked)
    : isUuid(product.itemId)
      ? product.itemId
      : undefined;
  if (!itemId) {
    throw new Error(
      "This item is not linked to a server record. Reload the page and try again.",
    );
  }
  return {
    itemId,
    merchandisingName: product.merchandisingName.trim(),
    sellingPrice: dollarsToCents(product.salesPrice),
    description: product.description || undefined,
    isLive: Boolean(product.live),
    position: Math.round(product.sortOrder || 0),
  };
}

export function toUpdateProductPayload(
  product: ProductForSale,
  catalogItems: Item[] = [],
): UpdateProductPayload {
  return toCreateProductPayload(product, catalogItems);
}

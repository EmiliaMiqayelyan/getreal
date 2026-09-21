import { permissionsForRoleType } from "@/utils/rolePermissions";
import type { AdminCustomer, ManagedRole, RoleUser } from "@/types/admin";
import type {
  Distributor,
  DistributorContact,
  DistributorDeliverySlot,
  DistributorDocument,
} from "@/types/distributor";
import type { Item, ItemPhoto, SourcePer } from "@/types/item";
import { pieceWeightOzFromLabel } from "@/types/item";
import type { ProductForSale } from "@/types/productForSale";
import type { Source } from "@/types/source";
import {
  formatDeliveryLabel,
  locationFromAddress,
  WEEK_DAYS,
} from "@/utils/format";

import type {
  ApiCategory,
  ApiDeliverySchedule,
  ApiDistributor,
  ApiDistributorDocument,
  ApiItem,
  ApiOrder,
  ApiProduct,
  ApiRole,
  ApiSource,
  ApiSubcategory,
  ApiUser,
  CatalogSubcategory,
} from "./types";
import { normalizeNamedList } from "./normalize";

export type { CatalogSubcategory };

export function mapApiUserToRoleUser(user: ApiUser, index: number): RoleUser {
  const roleName = user.role ?? "Manager";
  const displayRole =
    roleName.charAt(0).toUpperCase() + roleName.slice(1).replace(/_/g, " ");

  const type = displayRole.includes("Admin")
    ? "Superadmin"
    : displayRole.includes("Warehouse")
      ? "Warehouse Worker"
      : displayRole.includes("Driver")
        ? "Driver"
        : displayRole;

  return {
    id: user.id ?? `U${String(index + 1).padStart(3, "0")}`,
    name: user.name ?? user.email ?? "User",
    email: user.email ?? "",
    phone: user.phoneNumber ?? user.phone ?? "",
    type,
    password: "",
    permissions: permissionsForRoleType(type),
  };
}

export function mapRoleUserTypeToApiRole(type: string): string {
  const t = type.toLowerCase();
  if (t.includes("super")) return "admin";
  if (t.includes("warehouse")) return "warehouse";
  if (t.includes("driver")) return "driver";
  if (t.includes("manager")) return "manager";
  return "admin";
}

export function mapApiRoleToManagedRole(role: ApiRole, index: number): ManagedRole {
  return {
    id: role.id ?? `role-${index}`,
    name: role.name ?? "Role",
    permissions: permissionsForRoleType(role.name ?? "Role"),
  };
}

export function mapApiUserToAdminCustomer(user: ApiUser, index: number): AdminCustomer {
  const firstName =
    user.firstName?.trim() ||
    (user.name ?? user.email ?? "Customer").trim().split(/\s+/)[0] ||
    "Customer";
  const lastName =
    user.lastName?.trim() ||
    (user.name ?? "").trim().split(/\s+/).slice(1).join(" ");

  const city = user.city?.trim() ?? "";
  const state = user.state?.trim() ?? "";
  const shortLocation = [city, state].filter(Boolean).join(", ");
  const fullAddress = [
    user.address,
    user.aptUnit,
    city,
    state,
    user.zipCode,
  ]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(", ");

  return {
    id: user.id ?? `C${String(index + 1).padStart(3, "0")}`,
    firstName,
    lastName,
    email: user.email ?? "",
    phone: user.phoneNumber ?? user.phone ?? "",
    shortLocation,
    fullAddress,
    orderQuantity: 0,
    lastOrderedDate: "",
    lifetimeTotal: 0,
    blocked: Boolean(user.isBlocked),
    customerTag:
      user.status === "vip"
        ? "VIP"
        : user.status === "regular"
          ? "Regular"
          : "",
    deliveryDay: "",
    zip: user.zipCode ?? undefined,
    orders: [],
  };
}

function centsToDollars(cents: number | undefined): number {
  if (cents == null || !Number.isFinite(cents)) return 0;
  return cents / 100;
}

export { centsToDollars };

function mapApiItemPhotos(
  photos: string[] | null | undefined,
  itemKey: string,
): ItemPhoto[] {
  if (!Array.isArray(photos)) return [];
  return photos
    .filter((url): url is string => typeof url === "string" && Boolean(url.trim()))
    .map((url, photoIndex) => ({
      id: `api-photo-${itemKey}-${photoIndex}`,
      url,
      name: url.split("/").pop() || `Photo ${photoIndex + 1}`,
    }));
}

function sourcePerFromBuyingUnit(buyingUnit: string | null | undefined): SourcePer {
  const normalized = buyingUnit?.trim().toLowerCase() ?? "";
  if (normalized === "unit" || normalized === "lb" || normalized === "lbs") {
    return "Unit";
  }
  return "Case";
}

export function mapApiItemToItem(
  item: ApiItem,
  index: number,
  options: {
    categoriesById?: Map<string, string>;
    distributorsById?: Map<string, string>;
    sourcesById?: Map<string, string>;
    subcategoriesById?: Map<string, string>;
    /** Selling price in dollars from the linked product, when known. */
    sellingPriceDollars?: number;
  } = {},
): Item {
  const categoryName =
    (item.categoryId && options.categoriesById?.get(item.categoryId)) ||
    item.category ||
    "Protein";
  const subcategoryName =
    (item.subcategoryId && options.subcategoriesById?.get(item.subcategoryId)) ||
    item.subcategory ||
    "";
  const distributorName =
    (item.distributorId && options.distributorsById?.get(item.distributorId)) ||
    "";
  const sourceName =
    (item.sourceId && options.sourcesById?.get(item.sourceId)) || "";

  const recordId = item.id;
  const itemKey = recordId ?? item.itemCode ?? String(index);
  const photos = mapApiItemPhotos(item.photos, itemKey);
  const sourcePer = sourcePerFromBuyingUnit(item.buyingUnit);
  const singleItemUnit = item.singleItemUnit?.trim() || "Each";
  const pieceWeightOz =
    sourcePer === "Unit" ? pieceWeightOzFromLabel(singleItemUnit) : 0;
  const contents = Math.max(1, item.contents ?? 1);
  const buyingPrice = centsToDollars(item.buyingPrice);

  return {
    id: item.itemCode ?? recordId ?? `API-ITEM-${index + 1}`,
    recordId,
    name: item.name ?? "Item",
    merchandisingName: item.merchandisingName ?? item.name ?? "Item",
    description: item.description ?? "",
    preorderInfo: "",
    category: categoryName,
    subcategory: subcategoryName,
    subcategoryId: item.subcategoryId ?? undefined,
    distributor: distributorName,
    distributorId: item.distributorId,
    source: sourceName,
    sourceId: item.sourceId ?? undefined,
    sourcePer,
    caseBy: sourcePer === "Case" ? "Units / case" : "",
    pieceWeightOz,
    caseWeightLbs: 0,
    buyingPrice,
    contents: sourcePer === "Unit" ? 1 : contents,
    singleItemUnit,
    sellingPrice: options.sellingPriceDollars ?? 0,
    photos,
  };
}

/** @deprecated Prefer mapApiProductToProductForSale - kept for older call sites. */
export function mapApiProductToItem(product: ApiProduct, index: number): Item {
  const name = product.merchandisingName ?? product.name ?? "Product";
  const priceCents = product.sellingPrice ?? product.price ?? 0;
  const sellingPrice = centsToDollars(priceCents);
  const recordId = product.itemId ?? product.id;

  return {
    id: product.productId ?? recordId ?? `API-${index + 1}`,
    recordId,
    name,
    merchandisingName: name,
    description: product.description ?? "",
    preorderInfo: "",
    category: product.categoryNames?.[0] ?? "Protein",
    subcategory: product.categoryNames?.[1] ?? "",
    distributor: "",
    source: "",
    sourcePer: "Case",
    caseBy: "Units / case",
    pieceWeightOz: 0,
    caseWeightLbs: 0,
    buyingPrice: sellingPrice,
    contents: 1,
    singleItemUnit: "Each",
    sellingPrice,
    photos: [],
  };
}

export function mapApiProductToProductForSale(
  product: ApiProduct,
  index: number,
  catalogItems: Item[] = [],
): ProductForSale {
  const linked = catalogItems.find(
    (item) =>
      item.recordId === product.itemId ||
      item.id === product.itemId,
  );
  const name = product.merchandisingName ?? product.name ?? "Product";
  const priceCents = product.sellingPrice ?? product.price ?? 0;
  const recordId = product.id;

  return {
    id: product.productId ?? recordId ?? `API-PFS-${index + 1}`,
    recordId,
    // Prefer the item business code for UI linking; fall back to API itemId (UUID).
    itemId: linked?.id ?? product.itemId ?? "",
    sortOrder: product.position ?? index,
    live: Boolean(product.isLive),
    merchandisingName: name,
    category: linked?.category ?? product.categoryNames?.[0] ?? "Protein",
    subcategory: linked?.subcategory ?? product.categoryNames?.[1] ?? "",
    source: linked?.source ?? "",
    sourceId: linked?.sourceId,
    distributor: linked?.distributor ?? "",
    distributorId: linked?.distributorId,
    salesPrice: centsToDollars(priceCents),
    unitOfSales: linked?.singleItemUnit ?? "Each",
    photos: linked?.photos ?? [],
    description: product.description ?? linked?.description ?? "",
  };
}

export function scheduleToDeliveryDays(
  schedule: ApiDeliverySchedule | null | undefined,
): DistributorDeliverySlot[] {
  if (!schedule || typeof schedule !== "object" || Array.isArray(schedule)) {
    return [];
  }
  const slots: DistributorDeliverySlot[] = [];
  for (const day of WEEK_DAYS) {
    const time = schedule[day];
    if (typeof time === "string" && time.trim()) {
      slots.push({ day, time: time.trim() });
    }
  }
  // Include any unexpected keys (backend may use full day names later).
  for (const [day, time] of Object.entries(schedule)) {
    if (WEEK_DAYS.includes(day as (typeof WEEK_DAYS)[number])) continue;
    if (typeof time === "string" && time.trim()) {
      slots.push({ day, time: time.trim() });
    }
  }
  return slots;
}

export function mapApiDocuments(
  documents: ApiDistributorDocument[] | null | undefined,
  distributorKey: string,
): DistributorDocument[] {
  if (!Array.isArray(documents)) return [];
  return documents
    .map((doc, docIndex) => {
      const url = typeof doc?.url === "string" ? doc.url : undefined;
      const name =
        (typeof doc?.name === "string" && doc.name.trim()) ||
        `Document ${docIndex + 1}`;
      return {
        id:
          (typeof doc?.id === "string" && doc.id) ||
          `api-doc-${distributorKey}-${docIndex}`,
        name,
        size: (typeof doc?.size === "string" && doc.size) || "",
        url,
      };
    })
    .filter((doc) => Boolean(doc.url));
}

export function mapApiDistributorToDistributor(
  distributor: ApiDistributor,
  index: number,
): Distributor {
  const contacts: DistributorContact[] = (distributor.contacts ?? []).map(
    (contact, contactIndex) => ({
      id: `api-contact-${distributor.id ?? index}-${contactIndex}`,
      firstName: contact.firstName ?? "",
      lastName: contact.lastName ?? "",
      phone: contact.phone ?? "",
      email: contact.email ?? "",
      title: contact.title ?? "",
      primary: contactIndex === 0,
    }),
  );

  const addressParts = [
    distributor.address,
    distributor.city,
    distributor.state,
    distributor.zipCode,
  ]
    .map((part) => part?.trim())
    .filter(Boolean);
  const fullAddress = addressParts.join(", ");
  const location =
    [distributor.city, distributor.state].filter(Boolean).join(", ") ||
    (fullAddress ? locationFromAddress(fullAddress) : "");

  const primary = contacts[0];
  const recordId = distributor.id;
  const distributorKey = recordId ?? distributor.distributorCode ?? String(index);
  const deliveryDays = scheduleToDeliveryDays(distributor.deliverySchedule);
  const deliveryLabel = formatDeliveryLabel(deliveryDays);
  const documents = mapApiDocuments(distributor.documents, distributorKey);

  return {
    id: distributor.distributorCode ?? recordId ?? `DIS-API-${index + 1}`,
    recordId,
    name: distributor.name ?? "Distributor",
    paymentTerms: distributor.paymentTerms ?? "",
    contact: primary
      ? `${primary.firstName} ${primary.lastName}`.trim()
      : "",
    phone: primary?.phone ?? "",
    location,
    fullAddress: distributor.address?.trim() || fullAddress,
    delivery: [deliveryLabel.days, deliveryLabel.time].filter(Boolean).join(" "),
    deliveryDays,
    documents,
    notes: distributor.notes ?? "",
    contacts,
    categories: [],
    items: 0,
    docs: documents.length ? String(documents.length) : null,
    products: [],
  };
}

export function mapApiSourceToSource(
  source: ApiSource,
  index: number,
  distributorsById: Map<string, string> = new Map(),
): Source {
  const addressParts = [
    source.address,
    source.city,
    source.state,
    source.zipCode,
  ]
    .map((part) => part?.trim())
    .filter(Boolean);
  const fullAddress = addressParts.join(", ");
  const location =
    [source.city, source.state].filter(Boolean).join(", ") ||
    (fullAddress ? locationFromAddress(fullAddress) : "");

  const recordId = source.id;

  return {
    id: source.sourceCode ?? recordId ?? `SRC-API-${index + 1}`,
    recordId,
    name: source.name ?? "Source",
    location,
    fullAddress: source.address?.trim() || fullAddress,
    distributor:
      (source.distributorId && distributorsById.get(source.distributorId)) ||
      "",
    distributorId: source.distributorId,
    description: source.description ?? "",
    logoUrl: source.logoUrl ?? null,
  };
}

export function dollarsToCents(value: number): number {
  return Math.max(0, Math.round(value * 100));
}

export function findCategoryIdByName(
  categories: ApiCategory[],
  name: string,
): string | undefined {
  const normalized = name.trim().toLowerCase();
  return categories.find((category) => category.name?.toLowerCase() === normalized)
    ?.id;
}

export function findSubcategoryIdByName(
  subcategories: Array<Pick<CatalogSubcategory, "id" | "name" | "category">>,
  category: string,
  name: string,
): string | undefined {
  const categoryKey = category.trim().toLowerCase();
  const nameKey = name.trim().toLowerCase();
  if (!categoryKey || !nameKey) return undefined;
  return subcategories.find(
    (entry) =>
      entry.category.trim().toLowerCase() === categoryKey &&
      entry.name.trim().toLowerCase() === nameKey,
  )?.id;
}

export function mapApiSubcategoryToCatalog(
  subcategory: ApiSubcategory,
  categoriesById: Map<string, string> = new Map(),
): CatalogSubcategory | null {
  const name = subcategory.name?.trim();
  if (!name) return null;

  const nestedCategory =
    subcategory.category && typeof subcategory.category === "object"
      ? subcategory.category
      : null;
  const categoryId =
    subcategory.categoryId ?? nestedCategory?.id ?? undefined;
  const categoryName =
    (typeof subcategory.category === "string"
      ? subcategory.category
      : nestedCategory?.name) ||
    (categoryId ? categoriesById.get(categoryId) : undefined) ||
    "";

  if (!categoryName) return null;

  return {
    id: subcategory.id,
    name,
    category: categoryName,
    categoryId,
  };
}

export function normalizeUsersList(payload: unknown): ApiUser[] {
  return normalizeNamedList<ApiUser>(payload, [
    "users",
    "items",
    "data",
    "results",
  ]);
}

export function normalizeProductsList(payload: unknown): ApiProduct[] {
  return normalizeNamedList<ApiProduct>(payload, [
    "products",
    "items",
    "data",
    "results",
  ]);
}

export function normalizeRolesList(payload: unknown): ApiRole[] {
  return normalizeNamedList<ApiRole>(payload, [
    "roles",
    "items",
    "data",
    "results",
  ]);
}

export function normalizeOrdersList(payload: unknown): ApiOrder[] {
  return normalizeNamedList<ApiOrder>(payload, [
    "orders",
    "items",
    "data",
    "results",
  ]);
}

export function normalizeCategoriesList(payload: unknown): ApiCategory[] {
  return normalizeNamedList<ApiCategory>(payload, [
    "categories",
    "data",
    "results",
  ]);
}

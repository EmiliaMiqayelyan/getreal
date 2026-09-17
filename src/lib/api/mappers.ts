import { permissionsForRoleType } from "@/utils/rolePermissions";
import type { AdminCustomer, ManagedRole, RoleUser } from "@/types/admin";
import type { Distributor, DistributorContact } from "@/types/distributor";
import type { Item } from "@/types/item";
import type { ProductForSale } from "@/types/productForSale";
import type { Source } from "@/types/source";
import { locationFromAddress } from "@/utils/format";

import type {
  ApiCategory,
  ApiDistributor,
  ApiItem,
  ApiOrder,
  ApiProduct,
  ApiRole,
  ApiSource,
  ApiUser,
} from "./types";
import { normalizeNamedList } from "./normalize";

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

export function mapApiItemToItem(
  item: ApiItem,
  index: number,
  options: {
    categoriesById?: Map<string, string>;
    distributorsById?: Map<string, string>;
  } = {},
): Item {
  const categoryName =
    (item.categoryId && options.categoriesById?.get(item.categoryId)) ||
    item.category ||
    "Protein";
  const distributorName =
    (item.distributorId && options.distributorsById?.get(item.distributorId)) ||
    "";

  return {
    id: item.id ?? `API-ITEM-${index + 1}`,
    name: item.name ?? "Item",
    merchandisingName: item.merchandisingName ?? item.name ?? "Item",
    description: item.description ?? "",
    preorderInfo: "",
    category: categoryName,
    subcategory: item.subcategory ?? "",
    distributor: distributorName,
    distributorId: item.distributorId,
    source: "",
    sourceId: item.sourceId,
    sourcePer: "Case",
    caseBy: "Units / case",
    pieceWeightOz: 0,
    caseWeightLbs: 0,
    buyingPrice: centsToDollars(item.buyingPrice),
    contents: item.contents ?? 1,
    singleItemUnit: "Each",
    sellingPrice: 0,
    photos: [],
  };
}

/** @deprecated Prefer mapApiProductToProductForSale - kept for older call sites. */
export function mapApiProductToItem(product: ApiProduct, index: number): Item {
  const name = product.merchandisingName ?? product.name ?? "Product";
  const priceCents = product.sellingPrice ?? product.price ?? 0;
  const sellingPrice = centsToDollars(priceCents);

  return {
    id: product.itemId ?? product.id ?? `API-${index + 1}`,
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
  const linked = catalogItems.find((item) => item.id === product.itemId);
  const name = product.merchandisingName ?? product.name ?? "Product";
  const priceCents = product.sellingPrice ?? product.price ?? 0;

  return {
    id: product.id ?? `API-PFS-${index + 1}`,
    itemId: product.itemId ?? linked?.id ?? "",
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

  return {
    id: distributor.id ?? `DIS-API-${index + 1}`,
    name: distributor.name ?? "Distributor",
    paymentTerms: distributor.paymentTerms ?? "",
    contact: primary
      ? `${primary.firstName} ${primary.lastName}`.trim()
      : "",
    phone: primary?.phone ?? "",
    location,
    fullAddress: distributor.address?.trim() || fullAddress,
    delivery: "",
    deliveryDays: [],
    documents: [],
    notes: distributor.notes ?? "",
    contacts,
    categories: [],
    items: 0,
    docs: null,
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

  return {
    id: source.id ?? `SRC-API-${index + 1}`,
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

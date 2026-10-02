import { permissionsForRoleType } from "@/utils/rolePermissions";
import type { AdminCustomer, ManagedRole, RoleUser } from "@/types/admin";
import type {
  Distributor,
  DistributorContact,
  DistributorDeliverySlot,
  DistributorDocument,
} from "@/types/distributor";
import type { CaseBy, Item, ItemPhoto, SourcePer } from "@/types/item";
import { pieceWeightOzFromLabel } from "@/types/item";
import type { ProductForSale } from "@/types/productForSale";
import type { PushNotification } from "@/types/notification";
import type { Source } from "@/types/source";
import { codeFrom, isUuid, preferModelId } from "@/utils/entityIds";
import {
  formatCityState,
  formatDeliveryLabel,
  formatFullAddress,
  formatPhoneValue,
  locationFromAddress,
  parseAddressParts,
  WEEK_DAYS,
} from "@/utils/format";

import type {
  ApiCategory,
  ApiDeliverySchedule,
  ApiDistributor,
  ApiDistributorDocument,
  ApiItem,
  ApiNotificationRule,
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

/** Title-case an API role name and match the labels used on the Roles page. */
export function formatApiRoleName(roleName: string | null | undefined): string {
  const raw = roleName?.trim() || "Manager";
  const display = raw.charAt(0).toUpperCase() + raw.slice(1).replace(/_/g, " ");
  const lower = display.toLowerCase();
  if (lower.includes("admin")) return "Superadmin";
  if (lower.includes("warehouse")) return "Warehouse Worker";
  if (lower.includes("driver")) return "Driver";
  return display;
}

export function mapApiUserToRoleUser(user: ApiUser, index: number): RoleUser {
  const type = formatApiRoleName(user.role);

  const roleCode = codeFrom(user, ["roleCode"]);

  return {
    id: preferModelId(
      user,
      ["userCode"],
      user.id ?? `U${String(index + 1).padStart(3, "0")}`,
    ),
    recordId: isUuid(user.id) ? user.id : undefined,
    roleCode,
    roleId: user.roleId,
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
  if (t.includes("super") || t.includes("admin")) return "admin";
  if (t.includes("warehouse")) return "warehouse";
  if (t.includes("driver")) return "driver";
  if (t.includes("distributor")) return "distributor";
  if (t.includes("customer")) return "customer";
  if (t.includes("manager")) return "manager";
  return t.trim() || "admin";
}

export function mapApiRoleToManagedRole(
  role: ApiRole,
  index: number,
): ManagedRole {
  const roleCode = codeFrom(role, ["roleCode"]);
  const recordId = isUuid(role.id)
    ? role.id
    : isUuid(role.roleId)
      ? role.roleId
      : undefined;
  const name = formatApiRoleName(role.roleName ?? role.name);

  return {
    id: roleCode ?? role.roleId ?? role.id ?? `role-${index}`,
    roleCode,
    recordId,
    name,
    permissions: permissionsForRoleType(name),
  };
}

/** Roles list row → table user. `roleId` is shared, so the row id is the user. */
export function mapApiRoleAssignmentToRoleUser(
  role: ApiRole,
  index: number,
): RoleUser {
  const member = role.user ?? {};
  const type = formatApiRoleName(role.roleName ?? role.name);
  const email = member.email?.trim() ?? "";
  const userCode = codeFrom(member, ["userCode"]);
  const id =
    userCode ||
    member.id?.trim() ||
    member.userId?.trim() ||
    email ||
    `role-user-${index + 1}`;

  const userRecordId = isUuid(member.userId)
    ? member.userId
    : isUuid(member.id)
      ? member.id
      : undefined;

  return {
    id,
    recordId: userRecordId,
    roleCode: codeFrom(role, ["roleCode"]),
    roleId: role.roleId ?? role.id,
    name: member.name?.trim() || email || "User",
    email,
    phone: member.phone?.trim() ?? "",
    type,
    password: "",
    permissions: permissionsForRoleType(type),
  };
}

export function mapApiRolesToRoleUsers(roles: ApiRole[]): RoleUser[] {
  const seen = new Map<string, number>();
  return roles.map((role, index) => {
    const user = mapApiRoleAssignmentToRoleUser(role, index);
    const count = (seen.get(user.id) ?? 0) + 1;
    seen.set(user.id, count);
    if (count === 1) return user;
    return { ...user, id: `${user.id}#${count}` };
  });
}

/** One template per role. The list repeats a role once for every assigned user. */
export function uniqueManagedRoles(roles: ApiRole[]): ManagedRole[] {
  const seen = new Set<string>();
  const result: ManagedRole[] = [];
  roles.forEach((role, index) => {
    const mapped = mapApiRoleToManagedRole(role, index);
    if (seen.has(mapped.id)) return;
    seen.add(mapped.id);
    result.push(mapped);
  });
  return result;
}

function isoDateOnly(value: string | null | undefined): string {
  const match = value?.trim().match(/^(\d{4}-\d{2}-\d{2})/);
  return match?.[1] ?? "";
}

/** Weekday name at noon local time, so a date-only value does not shift a day. */
function weekdayName(value: string | null | undefined): string {
  const day = isoDateOnly(value);
  if (!day) return "";
  const date = new Date(`${day}T12:00:00`);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", { weekday: "long" });
}

function finiteNumber(value: number | null | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export function mapApiUserToAdminCustomer(
  user: ApiUser,
  index: number,
): AdminCustomer {
  const firstName =
    user.firstName?.trim() ||
    (user.name ?? user.email ?? "").trim().split(/\s+/)[0] ||
    "N/A";
  const lastName =
    user.lastName?.trim() ||
    (user.name ?? "").trim().split(/\s+/).slice(1).join(" ");

  const city = user.city?.trim() ?? "";
  const state = user.state?.trim() ?? "";
  const shortLocation = [city, state].filter(Boolean).join(", ");
  const fullAddress = [user.address, user.aptUnit, city, state, user.zipCode]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(", ");

  return {
    id: preferModelId(
      user,
      ["customerCode"],
      user.id ?? `C${String(index + 1).padStart(3, "0")}`,
    ),
    recordId: isUuid(user.id) ? user.id : undefined,
    firstName,
    lastName,
    email: user.email ?? "",
    phone: user.phoneNumber ?? user.phone ?? "",
    shortLocation,
    fullAddress,
    orderQuantity: finiteNumber(user.orderCount),
    lastOrderedDate: isoDateOnly(user.lastOrderDate),
    lifetimeTotal: centsToDollars(user.totalAmount ?? undefined),
    blocked: Boolean(user.isBlocked),
    subscribed: Boolean(user.isSubscribed),
    customerTag:
      user.status === "vip"
        ? "VIP"
        : user.status === "regular"
          ? "Regular"
          : "",
    deliveryDay: weekdayName(user.deliveryDate),
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
    .filter(
      (url): url is string => typeof url === "string" && Boolean(url.trim()),
    )
    .map((url, photoIndex) => ({
      id: `api-photo-${itemKey}-${photoIndex}`,
      url,
      name: url.split("/").pop() || `Photo ${photoIndex + 1}`,
    }));
}

function sourcePerFromBuyingUnit(
  buyingUnit: string | null | undefined,
): SourcePer {
  const normalized = buyingUnit?.trim().toLowerCase() ?? "";
  if (normalized === "unit" || normalized === "lb" || normalized === "lbs") {
    return "Unit";
  }
  return "Case";
}

/** Case type is stored in buyingUnit. Older rows only say "Case". */
function caseByFromBuyingUnit(buyingUnit: string | null | undefined): CaseBy {
  const normalized = buyingUnit?.trim().toLowerCase() ?? "";
  if (normalized.startsWith("lb")) return "Lbs / case";
  return "Units / case";
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
    "";
  const subcategoryName =
    (item.subcategoryId &&
      options.subcategoriesById?.get(item.subcategoryId)) ||
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
  const caseBy =
    sourcePer === "Case" ? caseByFromBuyingUnit(item.buyingUnit) : "";
  const singleItemUnit =
    item.singleItemUnit?.trim() || (sourcePer === "Unit" ? "Each" : "");
  const pieceWeightOz =
    sourcePer === "Unit" ? pieceWeightOzFromLabel(singleItemUnit) : 0;
  const contents = Math.max(1, item.contents ?? 1);
  const buyingPrice = centsToDollars(item.buyingPrice);

  return {
    id: preferModelId(item, ["itemCode"], recordId ?? `API-ITEM-${index + 1}`),
    recordId,
    name: item.name?.trim() || "N/A",
    merchandisingName:
      item.merchandisingName?.trim() || item.name?.trim() || "N/A",
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
    caseBy,
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
    id: preferModelId(product, ["productId"], recordId ?? `API-${index + 1}`),
    recordId,
    name,
    merchandisingName: name,
    description: product.description ?? "",
    preorderInfo: "",
    category: product.categoryNames?.[0] ?? "",
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
    (item) => item.recordId === product.itemId || item.id === product.itemId,
  );
  const name = product.merchandisingName ?? product.name ?? "Product";
  const priceCents = product.sellingPrice ?? product.price ?? 0;
  const recordId = product.id;

  return {
    id: preferModelId(
      product,
      ["productId"],
      recordId ?? `API-PFS-${index + 1}`,
    ),
    recordId,
    itemId:
      (product.itemId && isUuid(product.itemId) ? product.itemId : undefined) ??
      linked?.recordId ??
      product.itemId ??
      "",
    sortOrder: product.position ?? index,
    live: Boolean(product.isLive),
    merchandisingName: name,
    category: linked?.category ?? product.categoryNames?.[0] ?? "",
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

const STATE_CODE = /^[A-Za-z]{2}$/;

function distributorAddressFields(distributor: {
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
}) {
  const raw = distributor.address?.trim() ?? "";
  const city = distributor.city?.trim() ?? "";
  const state = distributor.state?.trim() ?? "";
  const zip = distributor.zipCode?.trim() ?? "";

  if (!city && !state && !zip) return parseAddressParts(raw);

  // Older saves stored the state code in `city` and left the city name in `address`.
  if (STATE_CODE.test(city) && !state && raw.includes(",")) {
    return parseAddressParts([raw, city, zip].filter(Boolean).join(", "));
  }

  if (
    raw &&
    ((city && raw.toLowerCase().includes(city.toLowerCase())) ||
      (zip && raw.includes(zip)))
  ) {
    const parsed = parseAddressParts(raw);
    return {
      street: parsed.street,
      apt: parsed.apt,
      city: city || parsed.city,
      state: state || parsed.state,
      zip: zip || parsed.zip,
    };
  }

  const comma = raw.indexOf(",");
  if (comma >= 0) {
    return {
      street: raw.slice(0, comma).trim(),
      apt: raw.slice(comma + 1).trim(),
      city,
      state,
      zip,
    };
  }

  return { street: raw, apt: "", city, state, zip };
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
      phone: formatPhoneValue(contact.phone ?? ""),
      email: contact.email ?? "",
      title: contact.title ?? "",
      primary: contactIndex === 0,
    }),
  );

  const addressFields = distributorAddressFields(distributor);
  const fullAddress = formatFullAddress(addressFields);
  const location =
    formatCityState(addressFields.city, addressFields.state) ||
    (fullAddress ? locationFromAddress(fullAddress) : "");

  const primary = contacts[0];
  const recordId = distributor.id;
  const distributorKey =
    recordId ?? distributor.distributorCode ?? String(index);
  const deliveryDays = scheduleToDeliveryDays(distributor.deliverySchedule);
  const deliveryLabel = formatDeliveryLabel(deliveryDays);
  const documents = mapApiDocuments(distributor.documents, distributorKey);

  return {
    id: preferModelId(
      distributor,
      ["distributorCode"],
      recordId ?? `DIS-API-${index + 1}`,
    ),
    recordId,
    name: distributor.name ?? "Distributor",
    paymentTerms: distributor.paymentTerms ?? "",
    contact: primary ? `${primary.firstName} ${primary.lastName}`.trim() : "",
    phone: primary?.phone ?? "",
    location,
    fullAddress,
    street: addressFields.street,
    apt: addressFields.apt,
    city: addressFields.city,
    state: addressFields.state,
    zip: addressFields.zip,
    delivery: [deliveryLabel.days, deliveryLabel.time]
      .filter(Boolean)
      .join(" "),
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
  const addressFields = distributorAddressFields(source);
  const fullAddress = formatFullAddress(addressFields);
  const location =
    formatCityState(addressFields.city, addressFields.state) ||
    (fullAddress ? locationFromAddress(fullAddress) : "");

  const recordId = source.id;

  return {
    id: preferModelId(
      source,
      ["sourceCode"],
      recordId ?? `SRC-API-${index + 1}`,
    ),
    recordId,
    name: source.name ?? "Source",
    location,
    fullAddress,
    street: addressFields.street,
    apt: addressFields.apt,
    city: addressFields.city,
    state: addressFields.state,
    zip: addressFields.zip,
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
  const match = categories.find(
    (category) => category.name?.toLowerCase() === normalized,
  );
  if (!match?.id || !isUuid(match.id)) return undefined;
  return match.id;
}

export function findSubcategoryIdByName(
  subcategories: Array<
    Pick<CatalogSubcategory, "id" | "name" | "category" | "recordId">
  >,
  category: string,
  name: string,
): string | undefined {
  const categoryKey = category.trim().toLowerCase();
  const nameKey = name.trim().toLowerCase();
  if (!categoryKey || !nameKey) return undefined;
  const match = subcategories.find(
    (entry) =>
      entry.category.trim().toLowerCase() === categoryKey &&
      entry.name.trim().toLowerCase() === nameKey,
  );
  if (!match) return undefined;
  if (match.recordId && isUuid(match.recordId)) return match.recordId;
  if (match.id && isUuid(match.id)) return match.id;
  return undefined;
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
  const categoryId = subcategory.categoryId ?? nestedCategory?.id ?? undefined;
  const categoryName =
    (typeof subcategory.category === "string"
      ? subcategory.category
      : nestedCategory?.name) ||
    (categoryId ? categoriesById.get(categoryId) : undefined) ||
    "";

  if (!categoryName) return null;

  return {
    id: preferModelId(subcategory, ["subcategoryCode"], subcategory.id ?? name),
    recordId: isUuid(subcategory.id) ? subcategory.id : undefined,
    name,
    category: categoryName,
    categoryId: categoryId && isUuid(categoryId) ? categoryId : undefined,
  };
}

/** Public order code shown in lists. Prefers orderCode over the UUID. */
export function orderModelId(
  order: { id?: string; orderCode?: string; code?: string },
  fallback: string,
): string {
  return preferModelId(order, ["orderCode", "code"], order.id ?? fallback);
}

/** Database id for order routes that look the row up by UUID. */
export function orderRecordId(order: { id?: string }): string | undefined {
  const id = order.id?.trim();
  return id && isUuid(id) ? id : undefined;
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

function readScheduleDelay(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

export function mapApiNotificationRule(
  rule: ApiNotificationRule,
  index: number,
): PushNotification {
  const recordId = rule.id;
  return {
    id: preferModelId(
      rule,
      ["notificationRuleCode", "ruleCode", "code"],
      recordId ?? `PN-${String(index + 1).padStart(3, "0")}`,
    ),
    recordId,
    action: rule.action?.trim() || rule.actionEndpoint?.trim() || "",
    httpMethod:
      (rule.httpMethod ?? rule.triggerMethod)?.trim().toUpperCase() || "",
    title: rule.title?.trim() || "",
    body: rule.subtext?.trim() || "",
    scheduleDelay: readScheduleDelay(rule.scheduleDelay),
    scheduleUnit: rule.scheduleUnit?.trim().toLowerCase() || "minutes",
  };
}

export function normalizeCategoriesList(payload: unknown): ApiCategory[] {
  return normalizeNamedList<ApiCategory>(payload, [
    "categories",
    "data",
    "results",
  ]);
}

import {
  ADMIN_ROLE_PERMISSIONS,
  DEFAULT_ROLE_PERMISSIONS,
} from "@/data/admin";
import type { AdminCustomer, ManagedRole, RoleUser } from "@/types/admin";
import type { Item } from "@/types/item";

import type { ApiProduct, ApiRole, ApiUser } from "./types";

export function mapApiUserToRoleUser(user: ApiUser, index: number): RoleUser {
  const roleName = user.role ?? "Manager";
  const displayRole =
    roleName.charAt(0).toUpperCase() + roleName.slice(1).replace(/_/g, " ");

  return {
    id: user.id ?? `U${String(index + 1).padStart(3, "0")}`,
    name: user.name ?? user.email ?? "User",
    email: user.email ?? "",
    phone: user.phone ?? "",
    type: displayRole.includes("Admin")
      ? "Superadmin"
      : displayRole.includes("Warehouse")
        ? "Warehouse Worker"
        : displayRole.includes("Driver")
          ? "Driver"
          : displayRole,
    password: "",
    permissions:
      displayRole === "Superadmin"
        ? ADMIN_ROLE_PERMISSIONS
        : DEFAULT_ROLE_PERMISSIONS,
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
    permissions: DEFAULT_ROLE_PERMISSIONS,
  };
}

export function mapApiUserToAdminCustomer(user: ApiUser, index: number): AdminCustomer {
  const fullName = (user.name ?? user.email ?? "Customer").trim();
  const [firstName, ...rest] = fullName.split(/\s+/);
  return {
    id: user.id ?? `C${String(index + 1).padStart(3, "0")}`,
    firstName: firstName || "Customer",
    lastName: rest.join(" ") || "",
    email: user.email ?? "",
    phone: user.phone ?? "",
    shortLocation: "",
    fullAddress: "",
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
    orders: [],
  };
}

export function mapApiProductToItem(product: ApiProduct, index: number): Item {
  const category = product.categoryNames?.[0] ?? "Protein";
  const priceCents = product.price ?? 0;
  const sellingPrice = priceCents > 100 ? priceCents / 100 : priceCents;

  return {
    id: product.id ?? `API-${index + 1}`,
    name: product.name ?? "Product",
    merchandisingName: product.name ?? "Product",
    description: product.description ?? "",
    preorderInfo: "",
    category,
    subcategory: product.categoryNames?.[1] ?? "",
    distributor: "",
    source: "",
    buyingUnit: "Case/Box",
    buyingPrice: sellingPrice,
    contents: 1,
    singleItemUnit: "Each",
    sellingPrice,
    photos: [],
  };
}

export function normalizeUsersList(payload: unknown): ApiUser[] {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    for (const key of ["users", "items", "data", "results"]) {
      const value = record[key];
      if (Array.isArray(value)) return value as ApiUser[];
    }
  }
  return [];
}

export function normalizeProductsList(payload: unknown): ApiProduct[] {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    for (const key of ["products", "items", "data", "results"]) {
      const value = record[key];
      if (Array.isArray(value)) return value as ApiProduct[];
    }
  }
  return [];
}

export function normalizeRolesList(payload: unknown): ApiRole[] {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    for (const key of ["roles", "items", "data", "results"]) {
      const value = record[key];
      if (Array.isArray(value)) return value as ApiRole[];
    }
  }
  return [];
}

export function normalizeOrdersList(payload: unknown): import("./types").ApiOrder[] {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    for (const key of ["orders", "items", "data", "results"]) {
      const value = record[key];
      if (Array.isArray(value)) return value as import("./types").ApiOrder[];
    }
  }
  return [];
}

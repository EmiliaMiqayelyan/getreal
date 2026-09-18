import type { ManagedRole, RolePermissions, RoleUser } from "@/types/admin";
import { ADMIN_USERS } from "@/data/admin";
import {
  ADMIN_ROLE_PERMISSIONS,
  MANAGER_ROLE_PERMISSIONS,
  WAREHOUSE_ROLE_PERMISSIONS,
  normalizePermissions,
} from "@/utils/rolePermissions";

const USERS_STORAGE_KEY = "getreal.roles.users";
const ROLES_STORAGE_KEY = "getreal.roles.templates";

function hasNewPermissionShape(
  permissions: Partial<RolePermissions> | null | undefined,
): boolean {
  return Boolean(permissions && "accessDistributors" in permissions);
}

function normalizeUser(user: RoleUser): RoleUser {
  const type = user.type?.toLowerCase() ?? "";
  if (type.includes("super")) {
    return { ...user, permissions: { ...ADMIN_ROLE_PERMISSIONS } };
  }
  if (!hasNewPermissionShape(user.permissions)) {
    if (type.includes("manager")) {
      return { ...user, permissions: { ...MANAGER_ROLE_PERMISSIONS } };
    }
    if (type.includes("warehouse")) {
      return { ...user, permissions: { ...WAREHOUSE_ROLE_PERMISSIONS } };
    }
  }
  return {
    ...user,
    permissions: normalizePermissions(user.permissions),
  };
}

function normalizeManagedRole(role: ManagedRole): ManagedRole {
  const name = role.name?.toLowerCase() ?? "";
  if (!hasNewPermissionShape(role.permissions)) {
    if (name.includes("manager")) {
      return { ...role, permissions: { ...MANAGER_ROLE_PERMISSIONS } };
    }
    if (name.includes("warehouse")) {
      return { ...role, permissions: { ...WAREHOUSE_ROLE_PERMISSIONS } };
    }
  }
  return {
    ...role,
    permissions: normalizePermissions(role.permissions),
  };
}

export function loadRoleUsers(): RoleUser[] {
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    if (!raw) return structuredClone(ADMIN_USERS).map(normalizeUser);
    const parsed = JSON.parse(raw) as RoleUser[];
    if (!Array.isArray(parsed) || !parsed.length) {
      return structuredClone(ADMIN_USERS).map(normalizeUser);
    }
    return parsed.map(normalizeUser);
  } catch {
    return structuredClone(ADMIN_USERS).map(normalizeUser);
  }
}

export function saveRoleUsers(users: RoleUser[]): void {
  try {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  } catch {
    // ignore quota / private mode
  }
}

/** Seed role templates until Roles API owns this list. */
export const DEFAULT_MANAGED_ROLES: ManagedRole[] = [];

export function loadManagedRoles(): ManagedRole[] {
  try {
    const raw = localStorage.getItem(ROLES_STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULT_MANAGED_ROLES).map(normalizeManagedRole);
    const parsed = JSON.parse(raw) as ManagedRole[];
    if (!Array.isArray(parsed)) {
      return structuredClone(DEFAULT_MANAGED_ROLES).map(normalizeManagedRole);
    }
    return parsed.map(normalizeManagedRole);
  } catch {
    return structuredClone(DEFAULT_MANAGED_ROLES).map(normalizeManagedRole);
  }
}

export function saveManagedRoles(roles: ManagedRole[]): void {
  try {
    localStorage.setItem(ROLES_STORAGE_KEY, JSON.stringify(roles));
  } catch {
    // ignore
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Demo password policy: min 6 chars, at least one letter and one number. */
export function isValidPassword(password: string): boolean {
  if (password.length < 6) return false;
  return /[A-Za-z]/.test(password) && /\d/.test(password);
}

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email.trim());
}

export type UserFormErrors = {
  name?: string;
  email?: string;
  password?: string;
  phone?: string;
  type?: string;
};

export function validateUserForm(input: {
  name: string;
  email: string;
  password: string;
  phone: string;
  type: string;
  /** When editing, empty password is allowed (§11). */
  isEdit: boolean;
}): UserFormErrors {
  const errors: UserFormErrors = {};

  if (!input.name.trim()) errors.name = "Name is required.";
  if (!input.email.trim()) errors.email = "Email is required.";
  else if (!isValidEmail(input.email)) {
    errors.email = "Enter a valid email address.";
  }

  if (!input.isEdit) {
    if (!input.password) errors.password = "Password is required.";
    else if (!isValidPassword(input.password)) {
      errors.password =
        "Password must be at least 6 characters and include a letter and a number.";
    }
  } else if (input.password && !isValidPassword(input.password)) {
    errors.password =
      "Password must be at least 6 characters and include a letter and a number.";
  }

  if (!input.phone.trim()) errors.phone = "Phone is required.";
  if (!input.type) errors.type = "Role Name is required.";

  return errors;
}

/** Map route path → page-access permission key for UI enforcement. */
export const ROUTE_PERMISSION_KEY: Record<string, keyof RolePermissions> = {
  "/dashboard": "sidebarDashboard",
  "/distributors": "accessDistributors",
  "/source": "accessSource",
  "/items": "accessItemSetup",
  "/products-for-sale": "accessProductsForSale",
  "/product-orders": "accessDistributorOrders",
  "/customers": "accessCustomers",
  "/customer-orders": "accessCustomerOrders",
  "/inventory": "accessInventory",
  "/distributor-deliveries": "accessReceiving",
  "/packing-coolers": "accessCoolerPacking",
  "/packer-manager": "accessPackerManager",
  "/roles": "accessRoles",
  "/notifications": "accessNotifications",
};

export function canAccessPath(
  permissions: RolePermissions | null | undefined,
  pathname: string,
): boolean {
  if (!permissions) return true;
  const key = ROUTE_PERMISSION_KEY[pathname];
  if (!key) return true;
  return Boolean(permissions[key]);
}

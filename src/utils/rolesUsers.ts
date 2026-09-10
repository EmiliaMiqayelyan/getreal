import type { ManagedRole, RolePermissions, RoleUser } from "@/types/admin";
import { ADMIN_USERS, DEFAULT_ROLE_PERMISSIONS } from "@/data/admin";

const USERS_STORAGE_KEY = "getreal.roles.users";
const ROLES_STORAGE_KEY = "getreal.roles.templates";

export function loadRoleUsers(): RoleUser[] {
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    if (!raw) return structuredClone(ADMIN_USERS);
    const parsed = JSON.parse(raw) as RoleUser[];
    if (!Array.isArray(parsed) || !parsed.length) {
      return structuredClone(ADMIN_USERS);
    }
    return parsed;
  } catch {
    return structuredClone(ADMIN_USERS);
  }
}

export function saveRoleUsers(users: RoleUser[]): void {
  try {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  } catch {
    // ignore quota / private mode
  }
}

export const DEFAULT_MANAGED_ROLES: ManagedRole[] = [
  {
    id: "role-warehouse-manager",
    name: "Warehouse Manager",
    permissions: {
      ...DEFAULT_ROLE_PERMISSIONS,
      sidebarInventory: true,
      sidebarReceiving: true,
      sidebarCoolerPacking: true,
      sidebarPackerManager: true,
      sidebarProductsForSale: true,
      productsEdit: true,
      productsToggleLive: true,
    },
  },
  {
    id: "role-packer-manager",
    name: "Packer Manager",
    permissions: {
      ...DEFAULT_ROLE_PERMISSIONS,
      sidebarCoolerPacking: true,
      sidebarPackerManager: true,
      sidebarCustomerOrders: true,
    },
  },
  {
    id: "role-manager",
    name: "Manager",
    permissions: {
      ...DEFAULT_ROLE_PERMISSIONS,
      sidebarDashboard: true,
      sidebarDistributors: true,
      sidebarProductsForSale: true,
      sidebarProductOrders: true,
      sidebarCustomers: true,
      sidebarCustomerOrders: true,
      sidebarInventory: true,
      sidebarRoles: false,
      productsCreate: true,
      productsEdit: true,
      customersCreate: true,
      customersEdit: true,
      ordersCreate: true,
      ordersEdit: true,
    },
  },
  {
    id: "role-item-receiver",
    name: "Item Reciever",
    permissions: {
      ...DEFAULT_ROLE_PERMISSIONS,
      sidebarDashboard: true,
      sidebarDistributors: true,
      sidebarProductsForSale: true,
      sidebarProductOrders: true,
      sidebarCustomers: true,
      sidebarCustomerOrders: true,
      sidebarInventory: true,
      sidebarReceiving: true,
      sidebarRoles: false,
    },
  },
];

export function loadManagedRoles(): ManagedRole[] {
  try {
    const raw = localStorage.getItem(ROLES_STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULT_MANAGED_ROLES);
    const parsed = JSON.parse(raw) as ManagedRole[];
    if (!Array.isArray(parsed)) return structuredClone(DEFAULT_MANAGED_ROLES);
    return parsed;
  } catch {
    return structuredClone(DEFAULT_MANAGED_ROLES);
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

/** Map route path → sidebar permission key for UI enforcement. */
export const ROUTE_PERMISSION_KEY: Record<string, keyof RolePermissions> = {
  "/dashboard": "sidebarDashboard",
  "/distributors": "sidebarDistributors",
  "/source": "sidebarSource",
  "/items": "sidebarItems",
  "/products-for-sale": "sidebarProductsForSale",
  "/product-orders": "sidebarProductOrders",
  "/customers": "sidebarCustomers",
  "/customer-orders": "sidebarCustomerOrders",
  "/inventory": "sidebarInventory",
  "/distributor-deliveries": "sidebarReceiving",
  "/packing-coolers": "sidebarCoolerPacking",
  "/packer-manager": "sidebarPackerManager",
  "/roles": "sidebarRoles",
  "/notifications": "sidebarNotifications",
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

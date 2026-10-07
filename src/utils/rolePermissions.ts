import type { RolePermissions } from "@/types/admin";

export type RolePermissionAction = {
  key: keyof RolePermissions;
  label: string;
};

export type RolePermissionGroup = {
  label: string;
  accessKey: keyof RolePermissions;
  accessLabel: string;
  actions: RolePermissionAction[];
};

/** Full Roles Responsibilities matrix for Role Management + per-user checkboxes. */
export const ROLE_PERMISSION_GROUPS: RolePermissionGroup[] = [
  {
    label: "Distributors",
    accessKey: "accessDistributors",
    accessLabel: "Access Distributors page",
    actions: [
      { key: "distributorsCreate", label: "Can Create" },
      { key: "distributorsEdit", label: "Can Edit" },
      { key: "distributorsDelete", label: "Can Delete" },
    ],
  },
  {
    label: "Source",
    accessKey: "accessSource",
    accessLabel: "Access Source page",
    actions: [
      { key: "sourceCreate", label: "Can Create" },
      { key: "sourceEdit", label: "Can Edit" },
      { key: "sourceRemove", label: "Can Remove" },
    ],
  },
  {
    label: "Item Setup",
    accessKey: "accessItemSetup",
    accessLabel: "Access Item Setup page",
    actions: [
      { key: "itemsCreate", label: "Can Create Item" },
      { key: "itemsEdit", label: "Can Edit" },
      { key: "itemsRemove", label: "Can Remove" },
      { key: "itemsEditPricing", label: "Can Edit Pricing" },
    ],
  },
  {
    label: "Product for Sale",
    accessKey: "accessProductsForSale",
    accessLabel: "Access Product for Sale page",
    actions: [
      { key: "productsAddItem", label: "Can Add Item" },
      { key: "productsRemove", label: "Can Remove" },
      { key: "productsToggleLive", label: "Can Turn On/Off Live Item" },
      { key: "productsChangePlacement", label: "Can Change Item Placement" },
      { key: "productsView", label: "Can View" },
    ],
  },
  {
    label: "Distributor Orders",
    accessKey: "accessDistributorOrders",
    accessLabel: "Access Distributor Orders page",
    actions: [
      {
        key: "distributorOrdersFromCustomerList",
        label: "Can Order from Customer Orders list",
      },
      {
        key: "distributorOrdersCreateCustom",
        label: "Can Create Custom Order",
      },
      {
        key: "distributorOrdersAccessDelivered",
        label: "Access Delivered page",
      },
    ],
  },
  {
    label: "Inventory Management",
    accessKey: "accessInventory",
    accessLabel: "Access Inventory Management page",
    actions: [
      { key: "inventoryStockItems", label: "Can Stock Items" },
      { key: "inventoryChangeLocation", label: "Can Change Item Location" },
    ],
  },
  {
    label: "Customers",
    accessKey: "accessCustomers",
    accessLabel: "Access Customers page",
    actions: [
      { key: "customersViewDetails", label: "Can View Customer Details" },
    ],
  },
  {
    label: "Customer Orders",
    accessKey: "accessCustomerOrders",
    accessLabel: "Access Customer Orders page",
    actions: [
      { key: "customerOrdersViewDetails", label: "Can View Order Details" },
      { key: "customerOrdersChangeStatuses", label: "Can Change Statuses" },
      {
        key: "customerOrdersStatusHover",
        label: "Can See Status Info on Hover",
      },
      { key: "customerOrdersAccessCompleted", label: "Access Completed page" },
    ],
  },
  {
    label: "Distributor Receiving",
    accessKey: "accessReceiving",
    accessLabel: "Access Distributor Receiving page",
    actions: [
      { key: "receivingValidate", label: "Can Validate" },
      { key: "receivingEdit", label: "Can Edit" },
    ],
  },
  {
    label: "Cooler Packing",
    accessKey: "accessCoolerPacking",
    accessLabel: "Access Cooler Packing page",
    actions: [{ key: "coolerPackingMakeActions", label: "Can Make Actions" }],
  },
  {
    label: "Packer Manager",
    accessKey: "accessPackerManager",
    accessLabel: "Access Packer Manager page",
    actions: [
      {
        key: "packerManagerViewCustomerDetails",
        label: "Can View Customer Details",
      },
      { key: "packerManagerAssignPacker", label: "Can Assign Packer" },
    ],
  },
  {
    label: "Roles",
    accessKey: "accessRoles",
    accessLabel: "Access Roles page",
    actions: [
      { key: "rolesAddUser", label: "Can Add User" },
      { key: "rolesAccessManagement", label: "Access Role Management" },
    ],
  },
  {
    label: "Notifications",
    accessKey: "accessNotifications",
    accessLabel: "Access Notifications page",
    actions: [
      { key: "notificationsCreate", label: "Can Create" },
      { key: "notificationsEdit", label: "Can Edit" },
      { key: "notificationsDelete", label: "Can Delete" },
    ],
  },
];

/** Blank / deferred defaults (Warehouse Worker until platform-ready). */
export const DEFAULT_ROLE_PERMISSIONS: RolePermissions = {
  sidebarDashboard: true,

  accessDistributors: false,
  distributorsCreate: false,
  distributorsEdit: false,
  distributorsDelete: false,

  accessSource: false,
  sourceCreate: false,
  sourceEdit: false,
  sourceRemove: false,

  accessItemSetup: false,
  itemsCreate: false,
  itemsEdit: false,
  itemsRemove: false,
  itemsEditPricing: false,

  accessProductsForSale: false,
  productsAddItem: false,
  productsRemove: false,
  productsToggleLive: false,
  productsChangePlacement: false,
  productsView: false,

  accessDistributorOrders: false,
  distributorOrdersFromCustomerList: false,
  distributorOrdersCreateCustom: false,
  distributorOrdersAccessDelivered: false,

  accessInventory: false,
  inventoryStockItems: false,
  inventoryChangeLocation: false,

  accessCustomers: false,
  customersViewDetails: false,

  accessCustomerOrders: false,
  customerOrdersViewDetails: false,
  customerOrdersChangeStatuses: false,
  customerOrdersStatusHover: false,
  customerOrdersAccessCompleted: false,

  accessReceiving: false,
  receivingValidate: false,
  receivingEdit: false,

  accessCoolerPacking: false,
  coolerPackingMakeActions: false,

  accessPackerManager: false,
  packerManagerViewCustomerDetails: false,
  packerManagerAssignPacker: false,

  accessRoles: false,
  rolesAddUser: false,
  rolesAccessManagement: false,

  accessNotifications: false,
  notificationsCreate: false,
  notificationsEdit: false,
  notificationsDelete: false,
};

/** Super Admin: every checkbox enabled. */
export const ADMIN_ROLE_PERMISSIONS: RolePermissions = Object.fromEntries(
  Object.keys(DEFAULT_ROLE_PERMISSIONS).map((key) => [key, true]),
) as RolePermissions;

/** Manager: all enabled except Roles. */
export const MANAGER_ROLE_PERMISSIONS: RolePermissions = {
  ...ADMIN_ROLE_PERMISSIONS,
  accessRoles: false,
  rolesAddUser: false,
  rolesAccessManagement: false,
};

/** Warehouse Worker: deferred until platform-ready. */
export const WAREHOUSE_ROLE_PERMISSIONS: RolePermissions = {
  ...DEFAULT_ROLE_PERMISSIONS,
};

export function normalizePermissions(
  permissions: Partial<RolePermissions> | null | undefined,
): RolePermissions {
  return {
    ...DEFAULT_ROLE_PERMISSIONS,
    ...(permissions ?? {}),
  };
}

/** Role permission flags from a GET /roles/:id `permissions` array. */
export function permissionsFromKeys(keys: string[]): RolePermissions {
  const next = { ...DEFAULT_ROLE_PERMISSIONS };
  for (const key of keys) {
    if (key in next) next[key as keyof RolePermissions] = true;
  }
  return next;
}

/**
 * Backend permission string that grants each checkbox. Checkboxes that share
 * a string are granted or revoked together, because the API cannot store
 * them separately.
 */
export const API_PERMISSION_FOR: Record<keyof RolePermissions, string> = {
  sidebarDashboard: "view:dashboard",

  accessDistributors: "read:distributors",
  distributorsCreate: "manage:distributors",
  distributorsEdit: "manage:distributors",
  distributorsDelete: "manage:distributors",

  accessSource: "manage:sources",
  sourceCreate: "manage:sources",
  sourceEdit: "manage:sources",
  sourceRemove: "manage:sources",

  accessItemSetup: "read:products",
  itemsCreate: "manage:products",
  itemsEdit: "manage:products",
  itemsRemove: "manage:products",
  itemsEditPricing: "manage:products",

  accessProductsForSale: "read:products",
  productsAddItem: "manage:products",
  productsRemove: "manage:products",
  productsToggleLive: "manage:products",
  productsChangePlacement: "manage:products",
  productsView: "read:products",

  accessDistributorOrders: "read:orders",
  distributorOrdersFromCustomerList: "create:orders",
  distributorOrdersCreateCustom: "create:orders",
  distributorOrdersAccessDelivered: "read:orders",

  accessInventory: "read:inventory",
  inventoryStockItems: "manage:inventory",
  inventoryChangeLocation: "manage:inventory",

  accessCustomers: "read:users",
  customersViewDetails: "read:users",

  accessCustomerOrders: "read:orders",
  customerOrdersViewDetails: "read:orders",
  customerOrdersChangeStatuses: "update:order_status",
  customerOrdersStatusHover: "read:orders",
  customerOrdersAccessCompleted: "read:orders",

  accessReceiving: "read:receiving",
  receivingValidate: "manage:receiving",
  receivingEdit: "manage:receiving",

  accessCoolerPacking: "read:coolers",
  coolerPackingMakeActions: "manage:coolers",

  accessPackerManager: "read:orders",
  packerManagerViewCustomerDetails: "read:orders",
  packerManagerAssignPacker: "update:orders",

  accessRoles: "read:roles",
  rolesAddUser: "manage:users",
  rolesAccessManagement: "manage:roles",

  accessNotifications: "read:notifications",
  notificationsCreate: "manage:notifications",
  notificationsEdit: "manage:notifications",
  notificationsDelete: "manage:notifications",
};

/** Backend strings that also grant other strings (`manage:x` includes `read:x`). */
const API_PERMISSION_IMPLIES: Record<string, string[]> = {
  "manage:distributors": ["read:distributors"],
  "manage:products": ["read:products"],
  "manage:inventory": ["read:inventory"],
  "manage:users": ["read:users"],
  "manage:roles": ["read:roles"],
  "manage:receiving": ["read:receiving"],
  "manage:coolers": ["read:coolers"],
  "manage:notifications": ["read:notifications"],
  "manage:orders": [
    "read:orders",
    "create:orders",
    "update:orders",
    "update:order_status",
  ],
  "create:orders": ["read:orders"],
  "update:orders": ["read:orders"],
  "update:order_status": ["read:orders"],
};

const UI_OWNED_API_PERMISSIONS = new Set(Object.values(API_PERMISSION_FOR));

function expandApiPermissions(keys: Iterable<string>): Set<string> {
  const granted = new Set<string>();
  const queue = [...keys];
  while (queue.length) {
    const key = queue.pop()!;
    if (granted.has(key)) continue;
    granted.add(key);
    queue.push(...(API_PERMISSION_IMPLIES[key] ?? []));
  }
  return granted;
}

/** Permission names from an API role, whether sent as strings or `{ name }` objects. */
export function apiPermissionNames(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const names: string[] = [];
  for (const entry of raw) {
    if (typeof entry === "string") {
      if (entry.trim()) names.push(entry.trim());
      continue;
    }
    if (entry && typeof entry === "object") {
      const record = entry as Record<string, unknown>;
      const name = [
        record.name,
        record.key,
        record.permission,
        record.code,
      ].find((value) => typeof value === "string" && value.trim());
      if (typeof name === "string") names.push(name.trim());
    }
  }
  return names;
}

/** Checkbox state from backend strings. Legacy UI keys are accepted as-is. */
export function permissionsFromApiNames(names: string[]): RolePermissions {
  const granted = expandApiPermissions(names);
  const next = { ...DEFAULT_ROLE_PERMISSIONS };
  for (const key of Object.keys(next) as Array<keyof RolePermissions>) {
    next[key] = granted.has(API_PERMISSION_FOR[key]) || names.includes(key);
  }
  return next;
}

/**
 * Checkbox state for an API role. An empty or unrecognised list keeps the
 * role-type defaults so the signed-in admin is not locked out of the app.
 */
export function permissionsFromApiKeys(
  raw: unknown,
  fallback: RolePermissions,
): RolePermissions {
  const names = apiPermissionNames(raw);
  const known = names.filter(
    (name) =>
      name in DEFAULT_ROLE_PERMISSIONS ||
      UI_OWNED_API_PERMISSIONS.has(name) ||
      name in API_PERMISSION_IMPLIES,
  );
  if (!known.length) return fallback;
  return permissionsFromApiNames(known);
}

/**
 * Backend strings to save for these checkboxes. Strings with no checkbox
 * (for example `manage:payments`) are kept from the role's current list, and
 * `manage:orders` is kept while every order checkbox it covers stays on.
 */
export function apiPermissionsFor(
  permissions: RolePermissions,
  current: string[] = [],
): string[] {
  const result = new Set<string>();
  for (const key of Object.keys(permissions) as Array<keyof RolePermissions>) {
    if (permissions[key]) result.add(API_PERMISSION_FOR[key]);
  }
  for (const name of current) {
    if (UI_OWNED_API_PERMISSIONS.has(name)) continue;
    if (name in DEFAULT_ROLE_PERMISSIONS) continue;
    const implied = API_PERMISSION_IMPLIES[name];
    if (implied && !implied.every((key) => result.has(key))) continue;
    result.add(name);
  }
  return [...result];
}

/** Toggle one checkbox and every checkbox stored under the same backend string. */
export function togglePermission(
  permissions: RolePermissions,
  key: keyof RolePermissions,
  value: boolean,
): RolePermissions {
  const owned = new Set(
    (Object.keys(permissions) as Array<keyof RolePermissions>)
      .filter((entry) => permissions[entry])
      .map((entry) => API_PERMISSION_FOR[entry]),
  );
  const target = API_PERMISSION_FOR[key];
  if (value) {
    for (const name of expandApiPermissions([target])) owned.add(name);
  } else {
    for (const name of [...owned]) {
      if (expandApiPermissions([name]).has(target)) owned.delete(name);
    }
  }
  return permissionsFromApiNames([...owned]);
}

/** True when at least one page-access flag is on. */
export function hasPageAccess(
  permissions: RolePermissions | null | undefined,
): boolean {
  if (!permissions) return false;
  return (
    Object.entries(permissions) as Array<[keyof RolePermissions, boolean]>
  ).some(([key, enabled]) => key.startsWith("access") && enabled);
}

/** Checked permission keys sent as `permissions: string[]`. */
export function checkedPermissionKeys(permissions: RolePermissions): string[] {
  return (
    Object.entries(permissions) as Array<[keyof RolePermissions, boolean]>
  )
    .filter(([, enabled]) => enabled)
    .map(([key]) => key);
}

export function permissionsForRoleType(type: string): RolePermissions {
  const normalized = type.trim().toLowerCase();
  if (normalized.includes("super") || normalized.includes("admin")) {
    return { ...ADMIN_ROLE_PERMISSIONS };
  }
  if (normalized.includes("manager")) return { ...MANAGER_ROLE_PERMISSIONS };
  if (normalized.includes("warehouse"))
    return { ...WAREHOUSE_ROLE_PERMISSIONS };
  return { ...DEFAULT_ROLE_PERMISSIONS };
}

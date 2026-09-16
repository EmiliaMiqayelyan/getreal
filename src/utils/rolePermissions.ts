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
    actions: [
      { key: "coolerPackingMakeActions", label: "Can Make Actions" },
    ],
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

export function permissionsForRoleType(type: string): RolePermissions {
  const normalized = type.trim().toLowerCase();
  if (normalized.includes("super")) return { ...ADMIN_ROLE_PERMISSIONS };
  if (normalized.includes("manager")) return { ...MANAGER_ROLE_PERMISSIONS };
  if (normalized.includes("warehouse")) return { ...WAREHOUSE_ROLE_PERMISSIONS };
  return { ...DEFAULT_ROLE_PERMISSIONS };
}

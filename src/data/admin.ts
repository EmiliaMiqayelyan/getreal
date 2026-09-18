import type {
  AdminCustomer,
  AdminItem,
  AdminProductOrder,
  RoleUser,
} from "@/types/admin";

export {
  ADMIN_ROLE_PERMISSIONS,
  DEFAULT_ROLE_PERMISSIONS,
  MANAGER_ROLE_PERMISSIONS,
  WAREHOUSE_ROLE_PERMISSIONS,
} from "@/utils/rolePermissions";

export const ADMIN_ITEMS: AdminItem[] = [];

export const ADMIN_PRODUCT_ORDERS: AdminProductOrder[] = [];

export const ADMIN_CUSTOMERS: AdminCustomer[] = [];

export const ADMIN_USERS: RoleUser[] = [];

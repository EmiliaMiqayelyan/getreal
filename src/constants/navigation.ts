import { ROUTES } from "@/constants";
import type { AppRole } from "@/lib/auth";

export type NavItem = {
  label: string;
  href: string;
  icon:
    | "dashboard"
    | "inventory"
    | "box"
    | "cart"
    | "truck"
    | "users"
    | "customers"
    | "roles";
  badge?: number;
};

export type NavSection = {
  title: string;
  items: NavItem[];
};

export const SUPERADMIN_NAV_SECTIONS: NavSection[] = [
  {
    title: "MENU",
    items: [
      { label: "Dashboard Report", href: ROUTES.dashboard, icon: "dashboard" },
    ],
  },
  {
    title: "CUSTOMER",
    items: [
      {
        label: "Customer Orders",
        href: ROUTES.customerOrders,
        icon: "users",
        badge: 13,
      },
      { label: "Customers", href: ROUTES.customers, icon: "customers" },
    ],
  },
  {
    title: "WAREHOUSE",
    items: [
      {
        label: "Distributors Orders",
        href: ROUTES.productOrders,
        icon: "cart",
        badge: 8,
      },
      { label: "Inventory", href: ROUTES.inventory, icon: "inventory" },
      {
        label: "Products For Sale",
        href: ROUTES.productsForSale,
        icon: "box",
      },
      { label: "Distributors", href: ROUTES.distributors, icon: "truck" },
    ],
  },
  {
    title: "SETTINGS",
    items: [{ label: "Roles", href: ROUTES.roles, icon: "roles" }],
  },
];

export const WAREHOUSE_NAV_SECTIONS: NavSection[] = [
  {
    title: "WAREHOUSE",
    items: [
      {
        label: "Distributor Receiving",
        href: ROUTES.distributorDeliveries,
        icon: "cart",
      },
      { label: "Inventory", href: ROUTES.inventory, icon: "inventory" },
      { label: "Packing Coolers", href: ROUTES.packingCoolers, icon: "box" },
      { label: "Distributors", href: ROUTES.distributors, icon: "truck" },
    ],
  },
];

/** @deprecated Prefer SUPERADMIN_NAV_SECTIONS / getNavSections */
export const NAV_SECTIONS = SUPERADMIN_NAV_SECTIONS;

export function getNavSections(role: AppRole | null): NavSection[] {
  if (role === "warehouse") return WAREHOUSE_NAV_SECTIONS;
  return SUPERADMIN_NAV_SECTIONS;
}

export function getRoleHome(role: AppRole | null): string {
  if (role === "warehouse") return ROUTES.distributorDeliveries;
  return ROUTES.dashboard;
}

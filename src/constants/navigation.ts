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
    | "roles"
    | "source"
    | "items"
    | "phone"
    | "package"
    | "bell";
  badge?: number;
};

export type NavSection = {
  title: string;
  items: NavItem[];
};

export const SUPERADMIN_NAV_SECTIONS: NavSection[] = [
  {
    title: "MAIN",
    items: [
      { label: "Distributors", href: ROUTES.distributors, icon: "truck" },
      { label: "Source", href: ROUTES.source, icon: "source" },
      { label: "Items", href: ROUTES.items, icon: "items" },
      {
        label: "Products For Sale",
        href: ROUTES.productsForSale,
        icon: "phone",
      },
      {
        label: "Distributors Orders",
        href: ROUTES.productOrders,
        icon: "cart",
        badge: 8,
      },
      { label: "Inventory", href: ROUTES.inventory, icon: "inventory" },
    ],
  },
  {
    title: "CUSTOMER",
    items: [
      { label: "Customers", href: ROUTES.customers, icon: "customers" },
      {
        label: "Customer Orders",
        href: ROUTES.customerOrders,
        icon: "roles",
      },
    ],
  },
  {
    title: "WAREHOUSE",
    items: [
      {
        label: "Distributor Receiving",
        href: ROUTES.distributorDeliveries,
        icon: "cart",
      },
      {
        label: "Cooler Packing",
        href: ROUTES.packingCoolers,
        icon: "package",
      },
      {
        label: "Packer Manager",
        href: ROUTES.packerManager,
        icon: "package",
      },
    ],
  },
  {
    title: "SETTINGS",
    items: [
      { label: "Roles", href: ROUTES.roles, icon: "roles" },
      {
        label: "Notifications",
        href: ROUTES.notifications,
        icon: "bell",
      },
    ],
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
      {
        label: "Cooler Packing",
        href: ROUTES.packingCoolers,
        icon: "package",
      },
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
  return ROUTES.distributors;
}

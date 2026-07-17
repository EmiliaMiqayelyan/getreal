import { ROUTES } from "@/constants";

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

export const NAV_SECTIONS: NavSection[] = [
  {
    title: "MENU",
    items: [{ label: "Dashboard", href: ROUTES.dashboard, icon: "dashboard" }],
  },
  {
    title: "WAREHOUSE",
    items: [
      { label: "Inventory", href: ROUTES.inventory, icon: "inventory" },
      {
        label: "Products For Sale",
        href: ROUTES.productsForSale,
        icon: "box",
      },
      {
        label: "Product Orders",
        href: ROUTES.productOrders,
        icon: "cart",
        badge: 8,
      },
      { label: "Distributors", href: ROUTES.distributors, icon: "truck" },
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
    title: "SETTINGS",
    items: [{ label: "Roles", href: ROUTES.roles, icon: "roles" }],
  },
];

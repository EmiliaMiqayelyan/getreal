export const APP_NAME = "GetReal Food" as const;

export const ROUTES = {
  home: "/",
  login: "/login",
  dashboard: "/dashboard",
  inventory: "/inventory",
  productsForSale: "/products-for-sale",
  productOrders: "/product-orders",
  distributorDeliveries: "/distributor-deliveries",
  packingCoolers: "/packing-coolers",
  packerManager: "/packer-manager",
  distributors: "/distributors",
  source: "/source",
  items: "/items",
  customerOrders: "/customer-orders",
  customers: "/customers",
  roles: "/roles",
  notifications: "/notifications",
} as const;

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES];

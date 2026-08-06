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
  distributors: "/distributors",
  customerOrders: "/customer-orders",
  customers: "/customers",
  roles: "/roles",
} as const;

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES];

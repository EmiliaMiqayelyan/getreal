export type AdminItemCategory =
  | "Meat"
  | "Poultry"
  | "Seafood"
  | "Pork"
  | "Vegetables"
  | "Fruits"
  | "Dairy"
  | "Grain"
  | "Specials";

export type AdminProductOrderStatus =
  | "In Progress"
  | "Completed"
  | "Canceled";

export type AdminCustomerOrderStatus =
  | "In Progress"
  | "Packing"
  | "Delivering"
  | "Completed"
  | "Canceled";

export type AdminItemSupplier = {
  supplierName: string;
  source: string;
  quantity: number;
  purchasePrice: number;
  lastDelivered: string;
  itemUnit: string;
};

export type AdminItem = {
  id: string;
  name: string;
  sku: string;
  category: AdminItemCategory;
  sellingPrice: number;
  unit: string;
  totalQuantity: number;
  suppliers: AdminItemSupplier[];
  live: boolean;
};

export type AdminProductOrderLine = {
  name: string;
  quantity: number;
  price: number;
  unit: string;
};

export type AdminProductOrder = {
  id: string;
  supplierName: string;
  companyName: string;
  status: AdminProductOrderStatus;
  creationDate: string;
  deliveryDate: string;
  createdBy: string;
  items: AdminProductOrderLine[];
};

export type AdminCustomerOrderItem = {
  itemName: string;
  quantity: number;
  unit: string;
  pricePerUnit: number;
  totalPrice: number;
};

export type AdminCustomerOrder = {
  id: string;
  orderDate: string;
  deliveryDate: string;
  deliveryAddress: string;
  orderPrice: number;
  paymentStatus: "Card" | "Cash" | "Terminal" | "Paid";
  status: AdminCustomerOrderStatus;
  items: AdminCustomerOrderItem[];
  packerAssigned?: string;
  coolerIds?: string[];
  orderedAt?: string;
};

export type AdminCustomer = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  shortLocation: string;
  fullAddress: string;
  orderQuantity: number;
  lastOrderedDate: string;
  lifetimeTotal: number;
  blocked?: boolean;
  subscribed?: boolean;
  customerTag?: "VIP" | "Special" | "Regular" | "";
  deliveryDay?: string;
  flagged?: boolean;
  zip?: string;
  orders: AdminCustomerOrder[];
};

export type RolePermissions = {
  sidebarDashboard: boolean;
  sidebarDistributors: boolean;
  sidebarSource: boolean;
  sidebarItems: boolean;
  sidebarProductsForSale: boolean;
  sidebarProductOrders: boolean;
  sidebarCustomers: boolean;
  sidebarCustomerOrders: boolean;
  sidebarInventory: boolean;
  sidebarReceiving: boolean;
  sidebarCoolerPacking: boolean;
  sidebarPackerManager: boolean;
  sidebarRoles: boolean;
  sidebarNotifications: boolean;
  productsCreate: boolean;
  productsEdit: boolean;
  productsDelete: boolean;
  productsToggleLive: boolean;
  customersCreate: boolean;
  customersEdit: boolean;
  customersDelete: boolean;
  ordersCreate: boolean;
  ordersEdit: boolean;
  ordersDelete: boolean;
  ordersMarkDelivered: boolean;
};

export type RoleUser = {
  id: string;
  name: string;
  email: string;
  phone: string;
  type: "Superadmin" | "Manager" | "Warehouse Worker" | "Driver" | string;
  permissions: RolePermissions;
  /** Demo-only stored password; empty/omit means unchanged on edit (§11). */
  password?: string;
};

/** Named role template editable in Role Management modal. */
export type ManagedRole = {
  id: string;
  name: string;
  permissions: RolePermissions;
};

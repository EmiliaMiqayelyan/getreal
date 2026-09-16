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
  /** Route/home access; not shown in Role Management checklist. */
  sidebarDashboard: boolean;

  accessDistributors: boolean;
  distributorsCreate: boolean;
  distributorsEdit: boolean;
  distributorsDelete: boolean;

  accessSource: boolean;
  sourceCreate: boolean;
  sourceEdit: boolean;
  sourceRemove: boolean;

  accessItemSetup: boolean;
  itemsCreate: boolean;
  itemsEdit: boolean;
  itemsRemove: boolean;
  itemsEditPricing: boolean;

  accessProductsForSale: boolean;
  productsAddItem: boolean;
  productsRemove: boolean;
  productsToggleLive: boolean;
  productsChangePlacement: boolean;
  productsView: boolean;

  accessDistributorOrders: boolean;
  distributorOrdersFromCustomerList: boolean;
  distributorOrdersCreateCustom: boolean;
  distributorOrdersAccessDelivered: boolean;

  accessInventory: boolean;
  inventoryStockItems: boolean;
  inventoryChangeLocation: boolean;

  accessCustomers: boolean;
  customersViewDetails: boolean;

  accessCustomerOrders: boolean;
  customerOrdersViewDetails: boolean;
  customerOrdersChangeStatuses: boolean;
  customerOrdersStatusHover: boolean;
  customerOrdersAccessCompleted: boolean;

  accessReceiving: boolean;
  receivingValidate: boolean;
  receivingEdit: boolean;

  accessCoolerPacking: boolean;
  coolerPackingMakeActions: boolean;

  accessPackerManager: boolean;
  packerManagerViewCustomerDetails: boolean;
  packerManagerAssignPacker: boolean;

  accessRoles: boolean;
  rolesAddUser: boolean;
  rolesAccessManagement: boolean;

  accessNotifications: boolean;
  notificationsCreate: boolean;
  notificationsEdit: boolean;
  notificationsDelete: boolean;
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

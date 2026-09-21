export type OrderCategory = "Meat" | "Fruits" | "Grains";

export type SupplierOption = {
  distributor: string;
  source: string;
  price: number;
  unit: string;
  qtyPerUnit: number;
};

export type OrderListItem = {
  id: string;
  itemName: string;
  category: OrderCategory;
  custOrderTotal: number;
  inStock: number | null;
  qtyReceiving: number;
  dateReceivingBy: string;
  suggestedQty: number;
  options: SupplierOption[];
};

export type WorkingOrderRow = OrderListItem & {
  quantity: number;
};

export type ReviewLine = {
  itemName: string;
  source: string;
  quantity: number;
  price: number;
  unit: string;
  lineTotal: number;
};

export type ReviewGroup = {
  distributor: string;
  email: string;
  items: ReviewLine[];
  itemCount: number;
  totalPrice: number;
};

export type PlacedOrder = {
  id: string;
  deliveryId: string;
  distributor: string;
  orderDate: string;
  deliveryDate: string;
  totalPrice: number;
  items: Array<{
    sku: string;
    itemName: string;
    source: string;
    quantity: number;
    price: number;
    unit: string;
  }>;
};

export type DeliveredOrderStatus = "Delivered" | "Partial";

export type DeliveredOrder = PlacedOrder & {
  week: string;
  day: string;
  zipCode: string;
  status: DeliveredOrderStatus;
  sortTimestamp: number;
};

export type DeliveryChip = {
  id: string;
  label: string;
  count: number;
};

export type PreviewRow = {
  id: string;
  itemName: string;
  custOrderTotal: number;
  inStock: number | null;
  qtyReceiving: number;
  dateReceivingBy: string;
};

export type ManualCatalogItem = {
  id: string;
  sku: string;
  name: string;
  distributor: string;
  source: string;
  inStock: number;
  price: number;
  unit: string;
};

export type ManualLine = ManualCatalogItem & {
  quantity: number;
};

/** Payload passed from Create Manual Order before Delivery ID assignment. */
export type ManualOrderDraft = {
  distributor: string;
  /** Display label shown in the orders list. */
  deliveryDate: string;
  /** ISO date (YYYY-MM-DD) for POST /orders when available. */
  deliveryDateIso?: string;
  totalPrice: number;
  items: PlacedOrder["items"];
};

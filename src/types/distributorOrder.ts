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
  category: string;
  custOrderTotal: number;
  inStock: number | null;
  qtyReceiving: number;
  dateReceivingBy: string;
  suggestedQty: number;
  options: SupplierOption[];
  /** Item / product code carried onto the invoice. */
  sku?: string;
  /**
   * Product-for-sale id to send as `productId` on POST /orders.
   * INTEGRATION: prefer the server UUID (`recordId`) over the display code.
   */
  productId?: string;
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
  sku?: string;
  productId?: string;
};

export type ReviewGroup = {
  distributor: string;
  /** Source this section is ordered from. Order Now submits this source only. */
  source: string;
  email: string;
  items: ReviewLine[];
  itemCount: number;
  totalPrice: number;
};

export type PlacedOrder = {
  id: string;
  /** UUID for GET /orders/:id. */
  recordId?: string;
  deliveryId: string;
  distributor: string;
  orderDate: string;
  deliveryDate: string;
  /** Local calendar day (`YYYY-MM-DD`) used by the date chips and list filter. */
  deliveryDateId?: string;
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
  /** Full ISO datetime for POST /orders when available. */
  deliveryDateIso?: string;
  totalPrice: number;
  items: PlacedOrder["items"];
};

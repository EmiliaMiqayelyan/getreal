export type ReceivingLineStatus = "accepted" | "rejected";

export type ReceivingRejectReason =
  | "Wrong Item"
  | "Damaged"
  | "Not Fresh"
  | "Missing Exp Date";

export type ReceivingHandoffLine = {
  lineId: string;
  itemId: string;
  itemName: string;
  category: string;
  source: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  priceLabel: string;
  expiration: string;
  status: ReceivingLineStatus;
  reason?: ReceivingRejectReason;
  photoUrl?: string;
  /** Catalog UUID when the line was rebuilt from an in-progress stock draft. */
  catalogItemId?: string;
  /** Preserved when a stock session is saved back onto the handoff. */
  qtyAfterUnpack?: string;
  location?: string;
  splits?: Array<{ qty: number; location: string }>;
};

/** Payload handed from Distributor Receiving → Inventory (accepted lines only). */
export type ReceivingHandoffOrder = {
  deliveryId: string;
  distributor: string;
  receivedAt: string;
  items: ReceivingHandoffLine[];
};

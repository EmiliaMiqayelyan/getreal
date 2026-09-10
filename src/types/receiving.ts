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
};

/** Payload handed from Distributor Receiving → Inventory (accepted lines only). */
export type ReceivingHandoffOrder = {
  deliveryId: string;
  distributor: string;
  receivedAt: string;
  items: ReceivingHandoffLine[];
};

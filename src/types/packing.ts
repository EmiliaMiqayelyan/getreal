/** Inventory-like stock row used by cooler packing SourcePicker. */
export type PackingSourceOption = {
  distributor: string;
  source: string;
  expDate: string;
  location: string;
  itemId: string;
};

export type PackingLine = {
  id: string;
  name: string;
  category: "Meat" | "Fruits";
  qty: number;
  selected?: PackingSourceOption;
  coolerId: string;
  packed: boolean;
  options: PackingSourceOption[];
};

/**
 * Cross-module packing state keyed by customer order code (e.g. ORD-U003-01).
 * Packer Manager writes assignment; Cooler Packing writes timestamps.
 */
export type PackingHandoffUpdate = {
  orderCode: string;
  packerId?: string;
  packerName: string;
  /** Set when packer starts packing (Cooler Packing Start Packing). */
  packingStartedAt?: string;
  /** Set when Cooler Ready completes — also mirrored as packedAt. */
  coolerReadyAt?: string;
  /** Alias of coolerReadyAt for Customer Orders timeline. */
  packedAt?: string;
  loadedAt?: string;
  coolerIds: string[];
  items?: PackingLine[];
};

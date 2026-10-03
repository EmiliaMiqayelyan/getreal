/**
 * One on-hand inventory lot the packer can fulfill an order line from.
 * API: a row from GET /inventory. `inventoryRecordId` is that record's id.
 */
export type PackingSourceOption = {
  inventoryRecordId: string;
  /** Public item code shown in the Item ID column. */
  itemId: string;
  distributor: string;
  source: string;
  /** Display expiration, e.g. Jul 30, 2026. */
  expDate: string;
  /** ISO date kept for the future packing payload. */
  expirationIso: string;
  location: string;
  /** Full address for the location hover. */
  address: string;
};

export type PackingLine = {
  id: string;
  /** Catalog item id. API: order line productId. */
  catalogItemId: string;
  name: string;
  /** Subcategory used as the packing group title (Meat, Fruits, …). */
  category: string;
  qty: number;
  selected?: PackingSourceOption;
  /** Cooler code, or "Cooler" until one is chosen. */
  coolerId: string;
  packed: boolean;
  options: PackingSourceOption[];
};

/** Customer order as the Cooler Packing list and detail screens see it. */
export type PackingOrder = {
  id: string;
  /** API order UUID. Absent on the local seed. */
  recordId?: string;
  customer: string;
  code: string;
  itemCount: number;
  /** Display label, e.g. Wed, Oct 7, 2026. */
  deliveryDate: string;
  deliveryDateId: string;
  /** Set when the packer starts packing. Written by Cooler Packing only. */
  packingStartedAt?: string;
  /** Cooler Ready timestamp. Written by Cooler Packing only. */
  packedAt?: string;
  /** Loaded timestamp. Written by the loading action only. */
  loadedAt?: string;
  /** Set once Packer Manager has assigned this order. */
  packerId?: string;
  packerName?: string;
  coolerIds: string[];
  items: PackingLine[];
};

/** Cooler choice. API: GET /coolers. Mock id and label are the public cooler code. */
export type PackingCoolerOption = {
  id: string;
  label: string;
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

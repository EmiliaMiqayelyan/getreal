import { createPackingOrders } from "@/data/packingInventory";
import type { EligiblePacker } from "@/data/packers";
import type { PackingHandoffUpdate } from "@/types/packing";

/**
 * Local Packer Manager snapshot.
 *
 * Uses the same customer orders as Cooler Packing. This page may assign one
 * packer. It must not write Packing Started, Cooler Ready, or Loaded —
 * those arrive from the packing handoff after Cooler Packing / loading.
 *
 * Live mode (`VITE_API_URL` set):
 * - GET /orders?type=standard
 * - GET /users?role=packer
 * - POST /orders/:id/assign-packer `{ packerId }`
 * Timestamps are read from the order. This page does not send them.
 * Without an API URL, the shared local catalog is used instead.
 */
export const PACKER_MANAGER_API_ENABLED = true;

export type PackerManagerOrder = {
  id: string;
  /** API order UUID. Absent on the local seed. */
  recordId?: string;
  customer: string;
  code: string;
  itemCount: number;
  deliveryDate: string;
  deliveryDateId: string;
  packerId?: string;
  packerName?: string;
  packingStartedAt?: string;
  coolerReadyAt?: string;
  loadedAt?: string;
};

export function createPackerManagerOrders(): PackerManagerOrder[] {
  return createPackingOrders().map((order) => ({
    id: order.code,
    recordId: order.recordId,
    customer: order.customer,
    code: order.code,
    itemCount: order.itemCount,
    deliveryDate: order.deliveryDate,
    deliveryDateId: order.deliveryDateId,
    packerId: order.packerId,
    packerName: order.packerName,
    packingStartedAt: order.packingStartedAt,
    coolerReadyAt: order.packedAt,
    loadedAt: order.loadedAt,
  }));
}

/** Assignments and recorded timestamps shared with Cooler Packing. */
export function createInitialPackingHandoff(): Record<
  string,
  PackingHandoffUpdate
> {
  const handoff: Record<string, PackingHandoffUpdate> = {};
  for (const order of createPackingOrders()) {
    if (
      !order.packerId &&
      !order.packingStartedAt &&
      !order.packedAt &&
      !order.loadedAt
    ) {
      continue;
    }
    handoff[order.code] = {
      orderCode: order.code,
      packerId: order.packerId,
      packerName: order.packerName ?? "",
      packingStartedAt: order.packingStartedAt,
      coolerReadyAt: order.packedAt,
      packedAt: order.packedAt,
      loadedAt: order.loadedAt,
      coolerIds: order.coolerIds,
    };
  }
  return handoff;
}

export function workloadForPacker(
  packer: EligiblePacker,
  orders: { packerId?: string }[],
) {
  const assigned = orders.filter((order) => order.packerId === packer.id).length;
  return packer.outsideOrderCount + assigned;
}

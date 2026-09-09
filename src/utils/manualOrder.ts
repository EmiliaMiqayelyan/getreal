import {
  MANUAL_CATALOG,
  MANUAL_EXTRA_CATALOG,
} from "@/constants/distributorOrders";
import type { ManualCatalogItem, ManualLine } from "@/types/distributorOrder";

export function getManualCatalogForDistributor(distributor: string) {
  return MANUAL_CATALOG.filter((item) => item.distributor === distributor);
}

export function getAddableManualItems(
  distributor: string,
  lines: ManualLine[],
) {
  const visibleIds = new Set(lines.map((line) => line.id));
  const pool = [
    ...getManualCatalogForDistributor(distributor),
    ...MANUAL_EXTRA_CATALOG.filter((item) => item.distributor === distributor),
  ];

  return pool.filter((item) => !visibleIds.has(item.id));
}

export function createManualLines(items: ManualCatalogItem[]): ManualLine[] {
  return items.map((item) => ({ ...item, quantity: 0 }));
}

export function formatManualDeliveryLabel(
  deliveryDate: string,
  timeSlot: string,
) {
  if (!deliveryDate) return "Select delivery date and time";

  const date = new Date(`${deliveryDate}T12:00:00`);
  const day = date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  if (!timeSlot) return day;
  return `${day}, ${timeSlot}`;
}

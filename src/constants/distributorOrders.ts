import type {
  DeliveredOrder,
  ManualCatalogItem,
  OrderListItem,
  PreviewRow,
} from "@/types/distributorOrder";

export const ORDER_CATEGORIES = ["Meat", "Fruits", "Grains"] as const;

export const ORDER_LIST_ITEMS: OrderListItem[] = [];

export const MAIN_ORDER_PREVIEW: PreviewRow[] = [];

/** Product demand shown on the Orders tab for each customer delivery date. */
export const ORDER_DEMAND_BY_DATE: Record<string, PreviewRow[]> = {};

export const ORDER_ITEM_CATEGORIES: Record<string, OrderListItem["category"]> =
  {};

export const DISTRIBUTOR_EMAILS: Record<string, string> = {};

export const DELIVERED_ORDER_STATUSES = ["Delivered", "Partial"] as const;

export const DELIVERED_SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "distributor", label: "Distributor" },
  { value: "total", label: "Total Price" },
] as const;

export const DELIVERED_ORDERS: DeliveredOrder[] = [];

export const EXPECTED_DELIVERY = "Tue, Jul 12, 06:00–08:00 AM";
export const DELIVERY_LABEL = "Wed, Jul 14";

export const MANUAL_DISTRIBUTORS: readonly string[] = [];

export const MANUAL_TIME_SLOTS = [
  "06:00–08:00 AM",
  "09:00–11:00 AM",
] as const;

/** Catalog shown after a distributor is selected on Create Manual Order. */
export const MANUAL_CATALOG: ManualCatalogItem[] = [];

/** Optional items surfaced through Add Item in the manual order flow. */
export const MANUAL_EXTRA_CATALOG: ManualCatalogItem[] = [];

import type {
  DeliveredOrder,
  ManualCatalogItem,
  OrderListItem,
  PlacedOrder,
  PreviewRow,
} from "@/types/distributorOrder";

export const ORDER_CATEGORIES = ["Meat", "Fruits", "Grains"] as const;

/** Temporary seed - one sample row until Product Orders API is wired. */
export const ORDER_LIST_ITEMS: OrderListItem[] = [
  {
    id: "angus",
    itemName: "Angus Chuck Ground Beef",
    category: "Meat",
    custOrderTotal: 12,
    inStock: null,
    qtyReceiving: 2,
    dateReceivingBy: "Tues, July 19",
    suggestedQty: 2,
    options: [
      {
        distributor: "4PF Co.",
        source: "FreshMarket Co",
        price: 125,
        unit: "case",
        qtyPerUnit: 6,
      },
    ],
  },
];

export const MAIN_ORDER_PREVIEW: PreviewRow[] = [
  {
    id: "angus",
    itemName: "Angus Chuck Ground Beef",
    custOrderTotal: 3,
    inStock: null,
    qtyReceiving: 2,
    dateReceivingBy: "Tues, July 19",
  },
];

/** Product demand shown on the Orders tab for each customer delivery date. */
export const ORDER_DEMAND_BY_DATE: Record<string, PreviewRow[]> = {
  "2026-07-14": MAIN_ORDER_PREVIEW,
};

export const ORDER_ITEM_CATEGORIES = Object.fromEntries(
  ORDER_LIST_ITEMS.map((item) => [item.id, item.category]),
) as Record<string, OrderListItem["category"]>;

export const DISTRIBUTOR_EMAILS: Record<string, string> = {
  "4PF Co.": "orders@4pf.com",
};

export const SEED_IN_PROGRESS: PlacedOrder = {
  id: "seed-0802",
  deliveryId: "0802",
  distributor: "4PF Co.",
  orderDate: "Jul 16, 12:34 PM",
  deliveryDate: "Jul 18, 8:00 AM",
  totalPrice: 250,
  items: [
    {
      sku: "OPE-18048",
      itemName: "Angus Chuck Ground Beef",
      source: "FreshMarket Co",
      quantity: 2,
      price: 125,
      unit: "case",
    },
  ],
};

export const DELIVERED_ORDER_STATUSES = ["Delivered", "Partial"] as const;

export const DELIVERED_SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "distributor", label: "Distributor" },
  { value: "total", label: "Total Price" },
] as const;

/** Temporary seed - one delivered order sample. */
export const DELIVERED_ORDERS: DeliveredOrder[] = [
  {
    id: "del-0801",
    deliveryId: "0801",
    distributor: "4PF Co.",
    orderDate: "Jul 22, 10:12 AM",
    deliveryDate: "Jul 29, 7:30 AM",
    totalPrice: 125,
    day: "Wednesday, 7/29/2026",
    week: "Week of 7/28/2026",
    zipCode: "90210",
    status: "Delivered",
    sortTimestamp: Date.parse("2026-07-22T10:12:00"),
    items: [
      {
        sku: "OPE-10840",
        itemName: "Angus Chuck Ground Beef",
        source: "FreshMarket Co",
        quantity: 1,
        price: 125,
        unit: "case",
      },
    ],
  },
];

export const EXPECTED_DELIVERY = "Tue, Jul 12, 06:00–08:00 AM";
export const DELIVERY_LABEL = "Wed, Jul 14";

export const MANUAL_DISTRIBUTORS = ["4PF Co."] as const;

export const MANUAL_TIME_SLOTS = [
  "06:00–08:00 AM",
  "09:00–11:00 AM",
] as const;

/** Catalog shown after a distributor is selected on Create Manual Order. */
export const MANUAL_CATALOG: ManualCatalogItem[] = [
  {
    id: "m-angus",
    sku: "QS-002",
    name: "Angus Chuck Ground Beef",
    distributor: "4PF Co.",
    source: "FreshMarket Co",
    inStock: 2,
    price: 125,
    unit: "case",
  },
];

/** Optional items surfaced through Add Item in the manual order flow. */
export const MANUAL_EXTRA_CATALOG: ManualCatalogItem[] = [
  {
    id: "m-wagyu",
    sku: "QS-009",
    name: "Wagyu Aged Tenderloin Steak",
    distributor: "4PF Co.",
    source: "FreshMarket Co",
    inStock: 1,
    price: 29,
    unit: "steak",
  },
];

import type {
  DeliveredOrder,
  DeliveryChip,
  ManualCatalogItem,
  OrderListItem,
  PlacedOrder,
  PreviewRow,
} from "@/types/distributorOrder";

export const ORDER_CATEGORIES = ["Meat", "Fruits", "Grains"] as const;

export const DELIVERY_CHIPS: DeliveryChip[] = [
  { id: "jul-14", label: "Wed, Jul 14", count: 13 },
  { id: "jul-20", label: "Wed, Jul 20", count: 7 },
  { id: "jun-27", label: "Wed, Jun 27", count: 3 },
];

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
        distributor: "Rancho Protein LLC",
        source: "MeatFactory Co",
        price: 125,
        unit: "case",
        qtyPerUnit: 6,
      },
    ],
  },
  {
    id: "ribeye",
    itemName: "Rib-eye Steak",
    category: "Meat",
    custOrderTotal: 8,
    inStock: null,
    qtyReceiving: 2,
    dateReceivingBy: "Tues, July 19",
    suggestedQty: 2,
    options: [
      {
        distributor: "Rancho Protein LLC",
        source: "MeatFactory Co",
        price: 90,
        unit: "case",
        qtyPerUnit: 4,
      },
    ],
  },
  {
    id: "chicken",
    itemName: "Legion Fields Whole Chicken",
    category: "Meat",
    custOrderTotal: 6,
    inStock: null,
    qtyReceiving: 2,
    dateReceivingBy: "Tues, July 19",
    suggestedQty: 1,
    options: [
      {
        distributor: "Rancho Protein LLC",
        source: "MeatFactory Co",
        price: 50,
        unit: "case",
        qtyPerUnit: 6,
      },
    ],
  },
  {
    id: "lemons",
    itemName: "Lemons",
    category: "Fruits",
    custOrderTotal: 9,
    inStock: 3,
    qtyReceiving: 2,
    dateReceivingBy: "Tues, July 19",
    suggestedQty: 6,
    options: [
      {
        distributor: "Tropical Produce LLC",
        source: "FruitWorlds Co.",
        price: 2.59,
        unit: "lb",
        qtyPerUnit: 1,
      },
    ],
  },
  {
    id: "blueberries",
    itemName: "Blueberries",
    category: "Fruits",
    custOrderTotal: 2,
    inStock: 3,
    qtyReceiving: 2,
    dateReceivingBy: "Tues, July 19",
    suggestedQty: 1,
    options: [
      {
        distributor: "4PF Co.",
        source: "FreshMarket Co.",
        price: 12.5,
        unit: "box",
        qtyPerUnit: 1,
      },
    ],
  },
  {
    id: "apples",
    itemName: "Gala Apples",
    category: "Fruits",
    custOrderTotal: 5,
    inStock: 1,
    qtyReceiving: 2,
    dateReceivingBy: "Tues, July 19",
    suggestedQty: 3,
    options: [
      {
        distributor: "4PF Co.",
        source: "Alpine Products Co.",
        price: 4.5,
        unit: "lb",
        qtyPerUnit: 1,
      },
    ],
  },
  {
    id: "butter",
    itemName: "Fresh Unsalted Butter",
    category: "Grains",
    custOrderTotal: 2,
    inStock: null,
    qtyReceiving: 2,
    dateReceivingBy: "Tues, July 19",
    suggestedQty: 3,
    options: [
      {
        distributor: "4PF Co.",
        source: "FreshMarket Co.",
        price: 4.5,
        unit: "lb",
        qtyPerUnit: 1,
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
  {
    id: "lemons",
    itemName: "Lemons",
    custOrderTotal: 9,
    inStock: 2,
    qtyReceiving: 2,
    dateReceivingBy: "Tues, July 19",
  },
  {
    id: "blueberries",
    itemName: "Blueberries",
    custOrderTotal: 2,
    inStock: 3,
    qtyReceiving: 2,
    dateReceivingBy: "Tues, July 19",
  },
];

export const DISTRIBUTOR_EMAILS: Record<string, string> = {
  "Rancho Protein LLC": "ranch@gmail.com",
  "Tropical Produce LLC": "orders@tropical.com",
  "4PF Co.": "orders@4pf.com",
};

export const SEED_IN_PROGRESS: PlacedOrder = {
  id: "seed-0802",
  deliveryId: "0802",
  distributor: "Rancho Protein LLC",
  orderDate: "Jul 16, 12:34 PM",
  deliveryDate: "Jul 18, 8:00 AM",
  totalPrice: 480,
  items: [
    {
      sku: "OPE-18048",
      itemName: "Angus Chuck Ground Beef",
      source: "MeatFactory Co",
      quantity: 2,
      price: 125,
      unit: "case",
    },
    {
      sku: "OPE-18049",
      itemName: "Rib-eye Steak",
      source: "MeatFactory Co",
      quantity: 2,
      price: 90,
      unit: "case",
    },
    {
      sku: "OPE-18050",
      itemName: "Legion Fields Whole Chicken",
      source: "MeatFactory Co",
      quantity: 1,
      price: 50,
      unit: "case",
    },
  ],
};

export const DELIVERED_ORDERS: DeliveredOrder[] = [
  {
    id: "del-0801",
    deliveryId: "0801",
    distributor: "Rancho Protein LLC",
    orderDate: "Jul 22, 10:12 AM",
    deliveryDate: "Jul 29, 7:30 AM",
    totalPrice: 365,
    day: "Wednesday, 7/29/2026",
    week: "Week of 7/28/2026",
    items: [
      {
        sku: "OPE-10840",
        itemName: "Angus Chuck Ground Beef",
        source: "MeatFactory Co",
        quantity: 1,
        price: 125,
        unit: "case",
      },
      {
        sku: "OPE-10841",
        itemName: "Rib-eye Steak",
        source: "MeatFactory Co",
        quantity: 2,
        price: 90,
        unit: "case",
      },
    ],
  },
  {
    id: "del-0803",
    deliveryId: "0803",
    distributor: "Tropical Produce LLC",
    orderDate: "Jul 21, 9:02 AM",
    deliveryDate: "Jul 29, 7:30 AM",
    totalPrice: 88.4,
    day: "Wednesday, 7/29/2026",
    week: "Week of 7/28/2026",
    items: [
      {
        sku: "OPE-10855",
        itemName: "Lemons",
        source: "FruitWorlds Co.",
        quantity: 20,
        price: 2.59,
        unit: "lb",
      },
    ],
  },
];

export const EXPECTED_DELIVERY = "Tue, Jul 12, 06:00–08:00 AM";
export const DELIVERY_LABEL = "Wed, Jul 14";

export const MANUAL_DISTRIBUTORS = [
  "Rancho Protein LLC",
  "Tropical Produce LLC",
  "4PF Co.",
] as const;

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
    source: "MeatFactory Co",
    inStock: 2,
    price: 125,
    unit: "case",
  },
  {
    id: "m-ribeye",
    sku: "QS-003",
    name: "Rib-eye Steak",
    source: "MeatFactory Co",
    inStock: 6,
    price: 90,
    unit: "case",
  },
  {
    id: "m-chicken",
    sku: "QS-004",
    name: "Legion Fields Whole Chicken",
    source: "MeatFactory Co",
    inStock: 0,
    price: 16,
    unit: "pound",
  },
  {
    id: "m-lemons",
    sku: "QS-005",
    name: "Lemons",
    source: "Tropical Produce LLC",
    inStock: 0,
    price: 6,
    unit: "piece",
  },
  {
    id: "m-blueberries",
    sku: "QS-006",
    name: "Blueberries",
    source: "Tropical Produce LLC",
    inStock: 6,
    price: 32,
    unit: "box",
  },
];

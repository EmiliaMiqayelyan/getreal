import {
  sourceColumnLabel,
  type InventorySection,
} from "@/utils/inventoryView";

/**
 * Frontend stand-in for inventory until the API is wired.
 *
 * API: GET /inventory should return one row per stored allocation, including
 * itemName, category, subcategory, orderCode, distributorName, sourceName,
 * deliveryDate, purchased, quantity, unit, and location. Names must be on the
 * list payload — a follow-up GET that fills them in makes the row flash "N/A".
 * Catalog items with no on-hand quantity still belong on this screen as Empty.
 *
 * API: the green banners are distributor orders waiting to be stocked
 * (accepted lines, not yet stored). Fields: distributor name, item count,
 * received-at. Distributor Receiving already pushes a local handoff; merge
 * that with this list until the received-orders endpoint exists.
 *
 * API: location is a plain string (the name below). There is no locations endpoint.
 * API: Complete Storage → POST /inventory/store
 *   { distributorOrderId, items: [{ itemId, quantity, location, expirationDate }] }
 *   itemId is the catalog item UUID. location is a name such as "Freezer 1".
 *   expirationDate is an ISO-8601 timestamp, e.g. "2027-01-01T00:00:00.000Z".
 *   One items entry per allocation.
 * API: Edit Location → POST /inventory/:recordId/split
 *   { splits: [{ quantity, location }] }
 *   then replace this list with GET /inventory.
 */

export const STORAGE_LOCATIONS = [
  "Fridge 1",
  "Fridge 2",
  "Fridge 3",
  "Freezer 1",
  "Freezer 2",
  "Freezer 3",
  "Dry Shelf 1",
  "Dry Shelf 2",
  "Dry Shelf 3",
] as const;

type MockLot = InventorySection["products"][number]["lots"][number];

type MockStockItem = {
  id: string;
  orderId: string;
  /** API: catalog item UUID sent as itemId on POST /inventory/store. */
  catalogItemId: string;
  itemName: string;
  source: string;
  purchased: string;
  qty: number;
  unit: string;
  qtyAfterUnpack: string;
  expDate: string;
  /** API: sent as expirationDate, an ISO-8601 timestamp. */
  expirationIso: string;
  location: string;
  splits: Array<{ qty: number; location: string }>;
};

type MockStockSection = {
  id: string;
  group: string;
  title: string;
  items: MockStockItem[];
};

export type MockReceivedOrder = {
  /** API: distributor order UUID. */
  id: string;
  orderCode?: string;
  orderNumber?: string;
  supplier: string;
  itemsCount: string;
  receivedAt: string;
  sections: MockStockSection[];
};

function section(
  category: string,
  title: string,
  products: InventorySection["products"],
): InventorySection {
  return {
    id: `${category}::${title}`,
    category,
    title,
    sourceLabel: sourceColumnLabel(title),
    products,
  };
}

function lot(
  partial: Pick<
    MockLot,
    | "recordId"
    | "catalogItemId"
    | "orderId"
    | "distributor"
    | "source"
    | "qty"
    | "unit"
    | "location"
  > &
    Partial<Pick<MockLot, "deliveryDate" | "purchased" | "address">>,
): MockLot {
  return {
    deliveryDate: "Jul 18, 2026, 09:15",
    purchased: "$12.00",
    address: partial.location,
    ...partial,
  };
}

function product(
  id: string,
  name: string,
  distributor: string,
  unit: string,
  lots: MockLot[],
): InventorySection["products"][number] {
  return { id, name, distributor, unit, lots };
}

/** Fresh copy so later edits do not mutate the seed. */
export function createMockInventorySections(): InventorySection[] {
  return [
    section("Protein", "Meat", [
      product(
        "angus-chuck",
        "Angus Chuck Ground Beef",
        "Rancho Protein LLC",
        "1 lb",
        [],
      ),
      product(
        "wagyu-tenderloin",
        "Wagyu Aged Tenderloin Steak",
        "Rancho Protein LLC",
        "1 steak (12 oz)",
        [
          lot({
            recordId: "inv-wagyu-1",
            catalogItemId: "cat-wagyu",
            orderId: "ORD-2041",
            distributor: "Rancho Protein LLC",
            source: "High Valley Ranch",
            deliveryDate: "Jul 18, 2026, 09:15",
            purchased: "$28.00",
            qty: 3,
            unit: "1 steak (12 oz)",
            location: "Freezer 1",
          }),
          lot({
            recordId: "inv-wagyu-2",
            catalogItemId: "cat-wagyu",
            orderId: "ORD-1988",
            distributor: "4PF Co.",
            source: "Black Oak Farm",
            deliveryDate: "Jul 12, 2026, 14:40",
            purchased: "$26.50",
            qty: 2,
            unit: "1 steak (12 oz)",
            location: "Freezer 2",
          }),
        ],
      ),
      product(
        "ribeye",
        "Rib-eye Steak",
        "Rancho Protein LLC",
        "1 steak (12 oz)",
        [
          lot({
            recordId: "inv-ribeye-1",
            catalogItemId: "cat-ribeye",
            orderId: "ORD-2055",
            distributor: "Rancho Protein LLC",
            source: "High Valley Ranch",
            purchased: "$22.00",
            qty: 5,
            unit: "1 steak (12 oz)",
            location: "Freezer 1",
          }),
        ],
      ),
      product("ny-strip", "NY Strip Steak", "4PF Co.", "1 steak (12 oz)", [
        lot({
          recordId: "inv-strip-1",
          catalogItemId: "cat-strip",
          orderId: "ORD-1882",
          distributor: "4PF Co.",
          source: "Black Oak Farm",
          deliveryDate: "Jul 9, 2026, 11:05",
          purchased: "$18.75",
          qty: 3,
          unit: "1 steak (12 oz)",
          location: "Fridge 2",
        }),
      ]),
    ]),
    section("Protein", "Poultry", [
      product(
        "whole-chicken",
        "Whole Chicken",
        "Rancho Protein LLC",
        "1 lb",
        [],
      ),
      product("drumsticks", "Drumsticks", "Rancho Protein LLC", "1 lb", [
        lot({
          recordId: "inv-drumsticks-1",
          catalogItemId: "cat-drumsticks",
          orderId: "ORD-2070",
          distributor: "Rancho Protein LLC",
          source: "Green Meadow Farm",
          purchased: "$6.40",
          qty: 3,
          unit: "1 lb",
          location: "Fridge 1",
        }),
      ]),
      product("thighs", "Thighs", "Hudson Valley Farm", "1 lb", [
        lot({
          recordId: "inv-thighs-1",
          catalogItemId: "cat-thighs",
          orderId: "ORD-1764",
          distributor: "Hudson Valley Farm",
          source: "Green Meadow Farm",
          deliveryDate: "Jul 4, 2026, 16:20",
          purchased: "$5.10",
          qty: 2,
          unit: "1 lb",
          location: "Fridge 3",
        }),
      ]),
    ]),
    section("Vegetables", "Leafy", [
      product("kale", "Kale", "4PF Co.", "Bunch", [
        lot({
          recordId: "inv-kale-1",
          catalogItemId: "cat-kale",
          orderId: "ORD-2210",
          distributor: "4PF Co.",
          source: "Riverbed Growers",
          deliveryDate: "Jul 19, 2026, 08:00",
          purchased: "$2.25",
          qty: 4,
          unit: "Bunch",
          location: "Fridge 1",
        }),
      ]),
      product("spinach", "Spinach", "4PF Co.", "Bunch", []),
    ]),
    section("Fruits", "Citrus", [
      product("lemons", "Lemons", "4PF Co.", "1 lb", [
        lot({
          recordId: "inv-lemons-1",
          catalogItemId: "cat-lemons",
          orderId: "ORD-2304",
          distributor: "4PF Co.",
          source: "Sun Valley Citrus",
          deliveryDate: "Jul 19, 2026, 08:00",
          purchased: "$3.00",
          qty: 9,
          unit: "1 lb",
          location: "Dry Shelf 1",
        }),
      ]),
    ]),
  ];
}

function stockItem(
  partial: Omit<MockStockItem, "qtyAfterUnpack" | "location" | "splits"> &
    Partial<Pick<MockStockItem, "qtyAfterUnpack" | "location" | "splits">>,
): MockStockItem {
  return {
    qtyAfterUnpack: "",
    location: "",
    splits: [],
    ...partial,
  };
}

function receivedOrder(
  id: string,
  supplier: string,
  receivedAt: string,
  sections: MockStockSection[],
): MockReceivedOrder {
  const count = sections.reduce(
    (total, group) => total + group.items.length,
    0,
  );
  return {
    id,
    supplier,
    itemsCount: `${count} item${count === 1 ? "" : "s"}`,
    receivedAt,
    sections,
  };
}

/** Fresh copy so stocking one order does not mutate the seed. */
export function createMockReceivedOrders(): MockReceivedOrder[] {
  return [
    receivedOrder(
      "recv-rancho",
      "Rancho Protein LLC",
      "Jul 20, 2026 · 12:35 PM",
      [
        {
          id: "Protein::Meat",
          group: "Protein",
          title: "Meat",
          items: [
            stockItem({
              id: "stock-ground-beef",
              orderId: "ORD-3101",
              catalogItemId: "cat-ground-beef",
              itemName: "Ground Beef",
              source: "High Valley Ranch",
              purchased: "$4.50",
              qty: 6,
              unit: "1 lb",
              expDate: "Aug 2, 2026",
              expirationIso: "2026-08-02",
            }),
            stockItem({
              id: "stock-wagyu",
              orderId: "ORD-3102",
              catalogItemId: "cat-wagyu",
              itemName: "Wagyu Aged Tenderloin Steak",
              source: "High Valley Ranch",
              purchased: "$28.00",
              qty: 2,
              unit: "1 steak (12 oz)",
              expDate: "Aug 4, 2026",
              expirationIso: "2026-08-04",
            }),
            stockItem({
              id: "stock-ribeye",
              orderId: "ORD-3103",
              catalogItemId: "cat-ribeye",
              itemName: "Rib-eye Steak",
              source: "High Valley Ranch",
              purchased: "$22.00",
              qty: 4,
              unit: "1 steak (12 oz)",
              expDate: "Aug 4, 2026",
              expirationIso: "2026-08-04",
            }),
          ],
        },
        {
          id: "Protein::Poultry",
          group: "Protein",
          title: "Poultry",
          items: [
            stockItem({
              id: "stock-chicken",
              orderId: "ORD-3104",
              catalogItemId: "cat-whole-chicken",
              itemName: "Whole Chicken",
              source: "Green Meadow Farm",
              purchased: "$7.80",
              qty: 2,
              unit: "1 lb",
              expDate: "Jul 28, 2026",
              expirationIso: "2026-07-28",
            }),
            stockItem({
              id: "stock-drumsticks",
              orderId: "ORD-3105",
              catalogItemId: "cat-drumsticks",
              itemName: "Drumsticks",
              source: "Green Meadow Farm",
              purchased: "$6.40",
              qty: 8,
              unit: "1 lb",
              expDate: "Jul 28, 2026",
              expirationIso: "2026-07-28",
            }),
            stockItem({
              id: "stock-thighs",
              orderId: "ORD-3106",
              catalogItemId: "cat-thighs",
              itemName: "Thighs",
              source: "Green Meadow Farm",
              purchased: "$5.10",
              qty: 3,
              unit: "1 lb",
              expDate: "Jul 28, 2026",
              expirationIso: "2026-07-28",
            }),
          ],
        },
      ],
    ),
    receivedOrder("recv-4pf", "4PF Co.", "Jul 20, 2026 · 12:35 PM", [
      {
        id: "Fruits::Citrus",
        group: "Fruits",
        title: "Citrus",
        items: [
          stockItem({
            id: "stock-lemons",
            orderId: "ORD-4101",
            catalogItemId: "cat-lemons",
            itemName: "Lemons",
            source: "Sun Valley Citrus",
            purchased: "$3.00",
            qty: 9,
            unit: "1 lb",
            expDate: "Aug 15, 2026",
            expirationIso: "2026-08-15",
          }),
          stockItem({
            id: "stock-limes",
            orderId: "ORD-4102",
            catalogItemId: "cat-limes",
            itemName: "Limes",
            source: "Sun Valley Citrus",
            purchased: "$3.20",
            qty: 4,
            unit: "1 lb",
            expDate: "Aug 15, 2026",
            expirationIso: "2026-08-15",
          }),
        ],
      },
      {
        id: "Vegetables::Leafy",
        group: "Vegetables",
        title: "Leafy",
        items: [
          stockItem({
            id: "stock-kale",
            orderId: "ORD-4103",
            catalogItemId: "cat-kale",
            itemName: "Kale",
            source: "Riverbed Growers",
            purchased: "$2.25",
            qty: 5,
            unit: "Bunch",
            expDate: "Jul 27, 2026",
            expirationIso: "2026-07-27",
          }),
          stockItem({
            id: "stock-spinach",
            orderId: "ORD-4104",
            catalogItemId: "cat-spinach",
            itemName: "Spinach",
            source: "Riverbed Growers",
            purchased: "$2.40",
            qty: 3,
            unit: "Bunch",
            expDate: "Jul 27, 2026",
            expirationIso: "2026-07-27",
          }),
        ],
      },
    ]),
  ];
}

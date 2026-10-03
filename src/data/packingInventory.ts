import { PACKER_GEVORG, PACKER_VAHAN } from "@/data/packers";
import type {
  PackingCoolerOption,
  PackingLine,
  PackingOrder,
  PackingSourceOption,
} from "@/types/packing";
import {
  formatExpectedDelivery,
  shiftDateId,
  toDeliveryDateId,
  upcomingWednesday,
} from "@/utils/deliveryCalendar";

/**
 * Shared customer-order catalog for Cooler Packing and Packer Manager.
 *
 * Orders with no packer stay off Cooler Packing until Packer Manager assigns
 * one. Each line's Distributor / Source choices are inventory lots. Choosing
 * one copies those fields onto the line and keeps `inventoryRecordId`.
 *
 * Cooler ids are the public cooler codes. Cooler Ready and Load Now write the
 * shared packing handoff. Packing Started, Cooler Ready, and Loaded on the
 * rows below are recorded history — Packer Manager never types them.
 * The packing HTTP calls stay behind `PACKING_API_ENABLED`.
 */

/** Fixed stamps so a refresh cannot rewrite operational history. */
const PACKING_STARTED = "7/29/26, 8:45am";
const COOLER_READY = "8/29/26, 9:15am";
const LOADED = "9/29/26, 9:50am";

const COOLER_PLACEHOLDER = "Cooler";

export const PACKING_COOLERS: PackingCoolerOption[] = [
  { id: "BL-0008", label: "BL-0008" },
  { id: "BL-02313", label: "BL-02313" },
  { id: "FR-10034", label: "FR-10034" },
  { id: "BL-01420", label: "BL-01420" },
];

type MenuItem = {
  name: string;
  category: string;
  qty: number;
};

const MENU: MenuItem[] = [
  { name: "Angus Chuck Ground Beef", category: "Meat", qty: 3 },
  { name: "Rib-eye Steak", category: "Meat", qty: 3 },
  { name: "Legion Fields Whole Chicken", category: "Meat", qty: 3 },
  { name: "Blueberries", category: "Fruits", qty: 3 },
  { name: "Lemons", category: "Fruits", qty: 3 },
  { name: "Gala Apples", category: "Fruits", qty: 3 },
  { name: "Kale", category: "Vegetables", qty: 2 },
  { name: "Spinach", category: "Vegetables", qty: 2 },
  { name: "NY Strip Steak", category: "Meat", qty: 2 },
  { name: "Drumsticks", category: "Meat", qty: 4 },
  { name: "Thighs", category: "Meat", qty: 2 },
  { name: "Whole Chicken", category: "Meat", qty: 1 },
];

const LOT_TEMPLATES = [
  {
    distributor: "4PF Co.",
    source: "FreshMarket Co.",
    expDate: "Aug 20, 2026",
    expirationIso: "2026-08-20",
  },
  {
    distributor: "4PF Co.",
    source: "Alpine Products Co.",
    expDate: "Aug 24, 2026",
    expirationIso: "2026-08-24",
  },
  {
    distributor: "Tropical Produce LLC",
    source: "FreshMarket Co.",
    expDate: "Jul 30, 2026",
    expirationIso: "2026-07-30",
  },
] as const;

const JUL30_LOCATION: Record<string, string> = {
  "Angus Chuck Ground Beef": "Freezer 1",
  "Rib-eye Steak": "Freezer 1",
  "Legion Fields Whole Chicken": "Freezer 2",
  Blueberries: "Dry Shelf 3",
  Lemons: "Dry Shelf 1",
  "Gala Apples": "Dry Shelf 2",
  Kale: "Fridge 1",
  Spinach: "Fridge 2",
  "NY Strip Steak": "Freezer 2",
  Drumsticks: "Fridge 1",
  Thighs: "Fridge 3",
  "Whole Chicken": "Freezer 3",
};

function slug(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function categoryLocations(category: string) {
  if (category === "Fruits") return ["Dry Shelf 1", "Dry Shelf 2", "Dry Shelf 3"];
  if (category === "Vegetables") {
    return ["Fridge 1", "Fridge 2", "Fridge 3"];
  }
  return ["Freezer 1", "Freezer 2", "Freezer 3"];
}

function locationAddress(location: string) {
  return `Rachel's Habit Warehouse, ${location}`;
}

function itemCode(name: string, index: number) {
  if (index === 2) return "OPE-10043";
  let hash = 0;
  for (const char of slug(name)) {
    hash = (hash * 33 + char.charCodeAt(0)) % 7000;
  }
  return `OPE-${11000 + hash + index}`;
}

export function categoryForItem(name: string) {
  return MENU.find((item) => item.name === name)?.category ?? "Items";
}

/** Inventory lots for one catalog item. Safe to call for unknown names. */
export function sourcesForItem(
  name: string,
  category = categoryForItem(name),
): PackingSourceOption[] {
  const locations = categoryLocations(category);
  const packedLocation = JUL30_LOCATION[name];
  return LOT_TEMPLATES.map((lot, index) => {
    const location =
      index === 2 && packedLocation ? packedLocation : locations[index]!;
    return {
      inventoryRecordId: `inv-${slug(name)}-${index + 1}`,
      itemId: itemCode(name, index),
      distributor: lot.distributor,
      source: lot.source,
      expDate: lot.expDate,
      expirationIso: lot.expirationIso,
      location,
      address: locationAddress(location),
    };
  });
}

function makeLine(
  id: string,
  spec: MenuItem,
  packed?: { sourceIndex: number; coolerId: string },
): PackingLine {
  const options = sourcesForItem(spec.name, spec.category);
  const selected = packed ? options[packed.sourceIndex] : undefined;
  return {
    id,
    catalogItemId: `cat-${slug(spec.name)}`,
    name: spec.name,
    category: spec.category,
    qty: spec.qty,
    selected,
    coolerId: packed?.coolerId ?? COOLER_PLACEHOLDER,
    packed: Boolean(packed && selected),
    options,
  };
}

function linesFor(
  orderCode: string,
  count: number,
  packed?: { coolerA: string; coolerB: string },
): PackingLine[] {
  return Array.from({ length: count }, (_, index) => {
    const spec = MENU[index % MENU.length]!;
    const coolerId =
      packed == null
        ? undefined
        : index % 2 === 0
          ? packed.coolerA
          : packed.coolerB;
    return makeLine(
      `${orderCode}-${index + 1}`,
      spec,
      coolerId ? { sourceIndex: 2, coolerId } : undefined,
    );
  });
}

function order(input: {
  customer: string;
  code: string;
  deliveryDateId: string;
  count: number;
  packer?: { id: string; name: string };
  packingStartedAt?: string;
  packedAt?: string;
  loadedAt?: string;
  packedCoolers?: { coolerA: string; coolerB: string };
}): PackingOrder {
  const items = linesFor(input.code, input.count, input.packedCoolers);
  const coolerIds = Array.from(
    new Set(
      items
        .map((item) => item.coolerId)
        .filter((coolerId) => coolerId && coolerId !== COOLER_PLACEHOLDER),
    ),
  );
  const deliveryDate = parseDateLabel(input.deliveryDateId);
  return {
    id: input.code,
    customer: input.customer,
    code: input.code,
    itemCount: items.length,
    deliveryDate,
    deliveryDateId: input.deliveryDateId,
    packingStartedAt: input.packingStartedAt,
    packedAt: input.packedAt,
    loadedAt: input.loadedAt,
    packerId: input.packer?.id,
    packerName: input.packer?.name,
    coolerIds,
    items,
  };
}

function parseDateLabel(dateId: string) {
  const [year, month, day] = dateId.split("-").map(Number);
  if (!year || !month || !day) return dateId;
  return formatExpectedDelivery(new Date(year, month - 1, day));
}

/**
 * Orders spread across the previous, current, and next delivery Wednesday
 * so the date cards have counts as soon as the page opens.
 * Unassigned rows are waiting on Packer Manager. Assigned rows carry the
 * operational timestamps already recorded for that order.
 */
export function createPackingOrders(
  center: Date = upcomingWednesday(),
): PackingOrder[] {
  const current = toDeliveryDateId(center);
  const previous = shiftDateId(current, -7);
  const next = shiftDateId(current, 7);
  const vahan = { id: PACKER_VAHAN.id, name: PACKER_VAHAN.name };
  const gevorg = { id: PACKER_GEVORG.id, name: PACKER_GEVORG.name };

  return [
    order({
      customer: "Lucas Bennett",
      code: "ORD-U003-01",
      deliveryDateId: current,
      count: 6,
    }),
    order({
      customer: "Sophia Martinez",
      code: "ORD-U003-02",
      deliveryDateId: current,
      count: 12,
      packer: vahan,
      packingStartedAt: PACKING_STARTED,
      packedAt: COOLER_READY,
      packedCoolers: { coolerA: "BL-02313", coolerB: "FR-10034" },
    }),
    order({
      customer: "Ethan Carter",
      code: "ORD-U003-03",
      deliveryDateId: current,
      count: 9,
    }),
    order({
      customer: "Liam Johnson",
      code: "ORD-U003-04",
      deliveryDateId: current,
      count: 5,
      packer: vahan,
      packingStartedAt: PACKING_STARTED,
    }),
    order({
      customer: "Ava Smith",
      code: "ORD-U003-05",
      deliveryDateId: current,
      count: 4,
    }),
    order({
      customer: "Noah Brown",
      code: "ORD-U003-06",
      deliveryDateId: current,
      count: 8,
      packer: gevorg,
      packingStartedAt: PACKING_STARTED,
      packedAt: COOLER_READY,
      loadedAt: LOADED,
      packedCoolers: { coolerA: "BL-0008", coolerB: "BL-01420" },
    }),
    order({
      customer: "Isabella Davis",
      code: "ORD-U003-07",
      deliveryDateId: current,
      count: 6,
      packer: vahan,
      packingStartedAt: PACKING_STARTED,
      packedAt: COOLER_READY,
      loadedAt: LOADED,
      packedCoolers: { coolerA: "BL-02313", coolerB: "FR-10034" },
    }),
    order({
      customer: "Mia Chen",
      code: "ORD-U002-01",
      deliveryDateId: previous,
      count: 3,
    }),
    order({
      customer: "Owen Brooks",
      code: "ORD-U002-02",
      deliveryDateId: previous,
      count: 4,
    }),
    order({
      customer: "Harper Lee",
      code: "ORD-U002-03",
      deliveryDateId: previous,
      count: 2,
    }),
    order({
      customer: "Grace Wilson",
      code: "ORD-U004-01",
      deliveryDateId: next,
      count: 3,
    }),
    order({
      customer: "Jack Miller",
      code: "ORD-U004-02",
      deliveryDateId: next,
      count: 5,
    }),
    order({
      customer: "Ella Thomas",
      code: "ORD-U004-03",
      deliveryDateId: next,
      count: 2,
    }),
  ];
}

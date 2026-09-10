import type { PackingSourceOption } from "@/types/packing";

/**
 * Demo Inventory stock rows for cooler packing SourcePicker.
 * Selecting one copies expDate / itemId / location onto the pack line.
 */
export const MEAT_OPTIONS: PackingSourceOption[] = [
  {
    distributor: "4PF Co.",
    source: "FreshMarket Co.",
    expDate: "Jul 30, 2026",
    location: "Freeze 1",
    itemId: "OPE-10043",
  },
  {
    distributor: "Rancho Protein LLC",
    source: "Alpine Products Co.",
    expDate: "Aug 02, 2026",
    location: "Freeze 2",
    itemId: "OPE-10050",
  },
];

export const FRUIT_OPTIONS: PackingSourceOption[] = [
  {
    distributor: "4PF Co.",
    source: "FreshMarket Co.",
    expDate: "Aug 20, 2026",
    location: "Dry Shelf 3",
    itemId: "OPE-23131",
  },
  {
    distributor: "4PF Co.",
    source: "Alpine Products Co.",
    expDate: "Aug 24, 2026",
    location: "Dry Shelf 2",
    itemId: "OPE-23132",
  },
  {
    distributor: "Tropical Produce LLC",
    source: "FreshMarket Co.",
    expDate: "Jul 30, 2026",
    location: "Dry Shelf 1",
    itemId: "OPE-23140",
  },
];

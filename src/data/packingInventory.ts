import type { PackingSourceOption } from "@/types/packing";

/**
 * Demo Inventory stock rows for cooler packing SourcePicker.
 * Selecting one copies expDate / itemId / location onto the pack line.
 * Temporary seed - one sample per category until Inventory API is wired.
 */
export const MEAT_OPTIONS: PackingSourceOption[] = [
  {
    distributor: "4PF Co.",
    source: "FreshMarket Co.",
    expDate: "Jul 30, 2026",
    location: "Freeze 1",
    itemId: "OPE-10043",
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
];

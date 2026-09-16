import type { Item } from "@/types/item";

function photo(id: string, label: string, bg: string): Item["photos"][number] {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96"><rect width="96" height="96" rx="12" fill="${bg}"/><text x="48" y="54" text-anchor="middle" font-family="Arial,sans-serif" font-size="16" font-weight="700" fill="#FFFFFF">${label}</text></svg>`;
  return {
    id,
    url: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
    name: `${label.toLowerCase()}.png`,
  };
}

/** Temporary seed - keep one sample until API covers this list. */
export const ITEMS: Item[] = [
  {
    id: "IT-000009",
    name: "Angus Chuck Ground Beef",
    merchandisingName: "Angus Chuck Ground Beef",
    description:
      "Hand-selected for peak ripeness and flavor. Ideal for retail and foodservice with consistent sizing and excellent shelf life.",
    preorderInfo: "",
    category: "Protein",
    subcategory: "Meat",
    distributor: "4PF",
    source: "FreshMarket Co",
    sourcePer: "Case",
    caseBy: "Units / case",
    pieceWeightOz: 0,
    caseWeightLbs: 0,
    buyingPrice: 180,
    contents: 12,
    singleItemUnit: "1 lb",
    sellingPrice: 29,
    photos: [
      photo("p9a", "B1", "#7A3B3B"),
      photo("p9b", "B2", "#944848"),
    ],
  },
];

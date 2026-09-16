import type { Source } from "@/types/source";

const DESC =
  "An FPC is a story of farmers choosing collaboration over isolation. Together they share knowledge, resources, and markets so every harvest reaches more tables with better quality and fairer returns.";

function logo(label: string, bg: string, fg = "#FFFFFF") {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80"><rect width="80" height="80" rx="10" fill="${bg}"/><text x="40" y="46" text-anchor="middle" font-family="Arial,sans-serif" font-size="18" font-weight="700" fill="${fg}">${label}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/** Temporary seed - keep one sample until API covers this list. */
export const SOURCES: Source[] = [
  {
    id: "SOR-00001",
    name: "FreshMarket Co",
    location: "Los Angeles, CA",
    fullAddress: "1845 S La Cienega Blvd, Los Angeles, CA 90035",
    distributor: "4PF",
    description: DESC,
    logoUrl: logo("FM", "#2F6B4F"),
    logoName: "freshmarket-logo.png",
  },
];

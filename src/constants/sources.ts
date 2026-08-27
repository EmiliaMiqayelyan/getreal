import type { Source } from "@/types/source";

const DESC =
  "An FPC is a story of farmers choosing collaboration over isolation. Together they share knowledge, resources, and markets so every harvest reaches more tables with better quality and fairer returns.";

function logo(label: string, bg: string, fg = "#FFFFFF") {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80"><rect width="80" height="80" rx="10" fill="${bg}"/><text x="40" y="46" text-anchor="middle" font-family="Arial,sans-serif" font-size="18" font-weight="700" fill="${fg}">${label}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

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
  {
    id: "SOR-00002",
    name: "MeatFactory Co",
    location: "Los Angeles, CA",
    fullAddress: "2200 Industrial Ave, Los Angeles, CA 90021",
    distributor: "4PF",
    description: DESC,
    logoUrl: logo("MF", "#C45C3A"),
    logoName: "meatfactory-logo.png",
  },
  {
    id: "SOR-00003",
    name: "Alpine Products Co.",
    location: "Los Angeles, CA",
    fullAddress: "910 Mountain View Rd, Los Angeles, CA 90042",
    distributor: "FreshFood LLC",
    description: DESC,
    logoUrl: logo("AP", "#3B6EA5"),
    logoName: "alpine-logo.png",
  },
  {
    id: "SOR-00004",
    name: "NanasFruits",
    location: "Los Angeles, CA",
    fullAddress: "441 Fruit St, Los Angeles, CA 90013",
    distributor: "4PF",
    description: DESC,
    logoUrl: logo("NF", "#E8A83A", "#111118"),
    logoName: "nanas-logo.png",
  },
  {
    id: "SOR-00005",
    name: "Siberian Meat Co",
    location: "Los Angeles, CA",
    fullAddress: "78 Cold Storage Way, Los Angeles, CA 90058",
    distributor: "FreshFood LLC",
    description: DESC,
    logoUrl: logo("SM", "#5B4A8A"),
    logoName: "siberian-logo.png",
  },
  {
    id: "SOR-00006",
    name: "MeatWorld",
    location: "Los Angeles, CA",
    fullAddress: "1500 Packing Plant Blvd, Los Angeles, CA 90023",
    distributor: "Ranch Protein LLC",
    description: DESC,
    logoUrl: logo("MW", "#8B3A3A"),
    logoName: "meatworld-logo.png",
  },
];

import type { Distributor } from "@/types/distributor";

/** Temporary seed - keep one sample until API covers this list. */
export const DISTRIBUTORS: Distributor[] = [
  {
    id: "DIS-10001",
    name: "4PF",
    paymentTerms: "NET-30",
    contact: "Marcus Chen",
    phone: "(415) 234-5678",
    location: "Los Angeles, CA",
    fullAddress: "1845 S La Cienega Blvd, Los Angeles, CA 90035",
    delivery: "Mon, Wed 8:00 AM",
    deliveryDays: [
      { day: "Mon", time: "08:00" },
      { day: "Wed", time: "08:00" },
    ],
    documents: [
      {
        id: "D001",
        name: "Order 4_ Milestone 3.pdf",
        size: "560.4 KB",
      },
    ],
    notes:
      "Preferred drop-off is the loading dock on La Cienega. Call 15 minutes before arrival.",
    contacts: [
      {
        id: "C001",
        firstName: "Marcus",
        lastName: "Chen",
        phone: "(415) 234-5678",
        email: "marcus@4pf.com",
        title: "Manager",
        primary: true,
      },
    ],
    categories: ["Protein"],
    items: 1,
    docs: "1",
    products: [
      {
        id: "P001",
        name: "Angus Chuck Ground Beef",
        product: "Ground Beef",
        source: "FreshMarket Co",
        price: 180,
        qty: 12,
        unit: "Case/Box",
        category: "Protein",
      },
    ],
  },
];

import type { Customer } from "@/types/customer";

/** Temporary seed - keep one sample until API covers this list. */
export const CUSTOMERS: Customer[] = [
  {
    id: "U001",
    name: "Sarah Johnson",
    email: "sarah.j@email.com",
    phone: "(555) 123-4567",
    address: "Brooklyn, NY",
    orders: 15,
    total: 597.55,
    lastOrder: "Jun 28",
    hasNote: true,
    status: "active",
    orderHistory: [
      {
        id: "ORD-1042",
        date: "Jun 28, 2026",
        items: 4,
        total: 86.4,
        status: "Delivered",
      },
    ],
  },
];

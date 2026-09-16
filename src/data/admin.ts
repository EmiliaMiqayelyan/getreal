import type {
  AdminCustomer,
  AdminItem,
  AdminProductOrder,
  RoleUser,
} from "@/types/admin";
import { ADMIN_ROLE_PERMISSIONS } from "@/utils/rolePermissions";

export {
  ADMIN_ROLE_PERMISSIONS,
  DEFAULT_ROLE_PERMISSIONS,
  MANAGER_ROLE_PERMISSIONS,
  WAREHOUSE_ROLE_PERMISSIONS,
} from "@/utils/rolePermissions";

/** Temporary seed - one sample until Items API owns this list. */
export const ADMIN_ITEMS: AdminItem[] = [
  {
    id: "I001",
    name: "Angus Chuck Ground Beef",
    sku: "IT-ANG-001",
    category: "Meat",
    sellingPrice: 10,
    unit: "1lb",
    totalQuantity: 120,
    live: true,
    suppliers: [
      {
        supplierName: "4PF Co.",
        source: "FreshMarket Co.",
        quantity: 60,
        purchasePrice: 7.5,
        lastDelivered: "2026-01-24",
        itemUnit: "1 lb",
      },
    ],
  },
];

/** Temporary seed - one sample until Product Orders API owns this list. */
export const ADMIN_PRODUCT_ORDERS: AdminProductOrder[] = [
  {
    id: "O001",
    supplierName: "Marcus Chen",
    companyName: "4PF Co.",
    status: "In Progress",
    creationDate: "2026-07-15",
    deliveryDate: "2026-08-01",
    createdBy: "James M.",
    items: [
      {
        name: "Angus Chuck Ground Beef",
        quantity: 40,
        price: 7.5,
        unit: "lb",
      },
    ],
  },
];

/** Temporary seed - one sample until Customers API owns this list. */
export const ADMIN_CUSTOMERS: AdminCustomer[] = [
  {
    id: "U001",
    firstName: "Sarah",
    lastName: "Johnson",
    email: "sarah.johnson@email.com",
    phone: "(555) 123-4567",
    shortLocation: "Brooklyn, NY",
    fullAddress: "245 Bedford Ave, Apt 3B, Brooklyn, NY 11211, USA",
    orderQuantity: 15,
    lastOrderedDate: "2026-06-28",
    lifetimeTotal: 597.55,
    subscribed: true,
    customerTag: "VIP",
    deliveryDay: "Wednesday",
    flagged: true,
    zip: "11211",
    orders: [
      {
        id: "ORD-U001-01",
        orderDate: "2026-06-28",
        deliveryDate: "2026-06-30",
        deliveryAddress: "245 Bedford Ave, Apt 3B, Brooklyn, NY 11211, USA",
        orderPrice: 86.4,
        paymentStatus: "Paid",
        status: "In Progress",
        orderedAt: "Jun 28, 2026, 2:10 PM",
        packerAssigned: "Packer Name 1",
        coolerIds: ["BL-0012", "FR-1423"],
        items: [
          {
            itemName: "Angus Chuck Ground Beef",
            quantity: 2,
            unit: "1lb",
            pricePerUnit: 10,
            totalPrice: 20,
          },
        ],
      },
    ],
  },
];

/** Temporary seed - one sample until Roles/Users API owns this list. */
export const ADMIN_USERS: RoleUser[] = [
  {
    id: "U001",
    name: "Alice Johnson",
    email: "alice@example.com",
    phone: "(555) 123-4567",
    type: "Superadmin",
    permissions: ADMIN_ROLE_PERMISSIONS,
  },
];

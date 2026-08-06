import { useMemo, useState } from "react";
import {
  Calendar,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus,
  Search,
  Truck,
  X,
} from "lucide-react";

import { UserMenu } from "@/components/layout/UserMenu";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { cn } from "@/utils/cn";

const ORANGE = "#F57850";
const GREEN = "#28402B";

type View =
  | "list"
  | "orderList"
  | "review"
  | "manualCreate"
  | "manualReview";

type SupplierOption = {
  distributor: string;
  source: string;
  price: number;
  unit: string;
  qtyPerUnit: string;
};

type OrderSeedRow = {
  id: string;
  itemName: string;
  category: "Meat" | "Fruits" | "Grains";
  custOrderTotal: number;
  inStock: number | null;
  qtyReceiving: number;
  dateReceivingBy: string;
  reviewQty: number;
  options: SupplierOption[];
};

type WorkingRow = OrderSeedRow & {
  selectedOptionIndex: number | null;
  quantity: number;
};

type LineItem = {
  sku: string;
  itemName: string;
  source: string;
  quantity: number;
  price: number;
  unit: string;
};

type CreatedOrder = {
  id: string;
  deliveryId: string;
  distributor: string;
  orderDate: string;
  deliveryDate: string;
  totalPrice: number;
  items: LineItem[];
};

type DeliveredOrder = CreatedOrder & {
  day: string;
  week: string;
};

type ManualCatalogItem = {
  id: string;
  sku: string;
  name: string;
  source: string;
  distributors: string[];
  inStock: number;
  price: number;
  unit: string;
};

type ManualLine = ManualCatalogItem & {
  quantity: number;
};

type ProductDraft = {
  name: string;
  sku: string;
  topCategory: string;
  subcategory: string;
  unit: string;
  sellingPrice: string;
  live: boolean;
  sourceName: string;
  price: string;
  priceOfUnit: string;
  qtyPerUnit: string;
  itemUnit: string;
};

const DELIVERY_CHIPS = [
  { id: "wed-14", label: "Wed Jul 14", count: 13 },
  { id: "wed-20", label: "Wed Jul 20", count: 7 },
  { id: "wed-27", label: "Wed Jul 27", count: 3 },
];

const ORDER_ROWS: OrderSeedRow[] = [
  {
    id: "angus",
    itemName: "Angus Chuck Ground Beef",
    category: "Meat",
    custOrderTotal: 3,
    inStock: null,
    qtyReceiving: 2,
    dateReceivingBy: "Tues, July 19",
    reviewQty: 3,
    options: [
      {
        distributor: "Rancho Protein LLC",
        source: "MeatFactory Co",
        price: 125,
        unit: "case",
        qtyPerUnit: "10 lb",
      },
      {
        distributor: "4PF Co.",
        source: "MeatFactory Co",
        price: 132,
        unit: "case",
        qtyPerUnit: "10 lb",
      },
    ],
  },
  {
    id: "ribeye",
    itemName: "Rib-eye Steak",
    category: "Meat",
    custOrderTotal: 2,
    inStock: null,
    qtyReceiving: 2,
    dateReceivingBy: "Tues, July 19",
    reviewQty: 2,
    options: [
      {
        distributor: "Rancho Protein LLC",
        source: "MeatFactory Co",
        price: 90,
        unit: "case",
        qtyPerUnit: "8 lb",
      },
      {
        distributor: "4PF Co.",
        source: "MeatFactory Co",
        price: 96,
        unit: "case",
        qtyPerUnit: "8 lb",
      },
    ],
  },
  {
    id: "chicken",
    itemName: "Legion Fields Whole Chicken",
    category: "Meat",
    custOrderTotal: 1,
    inStock: null,
    qtyReceiving: 2,
    dateReceivingBy: "Tues, July 19",
    reviewQty: 1,
    options: [
      {
        distributor: "Rancho Protein LLC",
        source: "MeatFactory Co",
        price: 50,
        unit: "case",
        qtyPerUnit: "6 ea",
      },
      {
        distributor: "Greenfield Farms",
        source: "Legion Fields",
        price: 54,
        unit: "case",
        qtyPerUnit: "6 ea",
      },
    ],
  },
  {
    id: "lemons",
    itemName: "Lemons",
    category: "Fruits",
    custOrderTotal: 9,
    inStock: 2,
    qtyReceiving: 2,
    dateReceivingBy: "Tues, July 19",
    reviewQty: 6,
    options: [
      {
        distributor: "Tropical Produce LLC",
        source: "FruitWorlds Co",
        price: 2.59,
        unit: "lb",
        qtyPerUnit: "1 lb",
      },
      {
        distributor: "4PF Co.",
        source: "FreshMarket Co.",
        price: 3.2,
        unit: "lb",
        qtyPerUnit: "1 lb",
      },
      {
        distributor: "4PF Co.",
        source: "Alpine Products Co.",
        price: 3.45,
        unit: "lb",
        qtyPerUnit: "1 lb",
      },
    ],
  },
  {
    id: "blueberries",
    itemName: "Blueberries",
    category: "Fruits",
    custOrderTotal: 2,
    inStock: 3,
    qtyReceiving: 2,
    dateReceivingBy: "Tues, July 19",
    reviewQty: 1,
    options: [
      {
        distributor: "4PF Co.",
        source: "FreshMarket Co.",
        price: 12.5,
        unit: "box",
        qtyPerUnit: "1 box",
      },
      {
        distributor: "Tropical Produce LLC",
        source: "FreshMarket Co.",
        price: 12.95,
        unit: "box",
        qtyPerUnit: "1 box",
      },
    ],
  },
  {
    id: "gala",
    itemName: "Gala Apples",
    category: "Fruits",
    custOrderTotal: 5,
    inStock: 1,
    qtyReceiving: 2,
    dateReceivingBy: "Tues, July 19",
    reviewQty: 1,
    options: [
      {
        distributor: "4PF Co.",
        source: "Alpine Products Co.",
        price: 4.5,
        unit: "lb",
        qtyPerUnit: "1 lb",
      },
      {
        distributor: "4PF Co.",
        source: "FreshMarket Co.",
        price: 4.75,
        unit: "lb",
        qtyPerUnit: "1 lb",
      },
    ],
  },
  {
    id: "butter",
    itemName: "Fresh Unsalted Butter",
    category: "Grains",
    custOrderTotal: 2,
    inStock: null,
    qtyReceiving: 2,
    dateReceivingBy: "Tues, July 19",
    reviewQty: 3,
    options: [
      {
        distributor: "4PF Co.",
        source: "FreshMarket Co.",
        price: 4.5,
        unit: "lb",
        qtyPerUnit: "1 lb",
      },
      {
        distributor: "Alpine Dairy Solutions",
        source: "Alpine Dairy",
        price: 4.9,
        unit: "lb",
        qtyPerUnit: "1 lb",
      },
    ],
  },
];

const SEED_IN_PROGRESS: CreatedOrder = {
  id: "seed-0802",
  deliveryId: "0802",
  distributor: "Rancho Protein LLC",
  orderDate: "Jul 16, 12:34 PM",
  deliveryDate: "Jul 18, 8:00 AM",
  totalPrice: 490,
  items: [
    {
      sku: "OPE-10848",
      itemName: "Angus Chuck Ground Beef",
      source: "MeatFactory Co",
      quantity: 2,
      price: 125,
      unit: "case",
    },
    {
      sku: "OPE-10849",
      itemName: "Rib-eye Steak",
      source: "MeatFactory Co",
      quantity: 1,
      price: 90,
      unit: "case",
    },
    {
      sku: "OPE-10850",
      itemName: "Legion Fields Whole Chicken",
      source: "MeatFactory Co",
      quantity: 3,
      price: 50,
      unit: "case",
    },
  ],
};

const DELIVERED_ORDERS: DeliveredOrder[] = [
  {
    id: "del-0801",
    deliveryId: "0801",
    distributor: "Rancho Protein LLC",
    orderDate: "Jul 22, 10:12 AM",
    deliveryDate: "Jul 29, 7:30 AM",
    totalPrice: 365,
    day: "Wednesday, 7/29/2026",
    week: "Week of 7/28/2026",
    items: [
      {
        sku: "OPE-10840",
        itemName: "Angus Chuck Ground Beef",
        source: "MeatFactory Co",
        quantity: 1,
        price: 125,
        unit: "case",
      },
      {
        sku: "OPE-10841",
        itemName: "Rib-eye Steak",
        source: "MeatFactory Co",
        quantity: 2,
        price: 90,
        unit: "case",
      },
      {
        sku: "OPE-10842",
        itemName: "Legion Fields Whole Chicken",
        source: "MeatFactory Co",
        quantity: 1,
        price: 50,
        unit: "case",
      },
    ],
  },
  {
    id: "del-0798",
    deliveryId: "0798",
    distributor: "Tropical Produce LLC",
    orderDate: "Jul 21, 3:40 PM",
    deliveryDate: "Jul 29, 9:00 AM",
    totalPrice: 84.5,
    day: "Wednesday, 7/29/2026",
    week: "Week of 7/28/2026",
    items: [
      {
        sku: "OPE-20410",
        itemName: "Lemons",
        source: "FruitWorlds Co",
        quantity: 20,
        price: 2.59,
        unit: "lb",
      },
      {
        sku: "OPE-20411",
        itemName: "Blueberries",
        source: "FreshMarket Co.",
        quantity: 2,
        price: 12.5,
        unit: "box",
      },
    ],
  },
  {
    id: "del-0790",
    deliveryId: "0790",
    distributor: "4PF Co.",
    orderDate: "Jul 14, 1:05 PM",
    deliveryDate: "Jul 22, 8:15 AM",
    totalPrice: 112.25,
    day: "Wednesday, 7/22/2026",
    week: "Week of 7/21/2026",
    items: [
      {
        sku: "OPE-30101",
        itemName: "Gala Apples",
        source: "Alpine Products Co.",
        quantity: 10,
        price: 4.5,
        unit: "lb",
      },
      {
        sku: "OPE-30102",
        itemName: "Fresh Unsalted Butter",
        source: "FreshMarket Co.",
        quantity: 15,
        price: 4.5,
        unit: "lb",
      },
    ],
  },
];

const MANUAL_DISTRIBUTORS = [
  "Rancho Protein LLC",
  "Tropical Produce LLC",
  "4PF Co.",
];

const MANUAL_CATALOG: ManualCatalogItem[] = [
  {
    id: "m-angus",
    sku: "OPE-10848",
    name: "Angus Chuck Ground Beef",
    source: "MeatFactory Co",
    distributors: ["Rancho Protein LLC", "4PF Co."],
    inStock: 12,
    price: 125,
    unit: "case",
  },
  {
    id: "m-ribeye",
    sku: "OPE-10849",
    name: "Rib-eye Steak",
    source: "MeatFactory Co",
    distributors: ["Rancho Protein LLC", "4PF Co."],
    inStock: 8,
    price: 90,
    unit: "case",
  },
  {
    id: "m-chicken",
    sku: "OPE-10850",
    name: "Legion Fields Whole Chicken",
    source: "MeatFactory Co",
    distributors: ["Rancho Protein LLC"],
    inStock: 5,
    price: 50,
    unit: "case",
  },
  {
    id: "m-lemons",
    sku: "OPE-20410",
    name: "Lemons",
    source: "Tropical Produce LLC",
    distributors: ["Tropical Produce LLC", "4PF Co."],
    inStock: 40,
    price: 2.59,
    unit: "lb",
  },
  {
    id: "m-blueberries",
    sku: "OPE-20411",
    name: "Blueberries",
    source: "Tropical Produce LLC",
    distributors: ["Tropical Produce LLC", "4PF Co."],
    inStock: 18,
    price: 12.5,
    unit: "box",
  },
  {
    id: "m-apples",
    sku: "OPE-30101",
    name: "Gala Apples",
    source: "Tropical Produce LLC",
    distributors: ["Tropical Produce LLC", "4PF Co."],
    inStock: 22,
    price: 4.5,
    unit: "lb",
  },
  {
    id: "m-butter",
    sku: "OPE-30102",
    name: "Fresh Unsalted Butter",
    source: "MeatFactory Co",
    distributors: ["4PF Co."],
    inStock: 14,
    price: 4.5,
    unit: "lb",
  },
];

const TIME_SLOTS = ["06:00–08:00 AM", "09:00–11:00 AM"] as const;

const TOP_CATEGORIES: Record<string, string[]> = {
  Protein: ["Meat", "Poultry", "Seafood", "Pork"],
  Produce: ["Vegetables", "Fruits"],
  Dairy: ["Dairy"],
  Other: ["Grain", "Specials"],
};

function currency(value: number) {
  return `$${value.toFixed(value % 1 === 0 ? 0 : 2)}`;
}

function currencyExact(value: number) {
  return `$${value.toFixed(2)}`;
}

function makeWorkingRows(): WorkingRow[] {
  return ORDER_ROWS.map((row) => ({
    ...row,
    selectedOptionIndex: null,
    quantity: 0,
  }));
}

function emptyProductDraft(): ProductDraft {
  return {
    name: "",
    sku: "",
    topCategory: "Protein",
    subcategory: "Meat",
    unit: "lb",
    sellingPrice: "",
    live: true,
    sourceName: "",
    price: "",
    priceOfUnit: "",
    qtyPerUnit: "1",
    itemUnit: "lb",
  };
}

function QtyStepper({
  value,
  onChange,
}: {
  value: number;
  onChange: (next: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => onChange(Math.max(0, value - 1))}
        className="flex size-7 items-center justify-center rounded-full bg-[#EFF3ED] text-[#71846F]"
      >
        <Minus size={12} />
      </button>
      <div className="min-w-[20px] text-center text-[14px] text-[#2E2E2E]">
        {value}
      </div>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        className="flex size-7 items-center justify-center rounded-full bg-[#EFF3ED] text-[#71846F]"
      >
        <Plus size={12} />
      </button>
    </div>
  );
}

function ExpandableOrderTable({
  orders,
  expandedId,
  onToggle,
}: {
  orders: CreatedOrder[];
  expandedId: string;
  onToggle: (id: string) => void;
}) {
  return (
    <div className="overflow-hidden rounded-[10px] border border-[#ECECEA] bg-white">
      <div className="grid grid-cols-[110px_1.4fr_1.1fr_1.1fr_1fr_100px] items-center gap-3 border-b border-[#F0F0EE] bg-[#FAFAF8] px-5 py-2.5 text-[10px] font-semibold tracking-[0.04em] text-[#8A8A8A] uppercase">
        <div>Delivery ID</div>
        <div>Distributor</div>
        <div>Order Date</div>
        <div>Delivery Date</div>
        <div>Total Price</div>
        <div>Invoice</div>
      </div>

      {orders.map((order) => {
        const open = expandedId === order.id;
        return (
          <div key={order.id} className="border-b border-[#F3F3F1] last:border-b-0">
            <button
              type="button"
              onClick={() => onToggle(order.id)}
              className="grid w-full grid-cols-[110px_1.4fr_1.1fr_1.1fr_1fr_100px] items-center gap-3 px-5 py-3.5 text-left"
            >
              <div className="flex items-center gap-2">
                <ChevronRight
                  size={13}
                  className={cn(
                    "text-[#B2A89E] transition-transform",
                    open && "rotate-90",
                  )}
                />
                <span className="rounded-[6px] bg-[#F3F3F1] px-1.5 py-0.5 font-mono text-[11px] text-[#6B6B6B]">
                  {order.deliveryId}
                </span>
              </div>
              <div className="text-[14px] font-semibold text-[#2E2E2E]">
                {order.distributor}
              </div>
              <div className="text-[13px] text-[#6B6B6B]">{order.orderDate}</div>
              <div className="text-[13px] text-[#6B6B6B]">
                {order.deliveryDate}
              </div>
              <div className="text-[13px] font-semibold text-[#2E2E2E]">
                {currency(order.totalPrice)}
              </div>
              <div className="text-[13px] font-medium text-[#3B82F6]">
                Download
              </div>
            </button>

            {open ? (
              <div className="border-t border-[#F0F0EE] bg-[#FAFAF8] px-5 py-2">
                {order.items.map((item) => (
                  <div
                    key={`${order.id}-${item.sku}`}
                    className="grid grid-cols-[110px_1.4fr_1.1fr_1.1fr_1fr_100px] items-center gap-3 py-2.5 text-[13px] text-[#46413C]"
                  >
                    <div className="pl-6">
                      <span className="rounded-[6px] bg-white px-1.5 py-0.5 font-mono text-[11px] text-[#6B6B6B]">
                        {item.sku}
                      </span>
                    </div>
                    <div className="font-medium text-[#2E2E2E]">
                      {item.itemName}
                    </div>
                    <div className="text-[#8A8A8A]">{item.source}</div>
                    <div>
                      {currencyExact(item.price)} / {item.unit}
                    </div>
                    <div>
                      {item.quantity} {item.unit}
                    </div>
                    <div />
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export default function ProductOrdersPage() {
  useDocumentTitle("Distributor Orders");

  const [view, setView] = useState<View>("list");
  const [activeTab, setActiveTab] = useState<"Orders" | "Delivered">("Orders");
  const [activeChip, setActiveChip] = useState("wed-20");
  const [search, setSearch] = useState("");
  const [productFilter, setProductFilter] = useState("");
  const [zipFilter, setZipFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortBy, setSortBy] = useState("");
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState(20);

  const [createdOrders, setCreatedOrders] = useState<CreatedOrder[]>([
    SEED_IN_PROGRESS,
  ]);
  const [expandedOrderId, setExpandedOrderId] = useState(SEED_IN_PROGRESS.id);
  const [expandedDeliveredId, setExpandedDeliveredId] = useState("del-0801");

  const [rows, setRows] = useState<WorkingRow[]>(makeWorkingRows);
  const [pickerRowId, setPickerRowId] = useState<string | null>(null);
  const [pickerSearch, setPickerSearch] = useState("");
  const [orderedDistributors, setOrderedDistributors] = useState<Set<string>>(
    () => new Set(),
  );

  const [manualDistributor, setManualDistributor] = useState("");
  const [manualLines, setManualLines] = useState<ManualLine[]>([]);
  const [manualCatalog, setManualCatalog] =
    useState<ManualCatalogItem[]>(MANUAL_CATALOG);
  const [deliveryDate, setDeliveryDate] = useState("2026-07-14");
  const [selectedTimes, setSelectedTimes] = useState<string[]>([
    TIME_SLOTS[0],
  ]);
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [productDraft, setProductDraft] = useState<ProductDraft>(
    emptyProductDraft(),
  );

  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);

  const filteredOrderRows = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    return ORDER_ROWS.filter((row) => {
      const matchesSearch =
        !normalized || row.itemName.toLowerCase().includes(normalized);
      const matchesProduct =
        !productFilter ||
        row.category.toLowerCase() === productFilter.toLowerCase();
      return matchesSearch && matchesProduct;
    });
  }, [productFilter, search]);

  const filteredInProgress = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    return createdOrders.filter((order) => {
      if (!normalized) return true;
      return (
        order.distributor.toLowerCase().includes(normalized) ||
        order.deliveryId.includes(normalized) ||
        order.items.some((item) =>
          item.itemName.toLowerCase().includes(normalized),
        )
      );
    });
  }, [createdOrders, search]);

  const filteredDelivered = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    let list = DELIVERED_ORDERS.filter((order) => {
      const matchesSearch =
        !normalized ||
        order.distributor.toLowerCase().includes(normalized) ||
        order.deliveryId.includes(normalized);
      return matchesSearch;
    });
    if (sortBy === "distributor") {
      list = [...list].sort((a, b) =>
        a.distributor.localeCompare(b.distributor),
      );
    } else if (sortBy === "total") {
      list = [...list].sort((a, b) => b.totalPrice - a.totalPrice);
    }
    return list;
  }, [search, sortBy]);

  const deliveredGroups = useMemo(() => {
    const weeks = new Map<string, Map<string, DeliveredOrder[]>>();
    filteredDelivered.forEach((order) => {
      if (!weeks.has(order.week)) weeks.set(order.week, new Map());
      const days = weeks.get(order.week)!;
      if (!days.has(order.day)) days.set(order.day, []);
      days.get(order.day)!.push(order);
    });
    return Array.from(weeks.entries());
  }, [filteredDelivered]);

  const groupedDialogRows = useMemo(
    () => ({
      Meat: rows.filter((row) => row.category === "Meat"),
      Fruits: rows.filter((row) => row.category === "Fruits"),
      Grains: rows.filter((row) => row.category === "Grains"),
    }),
    [rows],
  );

  const reviewGroups = useMemo(() => {
    const groups = new Map<
      string,
      {
        distributor: string;
        totalPrice: number;
        itemCount: number;
        items: LineItem[];
      }
    >();

    rows.forEach((row) => {
      if (row.selectedOptionIndex == null || row.quantity <= 0) return;
      const option = row.options[row.selectedOptionIndex];
      const current = groups.get(option.distributor);
      const line: LineItem = {
        sku: `OPE-${row.id.toUpperCase()}`,
        itemName: row.itemName,
        source: option.source,
        quantity: row.quantity,
        price: option.price,
        unit: option.unit,
      };
      const lineTotal = option.price * row.quantity;

      if (!current) {
        groups.set(option.distributor, {
          distributor: option.distributor,
          totalPrice: lineTotal,
          itemCount: row.quantity,
          items: [line],
        });
        return;
      }

      current.totalPrice += lineTotal;
      current.itemCount += row.quantity;
      current.items.push(line);
    });

    return Array.from(groups.values());
  }, [rows]);

  const reviewGrandTotal = reviewGroups.reduce(
    (sum, group) => sum + group.totalPrice,
    0,
  );

  const manualGroupedBySource = useMemo(() => {
    const map = new Map<string, ManualLine[]>();
    manualLines.forEach((line) => {
      if (!map.has(line.source)) map.set(line.source, []);
      map.get(line.source)!.push(line);
    });
    return Array.from(map.entries());
  }, [manualLines]);

  const manualTotal = manualLines.reduce(
    (sum, line) => sum + line.price * line.quantity,
    0,
  );

  const deliveryLabel = useMemo(() => {
    if (!deliveryDate) return "Wed, Jul 14";
    const date = new Date(`${deliveryDate}T12:00:00`);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  }, [deliveryDate]);

  const expectedDeliveryText = useMemo(() => {
    const slot = selectedTimes[0] ?? TIME_SLOTS[0];
    return `Tue, Jul 12, ${slot}`;
  }, [selectedTimes]);

  function updateRow(rowId: string, updater: (row: WorkingRow) => WorkingRow) {
    setRows((current) =>
      current.map((row) => (row.id === rowId ? updater(row) : row)),
    );
  }

  function showToast() {
    setToastVisible(true);
    window.setTimeout(() => setToastVisible(false), 2500);
  }

  function openOrderList() {
    setRows(makeWorkingRows());
    setOrderedDistributors(new Set());
    setPickerRowId(null);
    setPickerSearch("");
    setView("orderList");
  }

  function openManualCreate() {
    setManualDistributor("");
    setManualLines([]);
    setDeliveryDate("2026-07-14");
    setSelectedTimes([TIME_SLOTS[0]]);
    setProductModalOpen(false);
    setView("manualCreate");
  }

  function resetToList() {
    setView("list");
    setConfirmCloseOpen(false);
    setPickerRowId(null);
    setPickerSearch("");
    setProductModalOpen(false);
  }

  function applyCalculatedQuantities(section: "Meat" | "Fruits" | "Grains") {
    setRows((current) =>
      current.map((row) => {
        if (row.category !== section) return row;
        const preferredIndex =
          row.selectedOptionIndex ??
          (row.options.length > 0 ? 0 : null);
        return {
          ...row,
          selectedOptionIndex: preferredIndex,
          quantity: row.reviewQty,
        };
      }),
    );
  }

  function finalizeOrderList() {
    const nextOrders: CreatedOrder[] = reviewGroups.map((group, index) => ({
      id: `created-${Date.now()}-${index}`,
      deliveryId: String(803 + index).padStart(4, "0"),
      distributor: group.distributor,
      orderDate: "Jul 16, 12:34 PM",
      deliveryDate: "Jul 18, 8:00 AM",
      totalPrice: group.totalPrice,
      items: group.items,
    }));

    setCreatedOrders((current) => {
      const seed = current.find((order) => order.id === SEED_IN_PROGRESS.id);
      return seed ? [...nextOrders, seed] : nextOrders;
    });
    if (nextOrders[0]) setExpandedOrderId(nextOrders[0].id);
    showToast();
    resetToList();
  }

  function markDistributorOrdered(distributor: string) {
    setOrderedDistributors((current) => new Set(current).add(distributor));
  }

  function orderAllFromReview() {
    reviewGroups.forEach((group) => markDistributorOrdered(group.distributor));
    finalizeOrderList();
  }

  function selectManualDistributor(name: string) {
    setManualDistributor(name);
    if (!name) {
      setManualLines([]);
      return;
    }
    const items = manualCatalog.filter((item) =>
      item.distributors.includes(name),
    );
    setManualLines(
      items.map((item) => ({
        ...item,
        quantity: 0,
      })),
    );
  }

  function updateManualQty(id: string, quantity: number) {
    setManualLines((current) =>
      current.map((line) =>
        line.id === id ? { ...line, quantity: Math.max(0, quantity) } : line,
      ),
    );
  }

  function toggleTime(slot: string) {
    setSelectedTimes((current) => {
      if (current.includes(slot)) {
        return current.filter((entry) => entry !== slot);
      }
      return [...current, slot];
    });
  }

  function createProductFromModal() {
    if (!productDraft.name.trim() || !productDraft.sku.trim()) return;
    const price = Number(productDraft.price) || 0;
    const item: ManualCatalogItem = {
      id: `m-custom-${Date.now()}`,
      sku: productDraft.sku.trim(),
      name: productDraft.name.trim(),
      source: productDraft.sourceName.trim() || "Custom Source",
      distributors: manualDistributor
        ? [manualDistributor]
        : MANUAL_DISTRIBUTORS,
      inStock: 0,
      price,
      unit: productDraft.itemUnit || productDraft.unit || "lb",
    };
    setManualCatalog((current) => [...current, item]);
    if (manualDistributor) {
      setManualLines((current) => [...current, { ...item, quantity: 1 }]);
    }
    setProductModalOpen(false);
    setProductDraft(emptyProductDraft());
  }

  function finalizeManualOrder() {
    if (!manualDistributor) return;
    const items = manualLines
      .filter((line) => line.quantity > 0)
      .map((line) => ({
        sku: line.sku,
        itemName: line.name,
        source: line.source,
        quantity: line.quantity,
        price: line.price,
        unit: line.unit,
      }));
    if (!items.length) return;

    const next: CreatedOrder = {
      id: `manual-${Date.now()}`,
      deliveryId: String(810 + createdOrders.length).padStart(4, "0"),
      distributor: manualDistributor,
      orderDate: "Jul 16, 12:34 PM",
      deliveryDate: `${deliveryLabel}, ${selectedTimes[0] ?? TIME_SLOTS[0]}`,
      totalPrice: items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0,
      ),
      items,
    };

    setCreatedOrders((current) => [next, ...current]);
    setExpandedOrderId(next.id);
    showToast();
    resetToList();
  }

  const canReviewOrderList = rows.some(
    (row) => row.selectedOptionIndex != null && row.quantity > 0,
  );
  const canReviewManual =
    Boolean(manualDistributor) &&
    manualLines.some((line) => line.quantity > 0) &&
    Boolean(deliveryDate) &&
    selectedTimes.length > 0;

  const productNetCost =
    (Number(productDraft.priceOfUnit) || 0) /
    Math.max(1, Number(productDraft.qtyPerUnit) || 1);
  const productMargin =
    Number(productDraft.sellingPrice) > 0
      ? ((Number(productDraft.sellingPrice) - productNetCost) /
          Number(productDraft.sellingPrice)) *
        100
      : 0;

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-[#F5F5F3]">
      {view === "list" ? (
        <>
          <div className="shrink-0 border-b border-[#ECECEA] bg-white">
            <div className="px-7 pt-5">
              <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-4">
                <h1 className="text-[22px] font-semibold tracking-tight text-[#2E2E2E]">
                  Distributor Orders
                </h1>

                <div className="flex items-center gap-8">
                  {(["Orders", "Delivered"] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setActiveTab(tab)}
                      className={cn(
                        "border-b-2 pb-4 text-[14px]",
                        activeTab === tab
                          ? "border-[#F57850] font-medium text-[#2E2E2E]"
                          : "border-transparent text-[#8A8A8A]",
                      )}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                <div className="flex justify-end">
                  <UserMenu showAvatar className="items-center" />
                </div>
              </div>
            </div>

            <div className="border-t border-[#ECECEA] px-7 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative w-[160px]">
                  <Search
                    size={13}
                    className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[#A9A9A9]"
                  />
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search"
                    className="h-[34px] rounded-[8px] border-[#E6E6E3] bg-white pl-8 text-[13px]"
                  />
                </div>

                {activeTab === "Orders" ? (
                  <>
                    <Select
                      value={productFilter}
                      onChange={setProductFilter}
                      aria-label="All products"
                      options={[
                        { value: "", label: "All products" },
                        { value: "Meat", label: "Meat" },
                        { value: "Fruits", label: "Fruits" },
                        { value: "Grains", label: "Grains" },
                      ]}
                    />
                    <button
                      type="button"
                      onClick={openManualCreate}
                      className="ml-auto inline-flex h-[34px] items-center gap-1.5 rounded-[8px] px-3.5 text-[13px] font-medium text-white"
                      style={{ background: ORANGE }}
                    >
                      <Plus size={14} />
                      Create Order
                    </button>
                  </>
                ) : (
                  <>
                    <Select
                      value={zipFilter}
                      onChange={setZipFilter}
                      aria-label="All Zip Codes"
                      options={[
                        { value: "", label: "All Zip Codes" },
                        { value: "10003", label: "10003" },
                        { value: "11102", label: "11102" },
                      ]}
                    />
                    <button
                      type="button"
                      onClick={() => setCalendarOpen((open) => !open)}
                      className="inline-flex h-[34px] items-center gap-2 rounded-[8px] border border-[#E6E6E3] bg-white px-3 text-[13px] text-[#2E2E2E]"
                    >
                      <Calendar size={13} className="text-[#8A8A8A]" />
                      Select Date
                    </button>
                    <Select
                      value={statusFilter}
                      onChange={setStatusFilter}
                      aria-label="All Statuses"
                      options={[{ value: "", label: "All Statuses" }]}
                    />
                    <Select
                      value={sortBy}
                      onChange={setSortBy}
                      aria-label="Sort by"
                      options={[
                        { value: "", label: "Sort by" },
                        { value: "distributor", label: "Distributor" },
                        { value: "total", label: "Total" },
                      ]}
                    />
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-auto px-7 py-5">
            {activeTab === "Orders" ? (
              <>
                <div className="mb-5 flex items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-2">
                    {DELIVERY_CHIPS.map((chip) => {
                      const active = chip.id === activeChip;
                      return (
                        <button
                          key={chip.id}
                          type="button"
                          onClick={() => setActiveChip(chip.id)}
                          className={cn(
                            "inline-flex min-w-[120px] items-center justify-between gap-3 rounded-[12px] border px-4 py-3 text-left",
                            active
                              ? "border-transparent text-white"
                              : "border-[#ECECEA] bg-white text-[#2E2E2E]",
                          )}
                          style={active ? { background: GREEN } : undefined}
                        >
                          <span className="text-[13px] font-semibold">
                            {chip.label}
                          </span>
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                              active
                                ? "bg-white/15 text-white"
                                : "bg-[#F3F3F1] text-[#6B6B6B]",
                            )}
                          >
                            {chip.count}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="relative flex items-center gap-2">
                    <button
                      type="button"
                      className="flex size-9 items-center justify-center rounded-full border border-[#ECECEA] bg-white text-[#8A8A8A]"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button
                      type="button"
                      className="flex size-9 items-center justify-center rounded-full border border-[#ECECEA] bg-white text-[#8A8A8A]"
                    >
                      <ChevronRight size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setCalendarOpen((open) => !open)}
                      className="flex size-9 items-center justify-center rounded-full border border-[#ECECEA] bg-white text-[#8A8A8A]"
                    >
                      <Calendar size={15} />
                    </button>

                    {calendarOpen ? (
                      <div className="absolute top-11 right-0 z-30 w-[280px] rounded-[12px] border border-[#ECECEA] bg-white p-4 shadow-xl">
                        <div className="mb-3 flex items-center justify-between text-[13px] font-semibold text-[#2E2E2E]">
                          <span>July 2026</span>
                          <div className="flex gap-1 text-[#8A8A8A]">
                            <ChevronLeft size={14} />
                            <ChevronRight size={14} />
                          </div>
                        </div>
                        <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-[#8A8A8A]">
                          {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map(
                            (day) => (
                              <div key={day} className="py-1">
                                {day}
                              </div>
                            ),
                          )}
                          {Array.from({ length: 31 }, (_, index) => {
                            const day = index + 1;
                            return (
                              <button
                                key={day}
                                type="button"
                                onClick={() => setSelectedDay(day)}
                                className={cn(
                                  "rounded-full py-1.5 text-[#2E2E2E]",
                                  selectedDay === day
                                    ? "bg-[#E8E5E0] font-semibold"
                                    : "hover:bg-[#F5F5F3]",
                                )}
                              >
                                {day}
                              </button>
                            );
                          })}
                        </div>
                        <div className="mt-3 flex items-center justify-end gap-3 border-t border-[#F0F0EE] pt-3">
                          <button
                            type="button"
                            onClick={() => setCalendarOpen(false)}
                            className="text-[13px] text-[#8A8A8A]"
                          >
                            Close
                          </button>
                          <button
                            type="button"
                            onClick={() => setCalendarOpen(false)}
                            className="rounded-[8px] px-4 py-1.5 text-[13px] font-medium text-white"
                            style={{ background: ORANGE }}
                          >
                            Apply
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>

                {filteredInProgress.length > 0 ? (
                  <section className="mb-8">
                    <h2 className="mb-4 text-[20px] font-semibold tracking-tight text-[#2E2E2E]">
                      In Progress
                    </h2>
                    <ExpandableOrderTable
                      orders={filteredInProgress}
                      expandedId={expandedOrderId}
                      onToggle={(id) =>
                        setExpandedOrderId((current) =>
                          current === id ? "" : id,
                        )
                      }
                    />
                  </section>
                ) : null}

                <section>
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-[20px] font-semibold tracking-tight text-[#2E2E2E]">
                      Order List
                    </h2>
                    <button
                      type="button"
                      onClick={openOrderList}
                      className="h-[32px] rounded-[8px] bg-[#242424] px-4 text-[14px] font-medium text-white"
                    >
                      Order now
                    </button>
                  </div>

                  <div className="overflow-hidden rounded-[10px] border border-[#ECECEA] bg-white">
                    <div className="grid grid-cols-[2fr_1.1fr_0.8fr_1.2fr_1.3fr] items-center gap-4 border-b border-[#F0F0EE] bg-[#FAFAF8] px-5 py-2.5 text-[10px] font-semibold tracking-[0.04em] text-[#8A8A8A] uppercase">
                      <div>Item Name</div>
                      <div>Cust. Order Total</div>
                      <div>In Stock</div>
                      <div>Quantity Receiving</div>
                      <div>Date Receiving By</div>
                    </div>
                    {filteredOrderRows.map((row) => (
                      <div
                        key={row.id}
                        className="grid min-h-[48px] grid-cols-[2fr_1.1fr_0.8fr_1.2fr_1.3fr] items-center gap-4 border-b border-[#F3F3F1] px-5 text-[13px] font-medium text-[#2E2E2E] last:border-b-0"
                      >
                        <div>{row.itemName}</div>
                        <div>{row.custOrderTotal}</div>
                        <div>{row.inStock ?? "—"}</div>
                        <div>{row.qtyReceiving}</div>
                        <div>{row.dateReceivingBy}</div>
                      </div>
                    ))}
                  </div>
                </section>
              </>
            ) : (
              <div className="space-y-8">
                {deliveredGroups.map(([week, days]) => (
                  <section key={week}>
                    <h2 className="mb-4 text-[22px] font-semibold tracking-tight text-[#2E2E2E]">
                      {week}
                    </h2>
                    {Array.from(days.entries()).map(([day, dayOrders]) => (
                      <div key={day} className="mb-5">
                        <div className="mb-2 flex items-center gap-2 text-[13px] font-semibold text-[#2E2E2E]">
                          <Truck size={14} className="text-[#F57850]" />
                          {day}
                          <span className="text-[12px] font-medium text-[#8A8A8A]">
                            · {dayOrders.length} orders
                          </span>
                        </div>
                        <ExpandableOrderTable
                          orders={dayOrders}
                          expandedId={expandedDeliveredId}
                          onToggle={(id) =>
                            setExpandedDeliveredId((current) =>
                              current === id ? "" : id,
                            )
                          }
                        />
                      </div>
                    ))}
                  </section>
                ))}
              </div>
            )}
          </div>
        </>
      ) : null}

      {view === "orderList" || view === "review" ? (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#F5F5F3]">
          <div className="shrink-0 border-b border-[#ECECEA] bg-white px-8 py-5">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-[28px] font-semibold tracking-tight text-[#2E2E2E]">
                  {view === "review" ? "Review Order" : "Order List"}
                </h2>
                <p className="mt-1 text-[13px] text-[#8A8A8A]">
                  {view === "review" ? "Orders for" : "Item orders for"}{" "}
                  <span className="font-semibold text-[#2E2E2E]">
                    Wed, Jul 14 delivery
                  </span>
                </p>
              </div>
              <UserMenu showAvatar showBell={false} className="items-center" />
            </div>
          </div>

          {view === "orderList" ? (
            <div className="flex-1 overflow-auto px-8 py-5">
              {(["Meat", "Fruits", "Grains"] as const).map((section) => (
                <section key={section} className="mb-7">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-[22px] font-semibold tracking-tight text-[#2E2E2E]">
                      {section}
                    </h3>
                    {section !== "Grains" ? (
                      <button
                        type="button"
                        onClick={() => applyCalculatedQuantities(section)}
                        className="text-[13px] font-medium text-[#4E7CFF]"
                      >
                        Calculate QTY
                      </button>
                    ) : null}
                  </div>

                  <div className="overflow-hidden rounded-[12px] border border-[#ECECEA] bg-white">
                    <div className="grid grid-cols-[1.3fr_1.5fr_0.85fr_0.85fr_0.85fr_0.7fr_0.9fr] gap-3 border-b border-[#F0F0EE] px-4 py-3 text-[10px] font-semibold tracking-wide text-[#8A8A8A] uppercase">
                      <div>Item Name</div>
                      <div>Distributor / Source</div>
                      <div>Price</div>
                      <div>Qty Per Unit</div>
                      <div>Cust. Order Total</div>
                      <div>In Stock</div>
                      <div>Qty Needed</div>
                    </div>

                    {groupedDialogRows[section].map((row) => {
                      const selected =
                        row.selectedOptionIndex == null
                          ? null
                          : row.options[row.selectedOptionIndex];
                      const filteredOptions = row.options.filter((option) => {
                        const normalized = pickerSearch.trim().toLowerCase();
                        return (
                          !normalized ||
                          option.distributor
                            .toLowerCase()
                            .includes(normalized) ||
                          option.source.toLowerCase().includes(normalized)
                        );
                      });

                      return (
                        <div
                          key={row.id}
                          className="relative grid grid-cols-[1.3fr_1.5fr_0.85fr_0.85fr_0.85fr_0.7fr_0.9fr] items-center gap-3 border-b border-[#F3F3F1] px-4 py-3.5 last:border-b-0"
                        >
                          <div className="text-[14px] text-[#2E2E2E]">
                            {row.itemName}
                          </div>
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => {
                                setPickerRowId(
                                  pickerRowId === row.id ? null : row.id,
                                );
                                setPickerSearch("");
                              }}
                              className="flex h-[34px] w-full items-center justify-between rounded-[8px] border border-[#E6E6E3] bg-white px-3 text-[13px] text-[#2E2E2E]"
                            >
                              <span
                                className={cn(
                                  !selected && "text-[#8A8A8A]",
                                )}
                              >
                                {selected
                                  ? `${selected.distributor} / ${selected.source}`
                                  : "Select"}
                              </span>
                              <ChevronDown
                                size={14}
                                className="text-[#8D877F]"
                              />
                            </button>

                            {pickerRowId === row.id ? (
                              <div className="absolute top-[42px] left-0 z-20 w-[380px] overflow-hidden rounded-[10px] border border-[#ECECEA] bg-white shadow-xl">
                                <div className="border-b border-[#F0F0EE] p-2.5">
                                  <div className="relative">
                                    <Search
                                      size={12}
                                      className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[#B0ABA4]"
                                    />
                                    <Input
                                      value={pickerSearch}
                                      onChange={(event) =>
                                        setPickerSearch(event.target.value)
                                      }
                                      placeholder="Search"
                                      className="h-[30px] rounded-[8px] border-[#E6E6E3] pl-8 text-[12px]"
                                    />
                                  </div>
                                </div>
                                {filteredOptions.map((option) => (
                                  <button
                                    key={`${row.id}-${option.distributor}-${option.source}`}
                                    type="button"
                                    onClick={() => {
                                      updateRow(row.id, (current) => ({
                                        ...current,
                                        selectedOptionIndex:
                                          row.options.findIndex(
                                            (entry) =>
                                              entry.distributor ===
                                                option.distributor &&
                                              entry.source === option.source,
                                          ),
                                      }));
                                      setPickerRowId(null);
                                    }}
                                    className="grid w-full grid-cols-[1fr_1fr_auto] gap-3 border-b border-[#F3F3F1] px-3 py-3 text-left text-[13px] text-[#2E2E2E] last:border-b-0 hover:bg-[#FBF8F4]"
                                  >
                                    <span>{option.distributor}</span>
                                    <span className="text-[#67615A]">
                                      {option.source}
                                    </span>
                                    <span className="font-medium">
                                      {currencyExact(option.price)} /{" "}
                                      {option.unit}
                                    </span>
                                  </button>
                                ))}
                              </div>
                            ) : null}
                          </div>
                          <div className="text-[14px] text-[#2E2E2E]">
                            {selected
                              ? `${currencyExact(selected.price)} / ${selected.unit}`
                              : "—"}
                          </div>
                          <div className="text-[14px] text-[#2E2E2E]">
                            {selected?.qtyPerUnit ?? "—"}
                          </div>
                          <div className="text-[14px] text-[#2E2E2E]">
                            {row.custOrderTotal}
                          </div>
                          <div className="text-[14px] text-[#2E2E2E]">
                            {row.inStock ?? "—"}
                          </div>
                          <QtyStepper
                            value={row.quantity}
                            onChange={(quantity) =>
                              updateRow(row.id, (current) => ({
                                ...current,
                                quantity,
                              }))
                            }
                          />
                        </div>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <div className="flex-1 overflow-auto px-8 py-5">
              <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
                <div className="space-y-4">
                  {reviewGroups.map((group) => {
                    const ordered = orderedDistributors.has(group.distributor);
                    return (
                      <div
                        key={group.distributor}
                        className="rounded-[12px] border border-[#ECECEA] bg-white p-5"
                      >
                        <h3 className="mb-4 text-[24px] font-semibold tracking-tight text-[#2E2E2E]">
                          {group.distributor}
                        </h3>
                        <div className="space-y-3">
                          {group.items.map((item) => (
                            <div
                              key={`${group.distributor}-${item.itemName}`}
                              className="grid grid-cols-[1.5fr_1fr_0.5fr_0.9fr_0.8fr] gap-3 text-[13px]"
                            >
                              <div className="text-[#2E2E2E]">
                                {item.itemName}
                              </div>
                              <div className="text-[#8A8A8A]">
                                {item.source}
                              </div>
                              <div className="font-semibold text-[#2E2E2E]">
                                {item.quantity}x
                              </div>
                              <div className="text-[#2E2E2E]">
                                {currencyExact(item.price)} / {item.unit}
                              </div>
                              <div className="text-right font-semibold text-[#2E2E2E]">
                                {currencyExact(item.price * item.quantity)}
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="mt-6 flex items-center justify-between gap-4">
                          <div>
                            {ordered ? (
                              <div className="text-[13px] text-[#2E2E2E]">
                                <span className="mr-2 inline-flex size-4 items-center justify-center rounded-full bg-[#18BC33] text-white">
                                  <Check size={10} />
                                </span>
                                Order sent to email{" "}
                                <span className="font-medium">
                                  ranch@gmail.com
                                </span>
                                <span className="mx-2 text-[#C7C0B7]">·</span>
                                Expected delivery{" "}
                                <span className="font-semibold">
                                  Tue, Jul 12, 06:00–08:00 AM
                                </span>
                                <div className="mt-1 text-[12px] text-[#4A73FF]">
                                  Download order
                                </div>
                              </div>
                            ) : (
                              <div className="flex flex-wrap items-center gap-4">
                                <button
                                  type="button"
                                  onClick={() =>
                                    markDistributorOrdered(group.distributor)
                                  }
                                  className="rounded-[8px] px-4 py-2 text-[13px] font-medium text-white"
                                  style={{ background: ORANGE }}
                                >
                                  Order now
                                </button>
                                <span className="text-[13px] text-[#2E2E2E]">
                                  Expected delivery{" "}
                                  <span className="font-semibold">
                                    Tue, Jul 12, 06:00–08:00 AM
                                  </span>
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="text-[28px] font-semibold tracking-tight text-[#2E2E2E]">
                            {currencyExact(group.totalPrice)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {!reviewGroups.length ? (
                    <div className="rounded-[12px] border border-[#ECECEA] bg-white p-8 text-center text-[14px] text-[#8A8A8A]">
                      No items selected for review.
                    </div>
                  ) : null}
                </div>

                <div className="h-fit rounded-[12px] border border-[#ECECEA] bg-white p-4 xl:sticky xl:top-4">
                  <h3 className="mb-4 text-[20px] font-semibold tracking-tight text-[#2E2E2E]">
                    Order Summary
                  </h3>
                  <div className="space-y-4">
                    {reviewGroups.map((group) => (
                      <div
                        key={`${group.distributor}-summary`}
                        className="border-b border-[#F0F0EE] pb-4 last:border-b-0"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-[14px] font-semibold text-[#2E2E2E]">
                              {group.distributor}
                            </div>
                            <div className="text-[12px] text-[#8A8A8A]">
                              {group.itemCount} items
                            </div>
                          </div>
                          <div className="text-[14px] font-semibold text-[#2E2E2E]">
                            {currencyExact(group.totalPrice)}
                          </div>
                        </div>
                      </div>
                    ))}
                    <div className="flex items-center justify-between pt-2 text-[14px] font-semibold text-[#2E2E2E]">
                      <span>Total</span>
                      <span>{currencyExact(reviewGrandTotal)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="shrink-0 border-t border-[#ECECEA] bg-white px-8 py-4">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  if (view === "review") setView("orderList");
                  else setConfirmCloseOpen(true);
                }}
                className="inline-flex items-center gap-2 text-[14px] text-[#2E2E2E]"
              >
                {view === "review" ? (
                  <>
                    <ChevronLeft size={16} />
                    Back
                  </>
                ) : null}
              </button>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setConfirmCloseOpen(true)}
                  className="text-[14px] text-[#2E2E2E]"
                >
                  Cancel & Close
                </button>
                <button
                  type="button"
                  disabled={view === "orderList" && !canReviewOrderList}
                  onClick={() => {
                    if (view === "review") orderAllFromReview();
                    else setView("review");
                  }}
                  className="rounded-[8px] px-6 py-2.5 text-[14px] font-medium text-white disabled:opacity-50"
                  style={{ background: ORANGE }}
                >
                  {view === "review" ? "Order All" : "Review Order"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {view === "manualCreate" || view === "manualReview" ? (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#F5F5F3]">
          <div className="shrink-0 border-b border-[#ECECEA] bg-white px-8 py-5">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-[28px] font-semibold tracking-tight text-[#2E2E2E]">
                  {view === "manualReview"
                    ? "Review Order"
                    : "Create Manual Order"}
                </h2>
                {view === "manualReview" ? (
                  <p className="mt-1 text-[13px] text-[#8A8A8A]">
                    Orders for{" "}
                    <span className="font-semibold text-[#2E2E2E]">
                      {deliveryLabel} delivery
                    </span>
                  </p>
                ) : null}
              </div>
              <UserMenu showAvatar showBell={false} className="items-center" />
            </div>
          </div>

          {view === "manualCreate" ? (
            <div className="flex-1 overflow-auto px-8 py-5">
              <div className="mx-auto max-w-[980px] space-y-4">
                <div className="rounded-[12px] border border-[#ECECEA] bg-white p-5">
                  <label className="mb-2 block text-[12px] font-medium text-[#2E2E2E]">
                    Select Distributor
                  </label>
                  <Select
                    value={manualDistributor}
                    onChange={selectManualDistributor}
                    className="max-w-[320px] w-full"
                    aria-label="Select Distributor"
                    options={[
                      { value: "", label: "Select" },
                      ...MANUAL_DISTRIBUTORS.map((name) => ({
                        value: name,
                        label: name,
                      })),
                    ]}
                  />

                  {manualDistributor ? (
                    <>
                      <div className="mt-5 flex items-center justify-between">
                        <div className="text-[16px] font-semibold text-[#2E2E2E]">
                          Total: {currencyExact(manualTotal)}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setProductDraft(emptyProductDraft());
                            setProductModalOpen(true);
                          }}
                          className="inline-flex h-[34px] items-center gap-1.5 rounded-[8px] bg-[#242424] px-3.5 text-[13px] font-medium text-white"
                        >
                          <Plus size={14} />
                          Add Item
                        </button>
                      </div>

                      <div className="mt-4 text-[11px] font-semibold tracking-[0.06em] text-[#8A8A8A] uppercase">
                        Select Items From Source
                      </div>

                      <div className="mt-3 space-y-5">
                        {manualGroupedBySource.map(([source, lines]) => (
                          <div key={source}>
                            <h4 className="mb-2 text-[15px] font-semibold text-[#2E2E2E]">
                              {source}
                            </h4>
                            <div className="overflow-hidden rounded-[10px] border border-[#ECECEA]">
                              <div className="grid grid-cols-[90px_1.6fr_0.8fr_1fr_0.9fr] gap-3 border-b border-[#F0F0EE] bg-[#FAFAF8] px-4 py-2 text-[10px] font-semibold tracking-wide text-[#8A8A8A] uppercase">
                                <div>SKU</div>
                                <div>Item</div>
                                <div>In Stock</div>
                                <div>Price</div>
                                <div>Qty</div>
                              </div>
                              {lines.map((line) => (
                                <div
                                  key={line.id}
                                  className="grid grid-cols-[90px_1.6fr_0.8fr_1fr_0.9fr] items-center gap-3 border-b border-[#F3F3F1] px-4 py-3 text-[13px] last:border-b-0"
                                >
                                  <span className="w-fit rounded-[6px] bg-[#F3F3F1] px-1.5 py-0.5 font-mono text-[11px] text-[#6B6B6B]">
                                    {line.sku}
                                  </span>
                                  <div className="font-medium text-[#2E2E2E]">
                                    {line.name}
                                  </div>
                                  <div className="text-[#6B6B6B]">
                                    {line.inStock}
                                  </div>
                                  <div className="text-[#2E2E2E]">
                                    {currencyExact(line.price)} / {line.unit}
                                  </div>
                                  <QtyStepper
                                    value={line.quantity}
                                    onChange={(quantity) =>
                                      updateManualQty(line.id, quantity)
                                    }
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                        {!manualLines.length ? (
                          <div className="rounded-[10px] border border-dashed border-[#E6E6E3] px-4 py-8 text-center text-[13px] text-[#8A8A8A]">
                            No catalog items for this distributor. Add an item
                            to continue.
                          </div>
                        ) : null}
                      </div>
                    </>
                  ) : null}
                </div>

                <div className="rounded-[12px] border border-[#ECECEA] bg-white p-5">
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-[12px] font-medium text-[#2E2E2E]">
                        Select Delivery Date
                      </label>
                      <div className="relative">
                        <Calendar
                          size={14}
                          className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[#8A8A8A]"
                        />
                        <Input
                          type="date"
                          value={deliveryDate}
                          onChange={(event) =>
                            setDeliveryDate(event.target.value)
                          }
                          className="h-[36px] rounded-[8px] border-[#E6E6E3] pl-9 text-[13px]"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="mb-2 block text-[12px] font-medium text-[#2E2E2E]">
                        Select Time
                      </label>
                      <div className="space-y-2">
                        {TIME_SLOTS.map((slot) => (
                          <label
                            key={slot}
                            className="flex items-center gap-2 text-[13px] text-[#2E2E2E]"
                          >
                            <input
                              type="checkbox"
                              checked={selectedTimes.includes(slot)}
                              onChange={() => toggleTime(slot)}
                              className="size-4 rounded border-[#D1D1CF]"
                            />
                            {slot}
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-auto px-8 py-5">
              <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
                <div className="rounded-[12px] border border-[#ECECEA] bg-white p-5">
                  <h3 className="mb-4 text-[24px] font-semibold tracking-tight text-[#2E2E2E]">
                    {manualDistributor}
                  </h3>
                  <div className="space-y-3">
                    {manualLines
                      .filter((line) => line.quantity > 0)
                      .map((line) => (
                        <div
                          key={line.id}
                          className="grid grid-cols-[1.5fr_1fr_0.5fr_0.9fr_0.8fr] gap-3 text-[13px]"
                        >
                          <div className="text-[#2E2E2E]">{line.name}</div>
                          <div className="text-[#8A8A8A]">{line.source}</div>
                          <div className="font-semibold text-[#2E2E2E]">
                            {line.quantity}x
                          </div>
                          <div className="text-[#2E2E2E]">
                            {currencyExact(line.price)} / {line.unit}
                          </div>
                          <div className="text-right font-semibold text-[#2E2E2E]">
                            {currencyExact(line.price * line.quantity)}
                          </div>
                        </div>
                      ))}
                  </div>
                  <div className="mt-6 flex items-center justify-between">
                    <div className="text-[13px] text-[#2E2E2E]">
                      Expected delivery{" "}
                      <span className="font-semibold">
                        {expectedDeliveryText}
                      </span>
                    </div>
                    <div className="text-[28px] font-semibold tracking-tight text-[#2E2E2E]">
                      {currencyExact(manualTotal)}
                    </div>
                  </div>
                </div>

                <div className="h-fit rounded-[12px] border border-[#ECECEA] bg-white p-4 xl:sticky xl:top-4">
                  <h3 className="mb-4 text-[20px] font-semibold tracking-tight text-[#2E2E2E]">
                    Order Summary
                  </h3>
                  <div className="flex items-start justify-between gap-3 border-b border-[#F0F0EE] pb-4">
                    <div>
                      <div className="text-[14px] font-semibold text-[#2E2E2E]">
                        {manualDistributor}
                      </div>
                      <div className="text-[12px] text-[#8A8A8A]">
                        {manualLines
                          .filter((line) => line.quantity > 0)
                          .reduce((sum, line) => sum + line.quantity, 0)}{" "}
                        items
                      </div>
                    </div>
                    <div className="text-[14px] font-semibold text-[#2E2E2E]">
                      {currencyExact(manualTotal)}
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between text-[14px] font-semibold text-[#2E2E2E]">
                    <span>Total</span>
                    <span>{currencyExact(manualTotal)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="shrink-0 border-t border-[#ECECEA] bg-white px-8 py-4">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  if (view === "manualReview") setView("manualCreate");
                  else setConfirmCloseOpen(true);
                }}
                className="inline-flex items-center gap-2 text-[14px] text-[#2E2E2E]"
              >
                {view === "manualReview" ? (
                  <>
                    <ChevronLeft size={16} />
                    Back
                  </>
                ) : null}
              </button>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setConfirmCloseOpen(true)}
                  className="text-[14px] text-[#2E2E2E]"
                >
                  Cancel & Close
                </button>
                <button
                  type="button"
                  disabled={
                    view === "manualCreate"
                      ? !canReviewManual
                      : !canReviewManual
                  }
                  onClick={() => {
                    if (view === "manualReview") finalizeManualOrder();
                    else setView("manualReview");
                  }}
                  className="rounded-[8px] px-6 py-2.5 text-[14px] font-medium text-white disabled:opacity-50"
                  style={{ background: ORANGE }}
                >
                  {view === "manualReview" ? "Create Order" : "Review Order"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {productModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:items-center sm:p-6">
          <button
            type="button"
            aria-label="Close dialog overlay"
            className="absolute inset-0 bg-[#333333]/70"
            onClick={() => setProductModalOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            className="relative z-10 flex w-full max-w-[640px] flex-col overflow-hidden rounded-[12px] bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-[#F0F0EE] px-6 py-4">
              <h2 className="text-[18px] font-semibold text-[#2E2E2E]">
                Create a New Product
              </h2>
              <button
                type="button"
                onClick={() => setProductModalOpen(false)}
                aria-label="Close"
                className="rounded-md p-1 text-[#8A8A8A] hover:bg-[#F5F5F3]"
              >
                <X size={18} />
              </button>
            </div>

            <div className="max-h-[calc(100dvh-10rem)] overflow-y-auto px-6 py-5">
              <section>
                <h3 className="mb-3 text-[11px] font-semibold tracking-[0.06em] text-[#8A8A8A] uppercase">
                  Product Information
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-[12px] font-medium text-[#2E2E2E]">
                      Item Name
                    </label>
                    <Input
                      value={productDraft.name}
                      onChange={(event) =>
                        setProductDraft((current) => ({
                          ...current,
                          name: event.target.value,
                        }))
                      }
                      placeholder="e.g., Beef Ribeye Steak"
                      className="h-[36px] rounded-[8px] border-[#E6E6E3] text-[13px]"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[12px] font-medium text-[#2E2E2E]">
                      SKU #
                    </label>
                    <Input
                      value={productDraft.sku}
                      onChange={(event) =>
                        setProductDraft((current) => ({
                          ...current,
                          sku: event.target.value,
                        }))
                      }
                      placeholder="e.g., BEEF-RIB-001"
                      className="h-[36px] rounded-[8px] border-[#E6E6E3] text-[13px]"
                    />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-[12px] font-medium text-[#2E2E2E]">
                        Category
                      </label>
                      <Select
                        value={productDraft.topCategory}
                        onChange={(top) => {
                          const firstSub = TOP_CATEGORIES[top]?.[0] ?? "Meat";
                          setProductDraft((current) => ({
                            ...current,
                            topCategory: top,
                            subcategory: firstSub,
                          }));
                        }}
                        className="w-full"
                        aria-label="Category"
                        options={Object.keys(TOP_CATEGORIES).map((category) => ({
                          value: category,
                          label: category,
                        }))}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[12px] font-medium text-[#2E2E2E]">
                        Subcategory
                      </label>
                      <Select
                        value={productDraft.subcategory}
                        onChange={(value) =>
                          setProductDraft((current) => ({
                            ...current,
                            subcategory: value,
                          }))
                        }
                        className="w-full"
                        aria-label="Subcategory"
                        options={(TOP_CATEGORIES[productDraft.topCategory] ?? []).map(
                          (category) => ({
                            value: category,
                            label: category,
                          }),
                        )}
                      />
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-[12px] font-medium text-[#2E2E2E]">
                        Selling Unit
                      </label>
                      <Select
                        value={productDraft.unit}
                        onChange={(value) =>
                          setProductDraft((current) => ({
                            ...current,
                            unit: value,
                          }))
                        }
                        className="w-full"
                        aria-label="Selling Unit"
                        options={["lb", "case", "box", "ea", "pack"].map(
                          (unit) => ({
                            value: unit,
                            label: unit,
                          }),
                        )}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[12px] font-medium text-[#2E2E2E]">
                        Selling Price
                      </label>
                      <div className="relative">
                        <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[13px] text-[#8A8A8A]">
                          $
                        </span>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={productDraft.sellingPrice}
                          onChange={(event) =>
                            setProductDraft((current) => ({
                              ...current,
                              sellingPrice: event.target.value,
                            }))
                          }
                          placeholder="0.00"
                          className="h-[36px] rounded-[8px] border-[#E6E6E3] pl-7 text-[13px]"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between rounded-[8px] border border-[#ECECEA] bg-[#FAFAF8] px-4 py-3">
                    <div>
                      <div className="text-[13px] font-medium text-[#2E2E2E]">
                        Publish Live to App
                      </div>
                      <div className="text-[12px] text-[#8A8A8A]">
                        This item will be visible to customers.
                      </div>
                    </div>
                    <button
                      type="button"
                      aria-label="Toggle publish live"
                      onClick={() =>
                        setProductDraft((current) => ({
                          ...current,
                          live: !current.live,
                        }))
                      }
                      className={cn(
                        "relative inline-flex h-6 w-11 shrink-0 rounded-full transition",
                        productDraft.live ? "bg-[#3CB371]" : "bg-[#D1D1CF]",
                      )}
                    >
                      <span
                        className={cn(
                          "inline-block size-5 translate-y-0.5 rounded-full bg-white transition",
                          productDraft.live
                            ? "translate-x-5"
                            : "translate-x-0.5",
                        )}
                      />
                    </button>
                  </div>
                </div>
              </section>

              <section className="mt-6">
                <h3 className="mb-3 text-[11px] font-semibold tracking-[0.06em] text-[#8A8A8A] uppercase">
                  Source Under {manualDistributor || "Distributor"}
                </h3>
                <div className="rounded-[10px] border border-[#ECECEA] bg-[#FAFAF8] p-4">
                  <div className="mb-3 text-[14px] font-semibold text-[#2E2E2E]">
                    {manualDistributor || "Select a distributor"}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-[11px] text-[#8A8A8A]">
                        Source Name
                      </label>
                      <Input
                        value={productDraft.sourceName}
                        onChange={(event) =>
                          setProductDraft((current) => ({
                            ...current,
                            sourceName: event.target.value,
                          }))
                        }
                        className="h-[36px] rounded-[8px] border-[#E6E6E3] bg-white text-[13px]"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] text-[#8A8A8A]">
                        Price
                      </label>
                      <div className="relative">
                        <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[13px] text-[#8A8A8A]">
                          $
                        </span>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={productDraft.price}
                          onChange={(event) =>
                            setProductDraft((current) => ({
                              ...current,
                              price: event.target.value,
                            }))
                          }
                          className="h-[36px] rounded-[8px] border-[#E6E6E3] bg-white pl-7 text-[13px]"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] text-[#8A8A8A]">
                        Price of Unit
                      </label>
                      <div className="relative">
                        <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[13px] text-[#8A8A8A]">
                          $
                        </span>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={productDraft.priceOfUnit}
                          onChange={(event) =>
                            setProductDraft((current) => ({
                              ...current,
                              priceOfUnit: event.target.value,
                            }))
                          }
                          className="h-[36px] rounded-[8px] border-[#E6E6E3] bg-white pl-7 text-[13px]"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] text-[#8A8A8A]">
                        QTY per Unit
                      </label>
                      <Input
                        type="number"
                        min="1"
                        value={productDraft.qtyPerUnit}
                        onChange={(event) =>
                          setProductDraft((current) => ({
                            ...current,
                            qtyPerUnit: event.target.value,
                          }))
                        }
                        className="h-[36px] rounded-[8px] border-[#E6E6E3] bg-white text-[13px]"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] text-[#8A8A8A]">
                        Net Cost
                      </label>
                      <Input
                        readOnly
                        value={productNetCost.toFixed(2)}
                        className="h-[36px] rounded-[8px] border-[#E6E6E3] bg-[#F3F3F1] text-[13px] text-[#6B6B6B]"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] text-[#8A8A8A]">
                        Item Unit
                      </label>
                      <Select
                        value={productDraft.itemUnit}
                        onChange={(value) =>
                          setProductDraft((current) => ({
                            ...current,
                            itemUnit: value,
                          }))
                        }
                        className="w-full"
                        aria-label="Item Unit"
                        options={["lb", "case", "box", "ea", "pack"].map(
                          (unit) => ({
                            value: unit,
                            label: unit,
                          }),
                        )}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] text-[#8A8A8A]">
                        Margin %
                      </label>
                      <Input
                        readOnly
                        value={productMargin.toFixed(1)}
                        className="h-[36px] rounded-[8px] border-[#E6E6E3] bg-[#F3F3F1] text-[13px] text-[#6B6B6B]"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] text-[#8A8A8A]">
                        Calculated Price
                      </label>
                      <Input
                        readOnly
                        value={(Number(productDraft.sellingPrice) || 0).toFixed(
                          2,
                        )}
                        className="h-[36px] rounded-[8px] border-[#E6E6E3] bg-[#F3F3F1] text-[13px] text-[#6B6B6B]"
                      />
                    </div>
                  </div>
                </div>
              </section>
            </div>

            <div className="flex items-center justify-between border-t border-[#F0F0EE] px-6 py-4">
              <button
                type="button"
                onClick={() => setProductModalOpen(false)}
                className="text-[13px] font-medium text-[#8A8A8A]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={createProductFromModal}
                disabled={
                  !productDraft.name.trim() || !productDraft.sku.trim()
                }
                className={cn(
                  "h-[36px] rounded-[8px] px-5 text-[13px] font-medium text-white",
                  productDraft.name.trim() && productDraft.sku.trim()
                    ? "bg-[#242424]"
                    : "bg-[#C8C8C6]",
                )}
              >
                Create Item
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {confirmCloseOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4">
          <div className="w-full max-w-[520px] overflow-hidden rounded-[14px] bg-white shadow-2xl">
            <div className="px-5 py-5">
              <h3 className="text-[28px] font-semibold tracking-tight text-[#2E2E2E]">
                Cancel and Close Order
              </h3>
              <p className="mt-2 text-[14px] text-[#4C4742]">
                Are you sure you want to close order request?
              </p>
            </div>
            <div className="border-t border-[#ECECEA] px-5 py-3">
              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setConfirmCloseOpen(false)}
                  className="text-[14px] text-[#8A847C]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={resetToList}
                  className="rounded-[10px] bg-[#242424] px-5 py-2.5 text-[14px] font-medium text-white"
                >
                  Cancel Order
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {toastVisible ? (
        <div className="fixed right-8 bottom-8 z-50 rounded-[10px] bg-[#13BF2E] px-7 py-4 text-[14px] font-medium text-white shadow-lg">
          <span className="mr-2 inline-flex size-4 items-center justify-center rounded-full bg-white/20">
            <Check size={11} />
          </span>
          Orders Created
        </div>
      ) : null}
    </div>
  );
}

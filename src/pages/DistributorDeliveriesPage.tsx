import { useMemo, useState } from "react";
import {
  Calendar,
  Camera,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Search,
  X,
} from "lucide-react";

import { UserMenu } from "@/components/layout/UserMenu";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { cn } from "@/utils/cn";

const ORANGE = "#F57850";
const GREEN = "#28402B";

type DeliveryChip = { id: string; label: string; count: number };

type LineItem = {
  id: string;
  itemCode: string;
  name: string;
  category: "Meat" | "Fruits";
  quantity: number;
  unit: string;
  source: string;
  unitPrice: number;
  priceLabel: string;
};

type DeliveryOrder = {
  id: string;
  distributor: string;
  orderDate: string;
  expectedDelivery: string;
  totalPrice: number;
  checked: boolean;
  items: LineItem[];
};

type RejectReason =
  | "Wrong Item"
  | "Damaged"
  | "Not Fresh"
  | "Missing Exp Date";

type ItemCheckState = {
  status: "pending" | "accepted" | "rejected";
  expiration: string;
  itemId: string;
  reason?: RejectReason;
};

const DELIVERY_CHIPS: DeliveryChip[] = [
  { id: "wed-14", label: "Wed, Jul 14", count: 13 },
  { id: "wed-20", label: "Wed, Jul 20", count: 7 },
  { id: "wed-27", label: "Wed, Jul 27", count: 3 },
];

const REJECT_REASONS: RejectReason[] = [
  "Wrong Item",
  "Damaged",
  "Not Fresh",
  "Missing Exp Date",
];

const INITIAL_ORDERS: DeliveryOrder[] = [
  {
    id: "DP-1043",
    distributor: "4PF Co.",
    orderDate: "Jul 16, 12:34 PM",
    expectedDelivery: "Jul 18, 8:00 AM",
    totalPrice: 480,
    checked: false,
    items: [
      {
        id: "li-1",
        itemCode: "ID-002-02",
        name: "Angus Chuck Ground Beef",
        category: "Meat",
        quantity: 1,
        unit: "Case",
        source: "Lena Hoffman",
        unitPrice: 125,
        priceLabel: "$125/case",
      },
      {
        id: "li-2",
        itemCode: "ID-001-10",
        name: "Rib-eye Steak",
        category: "Meat",
        quantity: 1,
        unit: "Case",
        source: "Lena Hoffman",
        unitPrice: 90,
        priceLabel: "$90/case",
      },
      {
        id: "li-3",
        itemCode: "ID-001-11",
        name: "Rib-eye Steak",
        category: "Meat",
        quantity: 1,
        unit: "Case",
        source: "Lena Hoffman",
        unitPrice: 90,
        priceLabel: "$90/case",
      },
      {
        id: "li-4",
        itemCode: "ID-001-12",
        name: "Rib-eye Steak",
        category: "Meat",
        quantity: 1,
        unit: "Case",
        source: "Lena Hoffman",
        unitPrice: 90,
        priceLabel: "$90/case",
      },
      {
        id: "li-5",
        itemCode: "ID-015-03",
        name: "Legion Fields Whole Chicken",
        category: "Meat",
        quantity: 1,
        unit: "Case",
        source: "Lena Hoffman",
        unitPrice: 50,
        priceLabel: "$50/case",
      },
      {
        id: "li-6",
        itemCode: "ID-015-04",
        name: "Legion Fields Whole Chicken",
        category: "Meat",
        quantity: 1,
        unit: "Case",
        source: "Lena Hoffman",
        unitPrice: 50,
        priceLabel: "$50/case",
      },
    ],
  },
  {
    id: "DP-1044",
    distributor: "Tropical Produce LLC",
    orderDate: "Jul 16, 12:34 PM",
    expectedDelivery: "Jul 18, 8:00 AM",
    totalPrice: 101.25,
    checked: false,
    items: [
      {
        id: "li-7",
        itemCode: "ID-020-01",
        name: "Lemons",
        category: "Fruits",
        quantity: 4,
        unit: "Box",
        source: "Omara Okafor",
        unitPrice: 6,
        priceLabel: "$6/box",
      },
      {
        id: "li-8",
        itemCode: "ID-020-02",
        name: "Blueberries",
        category: "Fruits",
        quantity: 2,
        unit: "Box",
        source: "Omara Okafor",
        unitPrice: 32,
        priceLabel: "$32/box",
      },
    ],
  },
  {
    id: "DP-1045",
    distributor: "Rancho Protein LLC",
    orderDate: "Jul 16, 12:34 PM",
    expectedDelivery: "Jul 18, 8:00 AM",
    totalPrice: 101.25,
    checked: false,
    items: [
      {
        id: "li-9",
        itemCode: "ID-002-02",
        name: "Angus Chuck Ground Beef",
        category: "Meat",
        quantity: 1,
        unit: "Case",
        source: "Lena Hoffman",
        unitPrice: 125,
        priceLabel: "$125/case",
      },
      {
        id: "li-10",
        itemCode: "ID-001-10",
        name: "Rib-eye Steak",
        category: "Meat",
        quantity: 1,
        unit: "Case",
        source: "Lena Hoffman",
        unitPrice: 90,
        priceLabel: "$90/case",
      },
      {
        id: "li-11",
        itemCode: "ID-015-03",
        name: "Legion Fields Whole Chicken",
        category: "Meat",
        quantity: 1,
        unit: "Case",
        source: "Lena Hoffman",
        unitPrice: 50,
        priceLabel: "$50/case",
      },
      {
        id: "li-12",
        itemCode: "ID-021-01",
        name: "Blueberries",
        category: "Fruits",
        quantity: 1,
        unit: "Box",
        source: "FreshMarket Co.",
        unitPrice: 12.5,
        priceLabel: "$12.50/box",
      },
      {
        id: "li-13",
        itemCode: "ID-021-02",
        name: "Blueberries",
        category: "Fruits",
        quantity: 1,
        unit: "Box",
        source: "FreshMarket Co.",
        unitPrice: 12.5,
        priceLabel: "$12.50/box",
      },
    ],
  },
];

function currency(value: number) {
  return `$${value.toLocaleString(undefined, {
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

function emptyChecks(items: LineItem[]): Record<string, ItemCheckState> {
  return Object.fromEntries(
    items.map((item) => [
      item.id,
      {
        status: "pending" as const,
        expiration: "",
        itemId: item.itemCode,
      },
    ]),
  );
}

function CheckOrderView({
  order,
  onClose,
  onAccepted,
}: {
  order: DeliveryOrder;
  onClose: () => void;
  onAccepted: (orderId: string, checks: Record<string, ItemCheckState>) => void;
}) {
  const [checks, setChecks] = useState(() => emptyChecks(order.items));
  const [rejectFor, setRejectFor] = useState<string | null>(null);
  const [phase, setPhase] = useState<"check" | "review">("check");

  const categories = useMemo(() => {
    const map = new Map<string, LineItem[]>();
    order.items.forEach((item) => {
      if (!map.has(item.category)) map.set(item.category, []);
      map.get(item.category)!.push(item);
    });
    return Array.from(map.entries());
  }, [order.items]);

  const allResolved = order.items.every(
    (item) => checks[item.id]?.status !== "pending",
  );

  function updateCheck(id: string, patch: Partial<ItemCheckState>) {
    setChecks((current) => ({
      ...current,
      [id]: { ...current[id], ...patch },
    }));
  }

  const col =
    "grid-cols-[minmax(180px,1.4fr)_48px_64px_minmax(140px,1fr)_minmax(120px,0.9fr)_minmax(200px,1.1fr)]";

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#F5F5F3]">
      <div className="shrink-0 border-b border-[#ECECEA] bg-white px-7 pt-5 pb-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[22px] font-semibold tracking-tight text-[#2E2E2E]">
              Check Order
            </h1>
            <p className="mt-1 text-[13px] text-[#8A8A8A]">
              From{" "}
              <span className="font-medium text-[#2E2E2E]">
                {order.distributor}
              </span>
            </p>
          </div>
          <UserMenu showAvatar className="items-center" />
        </div>
      </div>

      <div className="flex-1 overflow-auto px-7 py-5">
        <div className="space-y-5">
          {categories.map(([category, items]) => (
            <section key={category}>
              <h2 className="mb-3 text-[16px] font-semibold text-[#2E2E2E]">
                {category}
              </h2>
              <div className="overflow-hidden rounded-[10px] border border-[#ECECEA] bg-white">
                <div
                  className={cn(
                    "grid gap-3 border-b border-[#F0F0EE] bg-[#FAFAF8] px-4 py-2.5 text-[10px] font-semibold tracking-[0.04em] text-[#8A8A8A] uppercase",
                    col,
                  )}
                >
                  <span>Item Name</span>
                  <span>Qty</span>
                  <span>Unit</span>
                  <span>Expiration Date</span>
                  <span>{category === "Fruits" ? "Item ID" : "Order ID"}</span>
                  <span>Actions</span>
                </div>

                {items.map((item) => {
                  const state = checks[item.id];
                  return (
                    <div
                      key={item.id}
                      className={cn(
                        "relative grid items-center gap-3 border-b border-[#F3F3F1] px-4 py-3 last:border-b-0",
                        col,
                      )}
                    >
                      <span className="text-[13px] font-medium text-[#2E2E2E]">
                        {item.name}
                      </span>
                      <span className="text-[13px] text-[#2E2E2E]">
                        {item.quantity}
                      </span>
                      <span className="text-[13px] text-[#2E2E2E]">
                        {item.unit}
                      </span>
                      <div className="relative">
                        <Calendar
                          size={13}
                          className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-[#A9A9A9]"
                        />
                        <input
                          type="text"
                          value={state.expiration}
                          onChange={(event) =>
                            updateCheck(item.id, {
                              expiration: event.target.value,
                            })
                          }
                          placeholder="Select"
                          className="h-9 w-full rounded-[8px] border border-[#E6E6E3] bg-white pr-3 pl-8 text-[12px] text-[#2E2E2E] outline-none placeholder:text-[#A9A9A9]"
                        />
                      </div>
                      <input
                        type="text"
                        value={state.itemId}
                        onChange={(event) =>
                          updateCheck(item.id, { itemId: event.target.value })
                        }
                        className="h-9 w-full rounded-[8px] border border-[#E6E6E3] bg-white px-3 text-[12px] text-[#2E2E2E] outline-none"
                      />
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          className="text-[13px] font-medium text-[#3B82F6]"
                        >
                          Print
                        </button>

                        {state.status === "accepted" ? (
                          <>
                            <button
                              type="button"
                              className="text-[13px] font-medium text-[#3B82F6]"
                              onClick={() =>
                                updateCheck(item.id, {
                                  status: "pending",
                                  reason: undefined,
                                })
                              }
                            >
                              Reject
                            </button>
                            <span className="inline-flex size-6 items-center justify-center rounded-full bg-[#2F8F4E] text-white">
                              <Check size={13} strokeWidth={3} />
                            </span>
                          </>
                        ) : state.status === "rejected" ? (
                          <>
                            <button
                              type="button"
                              className="text-[13px] font-medium text-[#3B82F6]"
                              onClick={() =>
                                updateCheck(item.id, {
                                  status: "accepted",
                                  reason: undefined,
                                })
                              }
                            >
                              Accept
                            </button>
                            <span className="inline-flex size-6 items-center justify-center rounded-full bg-[#E25B5B] text-white">
                              <X size={13} strokeWidth={3} />
                            </span>
                          </>
                        ) : (
                          <>
                            <div className="relative">
                              <button
                                type="button"
                                className="text-[13px] font-medium text-[#3B82F6]"
                                onClick={() =>
                                  setRejectFor(
                                    rejectFor === item.id ? null : item.id,
                                  )
                                }
                              >
                                Reject
                              </button>
                              {rejectFor === item.id ? (
                                <div className="absolute top-7 left-0 z-20 w-[240px] rounded-[10px] border border-[#ECECEA] bg-white p-3 shadow-xl">
                                  <div className="mb-2 text-[12px] font-semibold text-[#2E2E2E]">
                                    Reason
                                  </div>
                                  <div className="flex flex-wrap gap-1.5">
                                    {REJECT_REASONS.map((reason) => (
                                      <button
                                        key={reason}
                                        type="button"
                                        onClick={() => {
                                          updateCheck(item.id, {
                                            status: "rejected",
                                            reason,
                                          });
                                          setRejectFor(null);
                                        }}
                                        className={cn(
                                          "rounded-full border px-2.5 py-1 text-[11px]",
                                          reason === "Missing Exp Date"
                                            ? "border-[#E25B5B] bg-[#FDECEC] font-medium text-[#E25B5B]"
                                            : "border-transparent bg-[#F3F3F1] text-[#6B6B6B]",
                                        )}
                                      >
                                        {reason}
                                      </button>
                                    ))}
                                  </div>
                                  <button
                                    type="button"
                                    className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-[8px] border border-[#E6E6E3] px-3 py-2 text-[12px] font-medium text-[#2E2E2E]"
                                  >
                                    <Camera size={13} />
                                    Take photo of problem
                                  </button>
                                </div>
                              ) : null}
                            </div>
                            <button
                              type="button"
                              className="text-[13px] font-medium text-[#3B82F6]"
                              onClick={() =>
                                updateCheck(item.id, { status: "accepted" })
                              }
                            >
                              Accept
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-end gap-5 border-t border-[#ECECEA] bg-white px-7 py-4">
        <button
          type="button"
          onClick={onClose}
          className="text-[14px] font-medium text-[#8A8A8A]"
        >
          Cancel & Close
        </button>
        {phase === "check" ? (
          <button
            type="button"
            disabled={!allResolved}
            onClick={() => setPhase("review")}
            className="rounded-[8px] px-5 py-2.5 text-[14px] font-semibold text-white disabled:opacity-40"
            style={{ background: ORANGE }}
          >
            Review Order
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onAccepted(order.id, checks)}
            className="rounded-[8px] px-5 py-2.5 text-[14px] font-semibold text-white"
            style={{ background: ORANGE }}
          >
            Accept Order
          </button>
        )}
      </div>
    </div>
  );
}

const ROW_GRID =
  "grid grid-cols-[28px_100px_minmax(140px,1.2fr)_130px_140px_90px_110px] items-center gap-2";

export default function DistributorDeliveriesPage() {
  useDocumentTitle("Distributor Receiving");

  const [activeTab, setActiveTab] = useState<"Orders" | "Received">("Orders");
  const [activeChip, setActiveChip] = useState("wed-20");
  const [search, setSearch] = useState("");
  const [productFilter, setProductFilter] = useState("");
  const [distributorFilter, setDistributorFilter] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(["DP-1043"]),
  );
  const [orders, setOrders] = useState(INITIAL_ORDERS);
  const [checkingId, setCheckingId] = useState<string | null>(null);
  const [itemResults, setItemResults] = useState<
    Record<string, Record<string, ItemCheckState>>
  >({});

  const checkingOrder =
    orders.find((order) => order.id === checkingId) ?? null;

  const productOptions = useMemo(
    () =>
      Array.from(
        new Set(orders.flatMap((order) => order.items.map((item) => item.name))),
      ).sort(),
    [orders],
  );

  const distributorOptions = useMemo(
    () =>
      Array.from(new Set(orders.map((order) => order.distributor))).sort(),
    [orders],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter((order) => {
      const matchesTab =
        activeTab === "Orders" ? !order.checked : order.checked;
      const matchesSearch =
        !q ||
        order.id.toLowerCase().includes(q) ||
        order.distributor.toLowerCase().includes(q);
      const matchesProduct =
        !productFilter ||
        order.items.some((item) => item.name === productFilter);
      const matchesDistributor =
        !distributorFilter || order.distributor === distributorFilter;
      return (
        matchesTab && matchesSearch && matchesProduct && matchesDistributor
      );
    });
  }, [activeTab, distributorFilter, orders, productFilter, search]);

  function toggleExpanded(id: string) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleAccepted(
    orderId: string,
    checks: Record<string, ItemCheckState>,
  ) {
    setOrders((current) =>
      current.map((order) =>
        order.id === orderId ? { ...order, checked: true } : order,
      ),
    );
    setItemResults((current) => ({ ...current, [orderId]: checks }));
    setCheckingId(null);
    setActiveTab("Received");
    setExpanded(new Set([orderId]));
  }

  if (checkingOrder) {
    return (
      <CheckOrderView
        order={checkingOrder}
        onClose={() => setCheckingId(null)}
        onAccepted={handleAccepted}
      />
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#F5F5F3]">
      <div className="shrink-0 border-b border-[#ECECEA] bg-white">
        <div className="px-7 pt-5">
          <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-4">
            <h1 className="text-[22px] font-semibold tracking-tight text-[#2E2E2E]">
              Distributor Receiving
            </h1>

            <div className="flex items-center gap-8">
              {(["Orders", "Received"] as const).map((tab) => (
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

            <div className="flex flex-col items-end gap-1">
              <UserMenu showAvatar className="items-center" />
              <div className="text-[12px] text-[#8A8A8A]">
                Today, Tue, Jun 22, 2026
              </div>
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

            <Select
              value={productFilter}
              onChange={setProductFilter}
              aria-label="All products"
              options={[
                { value: "", label: "All products" },
                ...productOptions.map((name) => ({
                  value: name,
                  label: name,
                })),
              ]}
            />
            <Select
              value={distributorFilter}
              onChange={setDistributorFilter}
              aria-label="All Distributors"
              options={[
                { value: "", label: "All Distributors" },
                ...distributorOptions.map((name) => ({
                  value: name,
                  label: name,
                })),
              ]}
            />

            <div className="ml-auto text-[12px] text-[#8A8A8A]">
              Today, Tue, Jun 22, 2026
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {DELIVERY_CHIPS.map((chip) => {
              const active = activeChip === chip.id;
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
                  <span className="text-[13px] font-semibold">{chip.label}</span>
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

            <div className="ml-auto flex items-center gap-2">
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
                className="flex size-9 items-center justify-center rounded-full border border-[#ECECEA] bg-white text-[#8A8A8A]"
              >
                <Calendar size={15} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-7 py-5">
        <h2 className="mb-3 text-[20px] font-semibold text-[#2E2E2E]">
          Receiving Log
        </h2>

        <div className="overflow-hidden rounded-[10px] border border-[#ECECEA] bg-white">
          <div
            className={cn(
              ROW_GRID,
              "border-b border-[#F0F0EE] bg-[#FAFAF8] px-4 py-2.5 text-[10px] font-semibold tracking-[0.04em] text-[#8A8A8A] uppercase",
            )}
          >
            <div />
            <div>Delivery ID</div>
            <div>Distributor</div>
            <div>Order Date</div>
            <div>Expected Delivery</div>
            <div>Total Price</div>
            <div>Action</div>
          </div>

          {filtered.map((order) => {
            const open = expanded.has(order.id);
            const results = itemResults[order.id];

            return (
              <div
                key={order.id}
                className="border-b border-[#F3F3F1] last:border-b-0"
              >
                <div
                  className={cn(
                    ROW_GRID,
                    "px-4 py-3.5",
                    open && "bg-[#F7FBFF]",
                  )}
                >
                  <button
                    type="button"
                    aria-label={open ? "Collapse" : "Expand"}
                    onClick={() => toggleExpanded(order.id)}
                    className="flex justify-center text-[#F57850]"
                  >
                    <ChevronDown
                      size={15}
                      className={cn(
                        "transition-transform",
                        open ? "rotate-0" : "-rotate-90",
                      )}
                    />
                  </button>

                  <span className="w-fit rounded-[6px] bg-[#F3F3F1] px-1.5 py-0.5 font-mono text-[11px] font-medium text-[#6B6B6B]">
                    {order.id}
                  </span>
                  <span className="text-[14px] font-semibold text-[#2E2E2E]">
                    {order.distributor}
                  </span>
                  <span className="text-[13px] text-[#6B6B6B]">
                    {order.orderDate}
                  </span>
                  <span className="text-[13px] text-[#6B6B6B]">
                    {order.expectedDelivery}
                  </span>
                  <span className="text-[13px] font-semibold text-[#2E2E2E]">
                    {currency(order.totalPrice)}
                  </span>
                  <div>
                    {order.checked ? (
                      <button
                        type="button"
                        onClick={() => toggleExpanded(order.id)}
                        className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#3B82F6]"
                      >
                        View
                        <span className="inline-flex size-4 items-center justify-center rounded-full bg-[#2F8F4E] text-white">
                          <Check size={10} strokeWidth={3} />
                        </span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setCheckingId(order.id)}
                        className="text-[13px] font-medium text-[#3B82F6]"
                      >
                        Validate
                      </button>
                    )}
                  </div>
                </div>

                {open ? (
                  <div className="border-t border-[#ECECEA] bg-[#FAFAF8]">
                    {order.items.map((item) => {
                      const result = results?.[item.id];
                      const rejected = result?.status === "rejected";

                      return (
                        <div
                          key={item.id}
                          className={cn(
                            ROW_GRID,
                            "border-b border-[#F3F3F1] px-4 py-2.5 text-[12px] last:border-b-0",
                          )}
                        >
                          <div />
                          <span className="w-fit rounded-[6px] bg-[#EEEEEC] px-1.5 py-0.5 font-mono text-[10px] text-[#6B6B6B]">
                            {result?.itemId ?? item.itemCode}
                          </span>
                          <div
                            className={cn(
                              "font-medium",
                              rejected ? "text-[#E25B5B]" : "text-[#2E2E2E]",
                            )}
                          >
                            {item.name}
                          </div>
                          <div className="text-[#6B6B6B]">{item.source}</div>
                          <div />
                          <div>
                            {rejected && result?.reason ? (
                              <span className="font-medium text-[#E25B5B]">
                                Rejected · {result.reason}
                              </span>
                            ) : (
                              <span className="text-[#2E2E2E]">
                                {item.priceLabel}
                              </span>
                            )}
                          </div>
                          <div>
                            {rejected ? (
                              <button
                                type="button"
                                className="text-[12px] font-medium text-[#3B82F6]"
                              >
                                Image
                              </button>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          })}

          {!filtered.length ? (
            <div className="px-6 py-12 text-center text-[14px] text-[#8A8A8A]">
              No deliveries match your filters.
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

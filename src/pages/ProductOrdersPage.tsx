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
  X,
} from "lucide-react";

import { CreateManualOrderFlow } from "@/components/orders/CreateManualOrderFlow";
import { UserMenu } from "@/components/layout/UserMenu";
import { Input } from "@/components/ui/Input";
import { ScrollTable } from "@/components/ui/ScrollTable";
import { Select } from "@/components/ui/Select";
import {
  DELIVERED_ORDERS,
  DELIVERY_CHIPS,
  DELIVERY_LABEL,
  DISTRIBUTOR_EMAILS,
  EXPECTED_DELIVERY,
  MAIN_ORDER_PREVIEW,
  ORDER_CATEGORIES,
  ORDER_LIST_ITEMS,
  SEED_IN_PROGRESS,
} from "@/constants/distributorOrders";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useScrollLock } from "@/hooks/useScrollLock";
import type {
  OrderCategory,
  PlacedOrder,
  ReviewGroup,
  WorkingOrderRow,
} from "@/types/distributorOrder";
import { cn } from "@/utils/cn";

const ORANGE = "#F57850";
const GREEN = "#28402B";
const LINK = "text-[13px] font-medium text-[#3B7DC4] hover:underline";
/** Shared by review item rows + vendor footer so line totals align with vendor total. Trailing track nudges the price cluster left. */
const REVIEW_VENDOR_COLS =
  "grid-cols-[minmax(0,1fr)_minmax(0,1fr)_40px_110px_72px_minmax(2.75rem,0.2fr)]";

type View = "list" | "orderList" | "review" | "manual";
type Tab = "Orders" | "Delivered";

function money(value: number) {
  if (Number.isInteger(value)) return `$${value}`;
  return `$${value.toFixed(2).replace(/0$/, "").replace(/\.$/, "")}`;
}

function makeRows(): WorkingOrderRow[] {
  return ORDER_LIST_ITEMS.map((row) => ({
    ...row,
    quantity: row.suggestedQty,
  }));
}

function buildReview(rows: WorkingOrderRow[]): ReviewGroup[] {
  const map = new Map<string, ReviewGroup>();

  for (const row of rows) {
    if (row.quantity <= 0) continue;
    const option = row.options[0];
    if (!option) continue;

    const lineTotal = option.price * row.quantity;
    const line = {
      itemName: row.itemName,
      source: option.source,
      quantity: row.quantity,
      price: option.price,
      unit: option.unit,
      lineTotal,
    };

    const existing = map.get(option.distributor);
    if (!existing) {
      map.set(option.distributor, {
        distributor: option.distributor,
        email: DISTRIBUTOR_EMAILS[option.distributor] ?? "orders@example.com",
        items: [line],
        itemCount: row.quantity,
        totalPrice: lineTotal,
      });
      continue;
    }

    existing.items.push(line);
    existing.itemCount += row.quantity;
    existing.totalPrice += lineTotal;
  }

  return Array.from(map.values());
}

function QtyStepper({
  value,
  onChange,
}: {
  value: number;
  onChange: (next: number) => void;
}) {
  return (
    <div className="inline-flex h-[34px] items-center rounded-[8px] border border-[#E6E6E3] bg-[#F7F7F5]">
      <button
        type="button"
        aria-label="Decrease"
        onClick={() => onChange(Math.max(0, value - 1))}
        className="flex size-8 items-center justify-center text-[#5A5A5A]"
      >
        <Minus className="size-3.5" />
      </button>
      <span className="min-w-[28px] text-center text-[13px] font-medium text-[#111118]">
        {value}
      </span>
      <button
        type="button"
        aria-label="Increase"
        onClick={() => onChange(value + 1)}
        className="flex size-8 items-center justify-center text-[#5A5A5A]"
      >
        <Plus className="size-3.5" />
      </button>
    </div>
  );
}

function ExpandableOrders({
  orders,
  expandedId,
  onToggle,
}: {
  orders: PlacedOrder[];
  expandedId: string | null;
  onToggle: (id: string) => void;
}) {
  return (
    <ScrollTable minWidth={860}>
      <table className="w-full table-fixed border-collapse text-left">
        <colgroup>
          <col className="w-10" />
          <col className="w-[132px]" />
          <col className="w-[260px]" />
          <col className="w-[188px]" />
          <col className="w-[188px]" />
          <col className="w-[128px]" />
          <col />
          <col className="w-[100px]" />
        </colgroup>
        <thead>
          <tr className="border-b border-[#F0F0EE] bg-white text-[10px] font-semibold tracking-[0.06em] text-[#8A8A8A] uppercase">
            <th className="px-4 py-2.5 font-semibold" />
            <th className="py-2.5 pr-10 font-semibold">Delivery ID</th>
            <th className="py-2.5 pr-10 font-semibold">Distributor</th>
            <th className="py-2.5 pr-10 font-semibold">Order Date</th>
            <th className="py-2.5 pr-10 font-semibold">Delivery Date</th>
            <th className="py-2.5 pr-10 font-semibold">Total Price</th>
            <th aria-hidden className="py-2.5" />
            <th className="px-4 py-2.5 text-right font-semibold">Invoice</th>
          </tr>
        </thead>
        {orders.map((order) => {
          const open = expandedId === order.id;
          return (
            <tbody
              key={order.id}
              className={cn(
                "border-b border-[#F0F0EE]",
                open && "bg-[#F7F7F5]",
              )}
            >
              <tr>
                <td className="px-4 py-3.5 align-middle">
                  <button
                    type="button"
                    aria-label={open ? "Collapse" : "Expand"}
                    onClick={() => onToggle(order.id)}
                    className="flex items-center justify-center"
                  >
                    <ChevronDown
                      className={cn(
                        "size-3.5 shrink-0 transition-transform",
                        open
                          ? "rotate-0 text-[#E25B5B]"
                          : "-rotate-90 text-[#6A6A6A]",
                      )}
                    />
                  </button>
                </td>
                <td className="py-3.5 pr-10 align-middle">
                  <span className="rounded-[6px] bg-[#EEEEEC] px-2 py-0.5 font-mono text-[11px] font-medium text-[#6A6A6A]">
                    {order.deliveryId}
                  </span>
                </td>
                <td className="truncate py-3.5 pr-10 text-[13px] font-semibold text-[#111118] align-middle">
                  {order.distributor}
                </td>
                <td className="py-3.5 pr-10 text-[13px] text-[#4A4A4A] align-middle whitespace-nowrap">
                  {order.orderDate}
                </td>
                <td className="py-3.5 pr-10 text-[13px] text-[#4A4A4A] align-middle whitespace-nowrap">
                  {order.deliveryDate}
                </td>
                <td className="py-3.5 pr-10 text-[13px] font-semibold text-[#111118] align-middle whitespace-nowrap">
                  {money(order.totalPrice)}
                </td>
                <td aria-hidden className="py-3.5" />
                <td className="px-4 py-3.5 text-right align-middle">
                  <button type="button" className={LINK}>
                    Download
                  </button>
                </td>
              </tr>
              {open
                ? order.items.map((item) => (
                    <tr
                      key={`${order.id}-${item.sku}`}
                      className="border-t border-[#ECECEA]"
                    >
                      <td className="px-4 py-2.5" />
                      <td className="py-2.5 pr-10 align-middle">
                        <span className="rounded-[6px] bg-[#EEEEEC] px-2 py-0.5 font-mono text-[11px] font-medium text-[#6A6A6A]">
                          {item.sku}
                        </span>
                      </td>
                      <td className="truncate py-2.5 pr-10 text-[13px] text-[#111118] align-middle">
                        {item.itemName}
                      </td>
                      <td className="truncate py-2.5 pr-10 text-[13px] text-[#8A8A8A] align-middle">
                        {item.source}
                      </td>
                      <td className="py-2.5 pr-10" />
                      <td className="py-2.5 pr-10 text-[13px] text-[#111118] align-middle whitespace-nowrap">
                        {money(item.price)}
                      </td>
                      <td aria-hidden className="py-2.5" />
                      <td className="px-4 py-2.5" />
                    </tr>
                  ))
                : null}
            </tbody>
          );
        })}
      </table>
    </ScrollTable>
  );
}

export default function ProductOrdersPage() {
  useDocumentTitle("Distributor Orders");

  const [view, setView] = useState<View>("list");
  const [tab, setTab] = useState<Tab>("Orders");
  const [search, setSearch] = useState("");
  const [productFilter, setProductFilter] = useState("");
  const [distributorFilter, setDistributorFilter] = useState("");
  const [activeChip, setActiveChip] = useState("jul-20");
  const [calendarOpen, setCalendarOpen] = useState(false);

  const [inProgress, setInProgress] = useState<PlacedOrder[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedDeliveredId, setExpandedDeliveredId] = useState<string | null>(
    DELIVERED_ORDERS[0]?.id ?? null,
  );

  const [rows, setRows] = useState<WorkingOrderRow[]>(makeRows);
  const [orderedDistributors, setOrderedDistributors] = useState<Set<string>>(
    () => new Set(),
  );
  const [confirmClose, setConfirmClose] = useState(false);
  const [toast, setToast] = useState(false);
  useScrollLock(confirmClose);

  const filteredPreview = useMemo(() => {
    const q = search.trim().toLowerCase();
    return MAIN_ORDER_PREVIEW.filter((row) => {
      if (q && !row.itemName.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [search]);

  const filteredInProgress = useMemo(() => {
    const q = search.trim().toLowerCase();
    return inProgress.filter((order) => {
      if (distributorFilter && order.distributor !== distributorFilter)
        return false;
      if (!q) return true;
      return (
        order.distributor.toLowerCase().includes(q) ||
        order.deliveryId.includes(q) ||
        order.items.some((item) => item.itemName.toLowerCase().includes(q))
      );
    });
  }, [inProgress, search, distributorFilter]);

  const deliveredGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = DELIVERED_ORDERS.filter((order) => {
      if (distributorFilter && order.distributor !== distributorFilter)
        return false;
      if (!q) return true;
      return (
        order.distributor.toLowerCase().includes(q) ||
        order.deliveryId.includes(q)
      );
    });
    const weeks = new Map<string, Map<string, typeof list>>();
    for (const order of list) {
      if (!weeks.has(order.week)) weeks.set(order.week, new Map());
      const days = weeks.get(order.week)!;
      if (!days.has(order.day)) days.set(order.day, []);
      days.get(order.day)!.push(order);
    }
    return Array.from(weeks.entries());
  }, [search, distributorFilter]);

  const groupedRows = useMemo(() => {
    const groups: Record<OrderCategory, WorkingOrderRow[]> = {
      Meat: [],
      Fruits: [],
      Grains: [],
    };
    for (const row of rows) {
      groups[row.category].push(row);
    }
    return groups;
  }, [rows]);

  const reviewGroups = useMemo(() => buildReview(rows), [rows]);
  const grandTotal = reviewGroups.reduce((sum, g) => sum + g.totalPrice, 0);
  const canReview = rows.some((row) => row.quantity > 0);

  const distributorOptions = useMemo(() => {
    const names = new Set([
      ...ORDER_LIST_ITEMS.flatMap((r) => r.options.map((o) => o.distributor)),
      ...inProgress.map((o) => o.distributor),
      ...DELIVERED_ORDERS.map((o) => o.distributor),
    ]);
    return Array.from(names).sort();
  }, [inProgress]);

  function showToast() {
    setToast(true);
    window.setTimeout(() => setToast(false), 2800);
  }

  function openOrderFlow() {
    setRows(makeRows());
    setOrderedDistributors(new Set());
    setConfirmClose(false);
    setView("orderList");
  }

  function openManualFlow() {
    setConfirmClose(false);
    setView("manual");
  }

  function resetToList() {
    setView("list");
    setConfirmClose(false);
  }

  function handleManualCreated(order: PlacedOrder) {
    setInProgress((prev) =>
      prev.length === 0 ? [order, SEED_IN_PROGRESS] : [order, ...prev],
    );
    setExpandedId(order.id);
    showToast();
    resetToList();
  }

  function calculateQty(category: OrderCategory) {
    setRows((prev) =>
      prev.map((row) =>
        row.category === category
          ? { ...row, quantity: row.suggestedQty }
          : row,
      ),
    );
  }

  function setQty(id: string, quantity: number) {
    setRows((prev) =>
      prev.map((row) =>
        row.id === id ? { ...row, quantity: Math.max(0, quantity) } : row,
      ),
    );
  }

  function markOrdered(distributor: string) {
    setOrderedDistributors((prev) => new Set(prev).add(distributor));
  }

  function finalizeOrders() {
    const created: PlacedOrder[] = reviewGroups.map((group, index) => ({
      id: `created-${Date.now()}-${index}`,
      deliveryId: String(803 + index).padStart(4, "0"),
      distributor: group.distributor,
      orderDate: "Jul 16, 12:34 PM",
      deliveryDate: "Jul 18, 8:00 AM",
      totalPrice: group.totalPrice,
      items: group.items.map((item, i) => ({
        sku: `OPE-${18048 + i}`,
        itemName: item.itemName,
        source: item.source,
        quantity: item.quantity,
        price: item.price,
        unit: item.unit,
      })),
    }));

    setInProgress((prev) =>
      prev.length === 0
        ? [...created, SEED_IN_PROGRESS]
        : [...created, ...prev],
    );
    setExpandedId(created[0]?.id ?? SEED_IN_PROGRESS.id);
    showToast();
    resetToList();
  }

  function orderAll() {
    setOrderedDistributors(new Set(reviewGroups.map((g) => g.distributor)));
    finalizeOrders();
  }

  if (view === "manual") {
    return (
      <CreateManualOrderFlow
        onClose={resetToList}
        onCreated={handleManualCreated}
      />
    );
  }

  if (view === "list") {
    return (
      <div className="relative flex h-full min-h-0 flex-col bg-[#F5F5F3]">
        <div className="shrink-0 border-b border-[#ECECEA] bg-white">
          <div className="px-4 pt-5 md:px-7">
            <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[1fr_auto_1fr] lg:items-start">
              <h1 className="text-[22px] font-semibold tracking-tight text-[#111118]">
                Distributor Orders
              </h1>
              <div className="flex items-center gap-6 sm:gap-8">
                {(["Orders", "Delivered"] as const).map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setTab(name)}
                    className={cn(
                      "relative pb-3 text-[14px]",
                      tab === name
                        ? "font-medium text-[#111118]"
                        : "text-[#8A8A8A] hover:text-[#4A4A4A]",
                    )}
                  >
                    {name}
                    {tab === name ? (
                      <span
                        className="absolute right-0 bottom-0 left-0 h-[2px] rounded-full"
                        style={{ backgroundColor: ORANGE }}
                      />
                    ) : null}
                  </button>
                ))}
              </div>
              <div className="flex justify-end">
                <UserMenu showAvatar className="items-center" />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-[#ECECEA] px-4 py-3 md:px-7">
            <div className="relative w-full min-w-[160px] flex-1 sm:max-w-[220px] sm:flex-none">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-[#A9A9A9]" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search"
                className="h-[34px] rounded-[8px] border-[#E6E6E3] bg-white pl-8 text-[13px]"
              />
            </div>
            {tab === "Orders" ? (
              <>
                <Select
                  value={productFilter}
                  onChange={setProductFilter}
                  placeholder="All products"
                  aria-label="All products"
                  className="w-[140px]"
                  options={[
                    { value: "", label: "All products" },
                    ...ORDER_CATEGORIES.map((c) => ({ value: c, label: c })),
                  ]}
                />
                <Select
                  value={distributorFilter}
                  onChange={setDistributorFilter}
                  placeholder="All Distributors"
                  aria-label="All Distributors"
                  className="w-[160px]"
                  options={[
                    { value: "", label: "All Distributors" },
                    ...distributorOptions.map((name) => ({
                      value: name,
                      label: name,
                    })),
                  ]}
                />
                <button
                  type="button"
                  onClick={openManualFlow}
                  className="ml-auto inline-flex h-[34px] items-center gap-1.5 rounded-[8px] px-3.5 text-[13px] font-semibold text-white"
                  style={{ backgroundColor: ORANGE }}
                >
                  <Plus className="size-3.5" />
                  Create Order
                </button>
              </>
            ) : (
              <Select
                value={distributorFilter}
                onChange={setDistributorFilter}
                placeholder="All Distributors"
                aria-label="All Distributors"
                className="w-[160px]"
                options={[
                  { value: "", label: "All Distributors" },
                  ...distributorOptions.map((name) => ({
                    value: name,
                    label: name,
                  })),
                ]}
              />
            )}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 md:px-7">
          {tab === "Orders" ? (
            <>
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                  {DELIVERY_CHIPS.map((chip) => {
                    const active = chip.id === activeChip;
                    return (
                      <button
                        key={chip.id}
                        type="button"
                        onClick={() => setActiveChip(chip.id)}
                        className={cn(
                          "inline-flex min-w-[128px] items-center justify-between gap-3 rounded-[12px] border px-4 py-3",
                          active
                            ? "border-transparent text-white"
                            : "border-[#ECECEA] bg-white text-[#111118]",
                        )}
                        style={active ? { backgroundColor: GREEN } : undefined}
                      >
                        <span className="text-[13px] font-semibold">
                          {chip.label}
                        </span>
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                            active
                              ? "bg-white/20 text-white"
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
                    aria-label="Previous dates"
                  >
                    <ChevronLeft className="size-4" />
                  </button>
                  <button
                    type="button"
                    className="flex size-9 items-center justify-center rounded-full border border-[#ECECEA] bg-white text-[#8A8A8A]"
                    aria-label="Next dates"
                  >
                    <ChevronRight className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setCalendarOpen((v) => !v)}
                    className="flex size-9 items-center justify-center rounded-full border border-[#ECECEA] bg-white text-[#8A8A8A]"
                    aria-label="Calendar"
                  >
                    <Calendar className="size-4" />
                  </button>
                  {calendarOpen ? (
                    <div className="absolute top-11 right-0 z-30 w-[260px] rounded-[12px] border border-[#ECECEA] bg-white p-3 shadow-xl">
                      <div className="mb-2 text-[13px] font-semibold text-[#111118]">
                        July 2026
                      </div>
                      <p className="text-[12px] text-[#8A8A8A]">
                        Pick a delivery week to filter orders.
                      </p>
                      <button
                        type="button"
                        className="mt-3 text-[13px] font-medium text-[#3B7DC4]"
                        onClick={() => setCalendarOpen(false)}
                      >
                        Close
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>

              {filteredInProgress.length > 0 ? (
                <section className="mb-8">
                  <h2 className="mb-4 text-[20px] font-semibold tracking-tight text-[#111118]">
                    In Progress
                  </h2>
                  <ExpandableOrders
                    orders={filteredInProgress}
                    expandedId={expandedId}
                    onToggle={(id) =>
                      setExpandedId((cur) => (cur === id ? null : id))
                    }
                  />
                </section>
              ) : null}

              <section>
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h2 className="text-[20px] font-semibold tracking-tight text-[#111118]">
                    Order List
                  </h2>
                  <button
                    type="button"
                    onClick={openOrderFlow}
                    className="h-[32px] rounded-[8px] bg-[#242424] px-4 text-[14px] font-medium text-white"
                  >
                    Order now
                  </button>
                </div>
                <ScrollTable minWidth={860}>
                  <div className="grid grid-cols-[2fr_1.1fr_0.8fr_1.2fr_1.3fr] items-center gap-4 border-b border-[#F0F0EE] bg-[#FAFAF8] px-5 py-2.5 text-[10px] font-semibold tracking-[0.04em] text-[#8A8A8A] uppercase">
                    <span>Item Name</span>
                    <span>Cust. Order Total</span>
                    <span>In Stock</span>
                    <span>Quantity Receiving</span>
                    <span>Date Receiving By</span>
                  </div>
                  {filteredPreview.map((row) => (
                    <div
                      key={row.id}
                      className="grid min-h-[48px] grid-cols-[2fr_1.1fr_0.8fr_1.2fr_1.3fr] items-center gap-4 border-b border-[#F3F3F1] px-5 text-[13px] font-medium text-[#111118] last:border-b-0"
                    >
                      <span>{row.itemName}</span>
                      <span>{row.custOrderTotal}</span>
                      <span>{row.inStock ?? "—"}</span>
                      <span>{row.qtyReceiving}</span>
                      <span>{row.dateReceivingBy}</span>
                    </div>
                  ))}
                </ScrollTable>
              </section>
            </>
          ) : (
            <div className="space-y-8">
              {deliveredGroups.map(([week, days]) => (
                <section key={week}>
                  <h2 className="mb-4 text-[22px] font-semibold tracking-tight text-[#111118]">
                    {week}
                  </h2>
                  {Array.from(days.entries()).map(([day, dayOrders]) => (
                    <div key={day} className="mb-5">
                      <div className="mb-2 text-[13px] font-semibold text-[#111118]">
                        {day}
                        <span className="ml-2 text-[12px] font-medium text-[#8A8A8A]">
                          · {dayOrders.length} orders
                        </span>
                      </div>
                      <ExpandableOrders
                        orders={dayOrders}
                        expandedId={expandedDeliveredId}
                        onToggle={(id) =>
                          setExpandedDeliveredId((cur) =>
                            cur === id ? null : id,
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

        {toast ? (
          <div className="fixed right-6 bottom-6 z-50 flex items-center gap-2.5 rounded-[10px] bg-[#1F7A3A] px-4 py-3 text-[14px] font-medium text-white shadow-lg">
            <span className="flex size-5 items-center justify-center rounded-full bg-white/20">
              <Check className="size-3.5" />
            </span>
            Orders Created
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="relative flex h-full min-h-0 flex-col bg-[#F5F5F3]">
      <div className="shrink-0 border-b border-[#ECECEA] bg-white px-4 py-5 md:px-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[28px] font-semibold tracking-tight text-[#111118]">
              {view === "review" ? "Review Order" : "Order List"}
            </h1>
            <p className="mt-1 text-[13px] text-[#8A8A8A]">
              {view === "review" ? "Orders for" : "Item orders for"}{" "}
              <span className="font-semibold text-[#111118]">
                {DELIVERY_LABEL} delivery
              </span>
            </p>
          </div>
          <UserMenu showAvatar showBell={false} className="items-center" />
        </div>
      </div>

      {view === "orderList" ? (
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 md:px-8">
          {ORDER_CATEGORIES.map((section) => {
            const sectionRows = groupedRows[section];
            if (sectionRows.length === 0) return null;
            return (
              <section key={section} className="mb-7">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-[22px] font-semibold tracking-tight text-[#111118]">
                    {section}
                  </h2>
                  <button
                    type="button"
                    onClick={() => calculateQty(section)}
                    className="text-[13px] font-medium text-[#4E7CFF]"
                  >
                    Calculate QTY
                  </button>
                </div>
                <ScrollTable minWidth={980} className="rounded-[12px]">
                  <div className="grid grid-cols-[1.3fr_1.5fr_0.85fr_0.85fr_0.95fr_0.7fr_0.95fr] gap-3 border-b border-[#F0F0EE] px-4 py-3 text-[10px] font-semibold tracking-wide text-[#8A8A8A] uppercase">
                    <span>Item Name</span>
                    <span>Distributor / Source</span>
                    <span>Price</span>
                    <span>Qty Per Unit</span>
                    <span>Cust. Order Total</span>
                    <span>In Stock</span>
                    <span>Qty Needed</span>
                  </div>
                  {sectionRows.map((row) => {
                    const option = row.options[0];
                    return (
                      <div
                        key={row.id}
                        className="grid grid-cols-[1.3fr_1.5fr_0.85fr_0.85fr_0.95fr_0.7fr_0.95fr] items-center gap-3 border-b border-[#F3F3F1] px-4 py-3.5 last:border-b-0"
                      >
                        <span className="text-[14px] text-[#111118]">
                          {row.itemName}
                        </span>
                        <span className="truncate text-[13px] text-[#111118]">
                          {option
                            ? `${option.distributor} / ${option.source}`
                            : "—"}
                        </span>
                        <span className="text-[13px] text-[#111118]">
                          {option
                            ? `${money(option.price)} / ${option.unit}`
                            : "—"}
                        </span>
                        <span className="text-[13px] text-[#111118]">
                          {option?.qtyPerUnit ?? "—"}
                        </span>
                        <span className="text-[13px] text-[#111118]">
                          {row.custOrderTotal}
                        </span>
                        <span className="text-[13px] text-[#111118]">
                          {row.inStock ?? "—"}
                        </span>
                        <QtyStepper
                          value={row.quantity}
                          onChange={(q) => setQty(row.id, q)}
                        />
                      </div>
                    );
                  })}
                </ScrollTable>
              </section>
            );
          })}
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 md:px-8">
          <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,1fr)_300px] xl:gap-10">
            <div className="min-w-0 space-y-4">
              {reviewGroups.map((group) => {
                const ordered = orderedDistributors.has(group.distributor);
                return (
                  <div
                    key={group.distributor}
                    className="rounded-[12px] border border-[#ECECEA] bg-white p-5"
                  >
                    <h3 className="mb-4 text-[22px] font-semibold tracking-tight text-[#111118]">
                      {group.distributor}
                    </h3>
                    <div className="space-y-3">
                      {group.items.map((item) => (
                        <div
                          key={`${group.distributor}-${item.itemName}`}
                          className={cn(
                            "grid items-center gap-x-4 text-[13px]",
                            REVIEW_VENDOR_COLS,
                          )}
                        >
                          <span className="min-w-0 truncate text-[#111118]">
                            {item.itemName}
                          </span>
                          <span className="min-w-0 truncate text-[#8A8A8A]">
                            {item.source}
                          </span>
                          <span className="text-right font-semibold text-[#111118]">
                            {item.quantity}x
                          </span>
                          <span className="whitespace-nowrap text-right text-[#111118]">
                            {money(item.price)} / {item.unit}
                          </span>
                          <span className="text-right font-semibold whitespace-nowrap text-[#111118]">
                            {money(item.lineTotal)}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div
                      className={cn(
                        "mt-5 grid items-center gap-x-4 border-t border-[#F0F0EE] pt-4",
                        REVIEW_VENDOR_COLS,
                      )}
                    >
                      <div className="col-span-4 flex min-w-0 flex-wrap items-center gap-3">
                        {ordered ? (
                          <div className="flex min-w-0 items-start gap-2">
                            <span className="mt-0.5 inline-flex size-4 shrink-0 items-center justify-center rounded-full bg-[#18BC33] text-white">
                              <Check className="size-2.5" />
                            </span>
                            <div className="flex min-w-0 flex-col items-start gap-1.5">
                              <div className="text-[13px] text-[#111118]">
                                Order sent to email{" "}
                                <span className="font-semibold">
                                  {group.email}
                                </span>
                                <span className="text-[#8A8A8A]">
                                  {" "}
                                  · Expected delivery{" "}
                                  <span className="font-semibold text-[#111118]">
                                    {EXPECTED_DELIVERY}
                                  </span>
                                </span>
                              </div>
                              <button type="button" className={LINK}>
                                Download order
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => markOrdered(group.distributor)}
                              className="h-[34px] rounded-[8px] px-4 text-[13px] font-semibold text-white"
                              style={{ backgroundColor: ORANGE }}
                            >
                              Order now
                            </button>
                            <span className="text-[13px] text-[#8A8A8A]">
                              Expected delivery{" "}
                              <span className="font-semibold text-[#111118]">
                                {EXPECTED_DELIVERY}
                              </span>
                            </span>
                          </>
                        )}
                      </div>
                      <div className="text-right text-[18px] font-semibold text-[#111118]">
                        {money(group.totalPrice)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <aside className="h-fit shrink-0 rounded-[12px] border border-[#ECECEA] bg-white p-5 xl:sticky xl:top-4">
              <h3 className="mb-4 text-[16px] font-semibold text-[#111118]">
                Order Summary
              </h3>
              <div className="space-y-3">
                {reviewGroups.map((group) => (
                  <div
                    key={`sum-${group.distributor}`}
                    className="flex items-start justify-between gap-3 text-[13px]"
                  >
                    <div>
                      <div className="font-medium text-[#111118]">
                        {group.distributor}
                      </div>
                      <div className="text-[12px] text-[#8A8A8A]">
                        {group.itemCount} items
                      </div>
                    </div>
                    <div className="font-medium text-[#111118]">
                      {money(group.totalPrice)}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-[#F0F0EE] pt-4">
                <span className="text-[14px] font-semibold text-[#111118]">
                  Total
                </span>
                <span className="text-[22px] font-semibold text-[#111118]">
                  {money(grandTotal)}
                </span>
              </div>
            </aside>
          </div>
        </div>
      )}

      <div className="flex shrink-0 items-center justify-between gap-3 border-t border-[#ECECEA] bg-white px-4 py-3.5 md:px-8">
        {view === "review" ? (
          <button
            type="button"
            onClick={() => setView("orderList")}
            className="inline-flex items-center gap-1 text-[14px] font-medium text-[#111118] hover:opacity-80"
          >
            <ChevronLeft className="size-4" />
            Back
          </button>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setConfirmClose(true)}
            className="rounded-[8px] px-3 py-2 text-[14px] font-medium text-[#5A5A5A] hover:bg-[#F5F5F3]"
          >
            Cancel & Close
          </button>
          <button
            type="button"
            disabled={view === "orderList" && !canReview}
            onClick={() => {
              if (view === "review") orderAll();
              else setView("review");
            }}
            className="h-[40px] rounded-[8px] px-5 text-[14px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
            style={{ backgroundColor: ORANGE }}
          >
            {view === "review" ? "Order All" : "Review Order"}
          </button>
        </div>
      </div>

      {confirmClose ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center overscroll-none bg-black/45 p-4">
          <div
            className="w-full max-w-[420px] overflow-hidden overscroll-contain rounded-[12px] bg-white p-6 shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cancel-order-title"
            data-scroll-lock-allow
          >
            <div className="mb-4 flex items-start justify-between">
              <h2
                id="cancel-order-title"
                className="text-[18px] font-semibold text-[#111118]"
              >
                Cancel and Close Order
              </h2>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setConfirmClose(false)}
                className="rounded-md p-1 text-[#8A8A8A] hover:bg-[#F5F5F3]"
              >
                <X className="size-5" />
              </button>
            </div>
            <p className="mb-6 text-[14px] text-[#5A5A5A]">
              Are you sure you want to close order request?
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmClose(false)}
                className="rounded-[8px] px-4 py-2.5 text-[14px] font-medium text-[#5A5A5A] hover:bg-[#F5F5F3]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={resetToList}
                className="rounded-[8px] bg-[#111118] px-5 py-2.5 text-[14px] font-medium text-white hover:bg-[#1A1A1A]"
              >
                Cancel Order
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

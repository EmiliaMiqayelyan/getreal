import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Package,
  Search,
} from "lucide-react";

import { UserMenu } from "@/components/layout/UserMenu";
import { Input } from "@/components/ui/Input";
import { ScrollTable } from "@/components/ui/ScrollTable";
import { Select } from "@/components/ui/Select";
import { TABLE_HEADER } from "@/constants/table";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { cn } from "@/utils/cn";

const GREEN = "#28402B";

type DeliveryChip = { id: string; label: string; count: number };

type Packer = {
  id: string;
  name: string;
  code: string;
  orderCount: number;
};

type ManagerOrder = {
  id: string;
  customer: string;
  code: string;
  itemCount: number;
  assignedPackerId?: string;
  packingStartedAt?: string;
  coolerReadyAt?: string;
  loadedAt?: string;
};

const DELIVERY_CHIPS: DeliveryChip[] = [
  { id: "wed-14", label: "Wed, Jul 14", count: 13 },
  { id: "wed-20", label: "Wed, Jul 20", count: 7 },
  { id: "wed-27", label: "Wed, Jul 27", count: 3 },
];

const INITIAL_PACKERS: Packer[] = [
  { id: "p1", name: "Vahan N", code: "PCK-U003-01", orderCount: 10 },
  { id: "p2", name: "Rachel N", code: "PCK-U003-01", orderCount: 0 },
  { id: "p3", name: "Gevorg S", code: "PCK-U003-01", orderCount: 1 },
];

const INITIAL_ORDERS: ManagerOrder[] = [
  {
    id: "o1",
    customer: "Emily Rodriguez",
    code: "ORD-U003-01",
    itemCount: 5,
    assignedPackerId: "p1",
    packingStartedAt: "7/29/26, 8:45am",
    coolerReadyAt: "8/29/26, 9:15am",
    loadedAt: "9/29/26, 9:50am",
  },
  {
    id: "o2",
    customer: "Lucas Bennett",
    code: "ORD-U003-02",
    itemCount: 6,
    assignedPackerId: "p1",
    packingStartedAt: "7/29/26, 8:45am",
    coolerReadyAt: "8/29/26, 9:15am",
    loadedAt: "9/29/26, 9:50am",
  },
  {
    id: "o3",
    customer: "Sophia Martinez",
    code: "ORD-U003-03",
    itemCount: 12,
  },
  {
    id: "o4",
    customer: "Ethan Carter",
    code: "ORD-U003-04",
    itemCount: 9,
  },
  {
    id: "o5",
    customer: "Liam Johnson",
    code: "ORD-U003-05",
    itemCount: 5,
  },
];

const ROW_GRID =
  "grid grid-cols-[minmax(0,1.5fr)_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] items-center gap-x-8";

const ASSIGN_PANEL_WIDTH = 300;

function AssignPackerMenu({
  anchor,
  packers,
  onChoose,
  onClose,
}: {
  anchor: HTMLElement;
  packers: Packer[];
  onChoose: (packer: Packer) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const panelRef = useRef<HTMLDivElement>(null);

  const filtered = packers.filter((packer) => {
    const q = query.trim().toLowerCase();
    return (
      !q ||
      packer.name.toLowerCase().includes(q) ||
      packer.code.toLowerCase().includes(q)
    );
  });

  useLayoutEffect(() => {
    function place() {
      const rect = anchor.getBoundingClientRect();
      const gap = 6;
      let left = rect.left;
      if (left + ASSIGN_PANEL_WIDTH > window.innerWidth - 12) {
        left = Math.max(12, rect.right - ASSIGN_PANEL_WIDTH);
      }
      setPos({ top: rect.bottom + gap, left });
    }

    place();
    requestAnimationFrame(place);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [anchor]);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (panelRef.current?.contains(target) || anchor.contains(target)) return;
      onClose();
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [anchor, onClose]);

  return createPortal(
    <div
      ref={panelRef}
      role="listbox"
      aria-label="Assign packer"
      className="fixed z-[80] max-h-[320px] w-[300px] overflow-hidden overflow-y-auto rounded-[10px] border border-[#ECECEA] bg-white shadow-[0_12px_32px_rgba(0,0,0,0.14)]"
      style={{ top: pos.top, left: pos.left }}
    >
      <div className="sticky top-0 border-b border-[#F0F0EE] bg-white p-2.5">
        <div className="relative">
          <Search
            size={12}
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[#A9A9A9]"
          />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search"
            className="h-10 rounded-[8px] border-[#E6E6E3] pl-8 text-[13px]"
          />
        </div>
      </div>
      {filtered.map((packer) => (
        <button
          key={packer.id}
          type="button"
          onClick={() => onChoose(packer)}
          className="grid w-full grid-cols-[1fr_auto_auto] items-center gap-3 border-b border-[#F3F3F1] px-3 py-2.5 text-left last:border-b-0 hover:bg-[#FAFAF8]"
        >
          <span className="text-[13px] font-medium text-[#111118]">
            {packer.name}
          </span>
          <span className="text-[12px] text-[#8A8A8A]">
            {packer.orderCount === 0
              ? "No orders"
              : `${packer.orderCount} order${packer.orderCount === 1 ? "" : "s"}`}
          </span>
          <span className="rounded-[6px] bg-[#F3F3F1] px-1.5 py-0.5 font-mono text-[10px] text-[#6B6B6B]">
            {packer.code}
          </span>
        </button>
      ))}
      {!filtered.length ? (
        <div className="px-3 py-4 text-center text-[12px] text-[#8A8A8A]">
          No packers found
        </div>
      ) : null}
    </div>,
    document.body,
  );
}

export default function PackerManagerPage() {
  useDocumentTitle("Packer Manager");

  const [orders, setOrders] = useState(INITIAL_ORDERS);
  const [packers, setPackers] = useState(INITIAL_PACKERS);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("");
  const [activeChip, setActiveChip] = useState("wed-20");
  const [assignMenu, setAssignMenu] = useState<{
    orderId: string;
    anchor: HTMLElement;
  } | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let next = orders.filter((order) => {
      const packer = packers.find(
        (entry) => entry.id === order.assignedPackerId,
      );
      return (
        !q ||
        order.customer.toLowerCase().includes(q) ||
        order.code.toLowerCase().includes(q) ||
        packer?.name.toLowerCase().includes(q)
      );
    });

    if (sortBy === "assigned-first") {
      next = [...next].sort(
        (a, b) =>
          Number(Boolean(b.assignedPackerId)) -
          Number(Boolean(a.assignedPackerId)),
      );
    } else if (sortBy === "name") {
      next = [...next].sort((a, b) => a.customer.localeCompare(b.customer));
    }

    return next;
  }, [orders, packers, search, sortBy]);

  function assignPacker(orderId: string, packer: Packer) {
    const previousId = orders.find((order) => order.id === orderId)
      ?.assignedPackerId;

    setOrders((current) =>
      current.map((order) =>
        order.id === orderId
          ? {
              ...order,
              assignedPackerId: packer.id,
              packingStartedAt: order.packingStartedAt ?? "7/29/26, 8:45am",
            }
          : order,
      ),
    );

    setPackers((current) =>
      current.map((entry) => {
        if (entry.id === packer.id && previousId !== packer.id) {
          return { ...entry, orderCount: entry.orderCount + 1 };
        }
        if (previousId && entry.id === previousId && previousId !== packer.id) {
          return {
            ...entry,
            orderCount: Math.max(0, entry.orderCount - 1),
          };
        }
        return entry;
      }),
    );

    setAssignMenu(null);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
      <div className="shrink-0 border-b border-[#ECECEA] bg-white">
        <div className="flex min-h-[52px] items-center justify-between gap-4 px-4 md:h-[52px] md:px-7">
          <h1 className="text-[20px] font-semibold tracking-tight text-[#111118]">
            Cooler Packing
          </h1>
          <div className="flex items-center gap-3 border-l border-[#ECECEA] pl-5">
            <UserMenu className="items-center" />
            <div className="hidden text-[12px] text-[#8A8A8A] lg:block">
              Today, Tue, Jun 22, 2026
            </div>
          </div>
        </div>

        <div className="border-t border-[#ECECEA] px-4 py-2 md:px-7">
          <div className="flex min-h-[52px] flex-wrap items-center gap-2 md:h-[52px] md:flex-nowrap md:py-0">
            <div className="relative w-full sm:w-[220px]">
              <Search
                size={13}
                className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[#A9A9A9]"
              />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search"
                className="h-10 rounded-[8px] border-[#E6E6E3] bg-white pl-8 text-[13px]"
              />
            </div>
            <Select
              value={sortBy}
              onChange={setSortBy}
              aria-label="Sort by"
              options={[
                { value: "", label: "Sort by" },
                { value: "name", label: "Customer" },
                { value: "assigned-first", label: "Assigned first" },
              ]}
            />
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
                    "inline-flex items-center gap-2.5 rounded-full border px-3.5 py-2 text-left",
                    active
                      ? "border-transparent text-white"
                      : "border-[#ECECEA] bg-white text-[#111118]",
                  )}
                  style={active ? { background: GREEN } : undefined}
                >
                  <span className="text-[13px] font-semibold">{chip.label}</span>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                      active
                        ? "bg-[#3D5A40] text-white"
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
                className="flex size-10 items-center justify-center rounded-[8px] border border-[#ECECEA] bg-white text-[#8A8A8A]"
              >
                <ChevronLeft size={15} />
              </button>
              <button
                type="button"
                className="flex size-10 items-center justify-center rounded-[8px] border border-[#ECECEA] bg-white text-[#8A8A8A]"
              >
                <ChevronRight size={15} />
              </button>
              <button
                type="button"
                className="flex size-10 items-center justify-center rounded-[8px] border border-[#ECECEA] bg-white text-[#8A8A8A]"
              >
                <Calendar size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-4 py-5 md:px-7">
        <ScrollTable minWidth={860} className="rounded-[10px]">
          <div
            className={cn(
              ROW_GRID,
              TABLE_HEADER,
              "border-b border-[#F0F0EE] bg-[#FAFAF8] px-5 py-2.5",
            )}
          >
            <div>Customer Order ID</div>
            <div>Assign Packer</div>
            <div>Packing Started</div>
            <div>Cooler Ready</div>
            <div>Loaded</div>
          </div>

          {filtered.map((order) => {
            const assigned = packers.find(
              (packer) => packer.id === order.assignedPackerId,
            );

            return (
              <div
                key={order.id}
                className={cn(
                  ROW_GRID,
                  "h-[104px] border-b border-[#F3F3F1] px-5 last:border-b-0",
                )}
              >
                <div>
                  <div className="flex items-center gap-1 text-[14px] font-semibold text-[#111118]">
                    {order.customer}
                    <ChevronRight size={13} className="text-[#A9A9A9]" />
                  </div>
                  <div className="mt-1.5 flex items-center gap-2">
                    <span className="rounded-[6px] bg-[#F3F3F1] px-1.5 py-0.5 font-mono text-[11px] text-[#6B6B6B]">
                      {order.code}
                    </span>
                    <span className="text-[12px] text-[#8A8A8A]">
                      {order.itemCount} items
                    </span>
                  </div>
                </div>

                <div>
                  <button
                    type="button"
                    onClick={(event) => {
                      const anchor = event.currentTarget;
                      setAssignMenu((current) =>
                        current?.orderId === order.id
                          ? null
                          : { orderId: order.id, anchor },
                      );
                    }}
                    className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-[#E6E6E3] bg-white px-3 text-[13px] text-[#111118]"
                  >
                    <Package size={14} className="text-[#8A8A8A]" />
                    {assigned?.name ?? "Assign Packer"}
                    <ChevronDown size={13} className="text-[#8A8A8A]" />
                  </button>
                  {assignMenu?.orderId === order.id ? (
                    <AssignPackerMenu
                      anchor={assignMenu.anchor}
                      packers={packers}
                      onClose={() => setAssignMenu(null)}
                      onChoose={(packer) => assignPacker(order.id, packer)}
                    />
                  ) : null}
                </div>

                <div className="text-[13px] text-[#111118]">
                  {order.packingStartedAt ?? ""}
                </div>
                <div className="text-[13px] text-[#111118]">
                  {order.coolerReadyAt ?? ""}
                </div>
                <div className="text-[13px] text-[#111118]">
                  {order.loadedAt ?? ""}
                </div>
              </div>
            );
          })}
        </ScrollTable>

        {!filtered.length ? (
          <div className="mt-4 rounded-[10px] border border-[#ECECEA] bg-white px-6 py-12 text-center text-[14px] text-[#8A8A8A]">
            No orders match your filters.
          </div>
        ) : null}
      </div>
    </div>
  );
}

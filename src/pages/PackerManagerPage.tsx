import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Package,
} from "lucide-react";

import { Header } from "@/components/layout/AdminHeader";
import { DateNavButton, CalendarIcon, DATE_NAV_GROUP } from "@/components/shared/DateNavButton";
import {
  DeliveryDateChip,
  DATE_CHIP_ROW,
  DATE_CHIP_SCROLL,
} from "@/components/shared/DeliveryDateChip";
import { IdPill } from "@/components/ui/Badge";
import { ScrollTable } from "@/components/ui/ScrollTable";
import { SearchField } from "@/components/ui/SearchField";
import { Select } from "@/components/ui/Select";
import { usePackingHandoff } from "@/context/PackingHandoffContext";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { cn } from "@/utils/cn";

const MUTED_HEADER =
  "text-[11px] font-semibold tracking-[0.06em] text-[#2E2E2E] uppercase";

type DeliveryChip = {
  id: string;
  label: string;
  dateKey: string;
  day: number;
};

/** Eligible packing-role users only (§6). */
type Packer = {
  id: string;
  name: string;
  code: string;
  role: "packer";
};

type ManagerOrder = {
  id: string;
  customer: string;
  code: string;
  itemCount: number;
  deliveryDate: string;
};

const DELIVERY_CHIPS: DeliveryChip[] = [];

/** Eligible packing-role users only (§6). Temporary seed - one packer. */
const ELIGIBLE_PACKERS: Packer[] = [];

/** Temporary seed - one order sample. */
const INITIAL_ORDERS: ManagerOrder[] = [];

const ROW_GRID =
  "grid grid-cols-[220px_180px_140px_140px_140px] items-center gap-x-5";

const ASSIGN_PANEL_WIDTH = 300;

function AssignPackerMenu({
  anchor,
  packers,
  onChoose,
  onClose,
}: {
  anchor: HTMLElement;
  packers: (Packer & { orderCount: number })[];
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
      className="fixed z-[80] max-h-[320px] w-[300px] overflow-hidden overflow-y-auto rounded-[10px] border border-[#00000014] bg-white shadow-[0_12px_32px_rgba(0,0,0,0.14)]"
      style={{ top: pos.top, left: pos.left }}
    >
      <div className="sticky top-0 border-b border-[#00000014] bg-white p-2.5">
        <div className="relative">
          <SearchField
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search"
            fill
          />
        </div>
      </div>
      {filtered.map((packer) => (
        <button
          key={packer.id}
          type="button"
          onClick={() => onChoose(packer)}
          className="grid w-full grid-cols-[1fr_auto_auto] items-center gap-3 border-b border-[#00000014] px-3 py-2.5 text-left last:border-b-0 hover:bg-[#FAFAF8]"
        >
          <span className="text-[13px] font-medium text-[#111118]">
            {packer.name}
          </span>
          <span className="text-[12px] text-[#8A8A8A]">
            {packer.orderCount === 0
              ? "No orders"
              : `${packer.orderCount} order${packer.orderCount === 1 ? "" : "s"}`}
          </span>
          <IdPill>{packer.code}</IdPill>
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

  const { packingByCode, assignPacker: assignPackerHandoff } =
    usePackingHandoff();

  const [orders] = useState(INITIAL_ORDERS);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("");
  const [activeChip, setActiveChip] = useState("wed-20");
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState(20);
  const [assignMenu, setAssignMenu] = useState<{
    orderId: string;
    code: string;
    anchor: HTMLElement;
  } | null>(null);

  const activeChipIndex = DELIVERY_CHIPS.findIndex(
    (chip) => chip.id === activeChip,
  );

  const packersWithWorkload = useMemo(() => {
    return ELIGIBLE_PACKERS.map((packer) => ({
      ...packer,
      orderCount: Object.values(packingByCode).filter(
        (entry) => entry.packerId === packer.id,
      ).length,
    }));
  }, [packingByCode]);

  const chipCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const chip of DELIVERY_CHIPS) {
      counts[chip.id] = orders.filter((order) =>
        order.deliveryDate.includes(chip.dateKey),
      ).length;
    }
    return counts;
  }, [orders]);

  const rows = useMemo(() => {
    const chip = DELIVERY_CHIPS.find((entry) => entry.id === activeChip);
    const q = search.trim().toLowerCase();

    let next = orders
      .filter((order) => {
        const handoff = packingByCode[order.code];
        const packerName = handoff?.packerName ?? "";
        const matchesChip =
          !chip || order.deliveryDate.includes(chip.dateKey);
        const matchesSearch =
          !q ||
          order.customer.toLowerCase().includes(q) ||
          order.code.toLowerCase().includes(q) ||
          packerName.toLowerCase().includes(q);
        return matchesChip && matchesSearch;
      })
      .map((order) => {
        const handoff = packingByCode[order.code];
        return {
          ...order,
          packerId: handoff?.packerId,
          packerName: handoff?.packerName,
          packingStartedAt: handoff?.packingStartedAt,
          coolerReadyAt: handoff?.coolerReadyAt ?? handoff?.packedAt,
          loadedAt: handoff?.loadedAt,
        };
      });

    if (sortBy === "assigned-first") {
      next = [...next].sort(
        (a, b) => Number(Boolean(b.packerId)) - Number(Boolean(a.packerId)),
      );
    } else if (sortBy === "name") {
      next = [...next].sort((a, b) => a.customer.localeCompare(b.customer));
    }

    return next;
  }, [orders, packingByCode, search, sortBy, activeChip]);

  function cycleChip(delta: number) {
    if (DELIVERY_CHIPS.length === 0) return;
    const index = activeChipIndex >= 0 ? activeChipIndex : 0;
    const next =
      (index + delta + DELIVERY_CHIPS.length) % DELIVERY_CHIPS.length;
    const chip = DELIVERY_CHIPS[next]!;
    setActiveChip(chip.id);
    setSelectedDay(chip.day);
  }

  function applyCalendarDay(day: number) {
    setSelectedDay(day);
    const match = DELIVERY_CHIPS.find((chip) => chip.day === day);
    if (match) setActiveChip(match.id);
  }

  function handleAssign(orderCode: string, packer: Packer) {
    // Reassignment updates active packer; timestamps stay (§6, §12)
    assignPackerHandoff(orderCode, {
      packerId: packer.id,
      packerName: packer.name,
    });
    setAssignMenu(null);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#FAFAFA]">
      <Header
        title="Packer Manager"
        toolbar={
          <div className="flex w-full flex-wrap items-center gap-2 md:flex-nowrap">
            <SearchField
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search"
            />
            <Select
              value={sortBy}
              onChange={setSortBy}
              aria-label="Sort by"
              className="w-full sm:w-[140px]"
              options={[
                { value: "", label: "Sort by" },
                { value: "name", label: "Customer" },
                { value: "assigned-first", label: "Assigned first" },
              ]}
            />
            <div className="ml-auto text-[12px] text-[#8A8A8A]">
              Today, Tue, Jun 22, 2026
            </div>
          </div>
        }
      />

      <div className="flex-1 overflow-auto bg-[#FAFAFA] px-4 py-5 md:px-7">
        <div className={DATE_CHIP_ROW}>
          <div className={DATE_CHIP_SCROLL}>
            {DELIVERY_CHIPS.map((chip) => {
              const active = activeChip === chip.id;
              return (
                <DeliveryDateChip
                  key={chip.id}
                  label={chip.label}
                  count={chipCounts[chip.id] ?? 0}
                  active={active}
                  onClick={() => {
                    setActiveChip(chip.id);
                    setSelectedDay(chip.day);
                  }}
                />
              );
            })}
          </div>

          <div className={cn("relative shrink-0", DATE_NAV_GROUP)}>
            <DateNavButton
              aria-label="Previous dates"
              onClick={() => cycleChip(-1)}
            >
              <ChevronLeft size={14} />
            </DateNavButton>
            <DateNavButton
              aria-label="Next dates"
              onClick={() => cycleChip(1)}
            >
              <ChevronRight size={14} />
            </DateNavButton>
            <DateNavButton
              aria-label="Calendar"
              aria-expanded={calendarOpen}
              onClick={() => setCalendarOpen((open) => !open)}
            >
              <CalendarIcon />
            </DateNavButton>

            {calendarOpen ? (
              <div className="absolute top-11 right-0 z-30 w-[280px] rounded-[12px] border border-[#00000014] bg-white p-4 shadow-xl">
                <div className="mb-3 flex items-center justify-between text-[13px] font-semibold text-[#111118]">
                  <span>July 2026</span>
                  <div className="flex gap-1 text-[#8A8A8A]">
                    <ChevronLeft size={14} />
                    <ChevronRight size={14} />
                  </div>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-[#8A8A8A]">
                  {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
                    <span key={day}>{day}</span>
                  ))}
                </div>
                <div className="mt-1 grid grid-cols-7 gap-1">
                  {Array.from({ length: 31 }, (_, index) => {
                    const day = index + 1;
                    const match = DELIVERY_CHIPS.some(
                      (chip) => chip.day === day,
                    );
                    const selected = selectedDay === day;
                    return (
                      <button
                        key={day}
                        type="button"
                        disabled={!match}
                        onClick={() => {
                          applyCalendarDay(day);
                          setCalendarOpen(false);
                        }}
                        className={cn(
                          "flex size-8 items-center justify-center rounded-full text-[12px]",
                          selected
                            ? "bg-[#2B5B31] text-white"
                            : match
                              ? "text-[#111118] hover:bg-[#F3F3F1]"
                              : "text-[#D0D0D0]",
                        )}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <ScrollTable
          minWidth={860}
          className="rounded-[12px] border border-[#00000014] bg-white"
        >
          <div
            className={cn(
              ROW_GRID,
              MUTED_HEADER,
              "border-b border-[#00000014] bg-white px-5 py-2.5",
            )}
          >
            <div>Customer Order ID</div>
            <div>Assign Packer</div>
            <div>Packing Started</div>
            <div>Cooler Ready</div>
            <div>Loaded</div>
          </div>

          {rows.map((order) => {
            const assigned = packersWithWorkload.find(
              (packer) => packer.id === order.packerId,
            );

            return (
              <div
                key={order.id}
                className={cn(
                  ROW_GRID,
                  "min-h-[88px] border-b border-[#00000014] px-5 py-4 last:border-b-0",
                )}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1 text-[14px] font-semibold text-[#111118]">
                    {order.customer}
                    <ChevronRight size={14} className="text-[#A9A9A9]" />
                  </div>
                  <div className="mt-1.5 flex items-center gap-2">
                    <IdPill>{order.code}</IdPill>
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
                          : {
                              orderId: order.id,
                              code: order.code,
                              anchor,
                            },
                      );
                    }}
                    className="inline-flex h-9 max-w-full items-center gap-2 rounded-[10px] border border-[#00000014] bg-white px-3 text-[13px] text-[#111118]"
                  >
                    <Package size={14} className="shrink-0 text-[#8A8A8A]" />
                    <span className="truncate">
                      {assigned?.name ?? order.packerName ?? "Assign Packer"}
                    </span>
                    <ChevronDown size={13} className="shrink-0 text-[#8A8A8A]" />
                  </button>
                  {assignMenu?.orderId === order.id ? (
                    <AssignPackerMenu
                      anchor={assignMenu.anchor}
                      packers={packersWithWorkload}
                      onClose={() => setAssignMenu(null)}
                      onChoose={(packer) => handleAssign(order.code, packer)}
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

        {!rows.length ? (
          <div className="mt-4 rounded-[10px] border border-[#00000014] bg-white px-6 py-12 text-center text-[14px] text-[#8A8A8A]">
            No orders match your filters.
          </div>
        ) : null}
      </div>
    </div>
  );
}

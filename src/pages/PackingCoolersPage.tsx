import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Search,
} from "lucide-react";

import { UserMenu } from "@/components/layout/UserMenu";
import { DateNavButton, CalendarIcon, DATE_NAV_GROUP } from "@/components/shared/DateNavButton";
import {
  DeliveryDateChip,
  DATE_CHIP_ROW,
  DATE_CHIP_SCROLL,
} from "@/components/shared/DeliveryDateChip";
import { LocationHover } from "@/components/shared/LocationHover";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ScrollTable } from "@/components/ui/ScrollTable";
import { Select } from "@/components/ui/Select";
import { TABLE_HEADER } from "@/constants/table";
import { usePackingHandoff } from "@/context/PackingHandoffContext";
import { MEAT_OPTIONS } from "@/data/packingInventory";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import type { PackingLine, PackingSourceOption } from "@/types/packing";
import { cn } from "@/utils/cn";

const ORANGE = "#F57850";
const PACKED_GREEN = "#3AA149";
const LINK_BLUE = "#2165D4";
const PACKER_NAME = "Packer Name 1";
const MUTED_HEADER =
  "text-[11px] font-semibold tracking-[0.06em] text-[#2E2E2E] uppercase";

type DeliveryChip = {
  id: string;
  label: string;
  /** Substring matched against order.deliveryDate */
  dateKey: string;
  day: number;
};

type PackOrder = {
  id: string;
  customer: string;
  code: string;
  itemCount: number;
  deliveryDate: string;
  packedAt?: string;
  loadedAt?: string;
  coolerIds: string[];
  items: PackingLine[];
};

const DELIVERY_CHIPS: DeliveryChip[] = [
  { id: "wed-20", label: "Wed, Jul 20", dateKey: "Jul 20", day: 20 },
];

const COOLER_OPTIONS = ["BL-0008", "BL-02313", "FR-10034", "FR-1423"];

type SourceOption = PackingSourceOption;

/** Temporary seed - one packing line so SourcePicker still demos. */
function makeItems(): PackingLine[] {
  return [
    {
      id: "1",
      name: "Angus Chuck Ground Beef",
      category: "Meat",
      qty: 3,
      coolerId: "Cooler",
      packed: false,
      options: MEAT_OPTIONS,
    },
  ];
}

/** Temporary seed - one order shared with Packer Manager / Customer Orders. */
const INITIAL_ORDERS: PackOrder[] = [
  {
    id: "o1",
    customer: "Emily Rodriguez",
    code: "ORD-U003-01",
    itemCount: 1,
    deliveryDate: "Wed, Jul 20, 2026",
    packedAt: "8/29/26, 9:15am",
    loadedAt: "9/29/26, 9:50am",
    coolerIds: ["BL-0012", "FR-1423"],
    items: makeItems(),
  },
];

const SOURCE_PANEL_WIDTH = 460;

/** Format like `7/29/26, 8:45am` */
function formatPackTimestamp(date = new Date()): string {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const year = String(date.getFullYear()).slice(-2);
  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const suffix = hours >= 12 ? "pm" : "am";
  hours = hours % 12 || 12;
  return `${month}/${day}/${year}, ${hours}:${minutes}${suffix}`;
}

function coolerAssigned(coolerId: string) {
  return Boolean(coolerId) && coolerId !== "Cooler";
}

function itemReady(item: PackingLine) {
  return Boolean(item.selected) && coolerAssigned(item.coolerId) && item.packed;
}

function collectCoolerIds(items: PackingLine[]): string[] {
  return Array.from(
    new Set(
      items
        .map((item) => item.coolerId)
        .filter((value) => coolerAssigned(value)),
    ),
  );
}

function isDraftDirty(original: PackOrder, draft: PackOrder): boolean {
  if (original.items.length !== draft.items.length) return true;
  return draft.items.some((item, index) => {
    const base = original.items[index];
    if (!base) return true;
    return (
      item.packed !== base.packed ||
      item.coolerId !== base.coolerId ||
      item.selected?.itemId !== base.selected?.itemId ||
      item.selected?.distributor !== base.selected?.distributor ||
      item.selected?.source !== base.selected?.source
    );
  });
}

function SourcePicker({
  anchor,
  options,
  onChoose,
  onClose,
}: {
  anchor: HTMLElement;
  options: SourceOption[];
  onChoose: (option: SourceOption) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const panelRef = useRef<HTMLDivElement>(null);

  const filtered = options.filter((option) => {
    const q = query.trim().toLowerCase();
    return (
      !q ||
      option.distributor.toLowerCase().includes(q) ||
      option.source.toLowerCase().includes(q)
    );
  });

  useLayoutEffect(() => {
    function place() {
      const rect = anchor.getBoundingClientRect();
      const gap = 6;
      let left = rect.left;
      if (left + SOURCE_PANEL_WIDTH > window.innerWidth - 12) {
        left = Math.max(12, rect.right - SOURCE_PANEL_WIDTH);
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
      aria-label="Distributor / Source"
      className="fixed z-[80] max-h-[320px] w-[460px] overflow-hidden overflow-y-auto rounded-[10px] border border-[#ECECEA] bg-white shadow-[0_12px_32px_rgba(0,0,0,0.14)]"
      style={{ top: pos.top, left: pos.left }}
    >
      <div className="sticky top-0 bg-white px-3 pt-3 pb-2">
        <div className="relative">
          <Search
            size={13}
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[#111118]"
          />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search"
            className="w-full pl-8"
          />
        </div>
      </div>
      <div className="px-1 pb-1.5">
        {filtered.map((option) => (
          <button
            key={`${option.distributor}-${option.source}-${option.itemId}`}
            type="button"
            onClick={() => onChoose(option)}
            className="grid w-full grid-cols-[minmax(0,1.15fr)_minmax(0,1.25fr)_112px] items-center gap-x-4 rounded-[8px] px-3 py-2.5 text-left text-[13px] text-[#111118] hover:bg-[#FAFAF8]"
          >
            <span className="min-w-0 truncate">{option.distributor}</span>
            <span className="min-w-0 truncate">{option.source}</span>
            <span className="whitespace-nowrap">{option.expDate}</span>
          </button>
        ))}
        {!filtered.length ? (
          <div className="px-3 py-4 text-center text-[12px] text-[#8A8A8A]">
            No sources found
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}

function PackingDetail({
  order,
  onClose,
  onReady,
}: {
  order: PackOrder;
  onClose: () => void;
  onReady: (order: PackOrder) => void;
}) {
  const [draft, setDraft] = useState(order);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [openMenu, setOpenMenu] = useState<{
    id: string;
    anchor: HTMLElement;
  } | null>(null);

  const groups = useMemo(() => {
    const meat = draft.items.filter((item) => item.category === "Meat");
    const fruits = draft.items.filter((item) => item.category === "Fruits");
    return [
      ["Meat", meat],
      ["Fruits", fruits],
    ] as const;
  }, [draft.items]);

  const allReady = draft.items.every(itemReady);

  function updateItem(id: string, patch: Partial<PackingLine>) {
    setValidationError(null);
    setDraft((current) => ({
      ...current,
      items: current.items.map((item) =>
        item.id === id ? { ...item, ...patch } : item,
      ),
    }));
  }

  function requestClose() {
    if (isDraftDirty(order, draft)) {
      const leave = window.confirm(
        "You have unsaved packing changes. Leave without completing Cooler Ready?",
      );
      if (!leave) return;
    }
    onClose();
  }

  function handleReady() {
    const incomplete = draft.items.filter((item) => !itemReady(item));
    if (incomplete.length) {
      const missing = incomplete[0]!;
      const parts: string[] = [];
      if (!missing.selected) parts.push("distributor/source");
      if (!coolerAssigned(missing.coolerId)) parts.push("cooler ID");
      if (!missing.packed) parts.push("Item Packed");
      setValidationError(
        `Complete all items before Cooler Ready. "${missing.name}" still needs ${parts.join(", ")}.`,
      );
      return;
    }

    const coolerIds = collectCoolerIds(draft.items);
    onReady({
      ...draft,
      coolerIds,
      packedAt: formatPackTimestamp(),
      items: draft.items,
    });
  }

  const th = cn("px-0 py-2.5 text-left", TABLE_HEADER);
  const td = "px-0 py-3.5 align-middle text-[13px] text-[#111118]";

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
      <div className="shrink-0 border-b border-[#ECECEA] bg-white px-4 pt-5 pb-4 md:px-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[22px] font-semibold tracking-tight text-[#111118]">
              Cooler Packing{" "}
              <span className="font-normal italic text-[#6B6B6B]">
                for {draft.customer}
              </span>
            </h1>
            <p className="mt-1 text-[13px] text-[#8A8A8A]">
              Delivery date{" "}
              <span className="font-semibold text-[#111118]">
                {draft.deliveryDate}
              </span>
            </p>
          </div>
          <UserMenu className="items-center" />
        </div>
      </div>

      <div className="flex-1 overflow-auto px-4 py-5 md:px-7">
        {validationError ? (
          <div className="mb-4 rounded-[10px] border border-[#F5C2C2] bg-[#FDECEC] px-4 py-3 text-[13px] font-medium text-[#E25B5B]">
            {validationError}
          </div>
        ) : null}

        <div className="space-y-5">
          {groups.map(([title, items]) => (
            <section key={title}>
              <h2 className="mb-3 text-[16px] font-semibold text-[#111118]">
                {title}
              </h2>
              <ScrollTable minWidth={960} className="rounded-[10px]">
                <table className="w-full table-fixed border-collapse">
                  <colgroup>
                    <col style={{ width: "22%" }} />
                    <col style={{ width: "48px" }} />
                    <col style={{ width: "18%" }} />
                    <col style={{ width: "11%" }} />
                    <col style={{ width: "11%" }} />
                    <col style={{ width: "10%" }} />
                    <col style={{ width: "12%" }} />
                    <col />
                    <col style={{ width: "110px" }} />
                  </colgroup>
                  <thead>
                    <tr className="border-b border-[#ECECEA]">
                      <th className={cn(th, "pl-5 pr-3")}>Item Name</th>
                      <th className={cn(th, "pr-3")}>Qty</th>
                      <th className={cn(th, "pr-3")}>Distributor / Source</th>
                      <th className={cn(th, "pr-3")}>Exp Date</th>
                      <th className={cn(th, "pr-3")}>Item ID</th>
                      <th className={cn(th, "pr-3")}>Location</th>
                      <th className={cn(th, "pr-3")}>Cooler ID</th>
                      <th aria-hidden className="p-0" />
                      <th className={cn(th, "pr-5")} />
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => {
                      const canPack =
                        Boolean(item.selected) &&
                        coolerAssigned(item.coolerId);

                      return (
                        <tr
                          key={item.id}
                          className="border-b border-[#ECECEA] last:border-b-0"
                        >
                          <td className={cn(td, "pl-5 pr-3")}>
                            <span className="block truncate font-medium">
                              {item.name}
                            </span>
                          </td>
                          <td className={cn(td, "pr-3 font-semibold")}>
                            {item.qty}
                          </td>
                          <td className={cn(td, "pr-3")}>
                            <button
                              type="button"
                              onClick={(event) => {
                                const anchor = event.currentTarget;
                                setOpenMenu((current) =>
                                  current?.id === item.id
                                    ? null
                                    : { id: item.id, anchor },
                                );
                              }}
                              className="inline-flex max-w-full items-center gap-1 text-left text-[13px]"
                            >
                              <ChevronDown
                                size={14}
                                className="shrink-0 text-[#8A8A8A]"
                              />
                              <span
                                className={cn(
                                  "truncate",
                                  item.selected
                                    ? "text-[#111118]"
                                    : "text-[#8A8A8A]",
                                )}
                              >
                                {item.selected
                                  ? `${item.selected.distributor} / ${item.selected.source}`
                                  : "Select"}
                              </span>
                            </button>
                            {openMenu?.id === item.id ? (
                              <SourcePicker
                                anchor={openMenu.anchor}
                                options={item.options}
                                onClose={() => setOpenMenu(null)}
                                onChoose={(option) => {
                                  // Inventory stock row → copy expDate / itemId / location via selected
                                  updateItem(item.id, {
                                    selected: option,
                                    packed: false,
                                  });
                                  setOpenMenu(null);
                                }}
                              />
                            ) : null}
                          </td>
                          <td className={cn(td, "pr-3")}>
                            {item.selected?.expDate ?? ""}
                          </td>
                          <td className={cn(td, "pr-3")}>
                            <span className="block truncate">
                              {item.selected?.itemId ?? ""}
                            </span>
                          </td>
                          <td className={cn(td, "pr-3")}>
                            <LocationHover
                              className="text-[13px] text-[#111118]"
                              fullAddress={item.selected?.location ?? ""}
                              label="Location"
                            >
                              {item.selected?.location ?? ""}
                            </LocationHover>
                          </td>
                          <td className={cn(td, "pr-3")}>
                            <Select
                              value={item.coolerId}
                              onChange={(value) =>
                                updateItem(item.id, {
                                  coolerId: value,
                                  packed:
                                    item.packed && coolerAssigned(value)
                                      ? item.packed
                                      : false,
                                })
                              }
                              aria-label="Cooler ID"
                              variant="flat"
                              className="w-auto"
                              buttonClassName={
                                item.coolerId === "Cooler"
                                  ? "text-[#8A8A8A]"
                                  : "text-[#111118]"
                              }
                              options={[
                                { value: "Cooler", label: "Cooler" },
                                ...COOLER_OPTIONS.map((cooler) => ({
                                  value: cooler,
                                  label: cooler,
                                })),
                              ]}
                            />
                          </td>
                          <td aria-hidden className="p-0" />
                          <td className={cn(td, "pr-5 text-right")}>
                            {item.packed ? (
                              <span className="inline-flex items-center justify-end gap-2">
                                <span className="text-[13px] font-medium text-[#2F8F4E]">
                                  Packed
                                </span>
                                <span className="inline-flex size-5 items-center justify-center rounded-full bg-[#2F8F4E] text-white">
                                  <Check size={11} strokeWidth={3} />
                                </span>
                              </span>
                            ) : (
                              <button
                                type="button"
                                disabled={!canPack}
                                onClick={() =>
                                  updateItem(item.id, { packed: true })
                                }
                                className="text-[13px] font-medium text-[#3B82F6] disabled:text-[#93C5FD]"
                              >
                                Item Packed
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </ScrollTable>
            </section>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-end gap-5 border-t border-[#ECECEA] bg-white px-4 py-4 md:px-7">
        <button
          type="button"
          onClick={requestClose}
          className="text-[14px] font-medium text-[#111118]"
        >
          Cancel & Close
        </button>
        <button
          type="button"
          onClick={handleReady}
          className={cn(
            "rounded-[8px] px-6 py-2.5 text-[14px] font-semibold text-white",
            !allReady && "opacity-40",
          )}
          style={{ background: ORANGE }}
        >
          Cooler Ready
        </button>
      </div>
    </div>
  );
}

// Fixed tracks so columns stay packed left (no fr stretch gaps)
const ROW_GRID =
  "grid grid-cols-[220px_260px_160px_260px] items-center gap-x-5";

export default function PackingCoolersPage() {
  useDocumentTitle("Cooler Packing");

  const { upsertPacking, markLoaded, markPackingStarted, packingByCode } =
    usePackingHandoff();

  const [orders, setOrders] = useState(INITIAL_ORDERS);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("");
  const [activeChip, setActiveChip] = useState("wed-20");
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState(20);

  const activeChipIndex = DELIVERY_CHIPS.findIndex(
    (chip) => chip.id === activeChip,
  );

  const chipCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const chip of DELIVERY_CHIPS) {
      counts[chip.id] = orders.filter((order) => {
        const assigned = Boolean(packingByCode[order.code]?.packerId);
        return assigned && order.deliveryDate.includes(chip.dateKey);
      }).length;
    }
    return counts;
  }, [orders, packingByCode]);

  const activeOrder =
    orders.find((order) => order.id === activeOrderId) ?? null;

  const filtered = useMemo(() => {
    const chip = DELIVERY_CHIPS.find((entry) => entry.id === activeChip);
    const q = search.trim().toLowerCase();
    let next = orders
      .filter((order) => {
        // §11: available in Cooler Packing after Packer Manager assignment
        const handoff = packingByCode[order.code];
        const assigned = Boolean(handoff?.packerId);
        const matchesChip =
          !chip || order.deliveryDate.includes(chip.dateKey);
        const matchesSearch =
          !q ||
          order.customer.toLowerCase().includes(q) ||
          order.code.toLowerCase().includes(q);
        return assigned && matchesChip && matchesSearch;
      })
      .map((order) => {
        const handoff = packingByCode[order.code];
        return {
          ...order,
          packedAt: handoff?.coolerReadyAt ?? handoff?.packedAt ?? order.packedAt,
          loadedAt: handoff?.loadedAt ?? order.loadedAt,
          coolerIds: handoff?.coolerIds?.length
            ? handoff.coolerIds
            : order.coolerIds,
        };
      });

    if (sortBy === "packed-first") {
      next = [...next].sort(
        (a, b) => Number(Boolean(b.packedAt)) - Number(Boolean(a.packedAt)),
      );
    } else if (sortBy === "name") {
      next = [...next].sort((a, b) => a.customer.localeCompare(b.customer));
    }

    return next;
  }, [orders, search, sortBy, activeChip, packingByCode]);

  function openPacking(order: PackOrder) {
    markPackingStarted(order.code, formatPackTimestamp());
    setActiveOrderId(order.id);
  }

  function cycleChip(delta: number) {
    const index =
      activeChipIndex >= 0 ? activeChipIndex : 0;
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

  if (activeOrder) {
    return (
      <PackingDetail
        order={activeOrder}
        onClose={() => setActiveOrderId(null)}
        onReady={(updated) => {
          setOrders((current) =>
            current.map((order) =>
              order.id === updated.id ? updated : order,
            ),
          );
          upsertPacking({
            orderCode: updated.code,
            packedAt: updated.packedAt,
            coolerReadyAt: updated.packedAt,
            loadedAt: updated.loadedAt,
            coolerIds: updated.coolerIds,
            packerName:
              packingByCode[updated.code]?.packerName ?? PACKER_NAME,
            packerId: packingByCode[updated.code]?.packerId,
            packingStartedAt: packingByCode[updated.code]?.packingStartedAt,
            items: updated.items,
          });
          setActiveOrderId(null);
        }}
      />
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
      <div className="shrink-0 border-b border-[#ECECEA] bg-white">
        <div className="flex min-h-[52px] items-center justify-between gap-4 px-4 md:h-[52px] md:px-7">
          <h1 className="text-[20px] font-semibold tracking-tight text-[#111118]">
            Cooler Packing
          </h1>
          <UserMenu className="items-center" />
        </div>

        <div className="border-t border-[#ECECEA] px-4 py-2 md:px-7">
          <div className="flex min-h-[52px] flex-wrap items-center gap-2 md:h-[52px] md:flex-nowrap md:py-0">
            <div className="relative w-full sm:w-[220px]">
              <Search
                size={13}
                className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[#111118]"
              />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search"
                className="w-full pl-8"
              />
            </div>
            <Select
              value={sortBy}
              onChange={setSortBy}
              aria-label="Sort by"
              className="w-full sm:w-[140px]"
              options={[
                { value: "", label: "Sort by" },
                { value: "name", label: "Customer" },
                { value: "packed-first", label: "Packed first" },
              ]}
            />
            <div className="ml-auto text-[12px] text-[#8A8A8A]">
              Today, Tue, Jun 22, 2026
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-4 py-5 md:px-7">
        <div className={DATE_CHIP_ROW}>
          <div className={DATE_CHIP_SCROLL}>
            {DELIVERY_CHIPS.map((chip) => {
              const active = activeChip === chip.id;
              const count = chipCounts[chip.id] ?? 0;
              return (
                <DeliveryDateChip
                  key={chip.id}
                  label={chip.label}
                  count={count}
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
              <div className="absolute top-11 right-0 z-30 w-[280px] rounded-[12px] border border-[#ECECEA] bg-white p-4 shadow-xl">
                <div className="mb-3 flex items-center justify-between text-[13px] font-semibold text-[#111118]">
                  <span>July 2026</span>
                  <div className="flex gap-1 text-[#8A8A8A]">
                    <ChevronLeft size={14} />
                    <ChevronRight size={14} />
                  </div>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-[#8A8A8A]">
                  {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
                    <div key={day} className="py-1">
                      {day}
                    </div>
                  ))}
                  {Array.from({ length: 31 }, (_, index) => {
                    const day = index + 1;
                    const chipDay = DELIVERY_CHIPS.some(
                      (chip) => chip.day === day,
                    );
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => applyCalendarDay(day)}
                        className={cn(
                          "rounded-full py-1.5 text-[#111118]",
                          selectedDay === day
                            ? "bg-[#E8E5E0] font-semibold"
                            : "hover:bg-background",
                          chipDay && selectedDay !== day && "font-medium",
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
                    onClick={() => {
                      applyCalendarDay(selectedDay);
                      setCalendarOpen(false);
                    }}
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

        <ScrollTable minWidth={860} className="rounded-[12px] border border-[#ECECEA] bg-white">
          <div
            className={cn(
              ROW_GRID,
              MUTED_HEADER,
              "border-b border-[#F0F0EE] bg-white px-5 py-2.5",
            )}
          >
            <div>Customer Order ID</div>
            <div>Action</div>
            <div>Cooler ID</div>
            <div>Loading</div>
          </div>

          {filtered.map((order) => {
            const packed = Boolean(order.packedAt);
            const loaded = Boolean(order.loadedAt);

            return (
              <div
                key={order.id}
                className={cn(
                  ROW_GRID,
                  "min-h-[88px] border-b border-[#F0F0EE] px-5 py-4 last:border-b-0",
                )}
              >
                <button
                  type="button"
                  onClick={() => openPacking(order)}
                  className="max-w-[280px] text-left"
                >
                  <div className="flex items-center gap-1 text-[14px] font-semibold text-[#111118]">
                    {order.customer}
                    <ChevronRight size={14} className="text-[#A9A9A9]" />
                  </div>
                  <div className="mt-1.5 flex items-center gap-2">
                    <span className="rounded-[6px] bg-id-pill px-1.5 py-0.5 font-mono text-[11px] font-medium text-[#6B6B6B]">
                      {order.code}
                    </span>
                    <span className="text-[12px] text-[#8A8A8A]">
                      {order.itemCount} items
                    </span>
                  </div>
                </button>

                <div>
                  {packed ? (
                    <div className="inline-flex flex-wrap items-center gap-3">
                      <span
                        className="inline-flex h-9 items-center gap-1.5 rounded-[10px] px-3.5 text-[12px] font-semibold text-white"
                        style={{ background: PACKED_GREEN }}
                      >
                        Packed
                        <Check size={12} strokeWidth={3} />
                      </span>
                      <span className="text-[12px] text-[#111118]">
                        {order.packedAt}
                      </span>
                    </div>
                  ) : (
                    <Button
                      variant="dark"
                      onClick={() => openPacking(order)}
                    >
                      Start Packing
                    </Button>
                  )}
                </div>

                <div>
                  {packed && order.coolerIds.length ? (
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col gap-1.5">
                        {order.coolerIds.map((coolerId) => (
                          <span
                            key={coolerId}
                            className="w-fit rounded-[6px] bg-id-pill px-2 py-1 font-mono text-[11px] font-medium text-[#6B6B6B]"
                          >
                            {coolerId}
                          </span>
                        ))}
                      </div>
                      {!loaded ? (
                        <button
                          type="button"
                          onClick={() => openPacking(order)}
                          className="inline-flex h-9 items-center text-[13px] font-medium"
                          style={{ color: LINK_BLUE }}
                        >
                          Edit
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                <div>
                  {packed ? (
                    loaded ? (
                      <div className="inline-flex flex-wrap items-center gap-3">
                        <span
                          className="inline-flex h-9 items-center gap-1.5 rounded-[10px] px-3.5 text-[12px] font-semibold text-white"
                          style={{ background: PACKED_GREEN }}
                        >
                          Loaded
                          <Check size={12} strokeWidth={3} />
                        </span>
                        <span className="text-[12px] text-[#111118]">
                          {order.loadedAt}
                        </span>
                      </div>
                    ) : (
                      <Button
                        variant="dark"
                        onClick={() => {
                          const loadedAt = formatPackTimestamp();
                          setOrders((current) =>
                            current.map((entry) =>
                              entry.id === order.id
                                ? { ...entry, loadedAt }
                                : entry,
                            ),
                          );
                          markLoaded(order.code, loadedAt);
                          upsertPacking({
                            orderCode: order.code,
                            packedAt: order.packedAt,
                            coolerReadyAt: order.packedAt,
                            loadedAt,
                            coolerIds: order.coolerIds,
                            packerName:
                              packingByCode[order.code]?.packerName ??
                              PACKER_NAME,
                            packerId: packingByCode[order.code]?.packerId,
                            packingStartedAt:
                              packingByCode[order.code]?.packingStartedAt,
                            items: order.items,
                          });
                        }}
                        className="rounded-[10px] text-[12px]"
                      >
                        Load Now
                      </Button>
                    )
                  ) : null}
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

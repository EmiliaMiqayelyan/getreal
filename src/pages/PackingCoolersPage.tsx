import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Calendar,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Search,
} from "lucide-react";

import { UserMenu } from "@/components/layout/UserMenu";
import { LocationHover } from "@/components/shared/LocationHover";
import { Input } from "@/components/ui/Input";
import { ScrollTable } from "@/components/ui/ScrollTable";
import { Select } from "@/components/ui/Select";
import { TABLE_HEADER } from "@/constants/table";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { cn } from "@/utils/cn";

const ORANGE = "#F57850";
const GREEN = "#28402B";
const LINK_BLUE = "#3B82F6";

type DeliveryChip = { id: string; label: string; count: number };

type SourceOption = {
  distributor: string;
  source: string;
  expDate: string;
  location: string;
  itemId: string;
};

type PackLine = {
  id: string;
  name: string;
  category: "Meat" | "Fruits";
  qty: number;
  selected?: SourceOption;
  coolerId: string;
  packed: boolean;
  options: SourceOption[];
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
  items: PackLine[];
};

const DELIVERY_CHIPS: DeliveryChip[] = [
  { id: "wed-14", label: "Wed, Jul 14", count: 13 },
  { id: "wed-20", label: "Wed, Jul 20", count: 7 },
  { id: "wed-27", label: "Wed, Jul 27", count: 3 },
];

const COOLER_OPTIONS = ["BL-0008", "BL-02313", "FR-10034", "FR-1423"];

const MEAT_OPTIONS: SourceOption[] = [
  {
    distributor: "4PF Co.",
    source: "FreshMarket Co.",
    expDate: "Jul 30, 2026",
    location: "Freeze 1",
    itemId: "OPE-10043",
  },
  {
    distributor: "Rancho Protein LLC",
    source: "Alpine Products Co.",
    expDate: "Aug 02, 2026",
    location: "Freeze 2",
    itemId: "OPE-10050",
  },
];

const FRUIT_OPTIONS: SourceOption[] = [
  {
    distributor: "4PF Co.",
    source: "FreshMarket Co.",
    expDate: "Aug 20, 2026",
    location: "Dry Shelf 3",
    itemId: "OPE-23131",
  },
  {
    distributor: "4PF Co.",
    source: "Alpine Products Co.",
    expDate: "Aug 24, 2026",
    location: "Dry Shelf 2",
    itemId: "OPE-23132",
  },
  {
    distributor: "Tropical Produce LLC",
    source: "FreshMarket Co.",
    expDate: "Jul 30, 2026",
    location: "Dry Shelf 1",
    itemId: "OPE-23140",
  },
];

function makeItems(): PackLine[] {
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
    {
      id: "2",
      name: "Rib-eye Steak",
      category: "Meat",
      qty: 3,
      coolerId: "Cooler",
      packed: false,
      options: MEAT_OPTIONS,
    },
    {
      id: "3",
      name: "Legion Fields Whole Chicken",
      category: "Meat",
      qty: 3,
      coolerId: "Cooler",
      packed: false,
      options: MEAT_OPTIONS,
    },
    {
      id: "4",
      name: "Blueberries",
      category: "Fruits",
      qty: 3,
      coolerId: "Cooler",
      packed: false,
      options: FRUIT_OPTIONS,
    },
    {
      id: "5",
      name: "Lemons",
      category: "Fruits",
      qty: 3,
      coolerId: "Cooler",
      packed: false,
      options: FRUIT_OPTIONS,
    },
    {
      id: "6",
      name: "Gala Apples",
      category: "Fruits",
      qty: 3,
      coolerId: "Cooler",
      packed: false,
      options: FRUIT_OPTIONS,
    },
  ];
}

const INITIAL_ORDERS: PackOrder[] = [
  {
    id: "o1",
    customer: "Lucas Bennett",
    code: "ORD-U003-01",
    itemCount: 6,
    deliveryDate: "Wed, Jul 22, 2026",
    packedAt: "7/29/26, 8:45am",
    loadedAt: "8/29/26, 8:45am",
    coolerIds: ["BL-02313", "FR-10034"],
    items: makeItems(),
  },
  {
    id: "o2",
    customer: "Sophia Martinez",
    code: "ORD-U003-02",
    itemCount: 12,
    deliveryDate: "Wed, Jul 22, 2026",
    packedAt: "7/29/26, 8:45am",
    coolerIds: ["BL-02313", "FR-10034"],
    items: makeItems(),
  },
  {
    id: "o3",
    customer: "Ethan Carter",
    code: "ORD-U003-03",
    itemCount: 9,
    deliveryDate: "Wed, Jul 22, 2026",
    coolerIds: [],
    items: makeItems(),
  },
  {
    id: "o4",
    customer: "Liam Johnson",
    code: "ORD-U003-04",
    itemCount: 5,
    deliveryDate: "Wed, Jul 22, 2026",
    coolerIds: [],
    items: makeItems(),
  },
];

const SOURCE_PANEL_WIDTH = 360;

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
      className="fixed z-[80] max-h-[320px] w-[360px] overflow-hidden overflow-y-auto rounded-[10px] border border-[#ECECEA] bg-white shadow-[0_12px_32px_rgba(0,0,0,0.14)]"
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
            className="h-8 rounded-[8px] border-[#E6E6E3] pl-8 text-[12px]"
          />
        </div>
      </div>
      {filtered.map((option) => (
        <button
          key={`${option.distributor}-${option.source}-${option.itemId}`}
          type="button"
          onClick={() => onChoose(option)}
          className="grid w-full grid-cols-[1.1fr_1.1fr_0.9fr] gap-2 border-b border-[#F3F3F1] px-3 py-2.5 text-left text-[12px] text-[#111118] last:border-b-0 hover:bg-[#FAFAF8]"
        >
          <span>{option.distributor}</span>
          <span className="text-[#6B6B6B]">{option.source}</span>
          <span className="text-[#6B6B6B]">{option.expDate}</span>
        </button>
      ))}
      {!filtered.length ? (
        <div className="px-3 py-4 text-center text-[12px] text-[#8A8A8A]">
          No sources found
        </div>
      ) : null}
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

  const allPacked = draft.items.every((item) => item.packed && item.selected);

  function updateItem(id: string, patch: Partial<PackLine>) {
    setDraft((current) => ({
      ...current,
      items: current.items.map((item) =>
        item.id === id ? { ...item, ...patch } : item,
      ),
    }));
  }

  function handleReady() {
    const coolerIds = Array.from(
      new Set(
        draft.items
          .map((item) => item.coolerId)
          .filter((value) => value && value !== "Cooler"),
      ),
    );
    onReady({
      ...draft,
      coolerIds: coolerIds.length ? coolerIds : ["BL-02313", "FR-10034"],
      packedAt: "7/29/26, 8:45am",
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
                    {items.map((item) => (
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
                                updateItem(item.id, {
                                  selected: option,
                                  coolerId:
                                    item.coolerId === "Cooler"
                                      ? "BL-0008"
                                      : item.coolerId,
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
                              updateItem(item.id, { coolerId: value })
                            }
                            aria-label="Cooler"
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
                              disabled={!item.selected}
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
                    ))}
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
          onClick={onClose}
          className="text-[14px] font-medium text-[#111118]"
        >
          Cancel & Close
        </button>
        <button
          type="button"
          disabled={!allPacked}
          onClick={handleReady}
          className="rounded-[8px] px-6 py-2.5 text-[14px] font-semibold text-white disabled:opacity-40"
          style={{ background: ORANGE }}
        >
          Cooler Ready
        </button>
      </div>
    </div>
  );
}

const ROW_GRID =
  "grid grid-cols-[minmax(200px,max-content)_140px_minmax(140px,max-content)_120px_minmax(0,1fr)] items-center gap-x-4";

export default function PackingCoolersPage() {
  useDocumentTitle("Cooler Packing");

  const [orders, setOrders] = useState(INITIAL_ORDERS);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("");
  const [activeChip, setActiveChip] = useState("wed-20");
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);

  const activeOrder =
    orders.find((order) => order.id === activeOrderId) ?? null;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let next = orders.filter(
      (order) =>
        !q ||
        order.customer.toLowerCase().includes(q) ||
        order.code.toLowerCase().includes(q),
    );

    if (sortBy === "packed-first") {
      next = [...next].sort(
        (a, b) => Number(Boolean(b.packedAt)) - Number(Boolean(a.packedAt)),
      );
    } else if (sortBy === "name") {
      next = [...next].sort((a, b) => a.customer.localeCompare(b.customer));
    }

    return next;
  }, [orders, search, sortBy]);

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
          setActiveOrderId(null);
        }}
      />
    );
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
                className="h-[34px] rounded-[8px] border-[#E6E6E3] bg-white pl-8 text-[13px]"
              />
            </div>
            <Select
              value={sortBy}
              onChange={setSortBy}
              aria-label="Sort by"
              options={[
                { value: "", label: "Sort by" },
                { value: "name", label: "Customer" },
                { value: "packed-first", label: "Packed first" },
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
                className="flex size-8 items-center justify-center rounded-[8px] border border-[#ECECEA] bg-white text-[#8A8A8A]"
              >
                <ChevronLeft size={15} />
              </button>
              <button
                type="button"
                className="flex size-8 items-center justify-center rounded-[8px] border border-[#ECECEA] bg-white text-[#8A8A8A]"
              >
                <ChevronRight size={15} />
              </button>
              <button
                type="button"
                className="flex size-8 items-center justify-center rounded-[8px] border border-[#ECECEA] bg-white text-[#8A8A8A]"
              >
                <Calendar size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-4 py-5 md:px-7">
        <ScrollTable minWidth={780} className="rounded-[10px]">
          <div
            className={cn(
              ROW_GRID,
              TABLE_HEADER,
              "border-b border-[#F0F0EE] bg-[#FAFAF8] px-5 py-2.5",
            )}
          >
            <div>Customer Order ID</div>
            <div>Action</div>
            <div>Cooler ID</div>
            <div>Loading</div>
            <div />
          </div>

          {filtered.map((order) => {
            const packed = Boolean(order.packedAt);
            const loaded = Boolean(order.loadedAt);

            return (
              <div
                key={order.id}
                className={cn(
                  ROW_GRID,
                  "border-b border-[#F3F3F1] px-5 py-4 last:border-b-0",
                )}
              >
                <button
                  type="button"
                  onClick={() => setActiveOrderId(order.id)}
                  className="text-left"
                >
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
                </button>

                <div>
                  {packed ? (
                    <div className="inline-flex flex-col items-start gap-1">
                      <span
                        className="inline-flex items-center gap-1.5 rounded-[8px] px-3 py-2 text-[12px] font-semibold text-white"
                        style={{ background: GREEN }}
                      >
                        Packed
                        <Check size={12} strokeWidth={3} />
                      </span>
                      <span className="text-[11px] text-[#8A8A8A]">
                        {order.packedAt}
                      </span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setActiveOrderId(order.id)}
                      className="rounded-[8px] bg-[#2A2A2A] px-4 py-2 text-[12px] font-medium text-white"
                    >
                      Start Packing
                    </button>
                  )}
                </div>

                <div>
                  {packed && order.coolerIds.length ? (
                    <div className="flex flex-wrap items-center gap-2">
                      {order.coolerIds.map((coolerId) => (
                        <span
                          key={coolerId}
                          className="rounded-[6px] bg-[#F3F3F1] px-1.5 py-0.5 font-mono text-[11px] text-[#6B6B6B]"
                        >
                          {coolerId}
                        </span>
                      ))}
                      {!loaded ? (
                        <button
                          type="button"
                          onClick={() => setActiveOrderId(order.id)}
                          className="text-[12px] font-medium"
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
                      <div className="inline-flex flex-col items-start gap-1">
                        <span
                          className="inline-flex items-center gap-1.5 rounded-[8px] px-3 py-2 text-[12px] font-semibold text-white"
                          style={{ background: GREEN }}
                        >
                          Loaded
                          <Check size={12} strokeWidth={3} />
                        </span>
                        <span className="text-[11px] text-[#8A8A8A]">
                          {order.loadedAt}
                        </span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          setOrders((current) =>
                            current.map((entry) =>
                              entry.id === order.id
                                ? { ...entry, loadedAt: "8/29/26, 8:45am" }
                                : entry,
                            ),
                          )
                        }
                        className="rounded-[8px] bg-[#2A2A2A] px-4 py-2 text-[12px] font-medium text-white"
                      >
                        Load Now
                      </button>
                    )
                  ) : null}
                </div>
                <div aria-hidden />
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

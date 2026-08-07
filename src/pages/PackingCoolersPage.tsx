import { useMemo, useState } from "react";
import {
  Calendar,
  Check,
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
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { cn } from "@/utils/cn";

const ORANGE = "#F57850";
const GREEN = "#28402B";

type DeliveryChip = { id: string; label: string; count: number };

type Packer = {
  id: string;
  name: string;
  code: string;
  orderCount: number;
};

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
  assignedPacker?: Packer;
  packingStartedAt?: string;
  coolerReadyAt?: string;
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

const PACKERS: Packer[] = [
  { id: "p1", name: "Vahan N", code: "PCK-U003-01", orderCount: 10 },
  { id: "p2", name: "Rachel N", code: "PCK-U003-01", orderCount: 0 },
  { id: "p3", name: "Gevorg S", code: "PCK-U003-01", orderCount: 1 },
];

const COOLER_OPTIONS = ["BL-0008", "BL-82313", "FR-10034", "FR-1423"];

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
    source: "Lena Hoffman",
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
    customer: "Emily Rodriguez",
    code: "ORD-U003-01",
    itemCount: 6,
    deliveryDate: "Wed, Jul 22, 2026",
    assignedPacker: PACKERS[0],
    packingStartedAt: "7/29/26, 8:45am",
    coolerReadyAt: "8/29/26, 9:15am",
    loadedAt: "9/29/26, 9:50am",
    packedAt: "7/29/26, 8:45am",
    coolerIds: ["BL-82313", "FR-10034"],
    items: makeItems(),
  },
  {
    id: "o2",
    customer: "Lucas Bennett",
    code: "ORD-U003-02",
    itemCount: 6,
    deliveryDate: "Wed, Jul 22, 2026",
    assignedPacker: PACKERS[0],
    packingStartedAt: "7/29/26, 8:45am",
    coolerReadyAt: "8/29/26, 9:15am",
    loadedAt: "9/29/26, 9:50am",
    packedAt: "7/29/26, 8:45am",
    coolerIds: ["BL-82313"],
    items: makeItems(),
  },
  {
    id: "o3",
    customer: "Sophia Martinez",
    code: "ORD-U003-03",
    itemCount: 12,
    deliveryDate: "Wed, Jul 22, 2026",
    items: makeItems(),
    coolerIds: [],
  },
  {
    id: "o4",
    customer: "Ethan Carter",
    code: "ORD-U003-04",
    itemCount: 9,
    deliveryDate: "Wed, Jul 22, 2026",
    items: makeItems(),
    coolerIds: [],
  },
  {
    id: "o5",
    customer: "Liam Johnson",
    code: "ORD-U003-05",
    itemCount: 5,
    deliveryDate: "Wed, Jul 22, 2026",
    items: makeItems(),
    coolerIds: [],
  },
];

function AssignPackerMenu({
  open,
  packers,
  onChoose,
  onClose,
}: {
  open: boolean;
  packers: Packer[];
  onChoose: (packer: Packer) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  if (!open) return null;

  const filtered = packers.filter((packer) => {
    const q = query.trim().toLowerCase();
    return (
      !q ||
      packer.name.toLowerCase().includes(q) ||
      packer.code.toLowerCase().includes(q)
    );
  });

  return (
    <>
      <button
        type="button"
        aria-label="Close assign packer"
        className="fixed inset-0 z-10"
        onClick={onClose}
      />
      <div className="absolute top-10 left-0 z-20 w-[280px] overflow-hidden rounded-[10px] border border-[#ECECEA] bg-white shadow-xl">
        <div className="border-b border-[#F0F0EE] p-2.5">
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
        {filtered.map((packer) => (
          <button
            key={packer.id}
            type="button"
            onClick={() => onChoose(packer)}
            className="grid w-full grid-cols-[1fr_auto_auto] items-center gap-3 border-b border-[#F3F3F1] px-3 py-2.5 text-left last:border-b-0 hover:bg-[#FAFAF8]"
          >
            <span className="text-[13px] font-medium text-[#2E2E2E]">
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
      </div>
    </>
  );
}

function SourcePicker({
  open,
  options,
  onChoose,
  onClose,
}: {
  open: boolean;
  options: SourceOption[];
  onChoose: (option: SourceOption) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  if (!open) return null;

  const filtered = options.filter((option) => {
    const q = query.trim().toLowerCase();
    return (
      !q ||
      option.distributor.toLowerCase().includes(q) ||
      option.source.toLowerCase().includes(q)
    );
  });

  return (
    <>
      <button
        type="button"
        aria-label="Close source picker"
        className="fixed inset-0 z-10"
        onClick={onClose}
      />
      <div className="absolute top-9 left-0 z-20 w-[360px] overflow-hidden rounded-[10px] border border-[#ECECEA] bg-white shadow-xl">
        <div className="border-b border-[#F0F0EE] p-2.5">
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
            className="grid w-full grid-cols-[1.1fr_1.1fr_0.9fr] gap-2 border-b border-[#F3F3F1] px-3 py-2.5 text-left text-[12px] text-[#2E2E2E] last:border-b-0 hover:bg-[#FAFAF8]"
          >
            <span>{option.distributor}</span>
            <span className="text-[#6B6B6B]">{option.source}</span>
            <span className="text-[#6B6B6B]">{option.expDate}</span>
          </button>
        ))}
      </div>
    </>
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
  const [openMenu, setOpenMenu] = useState<string | null>(null);

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
          .filter((id) => id && id !== "Cooler"),
      ),
    );
    onReady({
      ...draft,
      coolerIds: coolerIds.length ? coolerIds : ["BL-82313", "FR-10034"],
      packedAt: "7/29/26, 8:45am",
      coolerReadyAt: "8/29/26, 9:15am",
      packingStartedAt: draft.packingStartedAt ?? "7/29/26, 8:45am",
    });
  }

  const col =
    "grid-cols-[minmax(160px,1.3fr)_48px_minmax(160px,1.3fr)_100px_90px_100px_100px_120px]";

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#F5F5F3]">
      <div className="shrink-0 border-b border-[#ECECEA] bg-white px-4 md:px-7 pt-5 pb-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[22px] font-semibold tracking-tight text-[#2E2E2E]">
              Cooler Packing{" "}
              <span className="font-normal text-[#6B6B6B]">
                for {draft.customer}
              </span>
            </h1>
            <p className="mt-1 text-[13px] text-[#8A8A8A]">
              Delivery date:{" "}
              <span className="font-medium text-[#2E2E2E]">
                {draft.deliveryDate}
              </span>
            </p>
          </div>
          <UserMenu showAvatar className="items-center" />
        </div>
      </div>

      <div className="flex-1 overflow-auto px-4 md:px-7 py-5">
        <div className="space-y-5">
          {groups.map(([title, items]) => (
            <section key={title}>
              <h2 className="mb-3 text-[16px] font-semibold text-[#2E2E2E]">
                {title}
              </h2>
              <ScrollTable minWidth={980} className="rounded-[10px]">
                <div
                  className={cn(
                    "grid gap-2 border-b border-[#F0F0EE] bg-[#FAFAF8] px-4 py-2.5 text-[10px] font-semibold tracking-[0.04em] text-[#8A8A8A] uppercase",
                    col,
                  )}
                >
                  <div>Item Name</div>
                  <div>Qty</div>
                  <div>Distributor / Source</div>
                  <div>Exp Date</div>
                  <div>Item ID</div>
                  <div>Location</div>
                  <div>Cooler ID</div>
                  <div />
                </div>

                {items.map((item) => (
                  <div
                    key={item.id}
                    className={cn(
                      "grid items-center gap-2 border-b border-[#F3F3F1] px-4 py-3 text-[13px] text-[#2E2E2E] last:border-b-0",
                      col,
                    )}
                  >
                    <div className="font-medium">{item.name}</div>
                    <div className="font-semibold">{item.qty}</div>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() =>
                          setOpenMenu((current) =>
                            current === item.id ? null : item.id,
                          )
                        }
                        className="flex h-8 w-full items-center justify-between rounded-[8px] border border-[#E6E6E3] bg-white px-2.5 text-left text-[12px]"
                      >
                        <span
                          className={
                            item.selected ? "text-[#2E2E2E]" : "text-[#8A8A8A]"
                          }
                        >
                          {item.selected
                            ? `${item.selected.distributor} / ${item.selected.source}`
                            : "Select"}
                        </span>
                        <ChevronDown size={13} className="text-[#8A8A8A]" />
                      </button>
                      <SourcePicker
                        open={openMenu === item.id}
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
                    </div>
                    <div className="text-[12px] text-[#6B6B6B]">
                      {item.selected?.expDate ?? ""}
                    </div>
                    <div className="font-mono text-[11px] text-[#6B6B6B]">
                      {item.selected?.itemId ?? ""}
                    </div>
                    <div className="text-[12px]">
                      {item.selected?.location ?? ""}
                    </div>
                    <div>
                      <Select
                        value={item.coolerId}
                        onChange={(value) =>
                          updateItem(item.id, { coolerId: value })
                        }
                        className="w-full"
                        aria-label="Cooler"
                        options={[
                          { value: "Cooler", label: "Cooler" },
                          ...COOLER_OPTIONS.map((cooler) => ({
                            value: cooler,
                            label: cooler,
                          })),
                        ]}
                      />
                    </div>
                    <div className="flex items-center justify-end gap-2">
                      {item.packed ? (
                        <>
                          <span className="text-[13px] font-medium text-[#2F8F4E]">
                            Packed
                          </span>
                          <span className="inline-flex size-5 items-center justify-center rounded-full bg-[#2F8F4E] text-white">
                            <Check size={11} strokeWidth={3} />
                          </span>
                        </>
                      ) : (
                        <button
                          type="button"
                          disabled={!item.selected}
                          onClick={() => updateItem(item.id, { packed: true })}
                          className="text-[13px] font-medium text-[#3B82F6] disabled:opacity-40"
                        >
                          Item Packed
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </ScrollTable>
            </section>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-end gap-5 border-t border-[#ECECEA] bg-white px-4 md:px-7 py-4">
        <button
          type="button"
          onClick={onClose}
          className="text-[14px] font-medium text-[#8A8A8A]"
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

const PACKER_GRID =
  "grid grid-cols-[minmax(220px,1.3fr)_180px_minmax(160px,1fr)_160px] items-center gap-3";

const MANAGER_GRID =
  "grid grid-cols-[minmax(220px,1.3fr)_160px_140px_140px_140px] items-center gap-3";

export default function PackingCoolersPage() {
  useDocumentTitle("Cooler Packing");

  const [mode, setMode] = useState<"Manager" | "Packer">("Manager");
  const [orders, setOrders] = useState(INITIAL_ORDERS);
  const [packers, setPackers] = useState(PACKERS);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("");
  const [activeChip, setActiveChip] = useState("wed-20");
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [assignMenuOrderId, setAssignMenuOrderId] = useState<string | null>(
    null,
  );

  const activeOrder =
    orders.find((order) => order.id === activeOrderId) ?? null;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let next = orders.filter(
      (order) =>
        !q ||
        order.customer.toLowerCase().includes(q) ||
        order.code.toLowerCase().includes(q) ||
        order.assignedPacker?.name.toLowerCase().includes(q),
    );

    if (sortBy === "packed-first") {
      next = [...next].sort(
        (a, b) => Number(Boolean(b.packedAt)) - Number(Boolean(a.packedAt)),
      );
    } else if (sortBy === "assigned-first") {
      next = [...next].sort(
        (a, b) =>
          Number(Boolean(b.assignedPacker)) - Number(Boolean(a.assignedPacker)),
      );
    } else if (sortBy === "name") {
      next = [...next].sort((a, b) => a.customer.localeCompare(b.customer));
    }

    return next;
  }, [orders, search, sortBy]);

  function assignPacker(orderId: string, packer: Packer) {
    const previous = orders.find((o) => o.id === orderId)?.assignedPacker;

    setOrders((current) =>
      current.map((order) =>
        order.id === orderId
          ? {
              ...order,
              assignedPacker: packer,
              packingStartedAt: order.packingStartedAt ?? "7/29/26, 8:45am",
            }
          : order,
      ),
    );

    setPackers((current) =>
      current.map((entry) => {
        if (entry.id === packer.id && previous?.id !== packer.id) {
          return { ...entry, orderCount: entry.orderCount + 1 };
        }
        if (previous && entry.id === previous.id && previous.id !== packer.id) {
          return {
            ...entry,
            orderCount: Math.max(0, entry.orderCount - 1),
          };
        }
        return entry;
      }),
    );
    setAssignMenuOrderId(null);
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
          setActiveOrderId(null);
          setMode("Packer");
        }}
      />
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#F5F5F3]">
      <div className="shrink-0 border-b border-[#ECECEA] bg-white">
        <div className="px-4 md:px-7 pt-5">
          <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[1fr_auto_1fr] lg:items-start lg:gap-4">
            <div className="flex items-start justify-between gap-3">
              <h1 className="text-[22px] font-semibold tracking-tight text-[#2E2E2E]">
                Cooler Packing
              </h1>
              <div className="flex flex-col items-end gap-1 lg:hidden">
                <UserMenu showAvatar className="items-center" />
              </div>
            </div>

            <div className="flex items-center gap-6 sm:gap-8">
              {(["Manager", "Packer"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setMode(tab)}
                  className={cn(
                    "border-b-2 pb-3 text-[14px] lg:pb-4",
                    mode === tab
                      ? "border-[#F57850] font-medium text-[#2E2E2E]"
                      : "border-transparent text-[#8A8A8A]",
                  )}
                >
                  {tab === "Manager" ? "Packer Manager" : "Packer Flow"}
                </button>
              ))}
            </div>

            <div className="hidden flex-col items-end gap-1 lg:flex">
              <UserMenu showAvatar className="items-center" />
              <div className="text-[12px] text-[#8A8A8A]">
                Today, Tue, Jun 22, 2026
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-[#ECECEA] px-4 md:px-7 py-3">
          <div className="flex flex-wrap items-center gap-2">
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
                { value: "assigned-first", label: "Assigned first" },
                { value: "packed-first", label: "Packed first" },
              ]}
            />
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
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

      <div className="flex-1 overflow-auto px-4 md:px-7 py-5">
        {mode === "Manager" ? (
          <ScrollTable minWidth={860} className="rounded-[10px]">
            <div
              className={cn(
                MANAGER_GRID,
                "border-b border-[#F0F0EE] bg-[#FAFAF8] px-5 py-2.5 text-[10px] font-semibold tracking-[0.04em] text-[#8A8A8A] uppercase",
              )}
            >
              <div>Customer Order ID</div>
              <div>Assign Packer</div>
              <div>Packing Started</div>
              <div>Cooler Ready</div>
              <div>Loaded</div>
            </div>

            {filtered.map((order) => (
              <div
                key={order.id}
                className={cn(
                  MANAGER_GRID,
                  "border-b border-[#F3F3F1] px-5 py-4 last:border-b-0",
                )}
              >
                <button
                  type="button"
                  onClick={() => setActiveOrderId(order.id)}
                  className="text-left"
                >
                  <div className="flex items-center gap-1 text-[14px] font-semibold text-[#2E2E2E]">
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

                <div className="relative">
                  <button
                    type="button"
                    onClick={() =>
                      setAssignMenuOrderId((current) =>
                        current === order.id ? null : order.id,
                      )
                    }
                    className="inline-flex h-9 items-center gap-2 rounded-[8px] border border-[#E6E6E3] bg-white px-3 text-[13px] text-[#2E2E2E]"
                  >
                    <Package size={14} className="text-[#8A8A8A]" />
                    {order.assignedPacker?.name ?? "Assign Packer"}
                    <ChevronDown size={13} className="text-[#8A8A8A]" />
                  </button>
                  <AssignPackerMenu
                    open={assignMenuOrderId === order.id}
                    packers={packers}
                    onClose={() => setAssignMenuOrderId(null)}
                    onChoose={(packer) => assignPacker(order.id, packer)}
                  />
                </div>

                <div className="text-[13px] text-[#2E2E2E]">
                  {order.packingStartedAt ?? ""}
                </div>
                <div className="text-[13px] text-[#2E2E2E]">
                  {order.coolerReadyAt ?? ""}
                </div>
                <div className="text-[13px] text-[#2E2E2E]">
                  {order.loadedAt ?? ""}
                </div>
              </div>
            ))}
          </ScrollTable>
        ) : (
          <ScrollTable minWidth={780} className="rounded-[10px]">
            <div
              className={cn(
                PACKER_GRID,
                "border-b border-[#F0F0EE] bg-[#FAFAF8] px-5 py-2.5 text-[10px] font-semibold tracking-[0.04em] text-[#8A8A8A] uppercase",
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
                    PACKER_GRID,
                    "border-b border-[#F3F3F1] px-5 py-4 last:border-b-0",
                  )}
                >
                  <div>
                    <div className="flex items-center gap-1 text-[14px] font-semibold text-[#2E2E2E]">
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
                    {packed ? (
                      <div className="inline-flex flex-col items-start gap-1">
                        <span className="inline-flex items-center gap-1.5 rounded-[8px] bg-[#E8F5EC] px-3 py-1.5 text-[12px] font-semibold text-[#2F8F4E]">
                          <Check size={12} strokeWidth={3} />
                          Packed
                        </span>
                        <span className="text-[11px] text-[#8A8A8A]">
                          {order.packedAt}
                        </span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setActiveOrderId(order.id)}
                        className="rounded-[8px] bg-[#242424] px-4 py-2 text-[12px] font-medium text-white"
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
                            className="text-[12px] font-medium text-[#3B82F6]"
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
                          <span className="inline-flex items-center gap-1.5 rounded-[8px] bg-[#E8F5EC] px-3 py-1.5 text-[12px] font-semibold text-[#2F8F4E]">
                            <Check size={12} strokeWidth={3} />
                            Loaded
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
                                  ? { ...entry, loadedAt: "9/29/26, 9:50am" }
                                  : entry,
                              ),
                            )
                          }
                          className="rounded-[8px] bg-[#242424] px-4 py-2 text-[12px] font-medium text-white"
                        >
                          Load Now
                        </button>
                      )
                    ) : null}
                  </div>
                </div>
              );
            })}
          </ScrollTable>
        )}

        {!filtered.length ? (
          <div className="mt-4 rounded-[10px] border border-[#ECECEA] bg-white px-6 py-12 text-center text-[14px] text-[#8A8A8A]">
            No orders match your filters.
          </div>
        ) : null}
      </div>
    </div>
  );
}

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Check,
  ChevronDown,
  ChevronRight,
  Minus,
  Plus,
  Search,
  X,
} from "lucide-react";

import { Header } from "@/components/layout/AdminHeader";
import { LocationHover } from "@/components/shared/LocationHover";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ScrollTable } from "@/components/ui/ScrollTable";
import { Select } from "@/components/ui/Select";
import { TABLE_HEADER } from "@/constants/table";
import { useReceivingHandoff } from "@/context/ReceivingHandoffContext";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useScrollLock } from "@/hooks/useScrollLock";
import { cn } from "@/utils/cn";
import { handoffToStockSections } from "@/utils/receivingHandoff";

const ORANGE = "#F57850";
const GREEN = "#2B5B31";

const LOCATION_OPTIONS = [
  "Fridge 1",
  "Fridge 2",
  "Fridge 3",
  "Freezer 1",
  "Freezer 2",
  "Freezer 3",
  "Dry Shelf 1",
  "Dry Shelf 2",
  "Dry Shelf 3",
] as const;

type InventoryLot = {
  orderId: string;
  /** Distributor delivery ID preserved from receiving (DP-xxxx). */
  deliveryId?: string;
  distributor: string;
  source: string;
  deliveryDate: string;
  purchased: string;
  qty: number;
  unit: string;
  location: string;
};

type InventoryProduct = {
  id: string;
  name: string;
  lots: InventoryLot[];
};

type InventorySection = {
  title: string;
  sourceLabel: "FARMER" | "SOURCE";
  products: InventoryProduct[];
};

type LocationSplit = {
  qty: number;
  location: string;
};

type StockItem = {
  id: string;
  orderId: string;
  deliveryId?: string;
  itemName: string;
  source?: string;
  purchased?: string;
  qty: number;
  unit: string;
  qtyAfterUnpack: string;
  expDate: string;
  location: string;
  splits: LocationSplit[];
};

type StockSection = {
  title: string;
  items: StockItem[];
};

type ReceivedOrder = {
  id: string;
  supplier: string;
  itemsCount: string;
  receivedAt: string;
  sections: StockSection[];
};

type DistributeTarget = {
  sectionTitle: string;
  itemId: string;
};

/** Temporary seed - one product per inventory section. */
const INITIAL_SECTIONS: InventorySection[] = [
  {
    title: "Meat",
    sourceLabel: "FARMER",
    products: [
      {
        id: "angus",
        name: "Angus Chuck Ground Beef",
        lots: [
          {
            orderId: "OPE-10045",
            distributor: "4PF Co.",
            source: "FreshAlley Meat Co",
            deliveryDate: "Jul 16, 2026, 08:00",
            purchased: "$125/case",
            qty: 5,
            unit: "1lb",
            location: "Freezer 1",
          },
        ],
      },
    ],
  },
  {
    title: "Poultry",
    sourceLabel: "FARMER",
    products: [
      {
        id: "drumsticks",
        name: "Drumsticks",
        lots: [
          {
            orderId: "OPE-10060",
            distributor: "Greenfield Farms",
            source: "Sofia Reyes",
            deliveryDate: "Jul 19, 2026, 06:00",
            purchased: "$7.50/pack",
            qty: 3,
            unit: "2 per pack",
            location: "Fridge 1",
          },
        ],
      },
    ],
  },
  {
    title: "Fruits",
    sourceLabel: "SOURCE",
    products: [{ id: "blueberries", name: "Blueberries", lots: [] }],
  },
];

const CATEGORY_GROUPS: { title: string; sections: string[] }[] = [
  { title: "Protein", sections: ["Meat", "Poultry"] },
  { title: "Produce", sections: ["Fruits"] },
];

/** Temporary seed - one received order sample. */
const RECEIVED_ORDERS: ReceivedOrder[] = [
  {
    id: "r-4pf",
    supplier: "4PF Co.",
    itemsCount: "1 item",
    receivedAt: "Jul 20, 2026 · 12:35 PM",
    sections: [
      {
        title: "Meat",
        items: [
          {
            id: "4pf-angus",
            orderId: "ID-002-02",
            itemName: "Angus Chuck Ground Beef",
            qty: 1,
            unit: "Case",
            qtyAfterUnpack: "6",
            expDate: "Jul 28, 2026",
            location: "",
            splits: [],
          },
        ],
      },
    ],
  },
];

const PRODUCT_MATCH: Record<string, string> = {
  "Angus Chuck Ground Beef": "angus",
  "Wagyu Aged Tenderloin Steak": "wagyu",
  "Rib-eye Steak": "ribeye",
  "NY Strip Steak": "nystrip",
  "Whole Chicken": "whole-chicken",
  "Legion Fields Whole Chicken": "whole-chicken",
  Drumsticks: "drumsticks",
  Thighs: "thighs",
  Breasts: "breasts",
  Blueberries: "blueberries",
  Strawberries: "strawberries",
  Lemons: "lemons",
};

const ID_PILL =
  "w-fit rounded-[6px] bg-[#EEF0F4] px-1.5 py-0.5 font-mono text-[11px] font-medium text-[#6B6B6B]";

function sectionSourceFor(title: string, itemName: string) {
  if (title === "Poultry") return "Legion Fields";
  if (title === "Fruits") {
    if (itemName === "Lemons") return "Citrus Grove Co";
    return "Berry Fields Farm";
  }
  return "FreshAlley Meat Co";
}

function stockItemLocation(item: StockItem) {
  const direct = item.location.trim();
  if (direct) return direct;
  const fromSplit = item.splits.find(
    (row) => row.qty > 0 && row.location.trim(),
  );
  return fromSplit?.location.trim() ?? "";
}

function stockItemReady(item: StockItem) {
  return parseUnpackQty(item.qtyAfterUnpack) > 0 && Boolean(stockItemLocation(item));
}

function incompleteStorageCount(sections: StockSection[]) {
  return sections.reduce(
    (count, section) =>
      count + section.items.filter((item) => !stockItemReady(item)).length,
    0,
  );
}

function printStockLabel(item: StockItem) {
  const qty = parseUnpackQty(item.qtyAfterUnpack) || item.qty;
  const popup = window.open("", "_blank", "noopener,noreferrer,width=420,height=520");
  if (!popup) return;
  popup.document.write(`<!doctype html><html><head><title>Label ${item.orderId}</title>
<style>
  body{font-family:ui-monospace,Menlo,monospace;padding:24px;color:#111}
  h1{font-size:18px;margin:0 0 12px}
  p{margin:6px 0;font-size:13px}
</style></head><body>
<h1>${item.itemName}</h1>
<p><strong>Order:</strong> ${item.orderId}</p>
<p><strong>Qty:</strong> ${qty}</p>
<p><strong>Unit:</strong> ${item.unit}</p>
<p><strong>Location:</strong> ${item.location || "—"}</p>
<p><strong>Exp:</strong> ${item.expDate}</p>
<script>window.onload=function(){window.print()}</script>
</body></html>`);
  popup.document.close();
}

function splitsTotal(splits: LocationSplit[]) {
  return splits.reduce((sum, row) => sum + (row.qty > 0 ? row.qty : 0), 0);
}

function nextUnusedLocation(used: string[]) {
  return (
    LOCATION_OPTIONS.find((option) => !used.includes(option)) ??
    LOCATION_OPTIONS[0]
  );
}

const GRID =
  "grid grid-cols-[28px_minmax(96px,0.9fr)_minmax(150px,1.3fr)_minmax(140px,1.2fr)_minmax(150px,1.3fr)_minmax(100px,0.9fr)_minmax(100px,0.8fr)_minmax(72px,0.55fr)_minmax(120px,1fr)] items-center gap-x-3";

// ORDER ID | ITEM NAME | QTY | UNIT | QTY AFTER UNPACK | EXP. DATE | ENTER LOCATION | gap | distribute | Print Label
// Only the right-side gap is `1fr` so free width never opens a void between ITEM NAME and QTY.
const STOCK_GRID =
  "grid grid-cols-[104px_minmax(160px,240px)_40px_52px_152px_100px_152px_minmax(72px,1fr)_40px_124px] items-center gap-x-4";

function stockTotal(product: InventoryProduct) {
  return product.lots.reduce((sum, lot) => sum + lot.qty, 0);
}

function parseUnpackQty(value: string) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function defaultSplits(total: number): LocationSplit[] {
  if (total <= 0) {
    return [
      { qty: 0, location: "Freezer 1" },
      { qty: 0, location: "Freezer 2" },
    ];
  }
  const first = Math.max(1, Math.ceil(total * (2 / 3)));
  const second = Math.max(0, total - first);
  return [
    { qty: first, location: "Freezer 1" },
    { qty: second, location: "Freezer 2" },
  ];
}

function QtyStepper({
  value,
  onChange,
  min = 0,
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
}) {
  return (
    <div className="flex shrink-0 items-center gap-2.5">
      <button
        type="button"
        aria-label="Decrease quantity"
        onClick={() => onChange(Math.max(min, value - 1))}
        className="flex size-10 items-center justify-center rounded-[8px] bg-[#E8EEE9] text-[#111118] hover:bg-[#DDE6DF]"
      >
        <Minus size={13} strokeWidth={2.5} />
      </button>
      <span className="min-w-[1.25rem] text-center text-[15px] font-medium text-[#111118]">
        {value}
      </span>
      <button
        type="button"
        aria-label="Increase quantity"
        onClick={() => onChange(value + 1)}
        className="flex size-10 items-center justify-center rounded-[8px] bg-[#E8EEE9] text-[#111118] hover:bg-[#DDE6DF]"
      >
        <Plus size={13} strokeWidth={2.5} />
      </button>
    </div>
  );
}

function LocationSelect({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <FlatLocationSelect
      value={value}
      onChange={onChange}
      className={className}
    />
  );
}

function InventoryLocationCell({
  location,
  onEditLocation,
}: {
  location: string;
  onEditLocation: () => void;
}) {
  return (
    <div className="relative flex min-w-0 items-center gap-1.5">
      <LocationHover
        className="min-w-0 flex-1 text-[12px] text-[#111118]"
        fullAddress={location}
        label="Location"
      >
        {location}
      </LocationHover>
      <button
        type="button"
        aria-label="Edit location"
        title="Edit location"
        onClick={(event) => {
          event.stopPropagation();
          onEditLocation();
        }}
        className="relative z-10 inline-flex size-9 shrink-0 items-center justify-center rounded-[8px] bg-[#F5F5F3] opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
      >
        <img
          src="/icons/change-location.png"
          alt=""
          width={16}
          height={18}
          className="opacity-70"
        />
      </button>
    </div>
  );
}

function FlatLocationSelect({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const label = value || "Select Location";

  useLayoutEffect(() => {
    if (!open) return;

    function place() {
      const button = buttonRef.current;
      if (!button) return;
      const rect = button.getBoundingClientRect();
      const gap = 6;
      const width = Math.min(
        Math.max(rect.width, 240),
        Math.max(160, window.innerWidth - 24),
      );
      let left = rect.left;
      if (left + width > window.innerWidth - 12) {
        left = Math.max(12, rect.right - width);
      }
      setPos({ top: rect.bottom + gap, left, width });
    }

    place();
    requestAnimationFrame(place);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (
        rootRef.current?.contains(target) ||
        listRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={cn("relative min-w-0", className)}>
      <button
        ref={buttonRef}
        type="button"
        aria-label="Location"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="inline-flex h-10 max-w-full items-center gap-1.5 rounded-[8px] px-1 text-left text-[13px] text-[#111118]"
      >
        <ChevronDown
          size={14}
          className={cn(
            "shrink-0 text-[#111118] transition-transform",
            open && "rotate-180",
          )}
        />
        <span className="truncate text-[#111118]">
          {label}
        </span>
      </button>
      {open
        ? createPortal(
            <ul
              ref={listRef}
              role="listbox"
              aria-label="Location"
              className={cn(
                "ui-select-menu fixed z-[80] flex max-h-60 flex-col gap-0",
                "overflow-x-hidden overflow-y-auto overscroll-contain",
                "rounded-[8px] border border-[#E6E6E3] bg-white p-0",
                "shadow-[0_8px_24px_rgba(0,0,0,0.12)]",
              )}
              style={{ top: pos.top, left: pos.left, width: pos.width }}
            >
              {LOCATION_OPTIONS.map((location) => {
                const selected = value === location;
                return (
                  <li
                    key={location}
                    role="presentation"
                    className="m-0 block h-9 max-h-9 min-h-9 shrink-0 list-none overflow-hidden p-0"
                    style={{ height: 36, maxHeight: 36, minHeight: 36 }}
                  >
                    <button
                      type="button"
                      role="option"
                      aria-selected={selected}
                      title={location}
                      onClick={() => {
                        onChange(location);
                        setOpen(false);
                      }}
                      className={cn(
                        "flex h-full w-full shrink-0 items-center overflow-hidden px-3 text-left text-[13px] leading-none whitespace-nowrap transition-colors",
                        selected
                          ? "bg-[#28402B] font-medium text-white"
                          : "bg-white text-[#111118] hover:bg-[#F5F5F3]",
                      )}
                      style={{ height: 36 }}
                    >
                      <span className="block min-w-0 flex-1 truncate overflow-hidden text-ellipsis whitespace-nowrap">
                        {location}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>,
            document.body,
          )
        : null}
    </div>
  );
}

function SplitModal({
  open,
  title,
  itemName,
  itemCount,
  confirmLabel,
  splits,
  onChangeSplits,
  onClose,
  onConfirm,
}: {
  open: boolean;
  title: string;
  itemName: string;
  itemCount: number | string;
  confirmLabel: string;
  splits: LocationSplit[];
  onChangeSplits: (next: LocationSplit[]) => void;
  onClose: () => void;
  onConfirm: () => void;
}) {
  useScrollLock(open);

  if (!open) return null;

  const target =
    typeof itemCount === "number"
      ? itemCount
      : Number.parseInt(String(itemCount), 10) || 0;
  const assigned = splitsTotal(splits);
  const validRows = splits.filter((row) => row.qty > 0 && row.location.trim());
  const canConfirm =
    target > 0 &&
    validRows.length > 0 &&
    assigned === target &&
    validRows.every((row) => row.location.trim());

  function updateRow(index: number, patch: Partial<LocationSplit>) {
    onChangeSplits(
      splits.map((row, rowIndex) =>
        rowIndex === index ? { ...row, ...patch } : row,
      ),
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto overscroll-none p-4 sm:items-center sm:p-6">
      <button
        type="button"
        aria-label="Close dialog overlay"
        className="absolute inset-0 bg-[#333333]/70"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        data-scroll-lock-allow
        className="relative z-10 w-full max-w-[420px] overflow-visible rounded-[12px] bg-white shadow-[0_16px_48px_rgba(0,0,0,0.18)]"
      >
        <div className="flex items-start justify-between gap-4 border-b border-[#ECECEA] px-6 pt-5 pb-3">
          <div className="min-w-0">
            <h2 className="text-[18px] font-semibold tracking-tight text-[#111118]">
              {title}
            </h2>
            <p className="mt-4 text-[14px] font-semibold text-[#111118]">
              {itemName}{" "}
              <span className="font-medium text-[#7A8B9A]">({itemCount})</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded-md p-1 text-[#A9A9A9] hover:bg-[#F5F5F3] hover:text-[#6B6B6B]"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-6 pb-2">
          {splits.map((row, index) => (
            <div
              key={index}
              className={cn(
                "flex items-center gap-5 py-3.5",
                index < splits.length - 1 && "border-b border-[#EEEEEE]",
              )}
            >
              <QtyStepper
                value={row.qty}
                onChange={(qty) => updateRow(index, { qty })}
              />
              <FlatLocationSelect
                value={row.location}
                onChange={(location) => updateRow(index, { location })}
              />
            </div>
          ))}
          {target > 0 && assigned !== target ? (
            <p className="pb-2 text-[12px] text-[#E25B5B]">
              Assigned {assigned} of {target}. Totals must match before
              continuing.
            </p>
          ) : null}
        </div>

        <div className="flex items-center justify-end gap-4 border-t border-[#ECECEA] px-6 py-4">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="dark"
            onClick={onConfirm}
            disabled={!canConfirm}
            size="sm"
            className="rounded-[10px] px-5 text-[14px] font-semibold"
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

function StockItemsView({
  order,
  onClose,
  onComplete,
}: {
  order: ReceivedOrder;
  onClose: () => void;
  onComplete: (order: ReceivedOrder) => void;
}) {
  const [draft, setDraft] = useState(order);
  const [distributeTarget, setDistributeTarget] =
    useState<DistributeTarget | null>(null);
  const [distributeSplits, setDistributeSplits] = useState<LocationSplit[]>([]);
  const [storageError, setStorageError] = useState<string | null>(null);

  const activeItem =
    distributeTarget == null
      ? null
      : (draft.sections
          .find((section) => section.title === distributeTarget.sectionTitle)
          ?.items.find((item) => item.id === distributeTarget.itemId) ?? null);

  const distributeTotal = activeItem
    ? parseUnpackQty(activeItem.qtyAfterUnpack) || activeItem.qty
    : 0;

  const canCompleteStorage = draft.sections.every((section) =>
    section.items.every(stockItemReady),
  );

  const groupedSections = CATEGORY_GROUPS.map((group) => ({
    ...group,
    sections: draft.sections.filter((section) =>
      group.sections.includes(section.title),
    ),
  })).filter((group) => group.sections.length > 0);

  function updateItem(
    sectionTitle: string,
    itemId: string,
    patch: Partial<StockItem>,
  ) {
    setStorageError(null);
    setDraft((current) => ({
      ...current,
      sections: current.sections.map((section) =>
        section.title !== sectionTitle
          ? section
          : {
              ...section,
              items: section.items.map((item) =>
                item.id === itemId ? { ...item, ...patch } : item,
              ),
            },
      ),
    }));
  }

  function openDistribute(sectionTitle: string, item: StockItem) {
    const unpack = parseUnpackQty(item.qtyAfterUnpack) || item.qty;
    const existing =
      item.splits.length > 1
        ? item.splits
        : item.location
          ? [
              {
                qty: unpack,
                location: item.location,
              },
              {
                qty: 0,
                location: nextUnusedLocation([item.location]),
              },
            ]
          : defaultSplits(unpack || 1);

    setDistributeTarget({ sectionTitle, itemId: item.id });
    setDistributeSplits(existing);
  }

  function confirmDistribute() {
    if (!distributeTarget || !activeItem) return;

    const target = parseUnpackQty(activeItem.qtyAfterUnpack) || activeItem.qty;
    const valid = distributeSplits.filter(
      (row) => row.qty > 0 && row.location.trim(),
    );
    if (!valid.length || splitsTotal(valid) !== target) return;

    // §14–15: distributing creates one Stock Items row per location portion.
    setDraft((current) => ({
      ...current,
      sections: current.sections.map((section) => {
        if (section.title !== distributeTarget.sectionTitle) return section;

        const nextItems: StockItem[] = [];
        for (const item of section.items) {
          if (item.id !== distributeTarget.itemId) {
            nextItems.push(item);
            continue;
          }
          valid.forEach((split, index) => {
            nextItems.push({
              ...item,
              id: index === 0 ? item.id : `${item.id}-loc-${index}`,
              qtyAfterUnpack: String(split.qty),
              location: split.location,
              splits: [{ qty: split.qty, location: split.location }],
            });
          });
        }

        return { ...section, items: nextItems };
      }),
    }));
    setDistributeTarget(null);
  }

  function handleComplete() {
    const remaining = incompleteStorageCount(draft.sections);
    if (remaining > 0) {
      setStorageError(
        remaining === 1
          ? "1 item still needs Qty After Unpack and a storage location."
          : `${remaining} items still need Qty After Unpack and a storage location.`,
      );
      return;
    }
    setStorageError(null);
    onComplete(draft);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
      <Header title="Stock Items" />

      <div className="flex-1 overflow-auto px-4 md:px-7 py-5">
        <div className="space-y-8">
          {groupedSections.map((group) => (
            <div key={group.title}>
              <h2 className="mb-4 text-[20px] font-semibold text-[#111118]">
                {group.title}
              </h2>
              <div className="space-y-5">
                {group.sections.map((section) => (
                  <div key={section.title}>
                    <ScrollTable minWidth={1240} className="rounded-[12px]">
                      {/* Meta: category | IN STOCK over unpack+exp | DATE RECEIVING BY over print */}
                      <div
                        className={cn(
                          STOCK_GRID,
                          "border-b border-[#E8E8E6] bg-[#FBF9F9] px-4 py-2.5",
                        )}
                      >
                        <span className="col-span-2 min-w-0 text-[14px] font-semibold tracking-normal text-[#111118] normal-case">
                          {section.title}
                        </span>
                        <span aria-hidden className="min-w-0" />
                        <span aria-hidden className="min-w-0" />
                        <span
                          className={cn(
                            "col-span-2 min-w-0 text-center",
                            TABLE_HEADER,
                          )}
                        >
                          In Stock
                        </span>
                        <span aria-hidden className="min-w-0" />
                        <span aria-hidden className="min-w-0" />
                        <span
                          className={cn(
                            "col-span-2 min-w-0 text-start whitespace-nowrap",
                            TABLE_HEADER,
                          )}
                        >
                          Date Receiving By
                        </span>
                      </div>

                      <div
                        className={cn(
                          STOCK_GRID,
                          "border-b border-[#F0F0EE] bg-white px-4 py-2",
                          TABLE_HEADER,
                        )}
                      >
                        <span className="min-w-0 truncate">Order ID</span>
                        <span className="min-w-0 truncate">Item Name</span>
                        <span className="min-w-0 truncate">Qty</span>
                        <span className="min-w-0 truncate">Unit</span>
                        <span className="min-w-0 truncate">Qty After Unpack</span>
                        <span className="min-w-0 truncate">Exp. Date</span>
                        <span className="min-w-0 truncate">Enter Location</span>
                        <span aria-hidden className="min-w-0" />
                        <span aria-hidden className="min-w-0" />
                        <span aria-hidden className="min-w-0" />
                      </div>

                      {section.items.map((item) => {
                        const printQty = parseUnpackQty(item.qtyAfterUnpack);
                        const rowReady = stockItemReady(item);
                        return (
                          <div
                            key={item.id}
                            className={cn(
                              STOCK_GRID,
                              "group border-b border-[#F0F0EE] bg-white px-4 py-3 text-[13px] text-[#111118] last:border-b-0",
                              storageError && !rowReady && "bg-[#FFF8F6]",
                            )}
                          >
                            <span className={cn(ID_PILL, "min-w-0 justify-self-start")}>
                              {item.orderId}
                            </span>
                            <span className="min-w-0 truncate font-semibold">
                              {item.itemName}
                            </span>
                            <span className="min-w-0 font-bold">{item.qty}</span>
                            <span className="min-w-0 font-bold">{item.unit}</span>
                            <div className="min-w-0">
                              <Input
                                value={item.qtyAfterUnpack}
                                onChange={(event) =>
                                  updateItem(section.title, item.id, {
                                    qtyAfterUnpack: event.target.value,
                                    splits: [],
                                  })
                                }
                                className="w-[72px] max-w-[72px] shrink-0 px-2 text-left"
                              />
                            </div>
                            <span className="min-w-0 truncate whitespace-nowrap">
                              {item.expDate}
                            </span>
                            <div className="min-w-0 overflow-hidden">
                              <LocationSelect
                                value={item.location}
                                onChange={(location) =>
                                  updateItem(section.title, item.id, {
                                    location,
                                    splits:
                                      location &&
                                      parseUnpackQty(item.qtyAfterUnpack)
                                        ? [
                                            {
                                              qty: parseUnpackQty(
                                                item.qtyAfterUnpack,
                                              ),
                                              location,
                                            },
                                          ]
                                        : [],
                                  })
                                }
                                className="min-w-0"
                              />
                            </div>
                            <span aria-hidden className="min-w-0" />
                            <button
                              type="button"
                              aria-label="Distribute item"
                              onClick={() =>
                                openDistribute(section.title, item)
                              }
                              className="inline-flex size-9 shrink-0 items-center justify-center justify-self-center rounded-[8px] bg-[#F5F5F3] opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                            >
                              <img
                                src="/icons/change-location.png"
                                alt=""
                                width={16}
                                height={18}
                                className="opacity-70"
                              />
                            </button>
                            <button
                              type="button"
                              onClick={() => printStockLabel(item)}
                              className="inline-flex h-10 min-w-0 items-center justify-self-end gap-1 whitespace-nowrap text-[13px] font-semibold"
                            >
                              {printQty > 0 ? (
                                <span className="text-[#777777]">
                                  ({printQty})
                                </span>
                              ) : null}
                              <span className="text-[#2165D4]">Print Label</span>
                            </button>
                          </div>
                        );
                      })}
                    </ScrollTable>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2 border-t border-[#ECECEA] bg-white px-4 py-4 md:px-7">
        {storageError ? (
          <p className="text-right text-[12px] text-[#E25B5B]">{storageError}</p>
        ) : null}
        <div className="flex items-center justify-end gap-4">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 items-center rounded-[10px] px-4 text-[14px] font-medium text-[#111118]"
          >
            Cancel & Close
          </button>
          <button
            type="button"
            onClick={handleComplete}
            aria-disabled={!canCompleteStorage}
            className={cn(
              "inline-flex h-10 items-center rounded-[10px] px-6 text-[14px] font-semibold text-white transition-opacity",
              !canCompleteStorage && "opacity-50",
            )}
            style={{ background: ORANGE }}
          >
            Complete Storage
          </button>
        </div>
      </div>

      <SplitModal
        open={distributeTarget != null && activeItem != null}
        title="Distribute Item"
        itemName={activeItem?.itemName ?? ""}
        itemCount={distributeTotal}
        confirmLabel="Distribute"
        splits={distributeSplits}
        onChangeSplits={setDistributeSplits}
        onClose={() => setDistributeTarget(null)}
        onConfirm={confirmDistribute}
      />
    </div>
  );
}

type EditLocationTarget = {
  sectionTitle: string;
  productId: string;
  lotIndex: number;
};

export default function InventoryPage() {
  useDocumentTitle("Inventory");
  const { pendingHandoffs, removeHandoff } = useReceivingHandoff();

  const [query, setQuery] = useState("");
  const [itemFilter, setItemFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [unitFilter, setUnitFilter] = useState("");
  const [distributorFilter, setDistributorFilter] = useState("");
  const [sections, setSections] = useState(INITIAL_SECTIONS);
  const [seedOrders, setSeedOrders] = useState(RECEIVED_ORDERS);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [storingId, setStoringId] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [editTarget, setEditTarget] = useState<EditLocationTarget | null>(null);
  const [editSplits, setEditSplits] = useState<LocationSplit[]>([]);

  const handoffOrders = useMemo<ReceivedOrder[]>(() => {
    return pendingHandoffs.map((handoff) => {
      const sectionsFromHandoff = handoffToStockSections(
        handoff.deliveryId,
        handoff.items,
      );
      const itemCount = handoff.items.length;
      return {
        id: handoff.deliveryId,
        supplier: handoff.distributor,
        itemsCount: `${itemCount} item${itemCount === 1 ? "" : "s"}`,
        receivedAt: handoff.receivedAt,
        sections: sectionsFromHandoff,
      };
    });
  }, [pendingHandoffs]);

  const orders = useMemo(() => {
    const seedIds = new Set(seedOrders.map((order) => order.id));
    const uniqueHandoffs = handoffOrders.filter(
      (order) => !seedIds.has(order.id),
    );
    return [...uniqueHandoffs, ...seedOrders];
  }, [handoffOrders, seedOrders]);

  const activeOrder = orders.find((order) => order.id === storingId) ?? null;

  const editProduct =
    editTarget == null
      ? null
      : (sections
          .find((section) => section.title === editTarget.sectionTitle)
          ?.products.find((product) => product.id === editTarget.productId) ??
        null);
  const editLot =
    editProduct && editTarget
      ? (editProduct.lots[editTarget.lotIndex] ?? null)
      : null;
  const editTotal = editLot?.qty ?? 0;

  const itemOptions = useMemo(
    () =>
      Array.from(
        new Set(
          sections.flatMap((section) =>
            section.products.map((product) => product.name),
          ),
        ),
      ).sort(),
    [sections],
  );

  const categoryOptions = useMemo(
    () => sections.map((section) => section.title),
    [sections],
  );

  const unitOptions = useMemo(
    () =>
      Array.from(
        new Set(
          sections.flatMap((section) =>
            section.products.flatMap((product) =>
              product.lots.map((lot) => lot.unit),
            ),
          ),
        ),
      ).sort(),
    [sections],
  );

  const distributorOptions = useMemo(
    () =>
      Array.from(
        new Set(
          sections.flatMap((section) =>
            section.products.flatMap((product) =>
              product.lots.map((lot) => lot.distributor),
            ),
          ),
        ),
      ).sort(),
    [sections],
  );

  const filteredSections = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    return sections
      .map((section) => ({
        ...section,
        products: section.products.filter((product) => {
          const matchesQuery =
            !normalized ||
            product.name.toLowerCase().includes(normalized) ||
            product.lots.some(
              (lot) =>
                lot.orderId.toLowerCase().includes(normalized) ||
                lot.distributor.toLowerCase().includes(normalized) ||
                lot.source.toLowerCase().includes(normalized),
            );

          const matchesItem = !itemFilter || product.name === itemFilter;
          const matchesCategory =
            !categoryFilter || section.title === categoryFilter;
          const matchesUnit =
            !unitFilter || product.lots.some((lot) => lot.unit === unitFilter);
          const matchesDistributor =
            !distributorFilter ||
            product.lots.some((lot) => lot.distributor === distributorFilter);

          return (
            matchesQuery &&
            matchesItem &&
            matchesCategory &&
            matchesUnit &&
            matchesDistributor
          );
        }),
      }))
      .filter(
        (section) =>
          section.products.length > 0 &&
          (!categoryFilter || section.title === categoryFilter),
      );
  }, [
    categoryFilter,
    distributorFilter,
    itemFilter,
    query,
    sections,
    unitFilter,
  ]);

  const filteredGroups = useMemo(
    () =>
      CATEGORY_GROUPS.map((group) => ({
        ...group,
        sections: filteredSections.filter((section) =>
          group.sections.includes(section.title),
        ),
      })).filter((group) => group.sections.length > 0),
    [filteredSections],
  );

  function toggleExpanded(id: string) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function openEditLocation(
    sectionTitle: string,
    productId: string,
    lotIndex: number,
  ) {
    const section = sections.find((entry) => entry.title === sectionTitle);
    const product = section?.products.find((entry) => entry.id === productId);
    const lot = product?.lots[lotIndex];
    if (!lot) return;

    setEditTarget({ sectionTitle, productId, lotIndex });
    setEditSplits([
      { qty: lot.qty, location: lot.location },
      { qty: 0, location: nextUnusedLocation([lot.location]) },
    ]);
  }

  function confirmEditLocation() {
    if (!editTarget || !editLot || !editProduct) return;

    const valid = editSplits.filter(
      (row) => row.qty > 0 && row.location.trim(),
    );
    if (!valid.length || splitsTotal(valid) !== editLot.qty) return;

    setSections((current) =>
      current.map((section) => {
        if (section.title !== editTarget.sectionTitle) return section;
        return {
          ...section,
          products: section.products.map((product) => {
            if (product.id !== editTarget.productId) return product;
            const nextLots = [...product.lots];
            const base = nextLots[editTarget.lotIndex];
            if (!base) return product;
            nextLots.splice(
              editTarget.lotIndex,
              1,
              ...valid.map((split) => ({
                ...base,
                qty: split.qty,
                location: split.location,
              })),
            );
            return { ...product, lots: nextLots };
          }),
        };
      }),
    );
    setEditTarget(null);
  }

  function completeStorage(order: ReceivedOrder) {
    const deliveryDate = order.receivedAt
      .replace(" · ", ", ")
      .replace(" PM", "")
      .replace(" AM", "");
    const storedProductIds = new Set<string>();

    for (const section of order.sections) {
      for (const item of section.items) {
        if (!stockItemReady(item)) continue;
        const productId = PRODUCT_MATCH[item.itemName];
        if (productId) storedProductIds.add(productId);
      }
    }

    setSeedOrders((current) => current.filter((item) => item.id !== order.id));
    removeHandoff(order.id);

    setSections((current) => {
      const next = current.map((section) => ({
        ...section,
        products: section.products.map((product) => ({
          ...product,
          lots: [...product.lots],
        })),
      }));

      for (const section of order.sections) {
        for (const item of section.items) {
          if (!stockItemReady(item)) continue;

          const productId = PRODUCT_MATCH[item.itemName];
          if (!productId) continue;

          const unpack = parseUnpackQty(item.qtyAfterUnpack);
          // Each Stock Items row is already a location portion after distribute.
          const splitPlacements = item.splits.filter(
            (row) => row.qty > 0 && row.location.trim(),
          );
          const placements =
            splitPlacements.length > 0
              ? splitPlacements
              : [{ qty: unpack, location: stockItemLocation(item) }];

          for (const inventorySection of next) {
            const product = inventorySection.products.find(
              (entry) => entry.id === productId,
            );
            if (!product) continue;

            for (const placement of placements) {
              product.lots.push({
                orderId: item.orderId,
                deliveryId: item.deliveryId ?? order.id,
                distributor: order.supplier,
                source:
                  item.source ??
                  sectionSourceFor(inventorySection.title, item.itemName),
                deliveryDate,
                purchased: item.purchased ?? "$125/case",
                qty: placement.qty,
                location: placement.location,
                unit: item.unit === "Case" ? "1lb" : item.unit,
              });
            }
          }
        }
      }

      return next;
    });

    setExpanded((current) => {
      const next = new Set(current);
      storedProductIds.forEach((id) => next.add(id));
      return next;
    });
    setStoringId(null);
    setShowToast(true);
    window.setTimeout(() => setShowToast(false), 2500);
  }

  if (activeOrder) {
    return (
      <StockItemsView
        order={activeOrder}
        onClose={() => setStoringId(null)}
        onComplete={completeStorage}
      />
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
      <Header
        title="Inventory"
        toolbar={
          <div className="flex w-full flex-wrap items-center gap-2 md:flex-nowrap">
            <div className="relative w-full sm:w-[220px]">
              <Search
                size={13}
                className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[#A9A9A9]"
              />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search"
                className="w-full pl-8"
              />
            </div>

            <Select
              value={itemFilter}
              onChange={setItemFilter}
              className="w-full sm:w-[160px]"
              aria-label="All Items"
              options={[
                { value: "", label: "All Items" },
                ...itemOptions.map((name) => ({ value: name, label: name })),
              ]}
            />
            <Select
              value={categoryFilter}
              onChange={setCategoryFilter}
              className="w-full sm:w-[160px]"
              aria-label="All Categories"
              options={[
                { value: "", label: "All Categories" },
                ...categoryOptions.map((name) => ({
                  value: name,
                  label: name,
                })),
              ]}
            />
            <Select
              value={unitFilter}
              onChange={setUnitFilter}
              className="w-full sm:w-[140px]"
              aria-label="All Units"
              options={[
                { value: "", label: "All Units" },
                ...unitOptions.map((unit) => ({ value: unit, label: unit })),
              ]}
            />
            <Select
              value={distributorFilter}
              onChange={setDistributorFilter}
              className="w-full sm:w-[170px]"
              aria-label="All Distributors"
              options={[
                { value: "", label: "All Distributors" },
                ...distributorOptions.map((distributor) => ({
                  value: distributor,
                  label: distributor,
                })),
              ]}
            />
          </div>
        }
      />

      <div className="flex-1 overflow-auto px-4 pt-8 pb-5 md:px-7">
        {orders.length ? (
          <div className="mb-5 space-y-2.5">
            {orders.map((order) => (
              <div key={order.id} className="overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setStoringId(order.id)}
                  className="flex w-full min-w-[720px] items-center rounded-[12px] px-5 py-3.5 text-left text-white"
                  style={{ background: GREEN }}
                >
                  <span className="shrink-0 text-[13px] font-medium whitespace-nowrap">
                    Order Received
                  </span>
                  <span
                    aria-hidden
                    className="mx-5 h-[18px] w-px shrink-0 self-center bg-white/70"
                  />
                  <span className="min-w-0 flex-[1.4] truncate pl-0 text-[14px] font-semibold">
                    {order.supplier}
                  </span>
                  <span className="ml-4 w-[100px] shrink-0 text-[13px] whitespace-nowrap">
                    {order.itemsCount}
                  </span>
                  <span className="ml-4 min-w-[160px] flex-1 text-[13px] whitespace-nowrap">
                    {order.receivedAt}
                  </span>
                  <ChevronRight
                    size={28}
                    strokeWidth={2.25}
                    className="ml-4 shrink-0 text-white"
                  />
                </button>
              </div>
            ))}
          </div>
        ) : null}

        <div className="space-y-8">
          {filteredGroups.map((group) => (
            <section key={group.title}>
              <h2 className="mb-4 text-[20px] font-semibold text-[#111118]">
                {group.title}
              </h2>

              <div className="space-y-5">
                {group.sections.map((section) => (
                  <div key={section.title}>
                    <ScrollTable minWidth={1100} className="rounded-[12px]">
                      <div className="border-b border-[#E8E8E6] bg-[#FBF9F9] px-3 py-2.5">
                        <span className="text-[14px] font-semibold text-[#111118]">
                          {section.title}
                        </span>
                      </div>

                      <div
                        className={cn(
                          GRID,
                          "border-b border-[#F0F0EE] bg-white px-3 py-2.5",
                          TABLE_HEADER,
                        )}
                      >
                        <div />
                        <div className="whitespace-nowrap">Order ID</div>
                        <div className="whitespace-nowrap">Distributor</div>
                        <div className="whitespace-nowrap">
                          {section.sourceLabel}
                        </div>
                        <div className="whitespace-nowrap">Delivery Date</div>
                        <div className="whitespace-nowrap">Purchased</div>
                        <div className="whitespace-nowrap">Qty Portion</div>
                        <div className="whitespace-nowrap">Unit</div>
                        <div className="whitespace-nowrap">Location</div>
                      </div>

                      {section.products.map((product, index) => {
                        const open = expanded.has(product.id);
                        const total = stockTotal(product);
                        const isLast = index === section.products.length - 1;

                        return (
                          <div
                            key={product.id}
                            className={cn(
                              !isLast || open
                                ? "border-b border-[#F0F0EE]"
                                : "",
                            )}
                          >
                            <button
                              type="button"
                              onClick={() => toggleExpanded(product.id)}
                              className={cn(
                                GRID,
                                "w-full bg-white px-3 py-3.5 text-left hover:bg-[#FAFAF8]",
                              )}
                            >
                              <span className="flex justify-center text-[#8A8A8A]">
                                <ChevronDown
                                  size={14}
                                  className={cn(
                                    "transition-transform",
                                    open
                                      ? "rotate-0 text-[#E25B5B]"
                                      : "-rotate-90",
                                  )}
                                />
                              </span>
                              <div className="col-span-5 min-w-0 truncate text-[13px] font-semibold text-[#111118]">
                                {product.name}
                              </div>
                              <div
                                className={cn(
                                  "text-[13px] font-semibold whitespace-nowrap",
                                  total === 0
                                    ? "text-[#E25B5B]"
                                    : "text-[#111118]",
                                )}
                              >
                                {total === 0 ? "Empty" : total}
                              </div>
                              <div />
                              <div />
                            </button>

                            {open ? (
                              <div>
                                {product.lots.length ? (
                                  product.lots.map((lot, lotIndex) => (
                                    <div
                                      key={`${product.id}-${lot.orderId}-${lot.location}-${lotIndex}`}
                                      className={cn(
                                        GRID,
                                        "group bg-[#F9FAFB] px-3 py-3 text-[12px] text-[#111118]",
                                        lotIndex < product.lots.length - 1
                                          ? "border-b border-[#F0F0EE]"
                                          : "",
                                      )}
                                    >
                                      <div />
                                      <span className={ID_PILL}>
                                        {lot.orderId}
                                      </span>
                                      <div className="min-w-0 truncate">
                                        {lot.distributor}
                                      </div>
                                      <div className="min-w-0 truncate">
                                        {lot.source}
                                      </div>
                                      <div className="whitespace-nowrap">
                                        {lot.deliveryDate}
                                      </div>
                                      <div className="whitespace-nowrap">
                                        {lot.purchased}
                                      </div>
                                      <div className="font-semibold">
                                        {lot.qty}
                                      </div>
                                      <div className="whitespace-nowrap">
                                        {lot.unit}
                                      </div>
                                      <InventoryLocationCell
                                        location={lot.location}
                                        onEditLocation={() =>
                                          openEditLocation(
                                            section.title,
                                            product.id,
                                            lotIndex,
                                          )
                                        }
                                      />
                                    </div>
                                  ))
                                ) : (
                                  <div
                                    className={cn(
                                      GRID,
                                      "bg-[#F9FAFB] px-3 py-3 text-[12px] text-[#8A8A8A]",
                                    )}
                                  >
                                    <div />
                                    <span className="w-fit rounded-[6px] bg-[#EEF0F4] px-2 py-0.5 text-center text-[11px]">
                                      -
                                    </span>
                                    <div className="col-span-7">
                                      Inventory Empty
                                    </div>
                                  </div>
                                )}
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </ScrollTable>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        {!filteredSections.length ? (
          <div className="rounded-[10px] border border-[#ECECEA] bg-white px-6 py-12 text-center text-[14px] text-[#8A8A8A]">
            No inventory matches your filters.
          </div>
        ) : null}
      </div>

      <SplitModal
        open={editTarget != null && editLot != null && editProduct != null}
        title="Edit Location"
        itemName={editProduct?.name ?? ""}
        itemCount={editTotal}
        confirmLabel="Edit"
        splits={editSplits}
        onChangeSplits={setEditSplits}
        onClose={() => setEditTarget(null)}
        onConfirm={confirmEditLocation}
      />

      {showToast ? (
        <div className="pointer-events-none fixed right-6 bottom-6 flex items-center gap-2 rounded-[10px] bg-[#12B72A] px-6 py-4 text-[14px] font-medium text-white shadow-lg">
          <span className="inline-flex size-4 items-center justify-center rounded-full bg-white text-[#12B72A]">
            <Check size={11} strokeWidth={3} />
          </span>
          Items Stored Successfully
        </div>
      ) : null}
    </div>
  );
}

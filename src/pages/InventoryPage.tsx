import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, ChevronRight, Minus, Plus, X } from "lucide-react";

import { Header } from "@/components/layout/AdminHeader";
import { LocationHover } from "@/components/shared/LocationHover";
import { AppLoader } from "@/components/ui/AppLoader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ScrollTable } from "@/components/ui/ScrollTable";
import { SearchField } from "@/components/ui/SearchField";
import { Select } from "@/components/ui/Select";
import { PINNED_HEADER, TABLE_HEADER, ID_PILL } from "@/constants/table";
import { useReceivingHandoff } from "@/context/ReceivingHandoffContext";
import { useAppCatalog } from "@/context/AppCatalogContext";
import { useApiFeedback } from "@/hooks/useApiFeedback";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useLazyWindow } from "@/hooks/useLazyWindow";
import { InfiniteScrollSentinel } from "@/components/ui/InfiniteScrollSentinel";
import { useFloatingMenu } from "@/hooks/useFloatingMenu";
import { useScrollLock } from "@/hooks/useScrollLock";
import { inventoryApi, isApiConfigured } from "@/lib/api";
import { buildInventoryPayload, flattenInventory } from "@/lib/api/inventory";
import type { ApiInventory } from "@/lib/api/types";
import { cn } from "@/utils/cn";
import { floatingMenuStyle } from "@/utils/floatingMenu";
import { categoryNamesFromCatalog } from "@/utils/categories";
import { isUuid, recordRef } from "@/utils/entityIds";
import {
  buildInventorySections,
  groupInventorySections,
  type InventoryProduct,
} from "@/utils/inventoryView";
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

type LocationSplit = {
  qty: number;
  location: string;
};

type StockItem = {
  id: string;
  orderId: string;
  deliveryId?: string;
  catalogItemId: string;
  itemName: string;
  source?: string;
  purchased?: string;
  qty: number;
  unit: string;
  qtyAfterUnpack: string;
  expDate: string;
  expirationIso: string;
  location: string;
  splits: LocationSplit[];
};

type StockSection = {
  id: string;
  group: string;
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
  sectionId: string;
  itemId: string;
};

function stockItemLocation(item: StockItem) {
  const direct = item.location.trim();
  if (direct) return direct;
  const fromSplit = item.splits.find(
    (row) => row.qty > 0 && row.location.trim(),
  );
  return fromSplit?.location.trim() ?? "";
}

function stockItemReady(item: StockItem) {
  return (
    parseUnpackQty(item.qtyAfterUnpack) > 0 && Boolean(stockItemLocation(item))
  );
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
  const popup = window.open(
    "",
    "_blank",
    "noopener,noreferrer,width=420,height=520",
  );
  if (!popup) return;
  popup.document
    .write(`<!doctype html><html><head><title>Label ${item.orderId}</title>
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
  "grid grid-cols-[28px_minmax(96px,0.9fr)_minmax(150px,1.3fr)_minmax(140px,1.2fr)_minmax(150px,1.3fr)_minmax(100px,0.9fr)_minmax(100px,0.8fr)_minmax(72px,0.55fr)_minmax(120px,1fr)] items-center gap-x-3 px-3";

const STOCK_GRID =
  "grid grid-cols-[300px_minmax(0,1.4fr)_40px_52px_152px_100px_minmax(0,1fr)_minmax(72px,1fr)_40px_124px] items-center gap-x-4 px-4";

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
  address,
  onEditLocation,
}: {
  location: string;
  address?: string;
  onEditLocation: () => void;
}) {
  return (
    <div className="relative flex min-w-0 items-center gap-1.5">
      <LocationHover
        className="min-w-0 flex-1 text-[12px] text-[#111118]"
        fullAddress={address || location}
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
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const menuBox = useFloatingMenu(open, buttonRef, listRef, {
    minWidth: 240,
    maxHeight: 240,
  });
  const label = value || "Select Location";
  const options = [
    ...(value && !(LOCATION_OPTIONS as readonly string[]).includes(value)
      ? [value]
      : []),
    ...LOCATION_OPTIONS,
  ];

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
        <span className="truncate text-[#111118]">{label}</span>
      </button>
      {open
        ? createPortal(
            <ul
              ref={listRef}
              role="listbox"
              aria-label="Location"
              data-scroll-lock-allow
              className={cn(
                "ui-select-menu fixed z-[80] flex flex-col gap-0",
                "overflow-x-hidden overflow-y-auto overscroll-contain",
                "rounded-[8px] border border-[#00000014] bg-white p-0",
                "shadow-[0_8px_24px_rgba(0,0,0,0.12)]",
              )}
              style={floatingMenuStyle(menuBox)}
            >
              {options.map((location) => {
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
  confirming = false,
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
  confirming?: boolean;
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
        <div className="flex items-start justify-between gap-4 border-b border-[#00000014] px-6 pt-5 pb-3">
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
                index < splits.length - 1 && "border-b border-[#00000014]",
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

        <div className="flex items-center justify-end gap-4 border-t border-[#00000014] px-6 py-4">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="dark"
            onClick={onConfirm}
            disabled={!canConfirm || confirming}
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
  onComplete: (
    order: ReceivedOrder,
  ) => Promise<{ ok: boolean; storedIds: string[] }>;
}) {
  const [draft, setDraft] = useState(order);
  const [distributeTarget, setDistributeTarget] =
    useState<DistributeTarget | null>(null);
  const [distributeSplits, setDistributeSplits] = useState<LocationSplit[]>([]);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const activeItem =
    distributeTarget == null
      ? null
      : (draft.sections
          .find((section) => section.id === distributeTarget.sectionId)
          ?.items.find((item) => item.id === distributeTarget.itemId) ?? null);

  const distributeTotal = activeItem
    ? parseUnpackQty(activeItem.qtyAfterUnpack) || activeItem.qty
    : 0;

  const canCompleteStorage = draft.sections.every((section) =>
    section.items.every(stockItemReady),
  );

  const groupedSections = draft.sections.reduce<
    Array<{ title: string; sections: StockSection[] }>
  >((groups, section) => {
    const current = groups.find((group) => group.title === section.group);
    if (current) current.sections.push(section);
    else groups.push({ title: section.group, sections: [section] });
    return groups;
  }, []);

  function updateItem(
    sectionId: string,
    itemId: string,
    patch: Partial<StockItem>,
  ) {
    setStorageError(null);
    setDraft((current) => ({
      ...current,
      sections: current.sections.map((section) =>
        section.id !== sectionId
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

  function openDistribute(sectionId: string, item: StockItem) {
    const unpack = parseUnpackQty(item.qtyAfterUnpack);
    if (unpack <= 0) {
      setStorageError("Enter Qty After Unpack before distributing this item.");
      return;
    }
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

    setDistributeTarget({ sectionId, itemId: item.id });
    setDistributeSplits(existing);
  }

  function confirmDistribute() {
    if (!distributeTarget || !activeItem) return;

    const target = parseUnpackQty(activeItem.qtyAfterUnpack);
    const valid = distributeSplits.filter(
      (row) => row.qty > 0 && row.location.trim(),
    );
    if (!valid.length || splitsTotal(valid) !== target) return;

    // §14–15: distributing creates one Stock Items row per location portion.
    setDraft((current) => ({
      ...current,
      sections: current.sections.map((section) => {
        if (section.id !== distributeTarget.sectionId) return section;

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

  async function handleComplete() {
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
    setSaving(true);
    try {
      const result = await onComplete(draft);
      if (result.ok) return;
      const stored = new Set(result.storedIds);
      if (stored.size === 0) return;
      setDraft((current) => ({
        ...current,
        sections: current.sections
          .map((section) => ({
            ...section,
            items: section.items.filter((item) => !stored.has(item.id)),
          }))
          .filter((section) => section.items.length > 0),
      }));
      setStorageError(
        "Some items were stored. Finish the remaining items to complete this order.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#FAFAFA]">
      <Header title="Stock Items" />

      <div className="min-h-0 flex-1 overflow-auto bg-[#FAFAFA] p-4 md:p-7">
        <div className="space-y-8">
          {groupedSections.map((group) => {
            const showHeading =
              group.sections.length > 1 ||
              group.sections[0]?.title !== group.title;
            return (
              <div key={group.title}>
                {showHeading ? (
                  <h2 className="mb-4 text-[20px] font-semibold text-[#111118]">
                    {group.title}
                  </h2>
                ) : null}
                <div className="space-y-5">
                  {group.sections.map((section) => (
                    <div key={section.id}>
                      <ScrollTable minWidth={1440} className="rounded-[12px]">
                        <div>
                          {/* Meta: category | IN STOCK over unpack+exp | DATE RECEIVING BY over print */}
                          <div
                            className={cn(
                              STOCK_GRID,
                              "h-10 items-center border-b border-[#00000014] bg-[#FBF9F9]",
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
                              PINNED_HEADER,
                              "h-10 border-b border-[#00000014]",
                              TABLE_HEADER,
                            )}
                          >
                            <span className="min-w-0 truncate">Order ID</span>
                            <span className="min-w-0 truncate">Item Name</span>
                            <span className="min-w-0 truncate">Qty</span>
                            <span className="min-w-0 truncate">Unit</span>
                            <span className="min-w-0 truncate">
                              Qty After Unpack
                              <span className="text-danger"> *</span>
                            </span>
                            <span className="min-w-0 truncate">Exp. Date</span>
                            <span className="min-w-0 truncate">
                              Enter Location
                              <span className="text-danger"> *</span>
                            </span>
                            <span aria-hidden className="min-w-0" />
                            <span aria-hidden className="min-w-0" />
                            <span aria-hidden className="min-w-0" />
                          </div>

                          {section.items.map((item) => {
                            const printQty = parseUnpackQty(
                              item.qtyAfterUnpack,
                            );
                            const rowReady = stockItemReady(item);
                            return (
                              <div
                                key={item.id}
                                className={cn(
                                  STOCK_GRID,
                                  "group border-b border-[#00000014] bg-white py-3 text-[13px] text-[#111118] last:border-b-0",
                                  storageError && !rowReady && "bg-[#FFF8F6]",
                                )}
                              >
                                <span
                                  className={cn(ID_PILL, "justify-self-start")}
                                  title={item.orderId}
                                >
                                  {item.orderId}
                                </span>
                                <span className="min-w-0 truncate font-semibold">
                                  {item.itemName}
                                </span>
                                <span className="min-w-0 font-bold">
                                  {item.qty}
                                </span>
                                <span className="min-w-0 font-bold">
                                  {item.unit}
                                </span>
                                <div className="min-w-0">
                                  <Input
                                    value={item.qtyAfterUnpack}
                                    onChange={(event) =>
                                      updateItem(section.id, item.id, {
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
                                      updateItem(section.id, item.id, {
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
                                    openDistribute(section.id, item)
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
                                  className="inline-flex h-10 min-w-0 items-center gap-1 justify-self-end text-[13px] font-semibold whitespace-nowrap"
                                >
                                  {printQty > 0 ? (
                                    <span className="text-[#777777]">
                                      ({printQty})
                                    </span>
                                  ) : null}
                                  <span className="text-[#2165D4]">
                                    Print Label
                                  </span>
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </ScrollTable>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-2 border-t border-[#00000014] bg-white px-4 py-4 md:px-7">
        {storageError ? (
          <p className="text-right text-[12px] text-[#E25B5B]">
            {storageError}
          </p>
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
            onClick={() => void handleComplete()}
            disabled={saving}
            aria-disabled={!canCompleteStorage || saving}
            className={cn(
              "inline-flex h-10 items-center rounded-[10px] px-6 text-[14px] font-semibold text-white transition-opacity",
              (!canCompleteStorage || saving) && "opacity-50",
            )}
            style={{ background: ORANGE }}
          >
            {saving ? "Storing…" : "Complete Storage"}
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
  sectionId: string;
  productId: string;
  lotIndex: number;
};

function placementsFor(item: StockItem): LocationSplit[] {
  const unpack = parseUnpackQty(item.qtyAfterUnpack);
  const splitPlacements = item.splits.filter(
    (row) => row.qty > 0 && row.location.trim(),
  );
  if (splitPlacements.length > 0) return splitPlacements;
  const location = stockItemLocation(item);
  return location ? [{ qty: unpack, location }] : [];
}

function handoffFromRemaining(order: ReceivedOrder) {
  return {
    deliveryId: order.id,
    distributor: order.supplier,
    receivedAt: order.receivedAt,
    items: order.sections.flatMap((section) =>
      section.items.map((item) => ({
        lineId: item.id,
        itemId: item.orderId,
        catalogItemId: item.catalogItemId,
        itemName: item.itemName,
        category: section.title,
        source: item.source ?? "",
        quantity: item.qty,
        unit: item.unit,
        unitPrice: 0,
        priceLabel: item.purchased ?? "",
        expiration: item.expirationIso,
        status: "accepted" as const,
        qtyAfterUnpack: item.qtyAfterUnpack,
        location: item.location,
        splits: item.splits,
      })),
    ),
  };
}

export default function InventoryPage() {
  useDocumentTitle("Inventory");
  const { pendingHandoffs, removeHandoff, pushHandoff } = useReceivingHandoff();
  const {
    items: catalogItems,
    products,
    categories,
    isBootstrapping,
  } = useAppCatalog();
  const { notifyApiError } = useApiFeedback();

  const [query, setQuery] = useState("");
  const [itemFilter, setItemFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [unitFilter, setUnitFilter] = useState("");
  const [distributorFilter, setDistributorFilter] = useState("");
  const [inventoryRows, setInventoryRows] = useState<ApiInventory[]>([]);
  const [loading, setLoading] = useState(() => isApiConfigured());
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [detailEpoch, setDetailEpoch] = useState(0);
  const [storingId, setStoringId] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [savingLocation, setSavingLocation] = useState(false);
  const [editTarget, setEditTarget] = useState<EditLocationTarget | null>(null);
  const editRequest = useRef(0);
  const loadedLotIds = useRef(new Set<string>());
  const inflightLotIds = useRef(new Set<string>());
  const [editSplits, setEditSplits] = useState<LocationSplit[]>([]);

  const sections = useMemo(
    () =>
      buildInventorySections(
        catalogItems,
        inventoryRows,
        categoryNamesFromCatalog(categories),
      )
        .map((section) => ({
          ...section,
          products: section.products.filter(
            (product) => product.lots.length > 0,
          ),
        }))
        .filter((section) => section.products.length > 0),
    [catalogItems, categories, inventoryRows],
  );
  const sectionsRef = useRef(sections);
  sectionsRef.current = sections;

  useEffect(() => {
    if (!isApiConfigured()) {
      setLoading(false);
      return;
    }
    if (isBootstrapping) return;

    let cancelled = false;

    void inventoryApi
      .list()
      .then((rows) => {
        if (!cancelled) setInventoryRows(rows);
      })
      .catch((error) => {
        if (cancelled) return;
        notifyApiError(error, "Failed to load inventory.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // Fetch once after catalog bootstrap; remapping on every catalogItems identity change caused duplicate GETs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBootstrapping]);

  const handoffOrders = useMemo<ReceivedOrder[]>(() => {
    return pendingHandoffs.map((handoff) => {
      const sectionsFromHandoff = handoffToStockSections(
        handoff.deliveryId,
        handoff.items,
        catalogItems,
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
  }, [catalogItems, pendingHandoffs]);

  const orders = handoffOrders;

  const activeOrder = orders.find((order) => order.id === storingId) ?? null;

  const editProduct =
    editTarget == null
      ? null
      : (sections
          .find((section) => section.id === editTarget.sectionId)
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
    () => Array.from(new Set(sections.map((section) => section.category))),
    [sections],
  );

  const unitOptions = useMemo(
    () =>
      Array.from(
        new Set(
          sections.flatMap((section) =>
            section.products.flatMap((product) => [
              product.unit,
              ...product.lots.map((lot) => lot.unit),
            ]),
          ),
        ),
      )
        .filter((unit) => unit && unit !== "—")
        .sort(),
    [sections],
  );

  const distributorOptions = useMemo(
    () =>
      Array.from(
        new Set(
          sections.flatMap((section) =>
            section.products.flatMap((product) => [
              product.distributor,
              ...product.lots.map((lot) => lot.distributor),
            ]),
          ),
        ),
      )
        .filter((distributor) => distributor && distributor !== "—")
        .sort(),
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
            !categoryFilter || section.category === categoryFilter;
          const matchesUnit =
            !unitFilter ||
            product.unit === unitFilter ||
            product.lots.some((lot) => lot.unit === unitFilter);
          const matchesDistributor =
            !distributorFilter ||
            product.distributor === distributorFilter ||
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
          (!categoryFilter || section.category === categoryFilter),
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
    () => groupInventorySections(filteredSections),
    [filteredSections],
  );

  const inventoryProducts = useMemo(
    () =>
      filteredGroups.flatMap((group) =>
        group.sections.flatMap((section) => section.products),
      ),
    [filteredGroups],
  );
  const listWindow = useLazyWindow(
    inventoryProducts,
    `${query}|${itemFilter}|${categoryFilter}|${unitFilter}|${distributorFilter}`,
  );
  const visibleProductIds = useMemo(
    () => new Set(listWindow.visible.map((product) => product.id)),
    [listWindow.visible],
  );

  function replaceInventory(rows: ApiInventory[]) {
    loadedLotIds.current.clear();
    inflightLotIds.current.clear();
    setInventoryRows(rows);
    setDetailEpoch((current) => current + 1);
  }

  function toggleExpanded(id: string) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  useEffect(() => {
    if (!isApiConfigured() || expanded.size === 0) return;
    const ids: string[] = [];
    for (const section of sectionsRef.current) {
      for (const product of section.products) {
        if (!expanded.has(product.id)) continue;
        for (const lot of product.lots) {
          if (
            isUuid(lot.recordId) &&
            !loadedLotIds.current.has(lot.recordId) &&
            !inflightLotIds.current.has(lot.recordId)
          ) {
            ids.push(lot.recordId);
          }
        }
      }
    }
    if (!ids.length) return;
    for (const id of ids) inflightLotIds.current.add(id);
    void Promise.all(
      ids.map((id) => inventoryApi.getById(id).catch(() => null)),
    ).then((details) => {
      for (const id of ids) inflightLotIds.current.delete(id);
      const byId = new Map(
        details
          .filter((row): row is ApiInventory => Boolean(row?.id))
          .map((row) => [row.id as string, row]),
      );
      for (const id of byId.keys()) loadedLotIds.current.add(id);
      if (!byId.size) return;
      setInventoryRows((current) =>
        current.map((row) => {
          const detail = row.id ? byId.get(row.id) : undefined;
          if (!detail) return row;
          return flattenInventory({
            ...row,
            itemId: row.itemId || detail.itemId,
            distributorOrderId:
              row.distributorOrderId || detail.distributorOrderId,
            expirationDate: row.expirationDate ?? detail.expirationDate,
            location: row.location || detail.location,
            quantity: row.quantity ?? detail.quantity,
            itemName: row.itemName || detail.itemName,
            orderCode: row.orderCode || detail.orderCode,
            distributorName: row.distributorName || detail.distributorName,
            sourceName: row.sourceName || detail.sourceName,
            deliveryDate: row.deliveryDate || detail.deliveryDate,
            purchased: row.purchased ?? detail.purchased,
            unit: row.unit || detail.unit,
          });
        }),
      );
    });
  }, [detailEpoch, expanded]);

  function openEditLocation(
    sectionId: string,
    productId: string,
    lotIndex: number,
  ) {
    const section = sections.find((entry) => entry.id === sectionId);
    const product = section?.products.find((entry) => entry.id === productId);
    const lot = product?.lots[lotIndex];
    if (!lot) return;
    if (lot.qty < 1) {
      notifyApiError(
        new Error("This lot has no quantity to move."),
        "This lot has no quantity to move.",
      );
      return;
    }

    const currentLocation = lot.location === "—" ? "" : lot.location;
    setEditTarget({ sectionId, productId, lotIndex });
    setEditSplits([
      { qty: lot.qty, location: currentLocation },
      {
        qty: 0,
        location: nextUnusedLocation(currentLocation ? [currentLocation] : []),
      },
    ]);
    if (!isApiConfigured() || !isUuid(lot.recordId)) return;
    const recordId = lot.recordId;
    const request = editRequest.current + 1;
    editRequest.current = request;
    void inventoryApi
      .getById(recordId)
      .then((row) => {
        if (editRequest.current !== request) return;
        const qty = typeof row.quantity === "number" ? row.quantity : lot.qty;
        const location =
          row.location?.trim() && row.location.trim() !== "—"
            ? row.location.trim()
            : currentLocation;
        setEditSplits([
          { qty, location },
          {
            qty: 0,
            location: nextUnusedLocation(location ? [location] : []),
          },
        ]);
      })
      .catch((error) => {
        notifyApiError(error, "Failed to load inventory details.");
      });
  }

  async function confirmEditLocation() {
    if (!editTarget || !editLot || !editProduct) return;

    const valid = editSplits.filter(
      (row) => row.qty > 0 && row.location.trim() && row.location !== "—",
    );
    if (!valid.length || splitsTotal(valid) !== editLot.qty) return;

    if (isApiConfigured() && isUuid(editLot.recordId)) {
      setSavingLocation(true);
      let mutated = false;
      try {
        await inventoryApi.split(editLot.recordId, {
          splits: valid.map((row) => ({
            quantity: Math.max(1, Math.round(row.qty)),
            location: row.location.trim(),
          })),
        });
        mutated = true;
        replaceInventory(await inventoryApi.list());
        setEditTarget(null);
      } catch (error) {
        notifyApiError(error, "Failed to update location.");
        if (mutated) {
          try {
            replaceInventory(await inventoryApi.list());
          } catch {
            // The first error is already shown.
          }
        }
      } finally {
        setSavingLocation(false);
      }
      return;
    }

    setInventoryRows((current) => {
      const next: ApiInventory[] = [];
      let replaced = false;
      for (const row of current) {
        if ((row.id ?? "") !== editLot.recordId) {
          next.push(row);
          continue;
        }
        replaced = true;
        valid.forEach((split, index) => {
          next.push({
            ...row,
            id: index === 0 ? row.id : `local-${row.id}-${index}`,
            quantity: split.qty,
            location: split.location,
          });
        });
      }
      return replaced ? next : current;
    });
    setEditTarget(null);
  }

  async function completeStorage(order: ReceivedOrder) {
    const ready = order.sections.flatMap((section) =>
      section.items.filter(stockItemReady),
    );
    const storedIds: string[] = [];

    try {
      for (const item of ready) {
        const placements = placementsFor(item);
        if (!placements.length) continue;
        if (isApiConfigured()) {
          if (!isUuid(item.catalogItemId)) {
            throw new Error(
              `${item.itemName} is not linked to a catalog item, so it cannot be stored.`,
            );
          }
          const orderRecordId = [item.deliveryId, order.id].find((value) =>
            isUuid(value),
          );
          const linkedProduct = products.find((product) => {
            if (product.itemId === item.catalogItemId) return true;
            const catalogItem = catalogItems.find(
              (entry) =>
                entry.recordId === item.catalogItemId ||
                entry.id === item.catalogItemId,
            );
            if (!catalogItem) return false;
            return (
              product.itemId === catalogItem.id ||
              product.itemId === catalogItem.recordId
            );
          });
          const productId = linkedProduct
            ? recordRef(linkedProduct)
            : undefined;
          if (orderRecordId && productId) {
            await inventoryApi.store({
              distributorOrderId: orderRecordId,
              items: placements.map((placement) => {
                const parsed = Date.parse(
                  /^\d{4}-\d{2}-\d{2}$/.test(item.expirationIso)
                    ? `${item.expirationIso}T00:00:00.000Z`
                    : item.expirationIso,
                );
                return {
                  productId,
                  quantity: Math.max(1, Math.round(placement.qty)),
                  location: placement.location.trim(),
                  ...(Number.isNaN(parsed)
                    ? {}
                    : { expirationDate: new Date(parsed).toISOString() }),
                };
              }),
            });
          } else {
            for (const placement of placements) {
              await inventoryApi.create(
                buildInventoryPayload({
                  itemId: item.catalogItemId,
                  quantity: placement.qty,
                  location: placement.location,
                  expirationDate: item.expirationIso,
                  distributorOrderId: orderRecordId,
                }),
              );
            }
          }
        } else {
          setInventoryRows((current) => [
            ...current,
            ...placements.map((placement, index) => ({
              id: `local-${item.id}-${index}-${Date.now()}`,
              itemId: item.catalogItemId || item.orderId,
              itemName: item.itemName,
              inventoryCode: item.orderId,
              orderCode: order.id,
              distributorName: order.supplier,
              sourceName: item.source,
              quantity: placement.qty,
              unit: item.unit,
              purchased: item.purchased,
              expirationDate: item.expirationIso,
              location: placement.location,
              createdAt: new Date().toISOString(),
            })),
          ]);
        }
        storedIds.push(item.id);
      }
    } catch (error) {
      notifyApiError(error, "Failed to store items.");
    }

    if (isApiConfigured() && storedIds.length > 0) {
      try {
        replaceInventory(await inventoryApi.list());
      } catch (error) {
        notifyApiError(
          error,
          "Stored items, but inventory could not be refreshed.",
        );
      }
    }

    const ok = ready.length > 0 && storedIds.length === ready.length;
    if (ok) {
      removeHandoff(order.id);
      setExpanded((current) => {
        const next = new Set(current);
        for (const item of ready) {
          if (item.catalogItemId) next.add(item.catalogItemId);
        }
        return next;
      });
      setStoringId(null);
      setShowToast(true);
      window.setTimeout(() => setShowToast(false), 2500);
    } else if (storedIds.length > 0) {
      const stored = new Set(storedIds);
      pushHandoff(
        handoffFromRemaining({
          ...order,
          sections: order.sections
            .map((section) => ({
              ...section,
              items: section.items.filter((item) => !stored.has(item.id)),
            }))
            .filter((section) => section.items.length > 0),
        }),
      );
    }

    return { ok, storedIds };
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
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#FAFAFA]">
      <Header
        title="Inventory"
        toolbar={
          <div className="flex w-full flex-wrap items-center gap-2 md:flex-nowrap">
            <SearchField
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search"
            />

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

      <div className="min-h-0 flex-1 overflow-auto bg-[#FAFAFA] px-4 pt-8 pb-5 md:px-7">
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

        {loading ? (
          <AppLoader variant="table" label="Loading inventory" />
        ) : (
          <>
            <div className="space-y-8">
              {filteredGroups.map((group) => {
                const sections = group.sections
                  .map((section) => ({
                    ...section,
                    products: section.products.filter((product) =>
                      visibleProductIds.has(product.id),
                    ),
                  }))
                  .filter((section) => section.products.length > 0);
                if (sections.length === 0) return null;

                const showHeading =
                  sections.length > 1 || sections[0]?.title !== group.title;

                return (
                  <section key={group.title}>
                    {showHeading ? (
                      <h2 className="mb-4 text-[20px] font-semibold text-[#111118]">
                        {group.title}
                      </h2>
                    ) : null}

                    <div className="space-y-5">
                      {sections.map((section) => (
                        <div key={section.id}>
                          <ScrollTable
                            minWidth={1300}
                            className="rounded-[12px]"
                          >
                            <div
                              className={cn(
                                GRID,
                                "h-10 border-b border-[#00000014] bg-[#FBF9F9]",
                              )}
                            >
                              <span className="col-span-6 truncate text-[14px] font-semibold tracking-normal text-[#111118] normal-case">
                                {section.title}
                              </span>
                              <span className={cn(TABLE_HEADER, "text-center")}>
                                In Stock
                              </span>
                              <span />
                              <span
                                className={cn(
                                  TABLE_HEADER,
                                  "whitespace-nowrap",
                                )}
                              >
                                Date Receiving By
                              </span>
                            </div>

                            <div>
                              <div
                                className={cn(
                                  GRID,
                                  PINNED_HEADER,
                                  "h-10 border-b border-[#00000014]",
                                  TABLE_HEADER,
                                )}
                              >
                                <div />
                                <div className="whitespace-nowrap">
                                  Order ID
                                </div>
                                <div className="whitespace-nowrap">
                                  Distributor
                                </div>
                                <div className="whitespace-nowrap">
                                  {section.sourceLabel}
                                </div>
                                <div className="whitespace-nowrap">
                                  Delivery Date
                                </div>
                                <div className="whitespace-nowrap">
                                  Purchased
                                </div>
                                <div className="whitespace-nowrap">
                                  Qty Portion
                                </div>
                                <div className="whitespace-nowrap">Unit</div>
                                <div className="whitespace-nowrap">
                                  Location
                                </div>
                              </div>

                              {section.products.map((product, index) => {
                                const open = expanded.has(product.id);
                                const total = stockTotal(product);
                                const isLast =
                                  index === section.products.length - 1;

                                return (
                                  <div key={product.id} className="contents">
                                    <button
                                      type="button"
                                      onClick={() => toggleExpanded(product.id)}
                                      className={cn(
                                        GRID,
                                        "py-3.5",
                                        "w-full bg-white text-left hover:bg-[#FAFAF8]",
                                        (!isLast || open) &&
                                          "border-b border-[#00000014]",
                                      )}
                                    >
                                      <span className="flex justify-center text-[#8A8A8A]">
                                        <ChevronDown
                                          size={14}
                                          className={cn(
                                            "transition-transform",
                                            open
                                              ? "rotate-0 text-[#E25B5B]"
                                              : "-rotate-90 text-[#8A8A8A]",
                                          )}
                                        />
                                      </span>
                                      <span className="col-span-5 min-w-0 truncate text-[13px] font-semibold text-[#111118]">
                                        {product.name}
                                      </span>
                                      <span
                                        className={cn(
                                          "text-center text-[13px] font-semibold whitespace-nowrap",
                                          total <= 0
                                            ? "text-[#E25B5B]"
                                            : "text-[#111118]",
                                        )}
                                      >
                                        {total}
                                      </span>
                                      <span />
                                      <span />
                                    </button>

                                    {open ? (
                                      <div className="contents">
                                        {product.lots.length > 0 ? (
                                          product.lots.map((lot, lotIndex) => (
                                            <div
                                              key={`${product.id}-${lot.recordId}-${lotIndex}`}
                                              className={cn(
                                                GRID,
                                                "py-3.5",
                                                "group border-b border-[#00000014] bg-[#FBF9F9] text-[12px] text-[#111118] last:border-b-0",
                                              )}
                                            >
                                              <span />
                                              <span className="min-w-0 overflow-hidden">
                                                <span
                                                  className="bg-id-pill inline-flex h-5 max-w-full items-center truncate rounded-[6px] px-1.5 font-mono text-[11px] leading-none font-medium text-[#6B7180]"
                                                  title={lot.recordId}
                                                >
                                                  {lot.orderId}
                                                </span>
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
                                              <div
                                                className={cn(
                                                  "text-center font-semibold",
                                                  lot.qty <= 0 &&
                                                    "text-[#E25B5B]",
                                                )}
                                              >
                                                {lot.qty}
                                              </div>
                                              <div className="whitespace-nowrap">
                                                {lot.unit}
                                              </div>
                                              <InventoryLocationCell
                                                location={lot.location}
                                                address={lot.address}
                                                onEditLocation={() =>
                                                  openEditLocation(
                                                    section.id,
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
                                              "py-3.5",
                                              "bg-[#FBF9F9] text-[12px] text-[#8A8A8A]",
                                            )}
                                          >
                                            <span />
                                            <span
                                              className={cn(
                                                ID_PILL,
                                                "justify-self-start",
                                              )}
                                            >
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
                            </div>
                          </ScrollTable>
                        </div>
                      ))}
                    </div>
                  </section>
                );
              })}
              <InfiniteScrollSentinel
                hasMore={listWindow.hasMore}
                loadedCount={listWindow.loadedCount}
                onLoadMore={listWindow.loadMore}
              />
            </div>

            {!filteredSections.length ? (
              <div className="rounded-[10px] border border-[#00000014] bg-white px-6 py-12 text-center text-[14px] text-[#8A8A8A]">
                No inventory matches your filters.
              </div>
            ) : null}
          </>
        )}
      </div>

      <SplitModal
        open={editTarget != null && editLot != null && editProduct != null}
        title="Edit Location"
        itemName={editProduct?.name ?? ""}
        itemCount={editTotal}
        confirmLabel="Edit"
        splits={editSplits}
        onChangeSplits={setEditSplits}
        onClose={() => {
          if (!savingLocation) setEditTarget(null);
        }}
        onConfirm={() => void confirmEditLocation()}
        confirming={savingLocation}
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

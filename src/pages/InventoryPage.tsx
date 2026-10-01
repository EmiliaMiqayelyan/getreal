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
import {
  STORAGE_LOCATIONS,
  createMockInventorySections,
  createMockReceivedOrders,
  type MockReceivedOrder,
} from "@/data/inventoryMock";
import { inventoryApi, isApiConfigured, itemsApi } from "@/lib/api";
import { expirationTimestamp } from "@/lib/api/inventory";
import { mapApiItemToItem } from "@/lib/api/mappers";
import type { ApiInventory, ApiItem } from "@/lib/api/types";
import { cn } from "@/utils/cn";
import { categoryNamesFromCatalog } from "@/utils/categories";
import { isUuid } from "@/utils/entityIds";
import { floatingMenuStyle } from "@/utils/floatingMenu";
import {
  appendUnreceivedItems,
  buildInventorySections,
  groupInventorySections,
  sourceColumnLabel,
  type InventoryLot,
  type InventoryProduct,
  type InventorySection,
} from "@/utils/inventoryView";
import { handoffToStockSections } from "@/utils/receivingHandoff";
import {
  loadPendingStorageOrders,
  withoutStoredHandoffs,
  type PendingStorageOrder,
} from "@/utils/pendingStorageOrders";

const ORANGE = "#F57850";
const GREEN = "#2B5B31";

/** Location is a name string sent as-is. This list is local; there is no locations endpoint. */
const LOCATION_OPTIONS = STORAGE_LOCATIONS;

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
  orderCode?: string;
  orderNumber?: string;
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

function escapeLabel(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/** Browser print only. API does not need a label endpoint — the label is item ID, name, and location. */
function printStockLabel(item: StockItem) {
  const location = stockItemLocation(item);
  if (!location) return;
  const popup = window.open(
    "",
    "_blank",
    "noopener,noreferrer,width=420,height=520",
  );
  if (!popup) return;
  const itemId = escapeLabel(item.orderId);
  const itemName = escapeLabel(item.itemName);
  const storage = escapeLabel(location);
  popup.document
    .write(`<!doctype html><html><head><title>Label ${itemId}</title>
<style>
  body{font-family:ui-monospace,Menlo,monospace;padding:24px;color:#111}
  h1{font-size:18px;margin:0 0 12px}
  p{margin:6px 0;font-size:13px}
  .label{color:#666;font-size:11px;letter-spacing:.06em;text-transform:uppercase}
</style></head><body>
<p class="label">Item ID</p>
<p>${itemId}</p>
<p class="label">Item name</p>
<h1>${itemName}</h1>
<p class="label">Storage location</p>
<p>${storage}</p>
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
  "grid grid-cols-[28px_minmax(72px,0.9fr)_minmax(110px,1.15fr)_minmax(100px,1fr)_minmax(128px,1.15fr)_minmax(84px,0.75fr)_minmax(72px,0.6fr)_minmax(52px,0.45fr)_minmax(96px,0.9fr)] items-center gap-x-3 px-4";

const STOCK_GRID =
  "grid grid-cols-[minmax(84px,0.7fr)_minmax(110px,1.25fr)_36px_44px_minmax(84px,0.7fr)_minmax(88px,0.75fr)_minmax(112px,1fr)_24px_36px_minmax(104px,0.7fr)] items-center gap-x-3 px-4";

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
  minRows = 2,
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
  /** Distribute needs two locations; Edit Location can stay on one. */
  minRows?: number;
}) {
  useScrollLock(open);

  if (!open) return null;

  const target =
    typeof itemCount === "number"
      ? itemCount
      : Number.parseInt(String(itemCount), 10) || 0;
  const assigned = splitsTotal(splits);
  const validRows = splits.filter((row) => row.qty > 0 && row.location.trim());
  const locations = validRows.map((row) => row.location.trim());
  const hasDuplicateLocation = new Set(locations).size !== locations.length;
  const needsSplit = minRows > 1 && target >= minRows;
  const canConfirm =
    target > 0 &&
    validRows.length >= (needsSplit ? minRows : 1) &&
    assigned === target &&
    !hasDuplicateLocation;

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
              {splits.length > minRows ? (
                <button
                  type="button"
                  aria-label="Remove location"
                  onClick={() =>
                    onChangeSplits(
                      splits.filter((_, rowIndex) => rowIndex !== index),
                    )
                  }
                  className="ml-auto flex size-8 shrink-0 items-center justify-center rounded-[8px] text-[#8A8A8A] hover:bg-[#F5F5F3]"
                >
                  <X size={14} />
                </button>
              ) : null}
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              onChangeSplits([
                ...splits,
                {
                  qty: 0,
                  location: nextUnusedLocation(
                    splits.map((row) => row.location),
                  ),
                },
              ])
            }
            className="mb-2 inline-flex items-center gap-1.5 py-2 text-[13px] font-semibold text-[#2165D4]"
          >
            <Plus size={14} strokeWidth={2.5} />
            Add location
          </button>
          {minRows > 1 && target > 0 && target < minRows ? (
            <p className="pb-2 text-[12px] text-[#E25B5B]">
              At least {minRows} portions are required to split this item.
            </p>
          ) : null}
          {hasDuplicateLocation ? (
            <p className="pb-2 text-[12px] text-[#E25B5B]">
              Each portion needs its own storage location.
            </p>
          ) : null}
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
              qty: split.qty,
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

      <div className="min-h-0 flex-1 overflow-auto bg-[#FAFAFA] px-4 py-5 md:px-7 md:py-5">
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
                      <ScrollTable minWidth="100%" className="rounded-[12px]">
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
                                  disabled={!stockItemLocation(item)}
                                  className="inline-flex h-10 min-w-0 items-center gap-1 justify-self-end text-[13px] font-semibold whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-40"
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
        ) : !canCompleteStorage ? (
          <p className="text-right text-[12px] text-[#8A8A8A]">
            Enter a quantity and location for every item to complete storage.
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
            disabled={!canCompleteStorage || saving}
            className={cn(
              "inline-flex h-10 items-center rounded-[10px] px-6 text-[14px] font-semibold text-white transition-opacity",
              (!canCompleteStorage || saving) &&
                "cursor-not-allowed opacity-50",
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

/**
 * Offline stand-in for POST /inventory/store. Live mode reloads GET /inventory
 * after the store call instead of using this.
 */
function withStoredOrder(current: InventorySection[], order: ReceivedOrder) {
  const productIds: string[] = [];
  const next = current.map((section) => ({
    ...section,
    products: section.products.map((product) => ({
      ...product,
      lots: [...product.lots],
    })),
  }));

  for (const stockSection of order.sections) {
    let section = next.find(
      (entry) =>
        entry.category === stockSection.group &&
        entry.title === stockSection.title,
    );
    if (!section) {
      section = {
        id: `${stockSection.group}::${stockSection.title}`,
        category: stockSection.group,
        title: stockSection.title,
        sourceLabel: sourceColumnLabel(stockSection.title),
        products: [],
      };
      next.push(section);
    }

    for (const item of stockSection.items) {
      const placements = placementsFor(item);
      if (!placements.length) continue;
      let storedProduct = section.products.find(
        (entry) => entry.name === item.itemName,
      );
      if (!storedProduct) {
        storedProduct = {
          id: item.catalogItemId || `${section.id}::${item.itemName}`,
          name: item.itemName,
          distributor: order.supplier,
          unit: item.unit,
          lots: [],
        };
        section.products.push(storedProduct);
        section.products.sort((a, b) => a.name.localeCompare(b.name));
      }
      productIds.push(storedProduct.id);
      const stamp = Date.now();
      placements.forEach((placement, index) => {
        storedProduct.lots.push({
          recordId: `local-${item.id}-${stamp}-${index}`,
          catalogItemId: item.catalogItemId,
          orderId: item.orderId,
          distributor: order.supplier,
          source: item.source?.trim() || "—",
          deliveryDate: order.receivedAt,
          purchased: item.purchased?.trim() || "—",
          qty: placement.qty,
          unit: item.unit,
          location: placement.location,
          address: placement.location,
        });
      });
    }
  }

  return { sections: next, productIds };
}

export default function InventoryPage() {
  useDocumentTitle("Inventory");
  const liveInventory = isApiConfigured();
  const { pendingHandoffs, removeHandoff } = useReceivingHandoff();
  const {
    items: catalogItems,
    categories,
    distributors,
    sources,
    subcategoryRecords,
  } = useAppCatalog();
  const { notifyApiError, showError } = useApiFeedback();

  const [query, setQuery] = useState("");
  const [itemFilter, setItemFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [unitFilter, setUnitFilter] = useState("");
  const [distributorFilter, setDistributorFilter] = useState("");
  const [liveRows, setLiveRows] = useState<ApiInventory[] | null>(null);
  const [apiItems, setApiItems] = useState<ApiItem[]>([]);
  const [localSections, setLocalSections] = useState<InventorySection[]>(
    createMockInventorySections,
  );
  const [loading, setLoading] = useState(liveInventory);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [storingId, setStoringId] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [savingLocation, setSavingLocation] = useState(false);
  const [editTarget, setEditTarget] = useState<EditLocationTarget | null>(null);
  const [editSplits, setEditSplits] = useState<LocationSplit[]>([]);
  const [pendingOrders, setPendingOrders] = useState<MockReceivedOrder[]>(() =>
    liveInventory ? [] : createMockReceivedOrders(),
  );
  const [storageOrders, setStorageOrders] = useState<PendingStorageOrder[]>([]);

  const unreceivedItems = useMemo(
    () =>
      apiItems.map((item, index) =>
        mapApiItemToItem(item, index, {
          categoriesById: new Map(
            categories
              .filter((entry) => entry.id && entry.name)
              .map((entry) => [entry.id as string, entry.name as string]),
          ),
          subcategoriesById: new Map(
            subcategoryRecords
              .filter((entry) => entry.id)
              .map((entry) => [entry.id as string, entry.name]),
          ),
          distributorsById: new Map(
            distributors.flatMap((entry) =>
              entry.recordId ? [[entry.recordId, entry.name] as const] : [],
            ),
          ),
          sourcesById: new Map(
            sources.flatMap((entry) =>
              entry.recordId ? [[entry.recordId, entry.name] as const] : [],
            ),
          ),
        }),
      ),
    [apiItems, categories, distributors, sources, subcategoryRecords],
  );

  const sections = useMemo(() => {
    if (!liveInventory) return localSections;
    return appendUnreceivedItems(
      buildInventorySections(
        catalogItems,
        liveRows ?? [],
        categoryNamesFromCatalog(categories),
      ),
      unreceivedItems,
    );
  }, [
    catalogItems,
    categories,
    liveInventory,
    liveRows,
    localSections,
    unreceivedItems,
  ]);

  useEffect(() => {
    if (!liveInventory) return;
    let cancelled = false;
    void Promise.all([
      inventoryApi.list(),
      itemsApi.list().catch((error) => {
        if (!cancelled) {
          notifyApiError(
            error,
            "Failed to load items that have never been received.",
          );
        }
        return [] as ApiItem[];
      }),
      loadPendingStorageOrders().catch((error) => {
        if (!cancelled) {
          notifyApiError(error, "Failed to load orders waiting for storage.");
        }
        return [] as PendingStorageOrder[];
      }),
    ])
      .then(([rows, items, waiting]) => {
        if (cancelled) return;
        setLiveRows(rows);
        setApiItems(items);
        setStorageOrders(waiting);
      })
      .catch((error) => {
        if (!cancelled) notifyApiError(error, "Failed to load inventory.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [liveInventory, notifyApiError]);

  useEffect(() => {
    if (!liveInventory || storageOrders.length === 0) return;
    const covered = new Set(
      storageOrders.flatMap((order) =>
        order.orderCode ? [order.id, order.orderCode] : [order.id],
      ),
    );
    for (const handoff of pendingHandoffs) {
      if (
        covered.has(handoff.deliveryId) ||
        (handoff.orderCode && covered.has(handoff.orderCode))
      ) {
        removeHandoff(handoff.deliveryId);
      }
    }
  }, [liveInventory, pendingHandoffs, removeHandoff, storageOrders]);

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
        orderCode:
          handoff.orderCode ||
          (isUuid(handoff.deliveryId) ? undefined : handoff.deliveryId),
        supplier: handoff.distributor,
        itemsCount: `${itemCount} item${itemCount === 1 ? "" : "s"}`,
        receivedAt: handoff.receivedAt,
        sections: sectionsFromHandoff,
      };
    });
  }, [catalogItems, pendingHandoffs]);

  const orders = useMemo(() => {
    const waiting = liveInventory ? storageOrders : pendingOrders;
    return [...withoutStoredHandoffs(handoffOrders, waiting), ...waiting];
  }, [handoffOrders, liveInventory, pendingOrders, storageOrders]);

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

  function toggleExpanded(id: string) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

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
      showError("This lot has no quantity to move.");
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
  }

  async function confirmEditLocation() {
    if (!editTarget || !editLot) return;

    const valid = editSplits.filter(
      (row) => row.qty > 0 && row.location.trim() && row.location !== "—",
    );
    if (!valid.length || splitsTotal(valid) !== editLot.qty) return;

    if (liveInventory) {
      if (!isUuid(editLot.recordId)) {
        showError(
          "This inventory record has no server id, so it cannot be moved.",
        );
        return;
      }
      setSavingLocation(true);
      try {
        await inventoryApi.split(editLot.recordId, {
          splits: valid.map((row) => ({
            quantity: Math.max(1, Math.round(row.qty)),
            location: row.location.trim(),
          })),
        });
        setLiveRows(await inventoryApi.list());
        setEditTarget(null);
      } catch (error) {
        notifyApiError(error, "Failed to update location.");
      } finally {
        setSavingLocation(false);
      }
      return;
    }

    setLocalSections((current) =>
      current.map((section) => {
        if (section.id !== editTarget.sectionId) return section;
        return {
          ...section,
          products: section.products.map((product) => {
            if (product.id !== editTarget.productId) return product;
            const sourceLot = product.lots[editTarget.lotIndex];
            if (!sourceLot) return product;
            const replacements: InventoryLot[] = valid.map((split, index) => ({
              ...sourceLot,
              recordId:
                index === 0
                  ? sourceLot.recordId
                  : `${sourceLot.recordId}-split-${index}`,
              qty: split.qty,
              location: split.location,
              address: split.location,
            }));
            const lots = [...product.lots];
            lots.splice(editTarget.lotIndex, 1, ...replacements);
            return { ...product, lots };
          }),
        };
      }),
    );
    setEditTarget(null);
  }

  async function completeStorage(order: ReceivedOrder) {
    const ready = order.sections.flatMap((section) =>
      section.items.filter(stockItemReady),
    );
    if (!ready.length) return { ok: false, storedIds: [] as string[] };

    if (liveInventory) {
      if (!isUuid(order.id)) {
        showError(
          "This order has no distributor order id, so it cannot be stored.",
        );
        return { ok: false, storedIds: [] as string[] };
      }
      const missingName = ready.find((item) => !isUuid(item.catalogItemId));
      if (missingName) {
        showError(
          `${missingName.itemName} is missing an item id, so this order cannot be stored.`,
        );
        return { ok: false, storedIds: [] as string[] };
      }

      try {
        await inventoryApi.store({
          distributorOrderId: order.id,
          items: ready.flatMap((item) =>
            placementsFor(item).map((placement) => {
              const expirationDate = expirationTimestamp(item.expirationIso);
              return {
                itemId: item.catalogItemId,
                quantity: Math.max(1, Math.round(placement.qty)),
                location: placement.location.trim(),
                ...(expirationDate ? { expirationDate } : {}),
              };
            }),
          ),
        });
      } catch (error) {
        notifyApiError(error, "Failed to store items.");
        return { ok: false, storedIds: [] as string[] };
      }

      try {
        const rows = await inventoryApi.list();
        setLiveRows(rows);
        const next = buildInventorySections(
          catalogItems,
          rows,
          categoryNamesFromCatalog(categories),
        );
        const storedItemIds = new Set(ready.map((item) => item.catalogItemId));
        setExpanded((current) => {
          const open = new Set(current);
          for (const section of next) {
            for (const product of section.products) {
              if (
                product.lots.some((lot) => storedItemIds.has(lot.catalogItemId))
              ) {
                open.add(product.id);
              }
            }
          }
          return open;
        });
      } catch (error) {
        notifyApiError(
          error,
          "Stored items, but inventory could not be refreshed.",
        );
      }

      try {
        setStorageOrders(await loadPendingStorageOrders());
      } catch {
        setStorageOrders((current) =>
          current.filter((pending) => pending.id !== order.id),
        );
      }
    } else {
      const stored = withStoredOrder(sections, order);
      setLocalSections(stored.sections);
      setExpanded((current) => {
        const next = new Set(current);
        for (const id of stored.productIds) next.add(id);
        return next;
      });
    }

    removeHandoff(order.id);
    setPendingOrders((current) =>
      current.filter((pending) => pending.id !== order.id),
    );
    setStoringId(null);
    setShowToast(true);
    window.setTimeout(() => setShowToast(false), 2500);

    return { ok: true, storedIds: ready.map((item) => item.id) };
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

      <div className="min-h-0 flex-1 overflow-auto bg-[#FAFAFA] px-4 py-5 md:px-7 md:py-5">
        {orders.length ? (
          <div className="mb-5 space-y-2.5">
            {orders.map((order) => (
              <button
                key={order.id}
                type="button"
                onClick={() => setStoringId(order.id)}
                className="flex w-full items-center rounded-[12px] px-5 py-3.5 text-left text-white"
                style={{ background: GREEN }}
              >
                <span className="shrink-0 text-[13px] font-medium whitespace-nowrap">
                  Order Received
                </span>
                <span
                  aria-hidden
                  className="mx-5 h-[18px] w-px shrink-0 self-center bg-white/70"
                />
                {order.orderCode && !isUuid(order.orderCode) ? (
                  <span className="w-[148px] shrink-0 truncate text-[13px] font-medium">
                    {order.orderNumber
                      ? `${order.orderCode} #${order.orderNumber}`
                      : order.orderCode}
                  </span>
                ) : null}
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
                            minWidth="100%"
                            className="rounded-[12px]"
                          >
                            <div
                              className={cn(
                                GRID,
                                "h-10 border-b border-[#00000014] bg-[#FBF9F9]",
                              )}
                            >
                              <span className="col-span-4 truncate text-[14px] font-semibold tracking-normal text-[#111118] normal-case">
                                {section.title}
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
                                <div className="min-w-0 whitespace-nowrap">
                                  Order ID
                                </div>
                                <div aria-hidden />
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
                                      <span className="flex items-center justify-start text-[#8A8A8A]">
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
                                      <span className="col-span-3 col-start-2 min-w-0 truncate text-[13px] font-semibold text-[#111118]">
                                        {product.name}
                                      </span>
                                      <span
                                        className={cn(
                                          "col-start-7 text-left text-[13px] font-semibold whitespace-nowrap",
                                          total <= 0
                                            ? "text-[#E25B5B]"
                                            : "text-[#111118]",
                                        )}
                                      >
                                        {total <= 0 ? "Empty" : total}
                                      </span>
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
                                              <span className="z-10 w-max min-w-0 justify-self-start">
                                                <span
                                                  className="bg-id-pill inline-flex h-5 items-center rounded-[6px] px-1.5 font-mono text-[11px] leading-none font-medium whitespace-nowrap text-[#6B7180]"
                                                  title={lot.recordId}
                                                >
                                                  {lot.orderId}
                                                </span>
                                              </span>
                                              <span aria-hidden />
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
                                                  "text-left font-semibold",
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
                                            <span
                                              className={cn(
                                                ID_PILL,
                                                "z-10 w-max justify-self-start",
                                              )}
                                            >
                                              -
                                            </span>
                                            <span aria-hidden />
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
        minRows={1}
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

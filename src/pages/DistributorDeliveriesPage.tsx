import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
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

import { DeliveryDateCalendar } from "@/components/orders/DeliveryDateCalendar";
import { UserMenu } from "@/components/layout/UserMenu";
import { Input } from "@/components/ui/Input";
import { ScrollTable } from "@/components/ui/ScrollTable";
import { Select } from "@/components/ui/Select";
import { useReceivingHandoff } from "@/context/ReceivingHandoffContext";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import type { ReceivingHandoffLine } from "@/types/receiving";
import { cn } from "@/utils/cn";
import {
  formatDeliveryChipLabel,
  parseDeliveryDateId,
  toDeliveryDateId,
} from "@/utils/deliveryCalendar";
import {
  acceptedLinesOnly,
  formatReceivedAt,
  printItemLabel,
} from "@/utils/receivingHandoff";

const ORANGE = "#F57850";
const GREEN = "#28402B";
const LINK_BLUE = "#3B82F6";
const CHIP_WINDOW_SIZE = 3;

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
  /** ISO date id for receiving date navigation. */
  deliveryDateId: string;
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
  photoName?: string;
  photoUrl?: string;
};

type RejectImagePreview = {
  item: LineItem;
  result: ItemCheckState;
};

const REJECT_REASONS: RejectReason[] = [
  "Wrong Item",
  "Damaged",
  "Not Fresh",
  "Missing Exp Date",
];

const RECEIVING_DATES = [
  new Date(2026, 6, 14),
  new Date(2026, 6, 20),
  new Date(2026, 6, 27),
  new Date(2026, 7, 3),
  new Date(2026, 7, 10),
];

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"] as const;

function toIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatExpirationDate(iso: string) {
  const date = parseIsoDate(iso);
  if (!date) return iso;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function monthLabel(year: number, month: number) {
  return new Date(year, month, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function RejectImageDrawer({
  preview,
  onClose,
}: {
  preview: RejectImagePreview;
  onClose: () => void;
}) {
  const { item, result } = preview;
  const photoSrc = result.photoUrl;

  return (
    <aside className="absolute inset-y-0 right-0 z-40 flex w-full max-w-[420px] flex-col border-l border-[#ECECEA] bg-white shadow-[-8px_0_32px_rgba(0,0,0,0.08)]">
      <div className="flex items-start justify-end px-5 pt-4">
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="inline-flex size-10 items-center justify-center rounded-[8px] text-[#A9A9A9] hover:bg-[#F5F5F3] hover:text-[#6B6B6B]"
        >
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-auto px-6 pb-8">
        <h2 className="text-[28px] leading-tight font-semibold tracking-tight text-[#111118]">
          {item.name}
        </h2>
        <div className="mt-3">
          <div className="text-[15px] font-medium text-[#111118]">
            {item.source}
          </div>
          <div className="mt-0.5 text-[11px] font-semibold tracking-[0.06em] text-[#8A8A8A] uppercase">
            Source
          </div>
        </div>

        <div className="mt-8">
          {photoSrc ? (
            <img
              src={photoSrc}
              alt={`Problem photo for ${item.name}`}
              className="h-[180px] w-[220px] rounded-[12px] object-cover"
            />
          ) : (
            <div className="flex h-[180px] w-[220px] items-center justify-center rounded-[12px] bg-[#F5F5F3] text-[13px] text-[#8A8A8A]">
              No photo attached
            </div>
          )}
          {result.reason ? (
            <p className="mt-3 text-[15px] font-medium text-[#E25B5B]">
              {result.reason}
            </p>
          ) : null}
        </div>
      </div>
    </aside>
  );
}

function RejectReasonPopover({
  anchor,
  onClose,
  onSelect,
  onPhoto,
  hasPhoto = false,
}: {
  anchor: HTMLElement;
  onClose: () => void;
  onSelect: (reason: RejectReason) => void;
  onPhoto?: (file: File) => void;
  hasPhoto?: boolean;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const [photoTaken, setPhotoTaken] = useState(hasPhoto);

  useEffect(() => {
    function place() {
      const rect = anchor.getBoundingClientRect();
      const width = 248;
      const height = panelRef.current?.offsetHeight ?? 200;
      const gap = 8;
      let top = rect.bottom + gap;
      if (top + height > window.innerHeight - 12) {
        top = Math.max(12, rect.top - height - gap);
      }
      let left = rect.left;
      if (left + width > window.innerWidth - 12) {
        left = Math.max(12, rect.right - width);
      }
      setPos({ top, left });
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
      role="dialog"
      aria-label="Reject reason"
      className="fixed z-[80] w-[248px] rounded-[12px] border border-[#ECECEA] bg-white p-3 shadow-[0_12px_32px_rgba(0,0,0,0.14)]"
      style={{ top: pos.top, left: pos.left }}
    >
      <div className="mb-2.5 text-[13px] font-semibold text-[#111118]">
        Reason
      </div>
      <div className="grid grid-cols-2 gap-2">
        {REJECT_REASONS.map((reason) => (
          <button
            key={reason}
            type="button"
            onClick={() => onSelect(reason)}
            className={cn(
              "h-10 rounded-[10px] px-2.5 text-center text-[11px] font-medium",
              reason === "Missing Exp Date"
                ? "bg-[#FDECEC] text-[#E25B5B]"
                : "bg-[#F3F3F1] text-[#111118] hover:bg-[#ECECEA]",
            )}
          >
            {reason}
          </button>
        ))}
      </div>
      <div className="mt-3 border-t border-[#F0F0EE] pt-2.5">
        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            setPhotoTaken(true);
            onPhoto?.(file);
            event.target.value = "";
          }}
        />
        <button
          type="button"
          className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-[10px] bg-[#F3F3F1] text-[12px] font-medium text-[#111118] hover:bg-[#ECECEA]"
          onClick={() => photoInputRef.current?.click()}
        >
          <Camera size={14} />
          {photoTaken ? "Photo attached · Retake" : "Take photo of problem"}
        </button>
      </div>
    </div>,
    document.body,
  );
}

function ExpirationDatePicker({
  value,
  onChange,
  readOnly = false,
}: {
  value: string;
  onChange: (iso: string) => void;
  readOnly?: boolean;
}) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const selected = parseIsoDate(value);
  const initial = selected ?? new Date();
  const [viewYear, setViewYear] = useState(initial.getFullYear());
  const [viewMonth, setViewMonth] = useState(initial.getMonth());

  useEffect(() => {
    if (!open) return;
    const next = parseIsoDate(value) ?? new Date();
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  }, [open, value]);

  useEffect(() => {
    if (!open) return;
    const anchor = triggerRef.current;
    if (!anchor) return;

    function place() {
      if (!anchor) return;
      const rect = anchor.getBoundingClientRect();
      const width = 280;
      const gap = 8;
      const top = rect.bottom + gap;
      let left = rect.left;
      if (left + width > window.innerWidth - 12) {
        left = Math.max(12, rect.right - width);
      }
      setPos({ top, left });
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
    const anchor = triggerRef.current;
    if (!anchor) return;

    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (panelRef.current?.contains(target) || anchor?.contains(target)) return;
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

  const firstWeekday = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const todayIso = toIsoDate(new Date());
  const selectedIso = selected ? toIsoDate(selected) : "";

  function shiftMonth(delta: number) {
    const next = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  }

  if (readOnly) {
    return (
      <div className="inline-flex h-10 w-full min-w-[140px] max-w-[160px] items-center gap-2 rounded-[8px] border border-[#E0E0DE] bg-[#F9FAFB] px-2.5 text-[13px] text-[#111118]">
        <Calendar size={14} className="shrink-0 text-[#8A8A8A]" />
        <span className="h-4 w-px shrink-0 bg-[#E0E0DE]" aria-hidden />
        <span className="min-w-0 truncate">
          {value ? formatExpirationDate(value) : "—"}
        </span>
      </div>
    );
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Expiration date"
        onClick={() => setOpen((current) => !current)}
        className="inline-flex h-10 w-full min-w-[140px] max-w-[160px] items-center gap-2 rounded-[8px] border border-[#E0E0DE] bg-white px-2.5 text-left text-[13px] outline-none"
      >
        <Calendar size={14} className="shrink-0 text-[#6A6A6A]" />
        <span className="h-4 w-px shrink-0 bg-[#E0E0DE]" aria-hidden />
        <span
          className={cn(
            "min-w-0 truncate",
            value ? "text-[#111118]" : "text-[#8A8A8A]",
          )}
        >
          {value ? formatExpirationDate(value) : "Select"}
        </span>
      </button>

      {open
        ? createPortal(
            <div
              ref={panelRef}
              role="dialog"
              aria-label="Select expiration date"
              className="fixed z-[80] w-[280px] rounded-[12px] border border-[#ECECEA] bg-white p-4 shadow-[0_12px_32px_rgba(0,0,0,0.14)]"
              style={{ top: pos.top, left: pos.left }}
            >
              <div className="mb-3 flex items-center justify-between text-[13px] font-semibold text-[#111118]">
                <span>{monthLabel(viewYear, viewMonth)}</span>
                <div className="flex gap-1 text-[#8A8A8A]">
                  <button
                    type="button"
                    aria-label="Previous month"
                    onClick={() => shiftMonth(-1)}
                    className="flex size-10 items-center justify-center rounded-[8px] hover:bg-[#F5F5F3]"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    type="button"
                    aria-label="Next month"
                    onClick={() => shiftMonth(1)}
                    className="flex size-10 items-center justify-center rounded-[8px] hover:bg-[#F5F5F3]"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-[#8A8A8A]">
                {WEEKDAYS.map((day) => (
                  <div key={day} className="py-1">
                    {day}
                  </div>
                ))}
                {Array.from({ length: firstWeekday }, (_, index) => (
                  <div key={`pad-${index}`} />
                ))}
                {Array.from({ length: daysInMonth }, (_, index) => {
                  const day = index + 1;
                  const iso = toIsoDate(new Date(viewYear, viewMonth, day));
                  const isSelected = iso === selectedIso;
                  const isToday = iso === todayIso;
                  return (
                    <button
                      key={iso}
                      type="button"
                      onClick={() => {
                        onChange(iso);
                        setOpen(false);
                      }}
                      className={cn(
                        "inline-flex size-10 items-center justify-center rounded-full text-[13px] text-[#111118]",
                        isSelected
                          ? "bg-[#28402B] font-semibold text-white"
                          : isToday
                            ? "bg-[#E8E5E0] font-semibold"
                            : "hover:bg-[#F5F5F3]",
                      )}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

/** Temporary seed - one delivery order sample. */
const INITIAL_ORDERS: DeliveryOrder[] = [
  {
    id: "DP-1043",
    distributor: "4PF Co.",
    orderDate: "Jul 16, 12:34 PM",
    expectedDelivery: "Jul 18, 8:00 AM",
    deliveryDateId: "2026-07-20",
    totalPrice: 125,
    checked: false,
    items: [
      {
        id: "li-1",
        itemCode: "ID-002-02",
        name: "Angus Chuck Ground Beef",
        category: "Meat",
        quantity: 1,
        unit: "Case",
        source: "FreshMarket Co",
        unitPrice: 125,
        priceLabel: "$125/case",
      },
    ],
  },
];

const INITIAL_ITEM_RESULTS: Record<string, Record<string, ItemCheckState>> = {};

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

function isChecksDirty(
  items: LineItem[],
  checks: Record<string, ItemCheckState>,
) {
  return items.some((item) => {
    const state = checks[item.id];
    if (!state) return false;
    return (
      state.status !== "pending" ||
      state.expiration !== "" ||
      state.itemId !== item.itemCode ||
      Boolean(state.reason) ||
      Boolean(state.photoName) ||
      Boolean(state.photoUrl)
    );
  });
}

function validateChecks(
  items: LineItem[],
  checks: Record<string, ItemCheckState>,
) {
  const errors: string[] = [];
  for (const item of items) {
    const state = checks[item.id];
    if (!state || state.status === "pending") {
      errors.push(`${item.name}: accept or reject required`);
      continue;
    }
    if (!state.itemId.trim()) {
      errors.push(`${item.name}: item / order ID required`);
    }
    if (state.status === "accepted" && !state.expiration) {
      errors.push(`${item.name}: expiration date required`);
    }
    if (state.status === "rejected" && !state.reason) {
      errors.push(`${item.name}: rejection reason required`);
    }
  }
  return errors;
}

function CheckOrderView({
  order,
  initialChecks,
  readOnly = false,
  onClose,
  onAccepted,
}: {
  order: DeliveryOrder;
  initialChecks?: Record<string, ItemCheckState>;
  readOnly?: boolean;
  onClose: () => void;
  onAccepted: (orderId: string, checks: Record<string, ItemCheckState>) => void;
}) {
  const [checks, setChecks] = useState(
    () => initialChecks ?? emptyChecks(order.items),
  );
  const [rejectFor, setRejectFor] = useState<string | null>(null);
  const [rejectAnchor, setRejectAnchor] = useState<HTMLElement | null>(null);
  const [phase, setPhase] = useState<"check" | "review">(
    readOnly ? "review" : "check",
  );
  const [validationError, setValidationError] = useState<string | null>(null);

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
    if (readOnly) return;
    setValidationError(null);
    setChecks((current) => ({
      ...current,
      [id]: { ...current[id], ...patch },
    }));
  }

  function requestClose() {
    if (readOnly) {
      onClose();
      return;
    }
    if (isChecksDirty(order.items, checks)) {
      const leave = window.confirm(
        "You have unsaved receiving changes. Leave without completing Accept Order?",
      );
      if (!leave) return;
    }
    onClose();
  }

  function handleAcceptOrder() {
    const errors = validateChecks(order.items, checks);
    if (errors.length) {
      setValidationError(errors[0] ?? "Complete all required receiving fields.");
      setPhase("check");
      return;
    }
    onAccepted(order.id, checks);
  }

  // Figma: name + qty/unit/exp/id+Print packed left; flexible gap; Actions right
  const col =
    "grid-cols-[minmax(140px,220px)_40px_52px_148px_auto_minmax(16px,1fr)_auto]";

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
      <div className="shrink-0 border-b border-[#ECECEA] bg-white px-4 pt-5 pb-4 md:px-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[22px] font-semibold tracking-tight text-[#111118]">
              {readOnly ? "View Order" : "Check Order"}
            </h1>
            <p className="mt-1 text-[13px] text-[#8A8A8A]">
              {readOnly ? "Processed Receiving From" : "Delivery Validation From"}{" "}
              <span className="font-medium text-[#111118]">
                {order.distributor}
              </span>
              <span className="ml-2 font-mono text-[12px] text-[#6A6A6A]">
                {order.id}
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

        <div className="space-y-6">
          {categories.map(([category, items]) => (
            <section key={category}>
              <h2 className="mb-3 text-[16px] font-semibold text-[#111118]">
                {category}
              </h2>
              <ScrollTable minWidth={900} className="rounded-[12px]">
                <div
                  className={cn(
                    "grid items-center gap-x-3 border-b border-[#F0F0EE] bg-white px-4 py-2.5 text-[11px] font-medium tracking-[0.06em] text-[#9A9A9A] uppercase",
                    col,
                  )}
                >
                  <span>Item Name</span>
                  <span>Qty</span>
                  <span>Unit</span>
                  <span>Expiration Date</span>
                  <span>
                    {category === "Fruits" ? "Item ID" : "Order ID"}
                  </span>
                  <span aria-hidden />
                  <span className="text-right">Actions</span>
                </div>

                {items.map((item) => {
                  const state = checks[item.id];
                  return (
                    <div
                      key={item.id}
                      className={cn(
                        "relative grid items-center gap-x-3 border-b border-[#F0F0EE] bg-white px-4 py-3.5 last:border-b-0",
                        col,
                        state.status === "accepted" &&
                          "border-l-[3px] border-l-[#2F8F4E]",
                        state.status === "rejected" &&
                          "border-l-[3px] border-l-[#F57850]",
                      )}
                    >
                      <span className="min-w-0 truncate text-[13px] text-[#111118]">
                        {item.name}
                      </span>
                      <span className="text-[13px] font-semibold text-[#111118]">
                        {item.quantity}
                      </span>
                      <span className="text-[13px] font-bold text-[#111118]">
                        {item.unit}
                      </span>
                      <div className="min-w-0">
                        <ExpirationDatePicker
                          value={state.expiration}
                          readOnly={readOnly}
                          onChange={(expiration) =>
                            updateCheck(item.id, { expiration })
                          }
                        />
                      </div>
                      <div className="flex w-max items-center gap-x-3">
                        {readOnly ? (
                          <span className="inline-flex h-10 w-[132px] shrink-0 items-center rounded-[8px] border border-[#E0E0DE] bg-[#F9FAFB] px-3 font-mono text-[13px] text-[#111118]">
                            {state.itemId}
                          </span>
                        ) : (
                          <input
                            type="text"
                            value={state.itemId}
                            onChange={(event) =>
                              updateCheck(item.id, {
                                itemId: event.target.value,
                              })
                            }
                            className="h-10 w-[132px] shrink-0 rounded-[8px] border border-[#E0E0DE] bg-white px-3 text-[13px] text-[#111118] outline-none"
                          />
                        )}
                        <button
                          type="button"
                          className="inline-flex h-10 shrink-0 items-center text-[13px] font-medium"
                          style={{ color: LINK_BLUE }}
                          onClick={() =>
                            printItemLabel({
                              itemName: item.name,
                              itemId: state.itemId || item.itemCode,
                              deliveryId: order.id,
                              distributor: order.distributor,
                              expiration: state.expiration,
                            })
                          }
                        >
                          Print
                        </button>
                      </div>
                      <span aria-hidden />
                      <div className="flex items-center justify-end gap-x-4 whitespace-nowrap">
                        {readOnly ? (
                          state.status === "accepted" ? (
                            <span className="inline-flex size-8 items-center justify-center rounded-full bg-[#2F8F4E] text-white">
                              <Check size={14} strokeWidth={3} />
                            </span>
                          ) : state.status === "rejected" ? (
                            <div className="flex items-center gap-2">
                              {state.reason ? (
                                <span className="text-[12px] font-medium text-[#E25B5B]">
                                  {state.reason}
                                </span>
                              ) : null}
                              <span className="inline-flex size-8 items-center justify-center rounded-full bg-[#E25B5B] text-white">
                                <X size={14} strokeWidth={3} />
                              </span>
                            </div>
                          ) : (
                            <span className="text-[12px] text-[#8A8A8A]">—</span>
                          )
                        ) : state.status === "accepted" ? (
                          <>
                            <button
                              type="button"
                              className="inline-flex h-10 items-center text-[13px] font-medium"
                              style={{ color: LINK_BLUE }}
                              onClick={() =>
                                updateCheck(item.id, {
                                  status: "pending",
                                  reason: undefined,
                                })
                              }
                            >
                              Reject
                            </button>
                            <span className="inline-flex size-8 items-center justify-center rounded-full bg-[#2F8F4E] text-white">
                              <Check size={14} strokeWidth={3} />
                            </span>
                          </>
                        ) : state.status === "rejected" ? (
                          <>
                            <button
                              type="button"
                              className="inline-flex h-10 items-center text-[13px] font-medium"
                              style={{ color: LINK_BLUE }}
                              onClick={() =>
                                updateCheck(item.id, {
                                  status: "accepted",
                                  reason: undefined,
                                })
                              }
                            >
                              Accept
                            </button>
                            <span className="inline-flex size-8 items-center justify-center rounded-full bg-[#E25B5B] text-white">
                              <X size={14} strokeWidth={3} />
                            </span>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              className="inline-flex h-10 items-center text-[13px] font-medium"
                              style={{ color: LINK_BLUE }}
                              onClick={(event) => {
                                if (rejectFor === item.id) {
                                  setRejectFor(null);
                                  setRejectAnchor(null);
                                } else {
                                  setRejectFor(item.id);
                                  setRejectAnchor(event.currentTarget);
                                }
                              }}
                            >
                              Reject
                            </button>
                            <button
                              type="button"
                              className="inline-flex h-10 items-center text-[13px] font-medium"
                              style={{ color: LINK_BLUE }}
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
              </ScrollTable>
            </section>
          ))}
        </div>
      </div>

      {!readOnly && rejectFor && rejectAnchor ? (
        <RejectReasonPopover
          anchor={rejectAnchor}
          onClose={() => {
            setRejectFor(null);
            setRejectAnchor(null);
          }}
          onSelect={(reason) => {
            updateCheck(rejectFor, { status: "rejected", reason });
            setRejectFor(null);
            setRejectAnchor(null);
          }}
          onPhoto={(file) => {
            updateCheck(rejectFor, {
              photoName: file.name,
              photoUrl: URL.createObjectURL(file),
            });
          }}
          hasPhoto={Boolean(
            checks[rejectFor]?.photoName || checks[rejectFor]?.photoUrl,
          )}
        />
      ) : null}

      <div className="flex items-center justify-end gap-4 border-t border-[#ECECEA] bg-white px-4 py-4 md:px-7">
        <button
          type="button"
          onClick={requestClose}
          className="inline-flex h-10 items-center rounded-[10px] px-4 text-[14px] font-medium text-[#111118]"
        >
          {readOnly ? "Close" : "Cancel & Close"}
        </button>
        {readOnly ? null : phase === "check" ? (
          <button
            type="button"
            disabled={!allResolved}
            onClick={() => setPhase("review")}
            className="inline-flex h-10 items-center rounded-[10px] px-5 text-[14px] font-semibold text-white disabled:opacity-40"
            style={{ background: ORANGE }}
          >
            Review Order
          </button>
        ) : (
          <button
            type="button"
            onClick={handleAcceptOrder}
            className="inline-flex h-10 items-center rounded-[10px] px-5 text-[14px] font-semibold text-white"
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
  "grid grid-cols-[18px_108px_220px_150px_150px_100px_minmax(0,1fr)_88px] items-center gap-x-5";

export default function DistributorDeliveriesPage() {
  useDocumentTitle("Distributor Receiving");
  const { pushHandoff, markDeliveryReceived } = useReceivingHandoff();

  const [activeTab, setActiveTab] = useState<"Orders" | "Received">("Orders");
  const [activeDateId, setActiveDateId] = useState("2026-07-20");
  const [chipWindowStart, setChipWindowStart] = useState(0);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [productFilter, setProductFilter] = useState("");
  const [distributorFilter, setDistributorFilter] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(["DP-1043", "DP-1038"]),
  );
  const [orders, setOrders] = useState(INITIAL_ORDERS);
  const [checkingId, setCheckingId] = useState<string | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [itemResults, setItemResults] = useState<
    Record<string, Record<string, ItemCheckState>>
  >(() => INITIAL_ITEM_RESULTS);
  const [imagePreview, setImagePreview] = useState<RejectImagePreview | null>(
    null,
  );

  const checkingOrder =
    orders.find((order) => order.id === checkingId) ?? null;
  const viewingOrder =
    orders.find((order) => order.id === viewingId) ?? null;

  const productOptions = useMemo(
    () =>
      Array.from(
        new Set(
          orders.flatMap((order) => order.items.map((item) => item.name)),
        ),
      ).sort(),
    [orders],
  );

  const distributorOptions = useMemo(
    () =>
      Array.from(new Set(orders.map((order) => order.distributor))).sort(),
    [orders],
  );

  const dateCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const order of orders) {
      const matchesTab =
        activeTab === "Orders" ? !order.checked : order.checked;
      if (!matchesTab) continue;
      counts.set(
        order.deliveryDateId,
        (counts.get(order.deliveryDateId) ?? 0) + 1,
      );
    }
    return counts;
  }, [activeTab, orders]);

  const visibleChips = useMemo(() => {
    return RECEIVING_DATES.slice(
      chipWindowStart,
      chipWindowStart + CHIP_WINDOW_SIZE,
    ).map((date) => {
      const id = toDeliveryDateId(date);
      return {
        id,
        label: formatDeliveryChipLabel(date),
        count: dateCounts.get(id) ?? 0,
      };
    });
  }, [chipWindowStart, dateCounts]);

  const canShiftBack = chipWindowStart > 0;
  const canShiftForward =
    chipWindowStart + CHIP_WINDOW_SIZE < RECEIVING_DATES.length;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter((order) => {
      const matchesTab =
        activeTab === "Orders" ? !order.checked : order.checked;
      const matchesDate = order.deliveryDateId === activeDateId;
      const matchesSearch =
        !q ||
        order.id.toLowerCase().includes(q) ||
        order.distributor.toLowerCase().includes(q) ||
        order.items.some((item) => item.name.toLowerCase().includes(q));
      const matchesProduct =
        !productFilter ||
        order.items.some((item) => item.name === productFilter);
      const matchesDistributor =
        !distributorFilter || order.distributor === distributorFilter;
      return (
        matchesTab &&
        matchesDate &&
        matchesSearch &&
        matchesProduct &&
        matchesDistributor
      );
    });
  }, [
    activeDateId,
    activeTab,
    distributorFilter,
    orders,
    productFilter,
    search,
  ]);

  function selectDeliveryDate(dateId: string) {
    setActiveDateId(dateId);
    const index = RECEIVING_DATES.findIndex(
      (date) => toDeliveryDateId(date) === dateId,
    );
    if (index === -1) return;
    if (index < chipWindowStart) {
      setChipWindowStart(index);
      return;
    }
    if (index >= chipWindowStart + CHIP_WINDOW_SIZE) {
      setChipWindowStart(Math.max(0, index - CHIP_WINDOW_SIZE + 1));
    }
  }

  function shiftChipWindow(delta: number) {
    setChipWindowStart((current) =>
      Math.max(
        0,
        Math.min(current + delta, RECEIVING_DATES.length - CHIP_WINDOW_SIZE),
      ),
    );
  }

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
    const order = orders.find((entry) => entry.id === orderId);
    if (!order) return;

    const lines: ReceivingHandoffLine[] = order.items.map((item) => {
      const result = checks[item.id];
      return {
        lineId: item.id,
        itemId: result?.itemId || item.itemCode,
        itemName: item.name,
        category: item.category,
        source: item.source,
        quantity: item.quantity,
        unit: item.unit,
        unitPrice: item.unitPrice,
        priceLabel: item.priceLabel,
        expiration: result?.expiration ?? "",
        status: result?.status === "rejected" ? "rejected" : "accepted",
        reason: result?.reason,
        photoUrl: result?.photoUrl,
      };
    });

    const handoff = acceptedLinesOnly({
      deliveryId: order.id,
      distributor: order.distributor,
      receivedAt: formatReceivedAt(),
      items: lines,
    });

    if (handoff.items.length > 0) {
      pushHandoff(handoff);
    } else {
      markDeliveryReceived(order.id);
    }

    setOrders((current) =>
      current.map((entry) =>
        entry.id === orderId ? { ...entry, checked: true } : entry,
      ),
    );
    setItemResults((current) => ({ ...current, [orderId]: checks }));
    setCheckingId(null);
    setActiveTab("Received");
    setActiveDateId(order.deliveryDateId);
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

  if (viewingOrder) {
    return (
      <CheckOrderView
        order={viewingOrder}
        initialChecks={
          itemResults[viewingOrder.id] ?? emptyChecks(viewingOrder.items)
        }
        readOnly
        onClose={() => setViewingId(null)}
        onAccepted={() => undefined}
      />
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
      <div className="shrink-0 border-b border-[#ECECEA] bg-white">
        <div className="flex min-h-[52px] items-center px-4 md:px-7 lg:h-[52px]">
          <div className="flex w-full flex-col gap-3 lg:grid lg:grid-cols-[1fr_auto_1fr] lg:items-center lg:gap-4">
            <div className="flex items-center justify-between gap-3">
              <h1 className="text-[20px] font-semibold tracking-tight text-[#111118]">
                Distributor Receiving
              </h1>
              <div className="flex items-center border-l border-[#ECECEA] pl-5 lg:hidden">
                <UserMenu className="items-center" />
              </div>
            </div>

            <div className="flex h-full items-center gap-6 sm:gap-8">
              {(["Orders", "Received"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "flex h-[52px] items-center border-b-2 text-[14px]",
                    activeTab === tab
                      ? "border-[#F57850] font-medium text-[#111118]"
                      : "border-transparent text-[#8A8A8A]",
                  )}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="hidden items-center justify-end gap-3 border-l border-[#ECECEA] pl-5 lg:flex lg:justify-self-end">
              <UserMenu className="items-center" />
              <div className="text-[12px] text-[#8A8A8A]">
                Today, Tue, Jun 22, 2026
              </div>
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
                className="w-full pl-8"
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
          </div>
        </div>
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col">
        <div className="flex-1 overflow-auto px-4 py-5 md:px-7">
          <div className="mb-5 flex flex-wrap items-center gap-2">
            {visibleChips.map((chip) => {
              const active = activeDateId === chip.id;
              return (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => selectDeliveryDate(chip.id)}
                  className={cn(
                    "inline-flex min-h-10 items-center gap-2.5 rounded-[12px] border px-3.5 py-2 text-left",
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

            <div className="relative ml-auto flex items-center gap-2">
              <button
                type="button"
                aria-label="Previous dates"
                disabled={!canShiftBack}
                onClick={() => shiftChipWindow(-1)}
                className="flex size-10 items-center justify-center rounded-[8px] border border-[#ECECEA] bg-white text-[#8A8A8A] disabled:opacity-40"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                aria-label="Next dates"
                disabled={!canShiftForward}
                onClick={() => shiftChipWindow(1)}
                className="flex size-10 items-center justify-center rounded-[8px] border border-[#ECECEA] bg-white text-[#8A8A8A] disabled:opacity-40"
              >
                <ChevronRight size={16} />
              </button>
              <button
                type="button"
                aria-label="Open calendar"
                aria-expanded={calendarOpen}
                onClick={() => setCalendarOpen((open) => !open)}
                className={cn(
                  "flex size-10 items-center justify-center rounded-[8px] border bg-white text-[#8A8A8A]",
                  calendarOpen ? "border-[#28402B]" : "border-[#ECECEA]",
                )}
              >
                <Calendar size={16} />
              </button>
              {calendarOpen ? (
                <DeliveryDateCalendar
                  selectedDateId={activeDateId}
                  initialMonth={
                    parseDeliveryDateId(activeDateId) ?? RECEIVING_DATES[0]
                  }
                  onSelectDate={(dateId) => {
                    selectDeliveryDate(dateId);
                  }}
                  onClose={() => setCalendarOpen(false)}
                />
              ) : null}
            </div>
          </div>

          <h2 className="mb-4 text-[20px] font-semibold text-[#111118]">
            Receiving Log
          </h2>

          <ScrollTable minWidth={920} className="rounded-[12px]">
            <div
              className={cn(
                ROW_GRID,
                "border-b border-[#F0F0EE] bg-white px-4 py-2 text-[11px] font-semibold tracking-[0.06em] text-[#2E2E2E] uppercase",
              )}
            >
              <div />
              <div>Delivery ID</div>
              <div>Distributor</div>
              <div>Order Date</div>
              <div>Expected Delivery</div>
              <div>Total Price</div>
              <div aria-hidden />
              <div>Action</div>
            </div>

            <div className="divide-y divide-[#F0F0EE]">
              {filtered.map((order) => {
                const open = expanded.has(order.id);
                const results = itemResults[order.id];

                return (
                  <div key={order.id} className="bg-white">
                    <div
                      className={cn(
                        ROW_GRID,
                        "px-4 py-2.5",
                        open && "border-b border-[#F0F0EE]",
                      )}
                    >
                      <button
                        type="button"
                        aria-label={open ? "Collapse" : "Expand"}
                        onClick={() => toggleExpanded(order.id)}
                        className="flex items-center justify-center"
                      >
                        <ChevronDown
                          size={15}
                          className={cn(
                            "shrink-0 transition-transform",
                            open
                              ? "rotate-0 text-[#E25B5B]"
                              : "-rotate-90 text-[#6A6A6A]",
                          )}
                        />
                      </button>

                      <span className="w-fit rounded-[6px] bg-id-pill px-2 py-0.5 font-mono text-[11px] font-medium text-[#6A6A6A]">
                        {order.id}
                      </span>
                      <span className="truncate text-[14px] font-semibold text-[#111118]">
                        {order.distributor}
                      </span>
                      <span className="whitespace-nowrap text-[13px] text-[#4A4A4A]">
                        {order.orderDate}
                      </span>
                      <span className="whitespace-nowrap text-[13px] text-[#4A4A4A]">
                        {order.expectedDelivery}
                      </span>
                      <span className="whitespace-nowrap text-[13px] font-semibold text-[#111118]">
                        {currency(order.totalPrice)}
                      </span>
                      <div aria-hidden />
                      <div>
                        {order.checked ? (
                          <button
                            type="button"
                            onClick={() => setViewingId(order.id)}
                            className="inline-flex h-8 items-center gap-1.5 rounded-[8px] px-2.5 text-[13px] font-medium"
                            style={{ color: LINK_BLUE }}
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
                            className="inline-flex h-8 items-center rounded-[8px] px-2.5 text-[13px] font-medium"
                            style={{ color: LINK_BLUE }}
                          >
                            Validate
                          </button>
                        )}
                      </div>
                    </div>

                    {open
                      ? order.items.map((item, itemIndex) => {
                          const result = results?.[item.id];
                          const rejected = result?.status === "rejected";
                          const hasPhoto = Boolean(
                            result?.photoUrl || result?.photoName,
                          );

                          return (
                            <div
                              key={item.id}
                              className={cn(
                                ROW_GRID,
                                "bg-[#F9FAFB] px-4 py-2 text-[13px]",
                                itemIndex < order.items.length - 1 &&
                                  "border-b border-[#F0F0EE]",
                              )}
                            >
                              <div />
                              <div />
                              <div
                                className={cn(
                                  "min-w-0",
                                  rejected
                                    ? "text-[#E25B5B]"
                                    : "text-[#111118]",
                                )}
                              >
                                <div className="truncate">{item.name}</div>
                                <div className="truncate text-[12px] text-[#8A8A8A]">
                                  {item.source}
                                </div>
                              </div>
                              <div />
                              <div />
                              <div className="whitespace-nowrap">
                                {rejected && result?.reason ? (
                                  <span className="font-medium text-[#E25B5B]">
                                    Rejected · {result.reason}
                                  </span>
                                ) : (
                                  <span className="text-[#111118]">
                                    {item.priceLabel}
                                  </span>
                                )}
                              </div>
                              <div aria-hidden />
                              <div>
                                {rejected && hasPhoto ? (
                                  <button
                                    type="button"
                                    className="inline-flex h-8 items-center rounded-[8px] px-2.5 text-[13px] font-medium"
                                    style={{ color: LINK_BLUE }}
                                    onClick={() =>
                                      result
                                        ? setImagePreview({ item, result })
                                        : undefined
                                    }
                                  >
                                    Image
                                  </button>
                                ) : null}
                              </div>
                            </div>
                          );
                        })
                      : null}
                  </div>
                );
              })}
            </div>

            {!filtered.length ? (
              <div className="px-6 py-12 text-center text-[14px] text-[#8A8A8A]">
                No deliveries match your filters.
              </div>
            ) : null}
          </ScrollTable>
        </div>

        {imagePreview ? (
          <RejectImageDrawer
            preview={imagePreview}
            onClose={() => setImagePreview(null)}
          />
        ) : null}
      </div>
    </div>
  );
}

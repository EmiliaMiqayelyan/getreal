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

import { UserMenu } from "@/components/layout/UserMenu";
import { Input } from "@/components/ui/Input";
import { ScrollTable } from "@/components/ui/ScrollTable";
import { Select } from "@/components/ui/Select";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { cn } from "@/utils/cn";

const ORANGE = "#F57850";
const GREEN = "#28402B";
const LINK_BLUE = "#3B82F6";

type DeliveryChip = { id: string; label: string; count: number };

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

const DELIVERY_CHIPS: DeliveryChip[] = [
  { id: "wed-14", label: "Wed, Jul 14", count: 13 },
  { id: "wed-20", label: "Wed, Jul 20", count: 7 },
  { id: "wed-27", label: "Wed, Jul 27", count: 3 },
];

const REJECT_REASONS: RejectReason[] = [
  "Wrong Item",
  "Damaged",
  "Not Fresh",
  "Missing Exp Date",
];

const REJECT_PHOTO_SAMPLE = "/images/receiving-reject-sample.jpg";

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
    // Re-measure after paint so height-aware flip works.
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
            // Allow taking another photo of the same item.
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
}: {
  value: string;
  onChange: (iso: string) => void;
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
      // Always open below the pill so the trigger stays visible.
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

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Expiration date"
        onClick={() => setOpen((current) => !current)}
        className="relative flex h-10 w-[128px] items-center rounded-[8px] border border-[#E0E0DE] bg-white pr-3 pl-9 text-left text-[13px] text-[#111118] outline-none"
      >
        <Calendar
          size={14}
          className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[#111118]"
        />
        <span className="min-w-0 truncate">
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

const INITIAL_ORDERS: DeliveryOrder[] = [
  {
    id: "DP-1043",
    distributor: "4PF Co.",
    orderDate: "Jul 16, 12:34 PM",
    expectedDelivery: "Jul 18, 8:00 AM",
    totalPrice: 480,
    checked: false,
    items: [
      { id: "li-1", itemCode: "ID-002-02", name: "Angus Chuck Ground Beef", category: "Meat", quantity: 1, unit: "Case", source: "Lena Hoffman", unitPrice: 125, priceLabel: "$125/case" },
      { id: "li-2", itemCode: "ID-001-10", name: "Rib-eye Steak", category: "Meat", quantity: 1, unit: "Case", source: "Lena Hoffman", unitPrice: 90, priceLabel: "$90/case" },
      { id: "li-3", itemCode: "ID-001-11", name: "Rib-eye Steak", category: "Meat", quantity: 1, unit: "Case", source: "Lena Hoffman", unitPrice: 90, priceLabel: "$90/case" },
      { id: "li-4", itemCode: "ID-001-12", name: "Rib-eye Steak", category: "Meat", quantity: 1, unit: "Case", source: "Lena Hoffman", unitPrice: 90, priceLabel: "$90/case" },
      { id: "li-5", itemCode: "ID-015-03", name: "Legion Fields Whole Chicken", category: "Meat", quantity: 1, unit: "Case", source: "Lena Hoffman", unitPrice: 50, priceLabel: "$50/case" },
      { id: "li-6", itemCode: "ID-015-04", name: "Legion Fields Whole Chicken", category: "Meat", quantity: 1, unit: "Case", source: "Lena Hoffman", unitPrice: 50, priceLabel: "$50/case" },
    ],
  },
  {
    id: "DP-1044",
    distributor: "Tropical Produce LLC",
    orderDate: "Jul 16, 12:34 PM",
    expectedDelivery: "Jul 18, 8:00 AM",
    totalPrice: 101.25,
    checked: false,
    items: [
      { id: "li-7", itemCode: "ID-020-01", name: "Lemons", category: "Fruits", quantity: 4, unit: "Box", source: "Omara Okafor", unitPrice: 6, priceLabel: "$6/box" },
      { id: "li-8", itemCode: "ID-020-02", name: "Blueberries", category: "Fruits", quantity: 2, unit: "Box", source: "Omara Okafor", unitPrice: 32, priceLabel: "$32/box" },
    ],
  },
  {
    id: "DP-1045",
    distributor: "Rancho Protein LLC",
    orderDate: "Jul 16, 12:34 PM",
    expectedDelivery: "Jul 18, 8:00 AM",
    totalPrice: 101.25,
    checked: false,
    items: [
      { id: "li-9", itemCode: "ID-002-02", name: "Angus Chuck Ground Beef", category: "Meat", quantity: 1, unit: "Case", source: "Lena Hoffman", unitPrice: 125, priceLabel: "$125/case" },
      { id: "li-10", itemCode: "ID-001-10", name: "Rib-eye Steak", category: "Meat", quantity: 1, unit: "Case", source: "Lena Hoffman", unitPrice: 90, priceLabel: "$90/case" },
      { id: "li-11", itemCode: "ID-015-03", name: "Legion Fields Whole Chicken", category: "Meat", quantity: 1, unit: "Case", source: "Lena Hoffman", unitPrice: 50, priceLabel: "$50/case" },
      { id: "li-12", itemCode: "ID-021-01", name: "Blueberries", category: "Fruits", quantity: 1, unit: "Box", source: "FreshMarket Co.", unitPrice: 12.5, priceLabel: "$12.50/box" },
      { id: "li-13", itemCode: "ID-021-02", name: "Blueberries", category: "Fruits", quantity: 1, unit: "Box", source: "FreshMarket Co.", unitPrice: 12.5, priceLabel: "$12.50/box" },
    ],
  },
  {
    id: "DP-1038",
    distributor: "4PF Co.",
    orderDate: "Jul 14, 10:12 AM",
    expectedDelivery: "Jul 16, 8:00 AM",
    totalPrice: 355,
    checked: true,
    items: [
      { id: "li-r1", itemCode: "ID-002-02", name: "Angus Chuck Ground Beef", category: "Meat", quantity: 1, unit: "Case", source: "FreshMarket Co", unitPrice: 125, priceLabel: "$125/case" },
      { id: "li-r2", itemCode: "ID-001-10", name: "Rib-eye Steak", category: "Meat", quantity: 1, unit: "Case", source: "FreshMarket Co", unitPrice: 90, priceLabel: "$90/case" },
      { id: "li-r3", itemCode: "ID-015-04", name: "Legion Fields Whole Chicken", category: "Meat", quantity: 1, unit: "Case", source: "FreshMarket Co", unitPrice: 50, priceLabel: "$50/case" },
    ],
  },
];

const INITIAL_ITEM_RESULTS: Record<string, Record<string, ItemCheckState>> = {
  "DP-1038": {
    "li-r1": {
      status: "accepted",
      expiration: "2026-08-01",
      itemId: "ID-002-02",
    },
    "li-r2": {
      status: "accepted",
      expiration: "2026-08-01",
      itemId: "ID-001-10",
    },
    "li-r3": {
      status: "rejected",
      expiration: "",
      itemId: "ID-015-04",
      reason: "Missing Exp Date",
      photoName: "problem.jpg",
      photoUrl: REJECT_PHOTO_SAMPLE,
    },
  },
};

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

function CheckOrderView({
  order,
  onClose,
  onAccepted,
}: {
  order: DeliveryOrder;
  onClose: () => void;
  onAccepted: (orderId: string, checks: Record<string, ItemCheckState>) => void;
}) {
  const [checks, setChecks] = useState(() => emptyChecks(order.items));
  const [rejectFor, setRejectFor] = useState<string | null>(null);
  const [rejectAnchor, setRejectAnchor] = useState<HTMLElement | null>(null);
  const [phase, setPhase] = useState<"check" | "review">("check");

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
    setChecks((current) => ({
      ...current,
      [id]: { ...current[id], ...patch },
    }));
  }

  const col =
    "grid-cols-[220px_48px_56px_140px_minmax(200px,auto)_minmax(0,1fr)_220px]";

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
      <div className="shrink-0 border-b border-[#ECECEA] bg-white px-4 pt-5 pb-4 md:px-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[22px] font-semibold tracking-tight text-[#111118]">
              Check Order
            </h1>
            <p className="mt-1 text-[13px] text-[#8A8A8A]">
              Delivery Validation From{" "}
              <span className="font-medium text-[#111118]">
                {order.distributor}
              </span>
            </p>
          </div>
          <UserMenu className="items-center" />
        </div>
      </div>

      <div className="flex-1 overflow-auto px-4 py-5 md:px-7">
        <div className="space-y-6">
          {categories.map(([category, items]) => (
            <section key={category}>
              <h2 className="mb-3 text-[16px] font-semibold text-[#111118]">
                {category}
              </h2>
              <ScrollTable minWidth={860} className="rounded-[12px]">
                <div
                  className={cn(
                    "grid items-center gap-x-3 border-b border-[#F0F0EE] bg-white px-4 py-2.5 text-[11px] font-semibold tracking-[0.06em] text-[#2E2E2E] uppercase",
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
                  <span>Actions</span>
                </div>

                {items.map((item) => {
                  const state = checks[item.id];
                  return (
                    <div
                      key={item.id}
                      className={cn(
                        "relative grid items-center gap-x-3 border-b border-[#F0F0EE] bg-white px-4 py-3 last:border-b-0",
                        col,
                        state.status === "accepted" &&
                          "border-l-[3px] border-l-[#2F8F4E]",
                        state.status === "rejected" &&
                          "border-l-[3px] border-l-[#F57850]",
                      )}
                    >
                      <span className="min-w-0 truncate text-[13px] font-medium text-[#111118]">
                        {item.name}
                      </span>
                      <span className="text-center text-[13px] text-[#111118]">
                        {item.quantity}
                      </span>
                      <span className="text-[13px] font-medium text-[#111118]">
                        {item.unit}
                      </span>
                      <div className="w-[140px]">
                        <ExpirationDatePicker
                          value={state.expiration}
                          onChange={(expiration) =>
                            updateCheck(item.id, { expiration })
                          }
                        />
                      </div>
                      <div className="flex items-center gap-x-2.5">
                        <button
                          type="button"
                          className="inline-flex h-10 shrink-0 items-center rounded-[10px] px-3 text-[13px] font-medium"
                          style={{ color: LINK_BLUE }}
                        >
                          Print
                        </button>
                        <input
                          type="text"
                          value={state.itemId}
                          onChange={(event) =>
                            updateCheck(item.id, { itemId: event.target.value })
                          }
                          className="h-10 w-[118px] rounded-[8px] border border-[#E0E0DE] bg-white px-3 text-[13px] text-[#111118] outline-none"
                        />
                      </div>
                      <span aria-hidden />
                      <div className="flex items-center gap-x-2 whitespace-nowrap">
                        {state.status === "accepted" ? (
                          <>
                            <button
                              type="button"
                              className="inline-flex h-10 items-center rounded-[10px] px-3 text-[13px] font-medium text-[#E25B5B]"
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
                              className="inline-flex h-10 items-center rounded-[10px] px-3 text-[13px] font-medium"
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
                              className="inline-flex h-10 items-center rounded-[10px] px-3 text-[13px] font-medium text-[#E25B5B]"
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
                              className="inline-flex h-10 items-center rounded-[10px] px-3 text-[13px] font-medium"
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

      {rejectFor && rejectAnchor ? (
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
          onClick={onClose}
          className="inline-flex h-10 items-center rounded-[10px] px-4 text-[14px] font-medium text-[#111118]"
        >
          Cancel & Close
        </button>
        {phase === "check" ? (
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
            onClick={() => onAccepted(order.id, checks)}
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

  const [activeTab, setActiveTab] = useState<"Orders" | "Received">("Orders");
  const [activeChip, setActiveChip] = useState("wed-20");
  const [search, setSearch] = useState("");
  const [productFilter, setProductFilter] = useState("");
  const [distributorFilter, setDistributorFilter] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(["DP-1043", "DP-1038"]),
  );
  const [orders, setOrders] = useState(INITIAL_ORDERS);
  const [checkingId, setCheckingId] = useState<string | null>(null);
  const [itemResults, setItemResults] = useState<
    Record<string, Record<string, ItemCheckState>>
  >(() => INITIAL_ITEM_RESULTS);
  const [imagePreview, setImagePreview] = useState<RejectImagePreview | null>(
    null,
  );

  const checkingOrder =
    orders.find((order) => order.id === checkingId) ?? null;

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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter((order) => {
      const matchesTab =
        activeTab === "Orders" ? !order.checked : order.checked;
      const matchesSearch =
        !q ||
        order.id.toLowerCase().includes(q) ||
        order.distributor.toLowerCase().includes(q);
      const matchesProduct =
        !productFilter ||
        order.items.some((item) => item.name === productFilter);
      const matchesDistributor =
        !distributorFilter || order.distributor === distributorFilter;
      return (
        matchesTab && matchesSearch && matchesProduct && matchesDistributor
      );
    });
  }, [activeTab, distributorFilter, orders, productFilter, search]);

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
    setOrders((current) =>
      current.map((order) =>
        order.id === orderId ? { ...order, checked: true } : order,
      ),
    );
    setItemResults((current) => ({ ...current, [orderId]: checks }));
    setCheckingId(null);
    setActiveTab("Received");
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
                className="h-10 rounded-[8px] border-[#E6E6E3] bg-white pl-8 text-[13px]"
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
          {DELIVERY_CHIPS.map((chip) => {
            const active = activeChip === chip.id;
            return (
              <button
                key={chip.id}
                type="button"
                onClick={() => setActiveChip(chip.id)}
                className={cn(
                  "inline-flex min-h-10 items-center gap-2.5 rounded-full border px-3.5 py-2 text-left",
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
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              className="flex size-10 items-center justify-center rounded-[8px] border border-[#ECECEA] bg-white text-[#8A8A8A]"
            >
              <ChevronRight size={16} />
            </button>
            <button
              type="button"
              className="flex size-10 items-center justify-center rounded-[8px] border border-[#ECECEA] bg-white text-[#8A8A8A]"
            >
              <Calendar size={16} />
            </button>
          </div>
        </div>

        <h2 className="mb-4 text-[20px] font-semibold text-[#111118]">
          Receiving Log
        </h2>

        <ScrollTable minWidth={920} className="rounded-[12px]">
          <div
            className={cn(
              ROW_GRID,
              "border-b border-[#F0F0EE] bg-white px-4 py-2.5 text-[11px] font-semibold tracking-[0.06em] text-[#2E2E2E] uppercase",
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

          <div className="divide-y-[5px] divide-[#F0F0EE]">
            {filtered.map((order) => {
              const open = expanded.has(order.id);
              const results = itemResults[order.id];

              return (
                <div key={order.id} className="bg-white">
                  <div
                    className={cn(
                      ROW_GRID,
                      "px-4 py-3.5",
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

                    <span className="w-fit rounded-[6px] bg-[#EEEEEC] px-2 py-0.5 font-mono text-[11px] font-medium text-[#6A6A6A]">
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
                          onClick={() => toggleExpanded(order.id)}
                          className="inline-flex h-10 items-center gap-1.5 rounded-[10px] px-3 text-[13px] font-medium"
                          style={{ color: LINK_BLUE }}
                        >
                          View
                          <span className="inline-flex size-5 items-center justify-center rounded-full bg-[#2F8F4E] text-white">
                            <Check size={11} strokeWidth={3} />
                          </span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setCheckingId(order.id)}
                          className="inline-flex h-10 items-center rounded-[10px] px-3 text-[13px] font-medium"
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

                        return (
                          <div
                            key={item.id}
                            className={cn(
                              ROW_GRID,
                              "bg-[#F9FAFB] px-4 py-3 text-[13px]",
                              itemIndex < order.items.length - 1 &&
                                "border-b border-[#F0F0EE]",
                            )}
                          >
                            <div />
                            <span className="w-fit rounded-[6px] bg-[#EEEEEC] px-2 py-0.5 font-mono text-[11px] font-medium text-[#6A6A6A]">
                              {result?.itemId ?? item.itemCode}
                            </span>
                            <div
                              className={cn(
                                "min-w-0 truncate",
                                rejected ? "text-[#E25B5B]" : "text-[#111118]",
                              )}
                            >
                              {item.name}
                            </div>
                            <div className="truncate text-[#8A8A8A]">
                              {item.source}
                            </div>
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
                              {rejected ? (
                                <button
                                  type="button"
                                  className="inline-flex h-10 items-center rounded-[10px] px-3 text-[13px] font-medium"
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

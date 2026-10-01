import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Calendar,
  Camera,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";

import { DeliveryDateCalendar } from "@/components/orders/DeliveryDateCalendar";
import { Header } from "@/components/layout/AdminHeader";
import { UserMenu } from "@/components/layout/UserMenu";
import {
  DateNavButton,
  CalendarIcon,
  DATE_NAV_GROUP,
} from "@/components/shared/DateNavButton";
import {
  DeliveryDateChip,
  DATE_CHIP_ROW,
  DATE_CHIP_SCROLL,
} from "@/components/shared/DeliveryDateChip";
import { ExportButton } from "@/components/shared/ExportButton";
import { IdPill } from "@/components/ui/Badge";
import { AppLoader } from "@/components/ui/AppLoader";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ScrollTable } from "@/components/ui/ScrollTable";
import { SearchField } from "@/components/ui/SearchField";
import { Select } from "@/components/ui/Select";
import { Tabs } from "@/components/ui/Tabs";
import { PINNED_HEADER, TABLE_HEADER } from "@/constants/table";
import { useReceivingHandoff } from "@/context/ReceivingHandoffContext";
import { useApiFeedback } from "@/hooks/useApiFeedback";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useFloatingMenu } from "@/hooks/useFloatingMenu";
import { useLazyWindow } from "@/hooks/useLazyWindow";
import { InfiniteScrollSentinel } from "@/components/ui/InfiniteScrollSentinel";
import { collectPaginated, isApiConfigured, ordersApi, receivingApi } from "@/lib/api";
import { centsToDollars } from "@/lib/api/mappers";
import type {
  ApiDelivery,
  ApiDeliveryLine,
  ValidateDeliveryItem,
} from "@/lib/api/receiving";
import { isUploadableImage, uploadImage } from "@/lib/api/upload";
import type { ExportRequest } from "@/types/export";
import type { ReceivingHandoffLine } from "@/types/receiving";
import { cn } from "@/utils/cn";
import { isUuid } from "@/utils/entityIds";
import { downloadCsvFile, exportFilename } from "@/utils/csvExport";
import { floatingMenuStyle } from "@/utils/floatingMenu";
import {
  deliveryDateIdFromValue,
  formatDeliveryChipLabel,
  formatExpectedDelivery,
  parseDeliveryDateId,
  toDeliveryDateId,
} from "@/utils/deliveryCalendar";
import { formatOrderTimestamp } from "@/utils/distributorOrdersPage";
import {
  acceptedLinesOnly,
  formatReceivedAt,
  printItemLabel,
} from "@/utils/receivingHandoff";

const ORANGE = "#F57850";
const LINK_BLUE = "#3B82F6";
const CHIP_WINDOW_SIZE = 3;

type LineItem = {
  id: string;
  /** Sellable product UUID sent to POST /receiving/:orderId/validate. */
  productId: string;
  itemCode: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  source: string;
  unitPrice: number;
  priceLabel: string;
};

type DeliveryOrder = {
  id: string;
  recordId?: string;
  distributor: string;
  orderDate: string;
  expectedDelivery: string;
  /** ISO date id for receiving date navigation. */
  deliveryDateId: string;
  totalPrice: number;
  checked: boolean;
  items: LineItem[];
};

type RejectReason = "Wrong Item" | "Damaged" | "Not Fresh" | "Missing Exp Date";

type ItemCheckState = {
  status: "pending" | "accepted" | "rejected";
  expiration: string;
  itemId: string;
  reason?: RejectReason;
  photoName?: string;
  photoUrl?: string;
  photoFile?: File;
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
    <aside className="absolute inset-y-0 right-0 z-40 flex w-full max-w-[420px] flex-col border-l border-[#00000014] bg-white shadow-[-8px_0_32px_rgba(0,0,0,0.08)]">
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
          <div className="mt-0.5 text-[11px] font-semibold tracking-[0.06em] text-[#2E2E2E] uppercase">
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
  const anchorRef = useRef(anchor);
  anchorRef.current = anchor;
  const menuBox = useFloatingMenu(true, anchorRef, panelRef, {
    width: 248,
    maxHeight: 360,
    gap: 8,
  });
  const [photoTaken, setPhotoTaken] = useState(hasPhoto);
  const [photoError, setPhotoError] = useState(false);
  const [photoMessage, setPhotoMessage] = useState("Problem photo is required.");

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

  function handleSelectReason(reason: RejectReason) {
    if (!photoTaken) {
      setPhotoError(true);
      return;
    }
    onSelect(reason);
  }

  return createPortal(
    <div
      ref={panelRef}
      role="dialog"
      aria-label="Reject reason"
      data-scroll-lock-allow
      className="ui-select-menu fixed z-[80] overflow-x-hidden overflow-y-auto overscroll-contain rounded-[12px] border border-[#00000014] bg-white p-3 shadow-[0_12px_32px_rgba(0,0,0,0.14)]"
      style={floatingMenuStyle(menuBox)}
    >
      <div className="mb-2.5">
        <input
          ref={photoInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (!file) return;
            if (!isUploadableImage(file)) {
              setPhotoTaken(false);
              setPhotoError(true);
              setPhotoMessage("Use a JPEG, PNG, or WebP photo.");
              return;
            }
            setPhotoTaken(true);
            setPhotoError(false);
            setPhotoMessage("Problem photo is required.");
            onPhoto?.(file);
          }}
        />
        <button
          type="button"
          className={cn(
            "inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-[10px] text-[12px] font-medium hover:bg-[#ECECEA]",
            photoError
              ? "border-danger border bg-[#FDECEC] text-[#E25B5B]"
              : "bg-[#F3F3F1] text-[#111118]",
          )}
          onClick={() => photoInputRef.current?.click()}
        >
          <Camera size={14} />
          {photoTaken ? "Photo attached · Retake" : "Take photo of problem *"}
        </button>
        {photoError ? (
          <p className="mt-1.5 text-[11px] text-[#E25B5B]">{photoMessage}</p>
        ) : null}
      </div>
      <div className="border-t border-[#00000014] pt-2.5">
        <div className="mb-2.5 text-[13px] font-semibold text-[#111118]">
          Reason
          <span className="text-danger"> *</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {REJECT_REASONS.map((reason) => (
            <button
              key={reason}
              type="button"
              onClick={() => handleSelectReason(reason)}
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
  const menuBox = useFloatingMenu(open, triggerRef, panelRef, {
    width: 280,
    maxHeight: 420,
    gap: 8,
  });
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

    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (panelRef.current?.contains(target) || anchor?.contains(target))
        return;
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
      <div className="inline-flex h-10 w-full max-w-[160px] min-w-[140px] items-center gap-2 rounded-[8px] border border-[#00000014] bg-[#F9FAFB] px-2.5 text-[13px] text-[#111118]">
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
        className="inline-flex h-10 w-full max-w-[160px] min-w-[140px] items-center gap-2 rounded-[8px] border border-[#00000014] bg-white px-2.5 text-left text-[13px] outline-none"
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
              data-scroll-lock-allow
              className="ui-select-menu fixed z-[80] overflow-x-hidden overflow-y-auto overscroll-contain rounded-[12px] border border-[#00000014] bg-white p-4 shadow-[0_12px_32px_rgba(0,0,0,0.14)]"
              style={floatingMenuStyle(menuBox)}
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
const INITIAL_ORDERS: DeliveryOrder[] = [];

function readDeliveryName(delivery: ApiDelivery) {
  if (typeof delivery.distributor === "string" && delivery.distributor.trim()) {
    return delivery.distributor.trim();
  }
  if (delivery.distributor && typeof delivery.distributor === "object") {
    return delivery.distributor.name?.trim() || "Distributor";
  }
  return delivery.distributorName?.trim() || delivery.name?.trim() || "Distributor";
}

function readLineText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function lineProductId(line: ApiDeliveryLine) {
  return line.productId?.trim() || line.product?.id?.trim() || "";
}

function lineDisplayName(line: ApiDeliveryLine) {
  return (
    readLineText(line.name) ||
    readLineText(line.itemName) ||
    readLineText(line.product?.name) ||
    "Item"
  );
}

function lineUnitPrice(line: ApiDeliveryLine) {
  const cents = line.price ?? line.unitPrice ?? line.cost;
  if (typeof cents === "number" && Number.isFinite(cents)) {
    return centsToDollars(cents);
  }
  return 0;
}

function mapDelivery(delivery: ApiDelivery, index: number): DeliveryOrder {
  const recordId = isUuid(delivery.id) ? delivery.id : undefined;
  const code =
    delivery.deliveryCode?.trim() ||
    delivery.orderCode?.trim() ||
    delivery.code?.trim() ||
    delivery.id?.trim() ||
    `DLV-${index + 1}`;
  const deliveryDateId = deliveryDateIdFromValue(delivery.deliveryDate);
  const deliveryDate = deliveryDateId
    ? parseDeliveryDateId(deliveryDateId)
    : null;
  const created = delivery.createdAt ? new Date(delivery.createdAt) : null;
  const status = (delivery.status ?? "").trim().toLowerCase();
  const checked =
    Boolean(delivery.validatedAt || delivery.receivedAt) ||
    status === "delivered" ||
    status === "received";
  const items: LineItem[] = (delivery.items ?? []).map((line, lineIndex) => {
    const quantity = Number(line.quantity ?? 0) || 0;
    const unitPrice = lineUnitPrice(line);
    const productId = lineProductId(line);
    return {
      id: line.id || `${productId || code}-${lineIndex + 1}`,
      productId,
      itemCode:
        line.itemCode?.trim() ||
        line.itemId?.trim() ||
        "",
      name: lineDisplayName(line),
      category: line.categoryName?.trim() || line.category?.trim() || "Items",
      quantity,
      unit: line.unit?.trim() || "",
      source: readLineText(line.sourceName) || readLineText(line.source),
      unitPrice,
      priceLabel: unitPrice ? `$${unitPrice.toFixed(2)}` : "—",
    };
  });
  const totalPrice =
    typeof delivery.totalPrice === "number"
      ? centsToDollars(delivery.totalPrice)
      : items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  return {
    id: code,
    recordId,
    distributor: readDeliveryName(delivery),
    orderDate:
      created && !Number.isNaN(created.getTime())
        ? formatOrderTimestamp(created)
        : "",
    expectedDelivery: deliveryDate ? formatExpectedDelivery(deliveryDate) : "",
    deliveryDateId,
    totalPrice,
    checked,
    items,
  };
}

/**
 * Incoming rows come from GET /receiving/deliveries.
 * Validated rows leave that list, so Delivered is GET /orders?status=delivered.
 */
async function loadReceivingScreen(): Promise<DeliveryOrder[]> {
  const [incoming, delivered] = await Promise.all([
    receivingApi.listDeliveries(),
    collectPaginated((page, limit) =>
      ordersApi.list({
        page,
        limit,
        type: "distributor",
        status: "delivered",
      }),
    ),
  ]);

  const merged = new Map<string, DeliveryOrder>();
  const put = (order: DeliveryOrder) => {
    const key = order.recordId || order.id;
    const prior = merged.get(key);
    if (!prior) {
      merged.set(key, order);
      return;
    }
    merged.set(key, {
      ...prior,
      ...order,
      items: order.items.length ? order.items : prior.items,
      checked: prior.checked || order.checked,
      distributor:
        order.distributor && order.distributor !== "Distributor"
          ? order.distributor
          : prior.distributor,
    });
  };

  incoming.forEach((row, index) => put(mapDelivery(row, index)));
  delivered.forEach((row, index) =>
    put({ ...mapDelivery(row as ApiDelivery, index), checked: true }),
  );
  return [...merged.values()];
}

const INITIAL_ITEM_RESULTS: Record<string, Record<string, ItemCheckState>> = {};

function currency(value: number) {
  return `$${value.toLocaleString(undefined, {
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

const DELIVERY_EXPORT_HEADERS = [
  "Delivery ID",
  "Distributor",
  "Order Date",
  "Expected Delivery",
  "Total Price",
] as const;

function downloadDeliveriesCsv(orders: DeliveryOrder[], filename: string) {
  downloadCsvFile(filename, [
    [...DELIVERY_EXPORT_HEADERS],
    ...orders.map((order) => [
      order.id,
      order.distributor || "—",
      order.orderDate || "—",
      order.expectedDelivery || "—",
      currency(order.totalPrice),
    ]),
  ]);
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
    if (state.status === "rejected" && !state.photoName && !state.photoUrl) {
      errors.push(`${item.name}: problem photo required`);
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
  onAccepted: (
    orderId: string,
    checks: Record<string, ItemCheckState>,
  ) => void | Promise<void>;
}) {
  const [checks, setChecks] = useState(
    () => initialChecks ?? emptyChecks(order.items),
  );
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
  const [rejectFor, setRejectFor] = useState<string | null>(null);
  const [rejectAnchor, setRejectAnchor] = useState<HTMLElement | null>(null);
  const [phase, setPhase] = useState<"check" | "review">(
    readOnly ? "review" : "check",
  );
  const [validationError, setValidationError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setChecks((current) => {
      let changed = false;
      const next = { ...current };
      for (const item of order.items) {
        const existing = next[item.id];
        if (!existing) {
          next[item.id] = {
            status: "pending",
            expiration: "",
            itemId: item.itemCode,
          };
          changed = true;
          continue;
        }
        if (!existing.itemId && item.itemCode) {
          next[item.id] = { ...existing, itemId: item.itemCode };
          changed = true;
        }
      }
      return changed ? next : current;
    });
  }, [order.items]);

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
      setLeaveConfirmOpen(true);
      return;
    }
    onClose();
  }

  async function handleAcceptOrder() {
    const errors = validateChecks(order.items, checks);
    if (errors.length) {
      setValidationError(
        errors[0] ?? "Complete all required receiving fields.",
      );
      setPhase("check");
      return;
    }
    setSaving(true);
    try {
      await onAccepted(order.id, checks);
    } finally {
      setSaving(false);
    }
  }

  // Figma: name + qty/unit/exp/id+Print packed left; flexible gap; Actions right
  const col =
    "grid grid-cols-[minmax(0,1.4fr)_40px_52px_148px_minmax(180px,auto)_minmax(0,1fr)_auto] items-center gap-x-4 px-4";

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#FAFAFA]">
      <div className="shrink-0 border-b border-[#00000014] bg-white px-4 pt-5 pb-4 md:px-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[22px] font-semibold tracking-tight text-[#111118]">
              {readOnly ? "View Order" : "Check Order"}
            </h1>
            <p className="mt-1 text-[13px] text-[#8A8A8A]">
              {readOnly
                ? "Processed Receiving From"
                : "Delivery Validation From"}{" "}
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

      <div className="min-h-0 flex-1 overflow-auto bg-[#FAFAFA] px-4 py-5 md:px-7 md:py-5">
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
                    PINNED_HEADER,
                    TABLE_HEADER,
                    "h-10 border-b border-[#00000014]",
                    col,
                  )}
                >
                  <span>Item Name</span>
                  <span>Qty</span>
                  <span>Unit</span>
                  <span>
                    Expiration Date
                    <span className="text-danger"> *</span>
                  </span>
                  <span>
                    {category === "Fruits" ? "Item ID" : "Order ID"}
                    <span className="text-danger"> *</span>
                  </span>
                  <span aria-hidden />
                  <span className="text-right">Actions</span>
                </div>

                {items.map((item) => {
                  const state = checks[item.id] ?? {
                    status: "pending" as const,
                    expiration: "",
                    itemId: item.itemCode,
                  };
                  return (
                    <div
                      key={item.id}
                      className={cn(
                        "relative border-b border-[#00000014] bg-white py-3.5 last:border-b-0",
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
                          <span className="inline-flex h-10 w-[132px] shrink-0 items-center rounded-[8px] border border-[#00000014] bg-[#F9FAFB] px-3 font-mono text-[13px] text-[#111118]">
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
                            className="h-10 w-[132px] shrink-0 rounded-[8px] border border-[#00000014] bg-white px-3 text-[13px] text-[#111118] outline-none"
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
                            <span className="text-[12px] text-[#8A8A8A]">
                              —
                            </span>
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
              photoFile: file,
            });
          }}
          hasPhoto={Boolean(
            checks[rejectFor]?.photoName || checks[rejectFor]?.photoUrl,
          )}
        />
      ) : null}

      <div className="flex items-center justify-end gap-4 border-t border-[#00000014] bg-white px-4 py-4 md:px-7">
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
            disabled={saving}
            onClick={() => void handleAcceptOrder()}
            className="inline-flex h-10 items-center rounded-[10px] px-5 text-[14px] font-semibold text-white disabled:opacity-40"
            style={{ background: ORANGE }}
          >
            {saving ? "Saving…" : "Accept Order"}
          </button>
        )}
      </div>

      <ConfirmDialog
        open={leaveConfirmOpen}
        title="Leave receiving?"
        message="You have unsaved receiving changes. Leave without completing Accept Order?"
        confirmLabel="Leave"
        onClose={() => setLeaveConfirmOpen(false)}
        onConfirm={onClose}
      />
    </div>
  );
}

const ROW_GRID =
  "grid grid-cols-[18px_112px_minmax(0,1.2fr)_150px_150px_100px_minmax(0,1fr)_88px] items-center gap-x-4 px-4";

export default function DistributorDeliveriesPage() {
  useDocumentTitle("Distributor Receiving");
  const { pushHandoff, markDeliveryReceived } = useReceivingHandoff();
  const { notifyApiError } = useApiFeedback();

  const [activeTab, setActiveTab] = useState<"Orders" | "Received">("Orders");
  const [activeDateId, setActiveDateId] = useState("");
  const [chipWindowStart, setChipWindowStart] = useState(0);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [productFilter, setProductFilter] = useState("");
  const [distributorFilter, setDistributorFilter] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [orders, setOrders] = useState(INITIAL_ORDERS);
  const [loading, setLoading] = useState(() => isApiConfigured());
  const [checkingId, setCheckingId] = useState<string | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [itemResults, setItemResults] = useState<
    Record<string, Record<string, ItemCheckState>>
  >(() => INITIAL_ITEM_RESULTS);
  const [imagePreview, setImagePreview] = useState<RejectImagePreview | null>(
    null,
  );

  useEffect(() => {
    if (!isApiConfigured()) return;
    let cancelled = false;
    void loadReceivingScreen()
      .then((mapped) => {
        if (cancelled) return;
        setOrders(mapped);
        const dateIds = [
          ...new Set(
            mapped
              .filter((order) => !order.checked)
              .map((order) => order.deliveryDateId)
              .filter(Boolean),
          ),
        ].sort();
        const preferred = dateIds[dateIds.length - 1] ?? "";
        if (!preferred) return;
        setActiveDateId((current) => current || preferred);
        const index = dateIds.indexOf(preferred);
        setChipWindowStart((current) =>
          current === 0
            ? Math.max(0, index - CHIP_WINDOW_SIZE + 1)
            : current,
        );
      })
      .catch((error) => {
        if (!cancelled) notifyApiError(error, "Failed to load deliveries.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [notifyApiError]);

  const ordersRef = useRef(orders);
  ordersRef.current = orders;
  const loadedDeliveryIds = useRef(new Set<string>());

  useEffect(() => {
    if (!isApiConfigured()) return;
    const openIds = new Set<string>();
    if (checkingId) openIds.add(checkingId);
    if (viewingId) openIds.add(viewingId);
    for (const id of expanded) openIds.add(id);

    const pending = ordersRef.current.filter(
      (order) =>
        openIds.has(order.id) &&
        order.recordId &&
        !loadedDeliveryIds.current.has(order.recordId) &&
        order.items.some((item) => !item.unit && !item.source && !item.itemCode),
    );
    if (!pending.length) return;

    let cancelled = false;
    void Promise.all(
      pending.map(async (order) => {
        const recordId = order.recordId;
        if (!recordId) return null;
        try {
          const remote = await ordersApi.getById(recordId);
          return {
            id: order.id,
            recordId,
            mapped: mapDelivery(remote as ApiDelivery, 0),
          };
        } catch (error) {
          if (!cancelled) notifyApiError(error, "Failed to load order details.");
          return null;
        }
      }),
    ).then((results) => {
      if (cancelled) return;
      for (const result of results) {
        if (result?.recordId) loadedDeliveryIds.current.add(result.recordId);
      }
      setOrders((current) =>
        current.map((row) => {
          const hit = results.find((entry) => entry?.id === row.id);
          if (!hit?.mapped.items.length) return row;
          return {
            ...row,
            items: hit.mapped.items,
            distributor:
              hit.mapped.distributor && hit.mapped.distributor !== "Distributor"
                ? hit.mapped.distributor
                : row.distributor,
            totalPrice: hit.mapped.totalPrice || row.totalPrice,
          };
        }),
      );
    });
    return () => {
      cancelled = true;
    };
  }, [checkingId, expanded, notifyApiError, viewingId]);

  const checkingOrder = orders.find((order) => order.id === checkingId) ?? null;
  const viewingOrder = orders.find((order) => order.id === viewingId) ?? null;

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
    () => Array.from(new Set(orders.map((order) => order.distributor))).sort(),
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

  const receivingDates = useMemo(() => {
    const unique = new Map<string, Date>();
    for (const order of orders) {
      if (order.checked) continue;
      const parsed = parseDeliveryDateId(order.deliveryDateId);
      if (parsed) unique.set(order.deliveryDateId, parsed);
    }
    const fromOrders = [...unique.values()].sort(
      (left, right) => left.getTime() - right.getTime(),
    );
    return fromOrders;
  }, [orders]);

  const visibleChips = useMemo(() => {
    return receivingDates
      .slice(chipWindowStart, chipWindowStart + CHIP_WINDOW_SIZE)
      .map((date) => {
      const id = toDeliveryDateId(date);
      return {
        id,
        label: formatDeliveryChipLabel(date),
        count: dateCounts.get(id) ?? 0,
      };
    });
  }, [chipWindowStart, dateCounts, receivingDates]);

  const canShiftBack = chipWindowStart > 0;
  const canShiftForward =
    chipWindowStart + CHIP_WINDOW_SIZE < receivingDates.length;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter((order) => {
      const matchesTab =
        activeTab === "Orders" ? !order.checked : order.checked;
      const matchesDate =
        activeTab === "Received" || order.deliveryDateId === activeDateId;
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

  const listWindow = useLazyWindow(
    filtered,
    `${search}|${activeTab}|${activeDateId}|${productFilter}|${distributorFilter}`,
  );

  function selectDeliveryDate(dateId: string) {
    setActiveDateId(dateId);
    const index = receivingDates.findIndex(
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
        Math.min(current + delta, receivingDates.length - CHIP_WINDOW_SIZE),
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

  async function handleAccepted(
    orderId: string,
    checks: Record<string, ItemCheckState>,
  ) {
    const order = orders.find((entry) => entry.id === orderId);
    if (!order) return;

    if (isApiConfigured()) {
      const validateId = order.recordId ?? (isUuid(order.id) ? order.id : "");
      if (!validateId) {
        notifyApiError(
          new Error("This delivery is missing a server id."),
          "This delivery is missing a server id.",
        );
        return;
      }
      try {
        const payload: ValidateDeliveryItem[] = [];
        for (const item of order.items) {
          const result = checks[item.id];
          const status: ValidateDeliveryItem["status"] =
            result?.status === "rejected" ? "rejected" : "accepted";
          if (!isUuid(item.productId)) {
            notifyApiError(
              new Error("Missing product id"),
              `${item.name} is missing a product id, so it cannot be validated.`,
            );
            return;
          }
          let evidenceUrl: string | undefined;
          if (status === "rejected" && result?.photoFile) {
            evidenceUrl = await uploadImage(result.photoFile);
          }
          payload.push({
            productId: item.productId,
            status,
            ...(status === "rejected" && result?.reason
              ? { reason: result.reason }
              : {}),
            ...(evidenceUrl ? { evidenceUrl } : {}),
          });
        }
        await receivingApi.validate(validateId, payload);
        try {
          const refreshed = await loadReceivingScreen();
          setOrders((current) => {
            const previous = new Map(
              current.map((entry) => [entry.recordId ?? entry.id, entry]),
            );
            return refreshed.map((entry) => {
              const prior = previous.get(entry.recordId ?? entry.id);
              const keepDetails = prior?.items.some(
                (item) => item.unit || item.source || item.itemCode,
              );
              const matched =
                entry.recordId === validateId || entry.id === order.id;
              return {
                ...entry,
                items: keepDetails && prior ? prior.items : entry.items,
                checked: entry.checked || matched,
              };
            });
          });
        } catch {
          setOrders((current) =>
            current.map((entry) =>
              entry.id === orderId ? { ...entry, checked: true } : entry,
            ),
          );
        }
      } catch (error) {
        notifyApiError(error, "Failed to validate delivery.");
        return;
      }
    }

    const lines: ReceivingHandoffLine[] = order.items.map((item) => {
      const result = checks[item.id];
      return {
        lineId: item.id,
        itemId: result?.itemId || item.itemCode || item.productId,
        catalogItemId: item.productId,
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

    if (!isApiConfigured()) {
      setOrders((current) =>
        current.map((entry) =>
          entry.id === orderId ? { ...entry, checked: true } : entry,
        ),
      );
    }
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
    <div className="relative flex h-full min-h-0 flex-col bg-[#FAFAFA]">
      <Header
        title="Distributor Receiving"
        toolbar={
          <div className="flex w-full flex-wrap items-center gap-2 md:flex-nowrap">
            <SearchField
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search"
            />

            <Select
              value={productFilter}
              onChange={setProductFilter}
              placeholder="All products"
              aria-label="All products"
              className="w-full sm:w-[140px]"
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
              placeholder="All Distributors"
              aria-label="All Distributors"
              className="w-full sm:w-[160px]"
              options={[
                { value: "", label: "All Distributors" },
                ...distributorOptions.map((name) => ({
                  value: name,
                  label: name,
                })),
              ]}
            />
            <ExportButton
              entityLabel="deliveries"
              recordCount={filtered.length}
              filtersActive={Boolean(
                search.trim() || productFilter || distributorFilter,
              )}
              onExport={async (request: ExportRequest) => {
                const source = request.scope === "all" ? orders : filtered;
                const filename =
                  request.scope === "all"
                    ? exportFilename("distributor-deliveries-all")
                    : activeTab === "Received"
                      ? `received-deliveries-${activeDateId}.csv`
                      : `distributor-deliveries-${activeDateId}.csv`;
                downloadDeliveriesCsv(source, filename);
              }}
              className="w-full sm:ml-auto sm:w-auto"
            />
          </div>
        }
        center={
          <Tabs
            embedded
            aria-label="Receiving views"
            items={[
              { id: "Orders", label: "Orders", width: 103 },
              { id: "Received", label: "Delivered", width: 93 },
            ]}
            value={activeTab}
            onChange={(id) => {
              setActiveTab(id as "Orders" | "Received");
              setCalendarOpen(false);
            }}
          />
        }
      />

      <div className="min-h-0 flex-1 overflow-y-auto bg-[#FAFAFA] px-4 py-5 md:px-7 md:py-5">
        {activeTab === "Orders" ? (
        <div className={DATE_CHIP_ROW}>
          <div className={DATE_CHIP_SCROLL}>
            {visibleChips.map((chip) => {
              const active = activeDateId === chip.id;
              return (
                <DeliveryDateChip
                  key={chip.id}
                  label={chip.label}
                  count={chip.count}
                  active={active}
                  onClick={() => selectDeliveryDate(chip.id)}
                />
              );
            })}
          </div>

          <div className={cn("relative z-20 shrink-0", DATE_NAV_GROUP)}>
            <DateNavButton
              aria-label="Previous dates"
              disabled={!canShiftBack}
              onClick={() => shiftChipWindow(-1)}
            >
              <ChevronLeft size={14} />
            </DateNavButton>
            <DateNavButton
              aria-label="Next dates"
              disabled={!canShiftForward}
              onClick={() => shiftChipWindow(1)}
            >
              <ChevronRight size={14} />
            </DateNavButton>
            <DateNavButton
              aria-label="Open calendar"
              aria-expanded={calendarOpen}
              onClick={() => setCalendarOpen((open) => !open)}
            >
              <CalendarIcon />
            </DateNavButton>
            {calendarOpen ? (
              <DeliveryDateCalendar
                selectedDateId={activeDateId}
                initialMonth={parseDeliveryDateId(activeDateId) ?? new Date()}
                onSelectDate={(dateId) => {
                  selectDeliveryDate(dateId);
                }}
                onClose={() => setCalendarOpen(false)}
              />
            ) : null}
          </div>
        </div>
        ) : null}

        <h2 className="mb-4 text-[20px] font-semibold tracking-tight text-[#111118]">
          Receiving Log
        </h2>

        {loading ? (
          <AppLoader variant="table" label="Loading deliveries" />
        ) : (
        <>
        <ScrollTable minWidth={920} className="rounded-[12px]">
          <div>
            <div
              className={cn(
                ROW_GRID,
                PINNED_HEADER,
                TABLE_HEADER,
                "h-10 border-b border-[#00000014]",
              )}
            >
              <div />
              <div className="-ml-3">Delivery ID</div>
              <div>Distributor</div>
              <div>Order Date</div>
              <div>Expected Delivery</div>
              <div>Total Price</div>
              <div aria-hidden />
              <div>Action</div>
            </div>

            {listWindow.visible.map((order) => {
              const open = expanded.has(order.id);
              const results = itemResults[order.id];

              return (
                <div key={order.id} className="contents">
                  <div
                    className={cn(
                      ROW_GRID,
                      "border-b border-[#00000014] bg-white py-3.5",
                    )}
                  >
                    <button
                      type="button"
                      aria-label={open ? "Collapse" : "Expand"}
                      onClick={() => toggleExpanded(order.id)}
                      className="flex items-center justify-self-start"
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

                    <IdPill>{order.id}</IdPill>
                    <span className="truncate text-[14px] font-semibold text-[#111118]">
                      {order.distributor}
                    </span>
                    <span className="text-[13px] whitespace-nowrap text-[#4A4A4A]">
                      {order.orderDate}
                    </span>
                    <span className="text-[13px] whitespace-nowrap text-[#4A4A4A]">
                      {order.expectedDelivery}
                    </span>
                    <span className="text-[13px] font-semibold whitespace-nowrap text-[#111118]">
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
                              "bg-[#FBF9F9] py-2.5 text-[13px]",
                              itemIndex < order.items.length - 1 &&
                                "border-b border-[#00000014]",
                            )}
                          >
                            <div className="col-span-2 min-w-0 justify-self-start">
                              <IdPill>{item.itemCode}</IdPill>
                            </div>
                            <div
                              className={cn(
                                "min-w-0 truncate",
                                rejected ? "text-[#E25B5B]" : "text-[#111118]",
                              )}
                            >
                              {item.name}
                            </div>
                            <div className="min-w-0 truncate text-[#8A8A8A]">
                              {item.source}
                            </div>
                            <div className="whitespace-nowrap text-[#111118]">
                              {item.quantity}
                              {item.unit ? ` ${item.unit}` : ""}
                            </div>
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

            {!filtered.length ? (
              <div className="col-span-full px-4 py-12 text-center text-[14px] text-[#8A8A8A]">
                {activeTab === "Received"
                  ? "No delivered orders yet."
                  : "No deliveries match your filters."}
              </div>
            ) : null}
          </div>
        </ScrollTable>
        <InfiniteScrollSentinel
          hasMore={listWindow.hasMore}
          loadedCount={listWindow.loadedCount}
          onLoadMore={listWindow.loadMore}
        />
        </>
        )}

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

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  Truck,
  X,
} from "lucide-react";

import { Header } from "@/components/layout/AdminHeader";
import { DeliveryDateCalendar } from "@/components/orders/DeliveryDateCalendar";
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
import { LocationHover } from "@/components/shared/LocationHover";
import { AppLoader } from "@/components/ui/AppLoader";
import { IdPill } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { InfiniteScrollSentinel } from "@/components/ui/InfiniteScrollSentinel";
import { ScrollTable } from "@/components/ui/ScrollTable";
import { SearchField } from "@/components/ui/SearchField";
import { Select } from "@/components/ui/Select";
import { Tabs } from "@/components/ui/Tabs";
import { PINNED_HEADER, TABLE_HEADER } from "@/constants/table";
import { usePackingHandoff } from "@/context/PackingHandoffContext";
import { useApiFeedback } from "@/hooks/useApiFeedback";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useLazyWindow } from "@/hooks/useLazyWindow";
import {
  centsToDollars,
  collectPaginated,
  isApiConfigured,
  orderModelId,
  orderRecordId,
  ordersApi,
  type ApiOrder,
  type ApiOrderItem,
} from "@/lib/api";
import type { OrderStatus } from "@/lib/api/orders";
import { publicCode } from "@/utils/entityIds";
import type { ExportRequest } from "@/types/export";
import type { PackingHandoffUpdate } from "@/types/packing";
import { cn } from "@/utils/cn";
import { downloadCsvFile, exportFilename } from "@/utils/csvExport";
import {
  deliveryDateIdFromValue,
  isWednesdayDateId,
  parseDeliveryDateId,
  pickDefaultDeliveryChipId,
  toDeliveryDateId,
  upcomingWednesday,
  WEDNESDAY_WEEKDAYS,
  weekWindowChips,
} from "@/utils/deliveryCalendar";

const ORANGE = "#F57850";

type TimelineStepKey =
  "requested" | "packing" | "onRoute" | "delivered" | "coolerPickup" | "return";

type TimelineStep = {
  key: TimelineStepKey;
  shortLabel?: string;
  person?: string;
  at?: string;
  done: boolean;
  final?: boolean;
};

type OrderItem = {
  name: string;
  qty: number;
  unit: string;
  unitPrice: number;
};

type CustomerOrderRow = {
  id: string;
  /** UUID required by PATCH /orders/:id/status. */
  recordId?: string;
  customerName: string;
  itemCount: number;
  address: string;
  apt: string;
  city: string;
  state: string;
  zip: string;
  orderDate: string;
  deliveryDate: string;
  /** Local calendar day, `YYYY-MM-DD`, used to filter the list. */
  deliveryDateId: string;
  deliveryLabel: string;
  paymentStatus: string;
  status?: string;
  total: number;
  items: OrderItem[];
  packerAssigned?: string;
  coolerIds?: string[];
  steps: TimelineStep[];
};

type CompletedOrder = {
  id: string;
  customer: string;
  address: string;
  zip: string;
  orderDate: string;
  delivered: string;
  items: number;
  total: number;
  day: string;
  week: string;
  /** API status is a finished order (`completed`). */
  finished?: boolean;
};

const STEPS_META: { key: TimelineStepKey; header: string }[] = [
  { key: "requested", header: "Requested" },
  { key: "packing", header: "Packing" },
  { key: "onRoute", header: "On Route" },
  { key: "delivered", header: "Delivered" },
  { key: "coolerPickup", header: "Cooler Pickup" },
  { key: "return", header: "Return" },
];

const STEP_API_STATUS: Record<TimelineStepKey, OrderStatus> = {
  requested: "requested",
  packing: "packing",
  onRoute: "on_route",
  delivered: "delivered",
  coolerPickup: "cooler_pickup",
  return: "return",
};

const ORDER_STATUS_DONE_COUNT: Record<string, number> = {
  requested: 1,
  packing: 2,
  cooler_ready: 2,
  loaded: 2,
  on_route: 3,
  delivered: 4,
  cooler_pickup: 5,
  return: 6,
  cancelled: 0,
};

type StatusDirection = "previous" | "next";

function stepHeader(stepKey: TimelineStepKey) {
  return STEPS_META.find((step) => step.key === stepKey)?.header ?? stepKey;
}

function statusNeighbors(stepKey: TimelineStepKey) {
  const index = STEPS_META.findIndex((step) => step.key === stepKey);
  return {
    previous: index > 0 ? STEPS_META[index - 1] : null,
    next:
      index >= 0 && index < STEPS_META.length - 1
        ? STEPS_META[index + 1]
        : null,
  };
}

function orderProgressIndex(steps: { done: boolean }[], status?: string) {
  if (status && status in ORDER_STATUS_DONE_COUNT) {
    return ORDER_STATUS_DONE_COUNT[status] - 1;
  }
  let index = -1;
  steps.forEach((step, stepIndex) => {
    if (step.done) index = stepIndex;
  });
  return index;
}

/** Only the immediate next step is a legal status change. */
function statusMoveHint(
  targetKey: TimelineStepKey,
  steps: { done: boolean }[],
  status?: string,
) {
  const currentIndex = orderProgressIndex(steps, status);
  const next = STEPS_META[currentIndex + 1] ?? null;
  if (!next) return "This order is already at the last status.";
  if (targetKey === next.key) return null;
  const targetIndex = STEPS_META.findIndex((step) => step.key === targetKey);
  if (targetIndex > currentIndex + 1) {
    return `You can't skip a status. Move to ${next.header} first.`;
  }
  return `You can only move to the next status (${next.header}).`;
}

/** Temporary seed - one line item sample. */

function applyPackingHandoff(
  order: CustomerOrderRow,
  packing?: PackingHandoffUpdate,
): CustomerOrderRow {
  if (!packing) return order;

  const readyAt = packing.coolerReadyAt ?? packing.packedAt;

  const steps = order.steps.map((step) => {
    if (step.key !== "packing" || !readyAt) return step;
    return {
      ...step,
      done: true,
      person: packing.packerName || step.person,
      shortLabel:
        packing.packerName?.split(" ")[0] || step.shortLabel,
      at: readyAt ? formatOrderStamp(readyAt) : step.at,
    };
  });

  return {
    ...order,
    coolerIds: packing.coolerIds.length ? packing.coolerIds : order.coolerIds,
    packerAssigned: packing.packerName || order.packerAssigned,
    steps,
  };
}

/** Temporary seed - one active order and one completed order. */
const ACTIVE_ORDERS: CustomerOrderRow[] = [];

const COMPLETED_ORDERS: CompletedOrder[] = [];

const ACTIVE_ORDER_COLUMNS =
  "grid grid-cols-[160px_repeat(6,minmax(0,1fr))] items-center gap-x-4 px-4";
const COMPLETED_ORDER_COLUMNS =
  "grid grid-cols-[112px_minmax(0,1fr)_minmax(0,1.6fr)_90px_minmax(0,1fr)_minmax(0,1fr)_70px_90px] items-center gap-x-4 px-4";

function currency(value: number) {
  return `$${value.toFixed(2)}`;
}

function orderLineItems(order: ApiOrder): OrderItem[] {
  return (order.items ?? []).map((line) => {
    const record = line as ApiOrderItem & Record<string, unknown>;
    const priceCents = readNumber(record.price);
    return {
      name:
        readString(record.name) ||
        readString(record.itemName) ||
        publicCode(line.productId) ||
        "N/A",
      qty: readNumber(record.quantity) ?? 0,
      unit: readString(record.unit) || "Each",
      unitPrice:
        priceCents != null
          ? centsToDollars(priceCents)
          : (readNumber(record.unitPrice) ?? 0),
    };
  });
}

function orderTotalDollars(order: ApiOrder, lines: OrderItem[]) {
  const raw = order as ApiOrder & Record<string, unknown>;
  const totalPriceCents = readNumber(raw.totalPrice);
  if (totalPriceCents != null) return centsToDollars(totalPriceCents);
  const dollarTotal =
    readNumber(raw.total) ??
    readNumber(raw.totalAmount) ??
    readNumber(raw.amount);
  if (dollarTotal != null) return dollarTotal;
  return lines.reduce((sum, line) => sum + line.qty * line.unitPrice, 0);
}

function orderCustomerRecord(order: ApiOrder) {
  const raw = order as ApiOrder & { customer?: unknown; user?: unknown };
  const users = order.users;
  if (Array.isArray(users)) {
    const match = users.find((entry) => entry?.id && entry.id === order.customerId);
    return asRecord(match ?? users[0]);
  }
  return asRecord(users) ?? asRecord(raw.customer) ?? asRecord(raw.user);
}

function readOrderCustomer(order: ApiOrder) {
  const raw = order as ApiOrder & Record<string, unknown>;
  const customer = orderCustomerRecord(order);
  const name =
    readString(raw.customerName) ||
    [readString(customer?.firstName), readString(customer?.lastName)]
      .filter(Boolean)
      .join(" ") ||
    readString(customer?.name) ||
    readString(customer?.email) ||
    "N/A";
  return {
    name,
    address:
      readString(customer?.address) ||
      readString(raw.address) ||
      readString(raw.deliveryAddress),
    apt: readString(customer?.aptUnit) || readString(customer?.apt),
    city: readString(customer?.city),
    state: readString(customer?.state),
    zip:
      readString(customer?.zipCode) ||
      readString(customer?.zip) ||
      readString(raw.zipCode) ||
      readString(raw.zip),
  };
}

function mapApiOrderToActive(
  order: ApiOrder,
  fallbackId: string,
): CustomerOrderRow {
  const doneCount = ORDER_STATUS_DONE_COUNT[order.status ?? "requested"] ?? 1;
  const lines = orderLineItems(order);
  const customer = readOrderCustomer(order);
  const orderCode = orderModelId(order, fallbackId);
  const steps = STEPS_META.map((meta, index) => {
    const done = index < doneCount;
    return {
      key: meta.key,
      done,
      final: meta.key === "return" && done,
      at: done ? timestampForStep(order, meta.key) : undefined,
    };
  });
  return {
    id: orderCode,
    recordId: orderRecordId(order),
    customerName: customer.name,
    itemCount: order.items?.length ?? 0,
    address: customer.address,
    apt: customer.apt,
    city: customer.city,
    state: customer.state,
    zip: customer.zip,
    orderDate: order.createdAt ? formatOrderStamp(order.createdAt) : "",
    deliveryDateId: deliveryDateIdFromValue(order.deliveryDate),
    deliveryDate: order.deliveryDate
      ? formatDeliveryBadge(order.deliveryDate)
      : "",
    deliveryLabel: order.deliveryDate
      ? formatDeliveryBadge(order.deliveryDate)
      : "",
    paymentStatus: readPaymentLabel(order),
    status: order.status,
    total: orderTotalDollars(order, lines),
    items: lines,
    packerAssigned: order.packerId ?? undefined,
    coolerIds: order.coolerId ? [order.coolerId] : undefined,
    steps,
  };
}

/** Status values GET /orders accepts for orders that belong on the Completed tab. */
const COMPLETED_ORDER_QUERY_STATUSES = [
  "delivered",
  "cooler_pickup",
  "return",
  "archived",
] as const;

function isCompletedOrderStatus(status?: string) {
  const value = (status ?? "").trim().toLowerCase();
  return (
    value === "completed" ||
    value === "complete" ||
    (COMPLETED_ORDER_QUERY_STATUSES as readonly string[]).includes(value)
  );
}

function isClosedOrderStatus(status?: string) {
  const value = (status ?? "").trim().toLowerCase();
  return (
    value === "return" ||
    value === "archived" ||
    value === "cancelled" ||
    value === "completed" ||
    value === "complete"
  );
}

async function loadCompletedStandardOrders() {
  const pages = await Promise.all(
    COMPLETED_ORDER_QUERY_STATUSES.map((status) =>
      collectPaginated((page, limit) =>
        ordersApi.list({ page, limit, type: "standard", status }),
      ),
    ),
  );
  return pages.flat();
}

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function readPaymentLabel(order: ApiOrder) {
  const raw = order as ApiOrder & Record<string, unknown>;
  return readString(order.paymentStatus) || readString(raw.payment) || "N/A";
}

function timestampForStep(order: ApiOrder, key: TimelineStepKey) {
  const raw = order as ApiOrder & Record<string, unknown>;
  const value = (() => {
    switch (key) {
      case "requested":
        return order.createdAt;
      case "packing":
        return order.coolerReadyAt || order.packingStartedAt;
      case "onRoute":
        return readString(raw.onRouteAt) || readString(order.loadedAt);
      case "delivered":
        return readString(order.deliveredAt) || readString(raw.deliveredAt);
      case "coolerPickup":
        return (
          readString(raw.coolerPickedUpAt) || readString(raw.coolerPickupAt)
        );
      case "return":
        return readString(raw.returnedAt);
      default:
        return "";
    }
  })();
  return value ? formatOrderStamp(value) : undefined;
}

function responseLooksLikeOrder(order: ApiOrder | null | undefined) {
  return Boolean(order && (order.id || order.status || order.orderCode));
}

function stepsForStatus(
  order: CustomerOrderRow,
  doneCount: number,
  source?: ApiOrder | null,
): TimelineStep[] {
  return STEPS_META.map((meta, index) => {
    const previous = order.steps.find((step) => step.key === meta.key);
    const done = index < doneCount;
    const fromServer =
      source && done ? timestampForStep(source, meta.key) : undefined;
    const at = done
      ? fromServer ||
        previous?.at ||
        (index === doneCount - 1
          ? formatOrderStamp(new Date().toISOString())
          : undefined)
      : undefined;
    return {
      key: meta.key,
      done,
      final: meta.key === "return" && done,
      at,
      person: done ? previous?.person : undefined,
      shortLabel: done ? previous?.shortLabel : undefined,
    };
  });
}

function applySavedOrder(
  order: CustomerOrderRow,
  saved: ApiOrder | null,
  apiStatus: OrderStatus,
  doneCount: number,
): CustomerOrderRow {
  const requestedCount = ORDER_STATUS_DONE_COUNT[apiStatus] ?? doneCount;
  const savedCount =
    saved?.status && saved.status in ORDER_STATUS_DONE_COUNT
      ? ORDER_STATUS_DONE_COUNT[saved.status]
      : 0;
  const status =
    savedCount >= requestedCount ? (saved?.status ?? apiStatus) : apiStatus;
  const steps = stepsForStatus(
    order,
    Math.max(requestedCount, savedCount, doneCount),
    saved,
  );
  if (!responseLooksLikeOrder(saved) || !saved) {
    return { ...order, status, steps };
  }
  const mapped = mapApiOrderToActive(saved, order.id);
  return {
    ...order,
    status,
    paymentStatus:
      mapped.paymentStatus !== "N/A" ? mapped.paymentStatus : order.paymentStatus,
    orderDate: mapped.orderDate || order.orderDate,
    deliveryDate: mapped.deliveryDate || order.deliveryDate,
    deliveryDateId: mapped.deliveryDateId || order.deliveryDateId,
    deliveryLabel: mapped.deliveryLabel || order.deliveryLabel,
    packerAssigned: mapped.packerAssigned || order.packerAssigned,
    coolerIds: mapped.coolerIds?.length ? mapped.coolerIds : order.coolerIds,
    items: mapped.items.length ? mapped.items : order.items,
    itemCount: mapped.items.length ? mapped.itemCount : order.itemCount,
    total: mapped.total || order.total,
    steps,
  };
}

function readNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function asRecord(value: unknown) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function parseFlexibleDate(value: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T12:00:00`);
  }
  return new Date(value);
}

function formatOrderStamp(value: string) {
  const date = parseFlexibleDate(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDeliveryBadge(value: string) {
  const date = parseFlexibleDate(value);
  if (Number.isNaN(date.getTime())) return value;
  const datePart = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const weekday = date.toLocaleDateString("en-US", { weekday: "long" });
  return `${datePart}, ${weekday}`;
}

function weekAndDay(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return { week: "N/A", day: value || "N/A" };
  }
  const start = new Date(date);
  const weekday = start.getDay();
  const mondayOffset = weekday === 0 ? -6 : 1 - weekday;
  start.setDate(start.getDate() + mondayOffset);
  const week = `Week of ${start.getMonth() + 1}/${start.getDate()}/${start.getFullYear()}`;
  const day = date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "numeric",
    day: "numeric",
    year: "numeric",
  });
  return { week, day };
}

function mapApiOrderToCompleted(
  order: ApiOrder,
  index: number,
): CompletedOrder {
  const raw = order as ApiOrder & Record<string, unknown>;
  const customer = readOrderCustomer(order);
  const address = [customer.address, customer.apt, customer.city, customer.state]
    .filter(Boolean)
    .join(", ");
  const zip = customer.zip;
  const lines = orderLineItems(order);
  const orderDateRaw = readString(order.createdAt) || readString(raw.orderDate);
  const deliveredRaw =
    readString(order.deliveryDate) ||
    readString(raw.deliveredAt) ||
    readString(order.updatedAt) ||
    orderDateRaw;
  const grouped = weekAndDay(deliveredRaw);

  return {
    id: orderModelId(order, `API-CO-${index + 1}`),
    customer: customer.name,
    address,
    zip,
    orderDate: orderDateRaw ? formatOrderStamp(orderDateRaw) : "",
    delivered: deliveredRaw ? formatOrderStamp(deliveredRaw) : "",
    items: order.items?.length ?? 0,
    total: orderTotalDollars(order, lines),
    day: grouped.day,
    week: grouped.week,
    finished: isCompletedOrderStatus(order.status),
  };
}

function display(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : "N/A";
}

function completedDataset(orders: CompletedOrder[], fromApi: boolean) {
  if (!fromApi) return orders;
  return orders.filter((order) => order.finished !== false);
}

function filterActiveOrders(
  orders: CustomerOrderRow[],
  search: string,
  statusFilter: string,
  deliveryDateId = "",
) {
  const q = search.trim().toLowerCase();
  return orders.filter((order) => {
    if (isClosedOrderStatus(order.status)) return false;
    const matchesSearch =
      !q ||
      order.customerName.toLowerCase().includes(q) ||
      order.id.toLowerCase().includes(q);
    const doneCount = order.steps.filter((step) => step.done).length;
    const matchesStatus =
      !statusFilter ||
      (statusFilter === "requested" && doneCount === 1) ||
      (statusFilter === "packing" && doneCount === 2) ||
      (statusFilter === "onRoute" && doneCount === 3) ||
      (statusFilter === "delivered" && doneCount === 4) ||
      (statusFilter === "coolerPickup" && doneCount === 5);
    const matchesDate =
      !deliveryDateId || order.deliveryDateId === deliveryDateId;
    return matchesSearch && matchesStatus && matchesDate;
  });
}

function filterCompletedOrders(
  orders: CompletedOrder[],
  search: string,
  zipFilter: string,
  sortBy: string,
) {
  const q = search.trim().toLowerCase();
  let next = orders.filter(
    (order) =>
      (!q ||
        order.customer.toLowerCase().includes(q) ||
        order.id.toLowerCase().includes(q) ||
        order.zip.includes(q)) &&
      (!zipFilter || order.zip === zipFilter),
  );

  if (sortBy === "total") {
    next = [...next].sort((a, b) => b.total - a.total);
  } else if (sortBy === "customer") {
    next = [...next].sort((a, b) => a.customer.localeCompare(b.customer));
  }

  return next;
}

function stepExportValue(step: TimelineStep | undefined) {
  if (!step?.done) return "—";
  const label = [step.shortLabel, step.at].filter(Boolean).join(", ");
  return label || "Done";
}

const ACTIVE_ORDER_EXPORT_HEADERS = [
  "Customer",
  "Order ID",
  "Items",
  ...STEPS_META.map((step) => step.header),
] as const;

const COMPLETED_ORDER_EXPORT_HEADERS = [
  "Week",
  "Day",
  "Order ID",
  "Customer",
  "Address",
  "Zip Code",
  "Order Date",
  "Delivered",
  "Items",
  "Total",
] as const;

function downloadActiveOrdersCsv(orders: CustomerOrderRow[], filename: string) {
  downloadCsvFile(filename, [
    [...ACTIVE_ORDER_EXPORT_HEADERS],
    ...orders.map((order) => [
      order.customerName || "N/A",
      order.id,
      String(order.itemCount),
      ...STEPS_META.map((step) =>
        stepExportValue(order.steps.find((entry) => entry.key === step.key)),
      ),
    ]),
  ]);
}

function downloadCompletedOrdersCsv(
  orders: CompletedOrder[],
  filename: string,
) {
  downloadCsvFile(filename, [
    [...COMPLETED_ORDER_EXPORT_HEADERS],
    ...orders.map((order) => [
      order.week || "N/A",
      order.day || "N/A",
      order.id,
      order.customer || "N/A",
      order.address || "N/A",
      order.zip || "N/A",
      order.orderDate || "N/A",
      order.delivered || "N/A",
      String(order.items),
      currency(order.total),
    ]),
  ]);
}

function HoverCard({
  step,
  order,
}: {
  step: TimelineStep;
  order: CustomerOrderRow;
}) {
  if (step.key === "requested") {
    return (
      <div className="w-[260px] rounded-[10px] border border-[#00000014] bg-white p-3 shadow-xl">
        <div className="text-[13px] font-semibold text-[#111118]">Ordered</div>
        <div className="mt-1 text-[12px] text-[#18A34A]">{display(step.at)}</div>
        <div className="mt-2 flex items-center gap-1.5 text-[12px] text-[#111118]">
          <span className="inline-flex size-4 items-center justify-center rounded-full bg-[#F57850] text-[9px] font-semibold text-white">
            {(step.person ?? order.customerName)[0]}
          </span>
          {step.person ?? order.customerName}
        </div>
        <div className="mt-3 space-y-1.5 border-t border-[#00000014] pt-2">
          {order.items.map((item, itemIndex) => (
            <div
              key={`${order.id}-${itemIndex}`}
              className="grid grid-cols-[1fr_24px_56px] gap-2 text-[12px] text-[#111118]"
            >
              <span className="truncate">
                {item.name}
              </span>
              <span className="text-center text-[#8A8A8A]">{item.qty}</span>
              <span className="text-right font-medium">
                {currency(item.qty * item.unitPrice)}
              </span>
            </div>
          ))}
          <div className="flex items-center justify-between border-t border-[#00000014] pt-2 text-[12px] font-bold text-[#111118]">
            <span>Order Total</span>
            <span>{currency(order.total)}</span>
          </div>
        </div>
      </div>
    );
  }

  if (step.key === "coolerPickup") {
    return (
      <div className="w-[200px] rounded-[10px] border border-[#00000014] bg-white p-3 shadow-xl">
        <div className="text-[13px] font-semibold text-[#111118]">
          Cooler Pickup
        </div>
        <div className="mt-1 text-[12px] text-[#18A34A]">{display(step.at)}</div>
        <div className="mt-2">
          {order.coolerIds?.[0] ? (
            <IdPill>{order.coolerIds[0]}</IdPill>
          ) : (
            "N/A"
          )}
        </div>
      </div>
    );
  }

  const titles: Record<string, string> = {
    packing: "Packed",
    onRoute: "On Route",
    delivered: "Delivered",
    return: "Return",
  };

  return (
    <div className="w-[220px] rounded-[10px] border border-[#00000014] bg-white p-3 shadow-xl">
      <div className="text-[13px] font-semibold text-[#111118]">
        {titles[step.key] ?? step.key}
      </div>
      <div className="mt-1 text-[12px] text-[#18A34A]">{display(step.at)}</div>
      {step.person ? (
        <div className="mt-2 flex items-center gap-1.5 text-[12px] text-[#111118]">
          <span className="inline-flex size-4 items-center justify-center rounded-full bg-[#F57850] text-[9px] font-semibold text-white">
            {step.person[0]}
          </span>
          {step.person}
        </div>
      ) : null}
      {step.key === "onRoute" ? (
        <div className="mt-3 grid grid-cols-2 gap-2 border-t border-[#00000014] pt-2 text-[11px]">
          <div>
            <div className="text-[11px] font-semibold tracking-[0.06em] text-[#2E2E2E] uppercase">
              Street Address
            </div>
            <div className="mt-0.5 text-[#111118]">{display(order.address)}</div>
          </div>
          <div>
            <div className="text-[11px] font-semibold tracking-[0.06em] text-[#2E2E2E] uppercase">
              Apt / Unit
            </div>
            <div className="mt-0.5 text-[#111118]">{display(order.apt)}</div>
          </div>
          <div>
            <div className="text-[11px] font-semibold tracking-[0.06em] text-[#2E2E2E] uppercase">
              City
            </div>
            <div className="mt-0.5 text-[#111118]">{display(order.city)}</div>
          </div>
          <div>
            <div className="text-[11px] font-semibold tracking-[0.06em] text-[#2E2E2E] uppercase">
              State
            </div>
            <div className="mt-0.5 text-[#111118]">{display(order.state)}</div>
          </div>
          <div>
            <div className="text-[11px] font-semibold tracking-[0.06em] text-[#2E2E2E] uppercase">
              Zip
            </div>
            <div className="mt-0.5 text-[#111118]">{display(order.zip)}</div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function InfoField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <div className="text-[11px] font-semibold tracking-[0.06em] text-[#2E2E2E] uppercase">
        {label}
      </div>
      <div className="mt-1 text-[13px] text-[#111118]">{children}</div>
    </div>
  );
}

function CoolerIds({ order }: { order: CustomerOrderRow }) {
  const coolers = order.coolerIds ?? [];
  if (!coolers.length) {
    return <span className="text-[#8A8A8A]">N/A</span>;
  }

  return (
    <span className="flex flex-wrap gap-1.5">
      {coolers.map((coolerId) => (
        <IdPill key={coolerId}>{coolerId}</IdPill>
      ))}
    </span>
  );
}

function AddressFields({
  order,
  deliveryDate,
}: {
  order: CustomerOrderRow;
  deliveryDate?: string;
}) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <InfoField label="Street Address">{display(order.address)}</InfoField>
      <InfoField label="Apt / Unit">{display(order.apt)}</InfoField>
      <InfoField label="City">{display(order.city)}</InfoField>
      <InfoField label="State">{display(order.state)}</InfoField>
      <InfoField label="Zip">{display(order.zip)}</InfoField>
      <InfoField label="Delivery date">
        {display(deliveryDate ?? order.deliveryDate)}
      </InfoField>
    </div>
  );
}

/** Scheduled date until Delivered is set, then the timeline delivered stamp. */
function deliveredModalDate(order: CustomerOrderRow) {
  const delivered = order.steps.find((step) => step.key === "delivered");
  if (delivered?.done && delivered.at?.trim()) return delivered.at;
  return order.deliveryDate;
}

const STATUS_SUMMARY: Record<
  TimelineStepKey,
  Record<StatusDirection, string>
> = {
  requested: {
    next: "The order returns to Requested. Packing and every later step are cleared.",
    previous:
      "The order returns to Requested. Packing and every later step are cleared.",
  },
  packing: {
    next: "The order moves into Packing so it can be assigned and loaded into a cooler.",
    previous:
      "The order moves back to Packing. Route, delivery, and return progress are cleared.",
  },
  onRoute: {
    next: "The order goes On Route for delivery to the address below.",
    previous:
      "The order goes back On Route. Delivery, cooler pickup, and return are cleared.",
  },
  delivered: {
    next: "The order is marked Delivered at the address below.",
    previous:
      "The order moves back to Delivered. Cooler pickup and return are cleared.",
  },
  coolerPickup: {
    next: "Cooler pickup is recorded for the coolers on this order.",
    previous:
      "The order moves back to Cooler Pickup. The return step is cleared.",
  },
  return: {
    next: "The cooler return is recorded and this order is complete.",
    previous: "The cooler return is recorded and this order is complete.",
  },
};

function StatusChangeDetails({
  stepKey,
  order,
}: {
  stepKey: TimelineStepKey;
  order: CustomerOrderRow;
}) {
  if (stepKey === "requested") {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <InfoField label="Customer">{display(order.customerName)}</InfoField>
          <InfoField label="Order date">{display(order.orderDate)}</InfoField>
          <InfoField label="Payment">{order.paymentStatus}</InfoField>
          <InfoField label="Items">{order.itemCount}</InfoField>
        </div>
        <div className="space-y-1.5 border-t border-[#00000014] pt-3">
          {order.items.length === 0 ? (
            <div className="text-[13px] text-[#8A8A8A]">No line items</div>
          ) : (
            order.items.map((item, itemIndex) => (
              <div
                key={`${order.id}-${itemIndex}`}
                className="grid grid-cols-[1fr_32px_72px] gap-2 text-[13px] text-[#111118]"
              >
                <span className="truncate">
                  {item.name}
                </span>
                <span className="text-center text-[#8A8A8A]">{item.qty}</span>
                <span className="text-right font-medium">
                  {currency(item.qty * item.unitPrice)}
                </span>
              </div>
            ))
          )}
          <div className="flex items-center justify-between border-t border-[#00000014] pt-2 text-[13px] font-bold text-[#111118]">
            <span>Order total</span>
            <span>{currency(order.total)}</span>
          </div>
        </div>
      </div>
    );
  }

  if (stepKey === "packing") {
    return (
      <div className="grid grid-cols-2 gap-4">
        <InfoField label="Customer">{display(order.customerName)}</InfoField>
        <InfoField label="Items">{order.itemCount}</InfoField>
        <InfoField label="Packer assigned">
          {display(order.packerAssigned)}
        </InfoField>
        <InfoField label="Delivery date">
          {display(order.deliveryDate)}
        </InfoField>
        <InfoField label="Cooler ID(s)">
          <CoolerIds order={order} />
        </InfoField>
      </div>
    );
  }

  if (stepKey === "onRoute") {
    return (
      <div className="space-y-4">
        <InfoField label="Customer">{display(order.customerName)}</InfoField>
        <AddressFields order={order} />
      </div>
    );
  }

  if (stepKey === "delivered") {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <InfoField label="Customer">{display(order.customerName)}</InfoField>
          <InfoField label="Payment">{order.paymentStatus}</InfoField>
        </div>
        <AddressFields order={order} deliveryDate={deliveredModalDate(order)} />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      <InfoField label="Customer">{display(order.customerName)}</InfoField>
      <InfoField label="Items">{order.itemCount}</InfoField>
      <InfoField label="Delivery date">{display(order.deliveryDate)}</InfoField>
      <InfoField label="Cooler ID(s)">
        <CoolerIds order={order} />
      </InfoField>
    </div>
  );
}

function StatusChangeModal({
  open,
  direction,
  stepKey,
  order,
  saving,
  onClose,
  onConfirm,
}: {
  open: boolean;
  direction: StatusDirection;
  stepKey: TimelineStepKey;
  order: CustomerOrderRow | null;
  saving: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const header = stepHeader(stepKey);

  return (
    <Modal
      open={open && Boolean(order)}
      title={`${direction === "next" ? "Next" : "Previous"} · ${header}`}
      onClose={onClose}
      size="sm"
      zIndexClass="z-[80]"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="primary"
            className="ml-3"
            onClick={onConfirm}
            disabled={saving}
          >
            {saving ? "Saving…" : `Set to ${header}`}
          </Button>
        </>
      }
    >
      <p className="mb-4 text-[14px] leading-5 text-[#111118]">
        {STATUS_SUMMARY[stepKey][direction]}
      </p>
      {order ? <StatusChangeDetails stepKey={stepKey} order={order} /> : null}
    </Modal>
  );
}

function HoverHint({
  text,
  children,
  className,
}: {
  text?: string;
  children: ReactNode;
  className?: string;
}) {
  const anchorRef = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  function show() {
    if (!text) return;
    const rect = anchorRef.current?.getBoundingClientRect();
    if (!rect) return;
    const width = 220;
    setPos({
      top: rect.top - 8,
      left: Math.max(
        12,
        Math.min(
          rect.left + rect.width / 2 - width / 2,
          window.innerWidth - width - 12,
        ),
      ),
    });
    setOpen(true);
  }

  return (
    <span
      ref={anchorRef}
      className={className}
      onMouseEnter={show}
      onMouseLeave={() => setOpen(false)}
      onFocus={show}
      onBlur={() => setOpen(false)}
    >
      {children}
      {text && open
        ? createPortal(
            <div
              role="tooltip"
              className="pointer-events-none fixed z-[120] w-[220px] rounded-[8px] border border-[#00000014] bg-white px-2.5 py-1.5 text-center text-[12px] leading-4 text-[#111118] shadow-[0_8px_24px_rgba(0,0,0,0.12)]"
              style={{
                top: pos.top,
                left: pos.left,
                transform: "translateY(-100%)",
              }}
            >
              {text}
            </div>,
            document.body,
          )
        : null}
    </span>
  );
}

function StatusChoiceButton({
  label,
  enabled,
  hint,
  onPick,
}: {
  label: string;
  enabled: boolean;
  hint: string | null;
  onPick: () => void;
}) {
  return (
    <HoverHint
      text={enabled ? undefined : (hint ?? undefined)}
      className="block min-w-0"
    >
      <button
        type="button"
        aria-disabled={!enabled}
        className={cn(
          "h-9 w-full truncate rounded-[8px] px-2 text-[13px] font-semibold",
          enabled
            ? "text-white"
            : "cursor-not-allowed bg-[#F2F2F2] text-[#B0B0B0]",
        )}
        style={enabled ? { background: ORANGE } : undefined}
        onMouseDown={(event) => {
          event.preventDefault();
          event.stopPropagation();
          if (!enabled) return;
          onPick();
        }}
      >
        {label}
      </button>
    </HoverHint>
  );
}

function StepNode({
  step,
  order,
  lockReason,
  onStatusClick,
}: {
  step: TimelineStep;
  order: CustomerOrderRow;
  lockReason?: string;
  onStatusClick: (anchor: DOMRect) => void;
}) {
  const [hover, setHover] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, placeAbove: false });
  const nodeRef = useRef<HTMLDivElement>(null);
  const hideTimer = useRef(0);

  useEffect(() => () => window.clearTimeout(hideTimer.current), []);

  function place() {
    const rect = nodeRef.current?.getBoundingClientRect();
    if (!rect) return;

    // Requested hover card is taller (line items); others are ~160px.
    const cardWidth = step.key === "requested" ? 260 : 220;
    const estimatedHeight = step.key === "requested" ? 220 : 160;
    const gap = 8;
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    // Prefer below; only flip above when there is not enough room under the node
    // but enough room above (avoids clipping with a single top row).
    const placeAbove =
      spaceBelow < estimatedHeight + gap && spaceAbove > spaceBelow;

    setPos({
      top: placeAbove ? rect.top - gap : rect.bottom + gap,
      left: Math.max(
        12,
        Math.min(
          rect.left + rect.width / 2 - cardWidth / 2,
          window.innerWidth - cardWidth - 12,
        ),
      ),
      placeAbove,
    });
  }

  function show() {
    if (!step.done) return;
    window.clearTimeout(hideTimer.current);
    place();
    setHover(true);
  }

  function hide() {
    hideTimer.current = window.setTimeout(() => setHover(false), 140);
  }

  return (
    <div
      ref={nodeRef}
      className="relative flex min-w-0 flex-col items-center px-0.5"
      onMouseEnter={show}
      onMouseLeave={hide}
    >
      <div className="mb-1.5 flex h-[14px] w-full items-end justify-center truncate text-center text-[10px] font-medium text-[#111118] sm:text-[11px]">
        {step.done && step.shortLabel ? step.shortLabel : null}
      </div>

      <HoverHint text={lockReason} className="z-[1] inline-flex">
        <button
          type="button"
          data-status-node
          aria-disabled={lockReason ? true : undefined}
          onClick={(event) => {
            event.stopPropagation();
            if (lockReason) return;
            onStatusClick(event.currentTarget.getBoundingClientRect());
          }}
          className={cn(
            "z-[1] flex size-[18px] shrink-0 items-center justify-center rounded-full",
            lockReason && "cursor-not-allowed opacity-40",
            step.done
              ? step.final
                ? "bg-[#242424]"
                : "bg-[#F57850]"
              : "border border-[#00000014] bg-[#EFEDEA]",
          )}
        >
          {step.done ? (
            <Check size={10} className="text-white" strokeWidth={3} />
          ) : null}
        </button>
      </HoverHint>

      <div className="mt-1.5 min-h-[14px] w-full truncate text-center text-[11px] leading-tight font-medium text-[#6B7180]">
        {step.done ? display(step.at) : null}
      </div>

      {hover && step.done
        ? createPortal(
            <div
              role="tooltip"
              className="pointer-events-auto fixed z-[100] hidden sm:block"
              style={{
                top: pos.top,
                left: pos.left,
                transform: pos.placeAbove ? "translateY(-100%)" : undefined,
              }}
              onMouseEnter={show}
              onMouseLeave={hide}
            >
              <HoverCard step={step} order={order} />
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

function OrderTimelineTrack({
  order,
  onStatusClick,
}: {
  order: CustomerOrderRow;
  onStatusClick: (stepKey: TimelineStepKey, anchor: DOMRect) => void;
}) {
  const progressIndex = orderProgressIndex(order.steps, order.status);
  const nextStep = STEPS_META[progressIndex + 1] ?? null;

  return (
    <div className="relative">
      <div className="pointer-events-none absolute top-[29px] right-[8%] left-[8%] flex">
        {order.steps.slice(0, -1).map((step, index) => {
          const segmentDone =
            order.steps[index]?.done && order.steps[index + 1]?.done;
          return (
            <div
              key={step.key}
              className={cn(
                "h-0 flex-1 border-t",
                segmentDone
                  ? "border-solid border-[#00000014]"
                  : "border-dashed border-[#00000014]",
              )}
            />
          );
        })}
      </div>
      <div className="relative grid grid-cols-6">
        {order.steps.map((step, index) => {
          const skipped = index > progressIndex + 1;
          const lockReason = skipped
            ? nextStep
              ? `You can't skip a status. Move to ${nextStep.header} first.`
              : "You can't skip a status."
            : undefined;
          return (
            <StepNode
              key={step.key}
              step={step}
              order={order}
              lockReason={lockReason}
              onStatusClick={(anchor) => {
                if (lockReason) return;
                onStatusClick(step.key, anchor);
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

function DayHeaderIcon() {
  const [useFallback, setUseFallback] = useState(false);

  if (useFallback) {
    return <Truck size={15} className="shrink-0 text-[#F57850]" aria-hidden />;
  }

  return (
    <img
      src="/icons/track-icon.png"
      alt=""
      className="size-[15px] shrink-0 object-contain"
      onError={() => setUseFallback(true)}
    />
  );
}

const DETAIL_LABEL =
  "text-[11px] font-medium tracking-[0.04em] text-[#9AA0A6] uppercase";
const DETAIL_VALUE = "mt-1 text-[13px] text-[#111118]";
const DETAIL_COLUMNS =
  "grid grid-cols-[minmax(0,1.7fr)_44px_minmax(108px,1fr)_72px] items-center gap-3 px-4";

function OrderDetailPanel({
  order,
  itemsLoading = false,
  onClose,
}: {
  order: CustomerOrderRow;
  itemsLoading?: boolean;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      const target = event.target;
      if (target instanceof Node && panelRef.current?.contains(target)) return;
      onCloseRef.current();
    }

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  return (
    <aside
      ref={panelRef}
      className="absolute top-[52px] right-0 bottom-0 z-40 flex w-full max-w-[560px] flex-col border-l border-[#ECECEC] bg-white shadow-[-8px_0_24px_rgba(0,0,0,0.06)]"
    >
      <div className="flex items-start justify-between gap-4 border-b border-[#ECECEC] px-6 pt-4 pb-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex h-5 w-max shrink-0 items-center rounded-[6px] bg-[#F3F4F6] px-1.5 font-mono text-[11px] font-medium leading-none whitespace-nowrap text-[#99A1AF]">
              {order.id}
            </span>
            <span className="text-[12px]">
              <span className="text-[#6D6F7B]">Ordered:</span>{" "}
              <span className="text-[#111118]">{display(order.orderDate)}</span>
            </span>
          </div>
          <h2 className="mt-2 text-[22px] leading-tight font-semibold tracking-tight text-[#111118]">
            {display(order.customerName)}
          </h2>
        </div>
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="shrink-0 rounded-md p-1 text-[#A9A9A9] hover:bg-[#F5F5F3] hover:text-[#6B6B6B]"
        >
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-auto px-6 pt-5 pb-6">
        <h3 className="mb-3 text-[15px] font-semibold text-[#111118]">
          Requested Items
        </h3>
        <div className="overflow-hidden rounded-[12px] border border-[#E6E6E8] bg-white">
          <div
            className={cn(
              DETAIL_COLUMNS,
              "border-b border-[#E6E6E8] bg-[#F7F7F8] py-2.5 text-[11px] font-medium tracking-[0.04em] text-[#9AA0A6] uppercase",
            )}
          >
            <div>Item</div>
            <div>Qty</div>
            <div>Unit Price</div>
            <div className="text-right">Total</div>
          </div>
          {itemsLoading ? (
            <AppLoader
              variant="section"
              label="Loading items"
              className="min-h-[96px] rounded-none border-0 bg-white py-6"
            />
          ) : (
          order.items.map((item, itemIndex) => {
            const label = item.name;
            return (
              <div
                key={`${order.id}-${itemIndex}`}
                className={cn(
                  DETAIL_COLUMNS,
                  "border-b border-[#E6E6E8] bg-white py-3 text-[13px] text-[#111118]",
                )}
              >
                <div className="min-w-0 break-words">{label}</div>
                <div>{item.qty}</div>
                <div className="whitespace-nowrap">
                  <span>{currency(item.unitPrice)}</span>
                  {item.unit ? (
                    <span className="text-[#9AA0A6]"> / {item.unit}</span>
                  ) : null}
                </div>
                <div className="text-right font-bold">
                  {currency(item.qty * item.unitPrice)}
                </div>
              </div>
            );
          })
          )}
          <div className="flex items-center justify-between bg-white px-4 py-3 text-[#111118]">
            <span className="text-[13px] font-medium">Order Total</span>
            <span className="text-[15px] font-bold tracking-tight">
              {currency(order.total)}
            </span>
          </div>
        </div>

        <h3 className="mt-6 mb-3 text-[15px] font-semibold text-[#111118]">
          Packing Information
        </h3>
        <div className="flex flex-wrap gap-x-10 gap-y-4">
          <div>
            <div className={DETAIL_LABEL}>Packer Assigned</div>
            <div className={DETAIL_VALUE}>{display(order.packerAssigned)}</div>
          </div>
          <div>
            <div className={DETAIL_LABEL}>Cooler ID</div>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {(order.coolerIds ?? []).map((coolerId) => (
                <IdPill key={coolerId}>{coolerId}</IdPill>
              ))}
              {!order.coolerIds?.length ? (
                <span className="text-[14px] text-[#111118]">N/A</span>
              ) : null}
            </div>
          </div>
        </div>

        <h3 className="mt-6 mb-3 text-[15px] font-semibold text-[#111118]">
          Delivery Information
        </h3>
        <div className="mb-4 inline-flex rounded-[8px] bg-[#FFF1EB] px-2.5 py-1 text-[12px] font-medium text-[#F57850]">
          {display(order.deliveryDate)}
        </div>
        <div className="flex flex-col gap-4">
          <div>
            <div className={DETAIL_LABEL}>Street Address</div>
            <div className={DETAIL_VALUE}>{display(order.address)}</div>
          </div>
          <div className="grid grid-cols-4 gap-4">
            <div>
              <div className={DETAIL_LABEL}>Apt / Unit</div>
              <div className={DETAIL_VALUE}>{display(order.apt)}</div>
            </div>
            <div>
              <div className={DETAIL_LABEL}>City</div>
              <div className={DETAIL_VALUE}>{display(order.city)}</div>
            </div>
            <div>
              <div className={DETAIL_LABEL}>State</div>
              <div className={DETAIL_VALUE}>{display(order.state)}</div>
            </div>
            <div>
              <div className={DETAIL_LABEL}>Zip</div>
              <div className={DETAIL_VALUE}>{display(order.zip)}</div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

export default function CustomerOrdersPage() {
  useDocumentTitle("Customer Orders");

  const { packingByCode } = usePackingHandoff();
  const { notifyApiError } = useApiFeedback();
  const apiConfigured = isApiConfigured();

  const [orders, setOrders] = useState(() =>
    apiConfigured ? [] : ACTIVE_ORDERS,
  );
  const [completedOrders, setCompletedOrders] = useState<CompletedOrder[]>(
    () => (apiConfigured ? [] : COMPLETED_ORDERS),
  );
  const [loading, setLoading] = useState(apiConfigured);
  const [completedLoading, setCompletedLoading] = useState(apiConfigured);
  const [activeTab, setActiveTab] = useState<"Orders" | "Completed">("Orders");
  const [appliedDateId, setAppliedDateId] = useState(() =>
    apiConfigured ? toDeliveryDateId(new Date()) : "",
  );
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [zipFilter, setZipFilter] = useState("");
  const [sortBy, setSortBy] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [orderDetail, setOrderDetail] = useState<CustomerOrderRow | null>(null);
  const [orderItemsLoading, setOrderItemsLoading] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [total, setTotal] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [listExhausted, setListExhausted] = useState(false);
  const loadLock = useRef(false);
  const defaultDeliveryApplied = useRef(false);
  const ordersRef = useRef(orders);
  ordersRef.current = orders;
  const calendarAnchorRef = useRef<HTMLDivElement>(null);
  const dateChipRowRef = useRef<HTMLDivElement>(null);
  const [statusMenu, setStatusMenu] = useState<{
    orderId: string;
    stepKey: TimelineStepKey;
    top: number;
    left: number;
    placeAbove: boolean;
  } | null>(null);
  const [statusChange, setStatusChange] = useState<{
    orderId: string;
    stepKey: TimelineStepKey;
    direction: StatusDirection;
  } | null>(null);
  const [statusSaving, setStatusSaving] = useState(false);

  useEffect(() => {
    if (!apiConfigured) return;
    let cancelled = false;
    loadLock.current = true;
    setLoading(true);

    void collectPaginated((page, limit) =>
      ordersApi.list({
        page,
        limit,
        type: "standard",
      }),
    )
      .then((remote) => {
        if (cancelled) return;
        const mapped: CustomerOrderRow[] = remote.map((order, index) =>
          mapApiOrderToActive(order, `API-CO-${index + 1}`),
        );
        setOrders(mapped);
        setTotal(mapped.length);
        setListExhausted(true);
      })
      .catch((error) => {
        if (cancelled) return;
        notifyApiError(error, "Failed to load customer orders.");
      })
      .finally(() => {
        if (cancelled) return;
        loadLock.current = false;
        setLoading(false);
        setLoadingMore(false);
      });

    return () => {
      cancelled = true;
    };
  }, [apiConfigured, notifyApiError]);

  useEffect(() => {
    if (!apiConfigured || activeTab !== "Completed") return;
    let cancelled = false;
    setCompletedLoading(true);
    void loadCompletedStandardOrders()
      .then((remote) => {
        if (cancelled) return;
        const seen = new Set<string>();
        const mapped: CompletedOrder[] = [];
        remote.forEach((order, index) => {
          const row = mapApiOrderToCompleted(order, index);
          if (seen.has(row.id)) return;
          seen.add(row.id);
          mapped.push({ ...row, finished: true });
        });
        setCompletedOrders(mapped);
      })
      .catch((error) => {
        if (!cancelled) {
          notifyApiError(error, "Failed to load completed orders.");
        }
      })
      .finally(() => {
        if (!cancelled) setCompletedLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeTab, apiConfigured, notifyApiError]);

  useEffect(() => {
    if (!statusMenu) return;

    function onPointerDown(event: MouseEvent) {
      const target = event.target as HTMLElement | null;
      if (
        target?.closest("[data-status-menu]") ||
        target?.closest("[data-status-node]")
      ) {
        return;
      }
      setStatusMenu(null);
    }

    function onRepositionClose() {
      setStatusMenu(null);
    }

    document.addEventListener("mousedown", onPointerDown);
    window.addEventListener("resize", onRepositionClose);
    window.addEventListener("scroll", onRepositionClose, true);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("resize", onRepositionClose);
      window.removeEventListener("scroll", onRepositionClose, true);
    };
  }, [statusMenu]);

  const ordersWithPacking = useMemo(
    () =>
      apiConfigured
        ? orders
        : orders.map((order) =>
            applyPackingHandoff(order, packingByCode[order.id]),
          ),
    [apiConfigured, orders, packingByCode],
  );

  const deliveryChips = useMemo(() => {
    const counts = new Map<string, number>();
    for (const order of filterActiveOrders(
      ordersWithPacking,
      search,
      statusFilter,
    )) {
      if (!order.deliveryDateId) continue;
      counts.set(
        order.deliveryDateId,
        (counts.get(order.deliveryDateId) ?? 0) + 1,
      );
    }
    const center =
      appliedDateId && isWednesdayDateId(appliedDateId)
        ? appliedDateId
        : toDeliveryDateId(upcomingWednesday());
    return weekWindowChips(center, counts);
  }, [appliedDateId, ordersWithPacking, search, statusFilter]);

  const filteredActive = useMemo(
    () =>
      filterActiveOrders(
        ordersWithPacking,
        search,
        statusFilter,
        appliedDateId,
      ),
    [apiConfigured, appliedDateId, ordersWithPacking, search, statusFilter],
  );

  const activeWindow = useLazyWindow(
    filteredActive,
    `${search}|${statusFilter}|${appliedDateId}`,
  );
  const visibleActive = apiConfigured ? filteredActive : activeWindow.visible;

  const completedForTable = useMemo(
    () => completedDataset(completedOrders, apiConfigured),
    [apiConfigured, completedOrders],
  );

  const filteredCompleted = useMemo(
    () => filterCompletedOrders(completedForTable, search, zipFilter, sortBy),
    [completedForTable, search, sortBy, zipFilter],
  );

  const completedWindow = useLazyWindow(
    filteredCompleted,
    `${search}|${zipFilter}|${sortBy}`,
  );

  const visibleCompleted = apiConfigured
    ? filteredCompleted
    : completedWindow.visible;

  const completedGroups = useMemo(() => {
    const weeks = new Map<string, Map<string, CompletedOrder[]>>();
    visibleCompleted.forEach((order) => {
      if (!weeks.has(order.week)) weeks.set(order.week, new Map());
      const days = weeks.get(order.week)!;
      if (!days.has(order.day)) days.set(order.day, []);
      days.get(order.day)!.push(order);
    });
    return Array.from(weeks.entries());
  }, [visibleCompleted]);

  const zipOptions = useMemo(
    () =>
      Array.from(
        new Set(completedForTable.map((order) => order.zip).filter(Boolean)),
      ).sort(),
    [completedForTable],
  );

  const selectedOrder =
    ordersWithPacking.find((order) => order.id === selectedOrderId) ?? null;

  const selectedRecordId = selectedOrder?.recordId;
  const packingRowsRef = useRef(ordersWithPacking);
  packingRowsRef.current = ordersWithPacking;

  useEffect(() => {
    if (!apiConfigured || !selectedOrderId || !selectedRecordId) {
      setOrderDetail(null);
      setOrderItemsLoading(false);
      return;
    }
    const listRow = packingRowsRef.current.find(
      (order) => order.id === selectedOrderId,
    );
    if (!listRow) return;
    let cancelled = false;
    const waitingForItems = listRow.items.length === 0;
    if (waitingForItems) setOrderItemsLoading(true);
    void ordersApi
      .getById(selectedRecordId)
      .then((order) => {
        if (cancelled) return;
        const mapped = mapApiOrderToActive(order, listRow.id);
        setOrderDetail({
          ...listRow,
          ...mapped,
          id: listRow.id,
          recordId: listRow.recordId,
          customerName:
            mapped.customerName !== "N/A"
              ? mapped.customerName
              : listRow.customerName,
          address: mapped.address || listRow.address,
          apt: mapped.apt || listRow.apt,
          city: mapped.city || listRow.city,
          state: mapped.state || listRow.state,
          zip: mapped.zip || listRow.zip,
          items: mapped.items.length ? mapped.items : listRow.items,
          itemCount: mapped.items.length ? mapped.itemCount : listRow.itemCount,
          total: mapped.total || listRow.total,
        });
      })
      .catch((error) => {
        if (!cancelled) notifyApiError(error, "Failed to load order details.");
      })
      .finally(() => {
        if (!cancelled) setOrderItemsLoading(false);
      });
    return () => {
      cancelled = true;
      setOrderItemsLoading(false);
    };
  }, [apiConfigured, notifyApiError, selectedOrderId, selectedRecordId]);
  const statusChangeOrder =
    ordersWithPacking.find((order) => order.id === statusChange?.orderId) ??
    null;
  const statusMenuOrder =
    ordersWithPacking.find((order) => order.id === statusMenu?.orderId) ??
    null;
  const triggeredStep = statusMenu
    ? (STEPS_META.find((step) => step.key === statusMenu.stepKey) ?? null)
    : null;
  const previousStep = statusMenu
    ? statusNeighbors(statusMenu.stepKey).previous
    : null;
  const previousHint =
    previousStep && statusMenuOrder
      ? statusMoveHint(
          previousStep.key,
          statusMenuOrder.steps,
          statusMenuOrder.status,
        )
      : "You can only move to the next status.";
  const triggeredHint =
    triggeredStep && statusMenuOrder
      ? statusMoveHint(
          triggeredStep.key,
          statusMenuOrder.steps,
          statusMenuOrder.status,
        )
      : "You can only move to the next status.";

  const ordersTotal = apiConfigured ? total : filteredActive.length;

  const ordersHasMore =
    apiConfigured && !listExhausted && orders.length < total;
  const activeHasMore = apiConfigured ? ordersHasMore : activeWindow.hasMore;

  const appliedChipIndex = deliveryChips.findIndex(
    (chip) => chip.id === appliedDateId,
  );
  const canShiftDatesBack =
    deliveryChips.length > 0 &&
    (appliedChipIndex === -1 || appliedChipIndex > 0);
  const canShiftDatesForward =
    deliveryChips.length > 0 &&
    (appliedChipIndex === -1 ||
      appliedChipIndex < deliveryChips.length - 1);

  useEffect(() => {
    if (!calendarOpen) return;

    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (calendarAnchorRef.current?.contains(target)) return;
      setCalendarOpen(false);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setCalendarOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [calendarOpen]);

  useEffect(() => {
    if (!appliedDateId) return;
    const chip = dateChipRowRef.current?.querySelector<HTMLElement>(
      `[data-delivery-date="${appliedDateId}"]`,
    );
    chip?.scrollIntoView({ inline: "nearest", block: "nearest" });
  }, [appliedDateId, deliveryChips]);

  useEffect(() => {
    if (appliedDateId && !isWednesdayDateId(appliedDateId)) {
      setAppliedDateId(toDeliveryDateId(upcomingWednesday()));
      defaultDeliveryApplied.current = true;
      return;
    }
    if (defaultDeliveryApplied.current || appliedDateId) {
      if (appliedDateId) defaultDeliveryApplied.current = true;
      return;
    }
    const dateId = pickDefaultDeliveryChipId(deliveryChips);
    if (!dateId) return;
    defaultDeliveryApplied.current = true;
    setAppliedDateId(dateId);
  }, [appliedDateId, deliveryChips]);

  function commitDeliveryDate(dateId: string) {
    setAppliedDateId(dateId);
  }

  function shiftDeliveryDate(delta: number) {
    if (deliveryChips.length === 0) return;
    if (appliedChipIndex === -1) {
      const edge = delta > 0 ? deliveryChips[0] : deliveryChips.at(-1);
      if (edge) commitDeliveryDate(edge.id);
      return;
    }
    const next = deliveryChips[appliedChipIndex + delta];
    if (next) commitDeliveryDate(next.id);
  }

  function loadMoreActive() {
    if (apiConfigured) return;
    activeWindow.loadMore();
  }

  const dateFilterActive = Boolean(appliedDateId);
  const exportCount =
    activeTab === "Orders"
      ? search.trim() || statusFilter || dateFilterActive
        ? filteredActive.length
        : ordersTotal
      : filteredCompleted.length;
  const exportFiltersActive =
    activeTab === "Orders"
      ? Boolean(search.trim() || statusFilter || dateFilterActive)
      : Boolean(search.trim() || zipFilter || statusFilter || sortBy);

  function openStatusChange(orderId: string, stepKey: TimelineStepKey) {
    const existing = ordersWithPacking.find((order) => order.id === orderId);
    if (!existing || statusMoveHint(stepKey, existing.steps, existing.status))
      return;
    setStatusMenu(null);
    setStatusChange({ orderId, stepKey, direction: "next" });
  }

  async function confirmStatusChange() {
    if (!statusChange || statusSaving) return;

    const { orderId, stepKey } = statusChange;
    const targetIndex = STEPS_META.findIndex((step) => step.key === stepKey);
    if (targetIndex < 0) return;
    const existing = ordersWithPacking.find((order) => order.id === orderId);
    if (!existing || statusMoveHint(stepKey, existing.steps, existing.status))
      return;

    const apiStatus = STEP_API_STATUS[stepKey];
    const recordId = ordersWithPacking.find(
      (order) => order.id === orderId,
    )?.recordId;
    setStatusSaving(true);
    try {
      let saved: ApiOrder | null = null;
      if (apiConfigured) {
        if (!recordId) {
          throw new Error("This order is missing a database id.");
        }
        const updated = await ordersApi.updateStatus(recordId, apiStatus);
        saved = responseLooksLikeOrder(updated) ? updated : null;
        if (!saved || !timestampForStep(saved, stepKey)) {
          try {
            const fresh = await ordersApi.getById(recordId);
            if (responseLooksLikeOrder(fresh)) saved = fresh;
          } catch {
            // Status is already saved. Keep the patch body and stamp the step locally.
          }
        }
      }
      const doneCount = targetIndex + 1;
      setOrders((current) =>
        current.map((order) =>
          order.id === orderId
            ? applySavedOrder(order, saved, apiStatus, doneCount)
            : order,
        ),
      );
      setOrderDetail((current) =>
        current?.id === orderId
          ? applySavedOrder(current, saved, apiStatus, doneCount)
          : current,
      );
      setStatusChange(null);
    } catch (error) {
      notifyApiError(error, "Failed to update order status.");
    } finally {
      setStatusSaving(false);
    }
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-[#FAFAFA]">
      <Header
        title="Customer Orders"
        toolbar={
          <div className="flex w-full flex-wrap items-center gap-2 md:flex-nowrap">
            <SearchField
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search"
            />

            {activeTab === "Orders" ? (
              <Select
                value={statusFilter}
                onChange={setStatusFilter}
                aria-label="All Statuses"
                className="w-full sm:w-[168px]"
                options={[
                  { value: "", label: "All Statuses" },
                  { value: "requested", label: "Requested" },
                  { value: "packing", label: "Packing" },
                  { value: "onRoute", label: "On Route" },
                  { value: "delivered", label: "Delivered" },
                  { value: "coolerPickup", label: "Cooler Pickup" },
                ]}
              />
            ) : (
              <>
                <Select
                  value={zipFilter}
                  onChange={setZipFilter}
                  aria-label="All Zip Codes"
                  className="w-full sm:w-[150px]"
                  options={[
                    { value: "", label: "All Zip Codes" },
                    ...zipOptions.map((zip) => ({ value: zip, label: zip })),
                  ]}
                />
                <button
                  type="button"
                  onClick={() => setCalendarOpen((open) => !open)}
                  className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-[8px] border border-[#00000014] bg-white px-3 text-[13px] text-[#111118] sm:w-auto"
                >
                  <Calendar size={14} className="text-[#8A8A8A]" />
                  Select Date
                </button>
                <Select
                  value={statusFilter}
                  onChange={setStatusFilter}
                  aria-label="All Statuses"
                  className="w-full sm:w-[150px]"
                  options={[{ value: "", label: "All Statuses" }]}
                />
                <Select
                  value={sortBy}
                  onChange={setSortBy}
                  aria-label="Sort by"
                  className="w-full sm:w-[140px]"
                  options={[
                    { value: "", label: "Sort by" },
                    { value: "customer", label: "Customer" },
                    { value: "total", label: "Total" },
                  ]}
                />
              </>
            )}

            <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:ml-auto sm:w-auto sm:flex-nowrap">
              <ExportButton
                entityLabel="orders"
                recordCount={exportCount}
                filtersActive={exportFiltersActive}
                onExport={async (request: ExportRequest) => {
                  let activeRows = ordersWithPacking;
                  let completedRows = completedOrders;
                  if (apiConfigured && activeTab === "Completed") {
                    const finished = await loadCompletedStandardOrders();
                    completedRows = finished.map((order, index) => ({
                      ...mapApiOrderToCompleted(order, index),
                      finished: true,
                    }));
                  } else if (apiConfigured) {
                    const remote = await collectPaginated((page, limit) =>
                      ordersApi.list({
                        page,
                        limit,
                        type: "standard",
                      }),
                    );
                    activeRows = remote.map((order, index) => {
                      const row = mapApiOrderToActive(
                        order,
                        `API-CO-${index + 1}`,
                      );
                      return applyPackingHandoff(row, packingByCode[row.id]);
                    });
                  }

                  if (activeTab === "Completed") {
                    const dataset = completedDataset(
                      completedRows,
                      apiConfigured,
                    );
                    const rows =
                      request.scope === "all"
                        ? dataset
                        : filterCompletedOrders(
                            dataset,
                            search,
                            zipFilter,
                            sortBy,
                          );
                    downloadCompletedOrdersCsv(
                      rows,
                      exportFilename(
                        request.scope === "all"
                          ? "completed-orders-all"
                          : "completed-orders",
                      ),
                    );
                    return;
                  }

                  const rows =
                    request.scope === "all"
                      ? filterActiveOrders(activeRows, "", "")
                      : filterActiveOrders(
                          activeRows,
                          search,
                          statusFilter,
                          appliedDateId,
                        );
                  downloadActiveOrdersCsv(
                    rows,
                    exportFilename(
                      request.scope === "all"
                        ? "customer-orders-all"
                        : "customer-orders",
                    ),
                  );
                }}
                className="w-full sm:w-auto"
              />
            </div>
          </div>
        }
        center={
          <Tabs
            embedded
            aria-label="Order views"
            items={[
              { id: "Orders", label: "Orders", width: 103 },
              { id: "Completed", label: "Completed", width: 118 },
            ]}
            value={activeTab}
            onChange={(id) => {
              setActiveTab(id as "Orders" | "Completed");
              setSelectedOrderId(null);
              setStatusMenu(null);
              setCalendarOpen(false);
            }}
          />
        }
      />

      <div className="relative flex min-h-0 flex-1 flex-col bg-[#FAFAFA]">
        <div className="min-h-0 flex-1 overflow-auto px-4 py-5 md:px-7 md:py-5">
          {activeTab === "Orders" ? (
            <div>
              <div className={DATE_CHIP_ROW}>
                <div ref={dateChipRowRef} className={DATE_CHIP_SCROLL}>
                  {deliveryChips.map((chip) => {
                    const active = chip.id === appliedDateId;
                    return (
                      <span
                        key={chip.id}
                        data-delivery-date={chip.id}
                        className="shrink-0"
                      >
                        <DeliveryDateChip
                          label={chip.label}
                          count={chip.count}
                          active={active}
                          onClick={() =>
                            commitDeliveryDate(
                              active ? "" : chip.id,
                            )
                          }
                        />
                      </span>
                    );
                  })}
                </div>

                <div
                  ref={calendarAnchorRef}
                  className={cn("relative z-30 shrink-0", DATE_NAV_GROUP)}
                >
                  <DateNavButton
                    aria-label="Previous dates"
                    disabled={!canShiftDatesBack}
                    onClick={() => shiftDeliveryDate(-1)}
                  >
                    <ChevronLeft size={14} />
                  </DateNavButton>
                  <DateNavButton
                    aria-label="Next dates"
                    disabled={!canShiftDatesForward}
                    onClick={() => shiftDeliveryDate(1)}
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
                    <DeliveryDateCalendar
                      deliveryWeekdays={WEDNESDAY_WEEKDAYS}
                      selectedDateId={appliedDateId}
                      onSelectDate={commitDeliveryDate}
                      onClose={() => setCalendarOpen(false)}
                      initialMonth={
                        parseDeliveryDateId(appliedDateId) ?? new Date()
                      }
                    />
                  ) : null}
                </div>
              </div>

              {loading ? (
                <AppLoader variant="table" label="Loading orders" />
              ) : (
                <ScrollTable
                  minWidth={1100}
                  className="mt-4 max-h-[min(720px,calc(100dvh-16rem))]"
                >
                  <div
                    className={cn(
                      ACTIVE_ORDER_COLUMNS,
                      TABLE_HEADER,
                      PINNED_HEADER,
                      "h-10 border-b border-[#00000014]",
                    )}
                  >
                    <div>Order ID</div>
                    {STEPS_META.map((step) => (
                      <div key={step.key} className="text-center">
                        {step.header}
                      </div>
                    ))}
                  </div>

                  {visibleActive.length === 0 ? (
                    <div className="px-4 py-10 text-center text-[13px] text-[#8A8A8A]">
                      No orders found
                    </div>
                  ) : (
                    visibleActive.map((order) => (
                      <div
                        key={order.id}
                        className={cn(
                          ACTIVE_ORDER_COLUMNS,
                          "relative bg-white py-4",
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => setSelectedOrderId(order.id)}
                          className="text-left"
                        >
                          <div className="flex items-center gap-1 text-[16px] font-semibold text-[#2E2E2E]">
                            {display(order.customerName)}
                            <ChevronRight
                              size={13}
                              className="text-[#A9A9A9]"
                            />
                          </div>
                          <div className="mt-1.5 flex flex-wrap items-center gap-2">
                            <IdPill>{order.id}</IdPill>
                            <span className="text-[12px] text-[#8A8A8A]">
                              {order.itemCount}{" "}
                              {order.itemCount === 1 ? "item" : "items"}
                            </span>
                          </div>
                        </button>

                        <div className="col-span-6">
                          <OrderTimelineTrack
                            order={order}
                            onStatusClick={(stepKey, anchor) => {
                              const progress = orderProgressIndex(
                                order.steps,
                                order.status,
                              );
                              const stepIndex = STEPS_META.findIndex(
                                (step) => step.key === stepKey,
                              );
                              if (stepIndex > progress + 1) return;
                              const menuWidth = 260;
                              const menuHeight = 124;
                              const gap = 8;
                              const spaceBelow =
                                window.innerHeight - anchor.bottom;
                              const spaceAbove = anchor.top;
                              const placeAbove =
                                spaceBelow < menuHeight + gap &&
                                spaceAbove > spaceBelow;
                              setStatusMenu(
                                statusMenu?.orderId === order.id &&
                                  statusMenu.stepKey === stepKey
                                  ? null
                                  : {
                                      orderId: order.id,
                                      stepKey,
                                      placeAbove,
                                      top: placeAbove
                                        ? anchor.top - gap
                                        : anchor.bottom + gap,
                                      left: Math.max(
                                        12,
                                        Math.min(
                                          anchor.left +
                                            anchor.width / 2 -
                                            menuWidth / 2,
                                          window.innerWidth - menuWidth - 12,
                                        ),
                                      ),
                                    },
                              );
                            }}
                          />
                        </div>
                      </div>
                    ))
                  )}
                </ScrollTable>
              )}
            </div>
          ) : completedLoading && completedOrders.length === 0 ? (
            <AppLoader variant="table" label="Loading completed orders" />
          ) : completedGroups.length === 0 ? (
            <p className="text-[14px] text-[#6B7180]">
              No completed orders yet.
            </p>
          ) : (
            <div className="space-y-8">
              {completedGroups.map(([week, days]) => (
                <section key={week}>
                  <h2 className="mb-5 text-[22px] font-semibold tracking-tight text-[#111118]">
                    {week}
                  </h2>
                  {Array.from(days.entries()).map(([day, dayOrders]) => (
                    <div
                      key={day}
                      className="mb-6 overflow-hidden rounded-[12px] border border-[#00000014] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
                    >
                      <div className="flex h-10 items-center gap-2 border-b border-[#00000014] bg-[#FBF9F9] px-4 text-[14px] font-semibold text-[#111118]">
                        <DayHeaderIcon />
                        <span>
                          {day}
                          <span className="font-medium text-[#8A8A8A]">
                            {" "}
                            · {dayOrders.length} orders
                          </span>
                        </span>
                      </div>
                      <ScrollTable minWidth={860} bare>
                        <div>
                          <div
                            className={cn(
                              COMPLETED_ORDER_COLUMNS,
                              TABLE_HEADER,
                              PINNED_HEADER,
                              "h-10 border-b border-[#00000014]",
                            )}
                          >
                            <div>Order ID</div>
                            <div>Customer</div>
                            <div>Address</div>
                            <div>Zip Code</div>
                            <div>Order Date</div>
                            <div>Delivered</div>
                            <div>Items</div>
                            <div>Total</div>
                          </div>
                          {dayOrders.map((order) => (
                            <div
                              key={order.id}
                              className={cn(
                                COMPLETED_ORDER_COLUMNS,
                                "border-b border-[#00000014] py-3.5 text-[13px] text-[#111118] last:border-b-0",
                              )}
                            >
                              <IdPill>{order.id}</IdPill>
                              <div className="font-semibold">
                                {display(order.customer)}
                              </div>
                              <LocationHover
                                className="text-[13px] text-[#111118]"
                                fullAddress={order.address}
                              >
                                {display(order.address)}
                              </LocationHover>
                              <div>{display(order.zip)}</div>
                              <div className="text-[#111118]">
                                {display(order.orderDate)}
                              </div>
                              <div className="text-[#111118]">
                                {display(order.delivered)}
                              </div>
                              <div>{order.items}</div>
                              <div className="font-bold">
                                {currency(order.total)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollTable>
                    </div>
                  ))}
                </section>
              ))}
            </div>
          )}

          <InfiniteScrollSentinel
            hasMore={
              activeTab === "Orders"
                ? activeHasMore
                : apiConfigured
                  ? false
                  : completedWindow.hasMore
            }
            loading={activeTab === "Orders" && loadingMore}
            loadedCount={
              activeTab === "Orders"
                ? apiConfigured
                  ? orders.length
                  : activeWindow.loadedCount
                : completedWindow.loadedCount
            }
            onLoadMore={
              activeTab === "Orders" ? loadMoreActive : completedWindow.loadMore
            }
          />
        </div>

        {statusMenu
          ? createPortal(
              <div
                data-status-menu
                className="fixed z-[100] w-[260px] rounded-[12px] border border-[#00000014] bg-white p-3 shadow-[0_8px_28px_rgba(0,0,0,0.12)]"
                style={{
                  top: statusMenu.top,
                  left: statusMenu.left,
                  transform: statusMenu.placeAbove
                    ? "translateY(-100%)"
                    : undefined,
                }}
              >
                <div className="mb-2 text-[14px] font-semibold text-[#111118]">
                  Change Status
                </div>
                <div className="flex gap-2">
                  {previousStep ? (
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 text-[10px] font-semibold tracking-[0.06em] text-[#8A8A8A] uppercase">
                        Previous
                      </div>
                      <StatusChoiceButton
                        label={previousStep.header}
                        enabled={previousHint === null}
                        hint={previousHint}
                        onPick={() =>
                          openStatusChange(
                            statusMenu.orderId,
                            previousStep.key,
                          )
                        }
                      />
                    </div>
                  ) : null}
                  {triggeredStep ? (
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 text-[10px] font-semibold tracking-[0.06em] text-[#8A8A8A] uppercase">
                        Status
                      </div>
                      <StatusChoiceButton
                        label={triggeredStep.header}
                        enabled={triggeredHint === null}
                        hint={triggeredHint}
                        onPick={() =>
                          openStatusChange(
                            statusMenu.orderId,
                            triggeredStep.key,
                          )
                        }
                      />
                    </div>
                  ) : null}
                </div>
              </div>,
              document.body,
            )
          : null}

        <StatusChangeModal
          open={Boolean(statusChange)}
          direction={statusChange?.direction ?? "next"}
          stepKey={statusChange?.stepKey ?? "requested"}
          order={statusChangeOrder}
          saving={statusSaving}
          onClose={() => {
            if (!statusSaving) setStatusChange(null);
          }}
          onConfirm={() => void confirmStatusChange()}
        />

      </div>

      {selectedOrder ? (
        <OrderDetailPanel
          order={
            orderDetail?.id === selectedOrder.id ? orderDetail : selectedOrder
          }
          itemsLoading={
            orderItemsLoading &&
            (orderDetail?.id === selectedOrder.id
              ? orderDetail.items.length === 0
              : selectedOrder.items.length === 0)
          }
          onClose={() => setSelectedOrderId(null)}
        />
      ) : null}
    </div>
  );
}

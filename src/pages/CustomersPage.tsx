import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronRight, Flag, X } from "lucide-react";

import { Header } from "@/components/layout/AdminHeader";
import { ExportButton } from "@/components/shared/ExportButton";
import { LocationHover } from "@/components/shared/LocationHover";
import { AppLoader } from "@/components/ui/AppLoader";
import { IdPill } from "@/components/ui/Badge";
import { InfiniteScrollSentinel } from "@/components/ui/InfiniteScrollSentinel";
import { ScrollTable } from "@/components/ui/ScrollTable";
import { SearchField } from "@/components/ui/SearchField";
import { Select } from "@/components/ui/Select";
import { DEFAULT_PAGE_LIMIT } from "@/constants/pagination";
import { PINNED_HEADER, SUB_ROW_PAD, TABLE_HEADER } from "@/constants/table";
import { ADMIN_CUSTOMERS } from "@/data/admin";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useApiFeedback } from "@/hooks/useApiFeedback";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useLazyWindow } from "@/hooks/useLazyWindow";
import {
  collectPaginated,
  isApiConfigured,
  mapApiUserToAdminCustomer,
  ordersApi,
  usersApi,
  type ApiOrder,
} from "@/lib/api";
import { centsToDollars } from "@/lib/api/mappers";
import type { ExportRequest } from "@/types/export";
import type {
  AdminCustomer,
  AdminCustomerOrder,
  AdminCustomerOrderStatus,
} from "@/types/admin";
import { cn } from "@/utils/cn";
import { isUuid } from "@/utils/entityIds";
import { downloadCsvFile, exportFilename } from "@/utils/csvExport";
import { resolveFullAddress } from "@/utils/format";

function applyOrderDetail(
  order: ApiOrder,
  fallback: AdminCustomerOrder,
): AdminCustomerOrder {
  const items = (order.items ?? []).map((line) => {
    const price = centsToDollars(line.price);
    const quantity = line.quantity ?? 0;
    return {
      itemName: line.name || line.itemName || "Item",
      quantity,
      unit: line.unit || "Each",
      pricePerUnit: price,
      totalPrice: price * quantity,
    };
  });
  return {
    ...fallback,
    items: items.length ? items : fallback.items,
    orderPrice:
      order.totalPrice != null
        ? centsToDollars(order.totalPrice)
        : fallback.orderPrice,
  };
}

function currency(value: number) {
  return `$${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatShortDate(iso: string) {
  if (!iso?.trim()) return "-";
  const date = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatDeliveryDate(iso: string) {
  const date = new Date(`${iso}T12:00:00`);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    weekday: "long",
  });
}

function dayAbbrev(day?: string) {
  if (!day) return "—";
  return day.slice(0, 3);
}

function matchesCustomerListFilters(
  customer: AdminCustomer,
  criteria: {
    query: string;
    applyQuery: boolean;
    zipFilter: string;
    orderCountFilter: string;
  },
) {
  const normalized = criteria.query.toLowerCase();
  const matchesQuery =
    !criteria.applyQuery ||
    !normalized ||
    customer.id.toLowerCase().includes(normalized) ||
    `${customer.firstName} ${customer.lastName}`
      .toLowerCase()
      .includes(normalized);
  const matchesZip = !criteria.zipFilter || customer.zip === criteria.zipFilter;
  const matchesOrders =
    !criteria.orderCountFilter ||
    (criteria.orderCountFilter === "1-10" && customer.orderQuantity <= 10) ||
    (criteria.orderCountFilter === "11-20" &&
      customer.orderQuantity >= 11 &&
      customer.orderQuantity <= 20) ||
    (criteria.orderCountFilter === "21+" && customer.orderQuantity >= 21);
  return matchesQuery && matchesZip && matchesOrders;
}

const CUSTOMER_EXPORT_HEADERS = [
  "ID",
  "Customer",
  "Email",
  "Phone",
  "Address",
  "Orders",
  "Total",
  "Last Order",
  "Delivery Day",
] as const;

function downloadCustomersCsv(customers: AdminCustomer[], filename: string) {
  downloadCsvFile(filename, [
    [...CUSTOMER_EXPORT_HEADERS],
    ...customers.map((customer) => [
      customer.id,
      `${customer.firstName} ${customer.lastName}`.trim() || "—",
      customer.email.trim() || "—",
      customer.phone.trim() || "—",
      customer.shortLocation.trim() || "—",
      String(customer.orderQuantity),
      currency(customer.lifetimeTotal),
      formatShortDate(customer.lastOrderedDate),
      dayAbbrev(customer.deliveryDay),
    ]),
  ]);
}

function parseAddress(fullAddress: string) {
  const parts = fullAddress.split(",").map((part) => part.trim());
  const street = parts[0] ?? "";
  const apt = parts[1]?.match(/^(Apt|Unit|Suite)\b/i) ? parts[1] : "";
  const city = apt ? (parts[2] ?? "") : (parts[1] ?? "");
  const stateZip = apt ? (parts[3] ?? "") : (parts[2] ?? "");
  const [state, zip] = stateZip.split(/\s+/);
  return { street, apt, city, state: state ?? "", zip: zip ?? "" };
}

function statusStyles(status: AdminCustomerOrderStatus) {
  switch (status) {
    case "In Progress":
      return "bg-[#E8F1FB] text-[#3B7DC4]";
    case "Packing":
      return "bg-[#F0EBFA] text-[#7B5EA7]";
    case "Delivering":
      return "bg-[#FFF0E8] text-[#F57850]";
    case "Completed":
      return "bg-[#E8F5EC] text-[#2F8F4E]";
    case "Canceled":
      return "bg-[#FDECEC] text-[#E25B5B]";
    default:
      return "bg-[#F3F3F1] text-[#6B6B6B]";
  }
}

type SelectedOrder = {
  customer: AdminCustomer;
  order: AdminCustomerOrder;
};

const ORDER_ROW =
  "grid grid-cols-[260px_100px_90px_120px_minmax(0,1fr)_88px_52px] items-center gap-x-4 px-4";
const GRID_PLAIN =
  "grid grid-cols-[112px_minmax(0,1.15fr)_minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)_56px_72px_88px_96px] items-center gap-x-4 px-4";
const GRID_ARROW =
  "grid grid-cols-[28px_112px_minmax(0,1.15fr)_minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)_56px_72px_88px_96px] items-center gap-x-4 px-4";

function OrderDetailDrawer({
  selected,
  onClose,
}: {
  selected: SelectedOrder;
  onClose: () => void;
}) {
  const { customer, order } = selected;
  const address = parseAddress(order.deliveryAddress || customer.fullAddress);

  return (
    <aside className="absolute inset-y-0 right-0 z-40 flex w-full max-w-[600px] flex-col border-l border-[#00000014] bg-white shadow-[-8px_0_32px_rgba(0,0,0,0.08)]">
      <div className="flex items-start justify-between border-b border-[#00000014] px-5 pt-3 pb-4">
        <div className="min-w-0 pr-3">
          <div className="flex flex-wrap items-center gap-2">
            <IdPill>{order.id}</IdPill>
            <span className="text-[12px] text-[#8A8A8A]">
              Ordered:{" "}
              <span className="text-[#111118]">
                {order.orderedAt ?? formatShortDate(order.orderDate)}
              </span>
            </span>
          </div>
          <h2 className="mt-2 text-[26px] font-semibold tracking-tight text-[#111118]">
            {customer.firstName} {customer.lastName}
          </h2>
          <div
            className={cn(
              "mt-2 inline-flex rounded-[6px] px-2 py-1 text-[12px] font-medium",
              order.paymentStatus === "Paid"
                ? "bg-[#E8F5EC] text-[#2F8F4E]"
                : "bg-[#F3F3F1] text-[#6B6B6B]",
            )}
          >
            Payment Status: {order.paymentStatus}
          </div>
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

      <div className="flex-1 overflow-auto px-5 py-5">
        <section>
          <h3 className="mb-3 text-[13px] font-semibold text-[#111118]">
            Requested Items
          </h3>
          <div className="overflow-x-auto">
            <div className="min-w-[320px] overflow-hidden rounded-[12px] border border-[#00000014] bg-[#FBF9F9]">
              <div
                className={cn(
                  "grid grid-cols-[1.6fr_50px_90px_70px] gap-2 border-b border-[#00000014] bg-[#FBF9F9] px-4 py-[10px] text-[11px] font-semibold tracking-[0.06em] text-[#2E2E2E] uppercase",
                )}
              >
                <div>Item / Order ID</div>
                <div>Qty</div>
                <div>Unit Price</div>
                <div className="text-right">Total</div>
              </div>
              {order.items.map((item) => (
                <div
                  key={`${order.id}-${item.itemName}`}
                  className={cn(
                    "grid grid-cols-[1.6fr_50px_90px_70px] gap-2 border-b border-[#00000014] bg-[#FBF9F9] px-4 py-[10px] text-[12px] text-[#111118] last:border-b-0",
                  )}
                >
                  <div className="min-w-0">
                    <div>{item.itemName}</div>
                    <div className="mt-0.5 font-mono text-[11px] text-[#8A8A8A]">
                      {order.id}
                    </div>
                  </div>
                  <div>{item.quantity}</div>
                  <div className="whitespace-nowrap">
                    <span>{currency(item.pricePerUnit)}</span>
                    {item.unit ? (
                      <span className="text-[#8A8A8A]"> / {item.unit}</span>
                    ) : null}
                  </div>
                  <div className="text-right font-bold">
                    {currency(item.totalPrice)}
                  </div>
                </div>
              ))}
              <div
                className={cn(
                  "flex items-center justify-between border-t border-[#00000014] bg-[#FBF9F9] px-4 py-[10px] text-[#111118]",
                )}
              >
                <span className="text-[14px] font-semibold">Order Total</span>
                <span className="text-[18px] font-bold tracking-tight">
                  {currency(order.orderPrice)}
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6">
          <h3 className="mb-3 text-[13px] font-semibold text-[#111118]">
            Packing Information
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-[11px] font-semibold tracking-[0.06em] text-[#2E2E2E] uppercase">
                Packer Assigned
              </div>
              <div className="mt-1 text-[13px] text-[#99A1AF]">
                {order.packerAssigned ?? "—"}
              </div>
            </div>
            <div>
              <div className="text-[11px] font-semibold tracking-[0.06em] text-[#2E2E2E] uppercase">
                Cooler ID(s)
              </div>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {(order.coolerIds ?? []).length ? (
                  order.coolerIds!.map((id) => <IdPill key={id}>{id}</IdPill>)
                ) : (
                  <span className="text-[13px] text-[#99A1AF]">—</span>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6">
          <h3 className="mb-3 text-[13px] font-semibold text-[#111118]">
            Delivery Information
          </h3>
          <div className="mb-3 inline-flex rounded-[8px] bg-[#FFF0E8] px-2.5 py-1 text-[12px] font-medium text-[#E07A4F]">
            {formatDeliveryDate(order.deliveryDate)}
          </div>
          <div className="flex flex-col gap-3 bg-white">
            <div>
              <div className="text-[11px] font-semibold tracking-[0.06em] text-[#2E2E2E] uppercase">
                Street Address
              </div>
              <div className="mt-1 text-[13px] font-bold text-[#111118]">
                {address.street || "—"}
              </div>
            </div>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <div className="text-[11px] font-semibold tracking-[0.06em] text-[#2E2E2E] uppercase">
                  Apt / Unit
                </div>
                <div className="mt-1 text-[13px] font-bold text-[#111118]">
                  {address.apt || "—"}
                </div>
              </div>
              <div>
                <div className="text-[11px] font-semibold tracking-[0.06em] text-[#2E2E2E] uppercase">
                  City
                </div>
                <div className="mt-1 text-[13px] font-bold text-[#111118]">
                  {address.city || "—"}
                </div>
              </div>
              <div>
                <div className="text-[11px] font-semibold tracking-[0.06em] text-[#2E2E2E] uppercase">
                  State
                </div>
                <div className="mt-1 text-[13px] font-bold text-[#111118]">
                  {address.state || "—"}
                </div>
              </div>
              <div>
                <div className="text-[11px] font-semibold tracking-[0.06em] text-[#2E2E2E] uppercase">
                  Zip
                </div>
                <div className="mt-1 text-[13px] font-bold text-[#111118]">
                  {address.zip || customer.zip || "—"}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </aside>
  );
}

function CustomerOrdersPanel({
  customer,
  onViewOrder,
}: {
  customer: AdminCustomer;
  onViewOrder: (customer: AdminCustomer, order: AdminCustomerOrder) => void;
}) {
  if (!customer.orders.length) {
    return (
      <div
        className={cn(
          "border-t border-[#00000014] bg-[#FBF9F9] py-8 text-center text-[13px] text-[#8A8A8A]",
          SUB_ROW_PAD,
        )}
      >
        No data found
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative border-t border-[#00000014] bg-[#FBF9F9]",
        SUB_ROW_PAD,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute top-0 bottom-0 left-[23px] hidden w-px bg-[#00000014] md:block"
      />
      {/* Mobile: stacked order cards */}
      <div className="relative space-y-2 md:hidden">
        {customer.orders.map((order) => (
          <div
            key={order.id}
            className="rounded-[10px] border border-[#00000014] bg-white p-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[13px] font-semibold text-[#111118]">
                  {order.id}
                </div>
                <div className="mt-1 text-[12px] text-[#8A8A8A]">
                  Ordered {formatShortDate(order.orderDate)} · Delivery{" "}
                  {formatShortDate(order.deliveryDate)}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[13px] font-semibold text-[#111118]">
                  {currency(order.orderPrice)}
                </div>
                <button
                  type="button"
                  onClick={() => onViewOrder(customer, order)}
                  className="mt-1 inline-flex h-10 items-center rounded-[10px] px-3 text-[13px] font-medium text-[#155DFC]"
                >
                  View
                </button>
              </div>
            </div>
            <div className="mt-2">
              <span
                className={cn(
                  "inline-flex rounded-[6px] px-2 py-0.5 text-[11px] font-medium",
                  statusStyles(order.status),
                )}
              >
                {order.status}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop: nested table left edge aligns to expand-arrow center */}
      <div className="relative hidden md:block">
        <ScrollTable minWidth={920} bare>
          <div
            className={cn(
              ORDER_ROW,
              TABLE_HEADER,
              PINNED_HEADER,
              "h-10 border-b border-[#00000014] bg-[#FBF9F9]",
            )}
          >
            <div>Order ID</div>
            <div>Order Date</div>
            <div>Delivery</div>
            <div>Status</div>
            <div aria-hidden />
            <div>Total</div>
            <div />
          </div>
          {customer.orders.map((order) => {
            const timeLabel = order.orderedAt
              ? order.orderedAt.replace(/^.*,\s*/, "").trim()
              : "";
            return (
              <div
                key={order.id}
                className={cn(
                  ORDER_ROW,
                  "border-b border-[#00000014] bg-[#FBF9F9] py-2.5 text-[13px] text-[#111118] last:border-b-0",
                )}
              >
                <IdPill>{order.id}</IdPill>
                <div>
                  <div>{formatShortDate(order.orderDate)}</div>
                  {timeLabel ? (
                    <div className="mt-0.5 text-[11px] text-[#8A8A8A]">
                      {timeLabel}
                    </div>
                  ) : null}
                </div>
                <div>{formatShortDate(order.deliveryDate)}</div>
                <div>
                  <span
                    className={cn(
                      "inline-flex rounded-[6px] px-2 py-0.5 text-[11px] font-medium",
                      statusStyles(order.status),
                    )}
                  >
                    {order.status}
                  </span>
                </div>
                <div aria-hidden />
                <div className="font-semibold">
                  {currency(order.orderPrice)}
                </div>
                <div className="text-right">
                  <button
                    type="button"
                    onClick={() => onViewOrder(customer, order)}
                    className="inline-flex h-10 items-center rounded-[10px] px-3 text-[13px] font-medium text-[#155DFC]"
                  >
                    View
                  </button>
                </div>
              </div>
            );
          })}
        </ScrollTable>
      </div>
    </div>
  );
}

function CustomerTable({
  customers,
  expandedId,
  onToggle,
  onViewOrder,
}: {
  customers: AdminCustomer[];
  expandedId: string | null;
  onToggle: (id: string) => void;
  onViewOrder: (customer: AdminCustomer, order: AdminCustomerOrder) => void;
}) {
  if (!customers.length) {
    return (
      <div className="rounded-[12px] border border-[#00000014] bg-white px-4 py-8 text-center text-[13px] text-[#8A8A8A]">
        No customers found
      </div>
    );
  }

  const showArrows = customers.some((customer) => customer.orders.length > 0);
  const grid = showArrows ? GRID_ARROW : GRID_PLAIN;

  return (
    <>
      {/* Mobile cards */}
      <div className="space-y-2 md:hidden">
        {customers.map((customer) => {
          const canExpand = customer.orders.length > 0;
          const open = canExpand && expandedId === customer.id;
          return (
            <div
              key={customer.id}
              className="overflow-hidden rounded-[12px] border border-[#00000014] bg-white"
            >
              <div className="flex w-full items-start gap-3 p-3.5">
                {canExpand ? (
                  <button
                    type="button"
                    aria-label={open ? "Collapse" : "Expand"}
                    onClick={() => onToggle(customer.id)}
                    className="mt-1 shrink-0"
                  >
                    <ChevronRight
                      size={14}
                      className={cn(
                        "text-[#B0B0B0] transition-transform",
                        open && "rotate-90 text-[#F57850]",
                      )}
                    />
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={canExpand ? () => onToggle(customer.id) : undefined}
                  className={cn(
                    "min-w-0 flex-1 text-left",
                    !canExpand && "cursor-default",
                  )}
                >
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <IdPill>{customer.id}</IdPill>
                    <span className="inline-flex items-center gap-1 text-[14px] font-semibold text-[#111118]">
                      {customer.firstName} {customer.lastName}
                      {customer.flagged ? (
                        <Flag
                          size={12}
                          className="text-[#111118]"
                          strokeWidth={1.75}
                        />
                      ) : null}
                    </span>
                  </div>
                  <div className="mt-1.5 text-[12px] whitespace-nowrap text-[#6B6B6B]">
                    {customer.phone}
                  </div>
                  <div className="mt-0.5 flex min-w-0 items-center gap-1 text-[12px] text-[#8A8A8A]">
                    <LocationHover
                      className="min-w-0 text-[12px] text-[#8A8A8A]"
                      fullAddress={resolveFullAddress(
                        customer.fullAddress,
                        customer.shortLocation,
                      )}
                    >
                      {customer.shortLocation}
                    </LocationHover>
                    <span className="shrink-0">
                      · {customer.orderQuantity} orders
                    </span>
                  </div>
                </button>
                <div className="shrink-0 text-right">
                  <div className="text-[14px] font-semibold text-[#111118]">
                    {currency(customer.lifetimeTotal)}
                  </div>
                  <div className="mt-1">
                    <span className="inline-flex rounded-full bg-[#E7F2EA] px-2 py-0.5 text-[11px] font-semibold text-[#1C5752]">
                      {dayAbbrev(customer.deliveryDay)}
                    </span>
                  </div>
                </div>
              </div>
              {open ? (
                <CustomerOrdersPanel
                  customer={customer}
                  onViewOrder={onViewOrder}
                />
              ) : null}
            </div>
          );
        })}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block">
        <ScrollTable
          minWidth={1280}
          className="max-h-[min(640px,calc(100dvh-18rem))]"
        >
          <div>
            <div
              className={cn(
                grid,
                PINNED_HEADER,
                TABLE_HEADER,
                "h-10 border-b border-[#00000014]",
              )}
            >
              {showArrows ? <div /> : null}
              <div className="whitespace-nowrap">ID</div>
              <div className="whitespace-nowrap">Customer</div>
              <div className="whitespace-nowrap">Email</div>
              <div className="whitespace-nowrap">Phone</div>
              <div className="whitespace-nowrap">Address</div>
              <div className="whitespace-nowrap">Orders</div>
              <div className="whitespace-nowrap">Total</div>
              <div className="whitespace-nowrap">Last Order</div>
              <div className="whitespace-nowrap">Delivery Day</div>
            </div>

            {customers.map((customer, index) => {
              const canExpand = customer.orders.length > 0;
              const open = canExpand && expandedId === customer.id;
              const isLast = index === customers.length - 1;

              return (
                <div key={customer.id} className="contents">
                  <div
                    className={cn(
                      grid,
                      "py-[10px]",
                      !isLast || open ? "border-b border-[#00000014]" : "",
                    )}
                  >
                    {showArrows ? (
                      canExpand ? (
                        <button
                          type="button"
                          aria-label={open ? "Collapse" : "Expand"}
                          onClick={() => onToggle(customer.id)}
                          className="relative z-[1] flex justify-self-start"
                        >
                          <ChevronRight
                            size={14}
                            className={cn(
                              "text-[#B0B0B0] transition-transform",
                              open && "rotate-90 text-[#F57850]",
                            )}
                          />
                        </button>
                      ) : (
                        <span className="w-3.5" aria-hidden />
                      )
                    ) : null}

                    {canExpand ? (
                      <button
                        type="button"
                        onClick={() => onToggle(customer.id)}
                        className="text-left"
                      >
                        <IdPill>{customer.id}</IdPill>
                      </button>
                    ) : (
                      <IdPill>{customer.id}</IdPill>
                    )}

                    <div className="flex min-w-0 items-center gap-1.5 overflow-hidden text-[13px] font-semibold text-[#111118]">
                      <span className="truncate">
                        {customer.firstName} {customer.lastName}
                      </span>
                      {customer.flagged ? (
                        <Flag
                          size={12}
                          className="shrink-0 text-[#111118]"
                          strokeWidth={1.75}
                        />
                      ) : null}
                    </div>

                    <div className="min-w-0 truncate text-[13px] text-[#111118]">
                      {customer.email}
                    </div>
                    <div className="min-w-0 truncate text-[13px] text-[#111118]">
                      {customer.phone}
                    </div>
                    <LocationHover
                      className="min-w-0 truncate text-[13px] text-[#111118]"
                      label="Address"
                      fullAddress={resolveFullAddress(
                        customer.fullAddress,
                        customer.shortLocation,
                      )}
                    >
                      {customer.shortLocation}
                    </LocationHover>
                    <div className="text-[13px] text-[#111118]">
                      {customer.orderQuantity}
                    </div>
                    <div className="text-[13px] font-semibold text-[#111118]">
                      {currency(customer.lifetimeTotal)}
                    </div>
                    <div className="text-[13px] text-[#111118]">
                      {formatShortDate(customer.lastOrderedDate)}
                    </div>
                    <div>
                      <span className="inline-flex rounded-full bg-[#E7F2EA] px-2.5 py-0.5 text-[12px] font-semibold text-[#1C5752]">
                        {dayAbbrev(customer.deliveryDay)}
                      </span>
                    </div>
                  </div>

                  {open ? (
                    <div className="col-span-full">
                      <CustomerOrdersPanel
                        customer={customer}
                        onViewOrder={onViewOrder}
                      />
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </ScrollTable>
      </div>
    </>
  );
}

export default function CustomersPage() {
  useDocumentTitle("Customers");

  const { notifyApiError } = useApiFeedback();
  const apiConfigured = isApiConfigured();
  const [customers, setCustomers] = useState(() =>
    apiConfigured ? [] : ADMIN_CUSTOMERS,
  );
  const [loading, setLoading] = useState(apiConfigured);
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query.trim(), 300);
  const [zipFilter, setZipFilter] = useState("");
  const [orderCountFilter, setOrderCountFilter] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selected, setSelected] = useState<SelectedOrder | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(() =>
    apiConfigured ? 0 : ADMIN_CUSTOMERS.length,
  );
  const [loadingMore, setLoadingMore] = useState(false);
  const [listExhausted, setListExhausted] = useState(false);
  const loadLock = useRef(false);
  const loadedOrderIds = useRef(new Set<string>());
  const customersRef = useRef(customers);
  customersRef.current = customers;

  // Restart the list when server search changes so the fetch runs once at page 1.
  const [searchForPage, setSearchForPage] = useState(debouncedQuery);
  if (debouncedQuery !== searchForPage) {
    setSearchForPage(debouncedQuery);
    setPage(1);
    setListExhausted(false);
    if (apiConfigured) setCustomers([]);
  }

  useEffect(() => {
    if (!apiConfigured) return;
    let cancelled = false;
    const append = page > 1;
    loadLock.current = true;
    if (append) setLoadingMore(true);
    else setLoading(true);

    void usersApi
      .list({
        page,
        limit: DEFAULT_PAGE_LIMIT,
        role: "customer",
        ...(debouncedQuery ? { search: debouncedQuery } : {}),
      })
      .then((result) => {
        if (cancelled) return;
        const mapped = result.items.map(mapApiUserToAdminCustomer);
        setCustomers((current) => {
          if (!append) return mapped;
          const seen = new Set(current.map((customer) => customer.id));
          const extra = mapped.filter((customer) => !seen.has(customer.id));
          return extra.length === 0 ? current : [...current, ...extra];
        });
        setTotal(result.total);
        if (
          mapped.length < DEFAULT_PAGE_LIMIT ||
          (append &&
            mapped.every((customer) =>
              customersRef.current.some(
                (existing) => existing.id === customer.id,
              ),
            ))
        ) {
          setListExhausted(true);
        }
      })
      .catch((error) => {
        if (cancelled) return;
        notifyApiError(error, "Failed to load customers.");
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
  }, [apiConfigured, debouncedQuery, notifyApiError, page]);

  useEffect(() => {
    if (!apiConfigured || !expandedId) return;
    const customer = customersRef.current.find((row) => row.id === expandedId);
    const recordId = isUuid(customer?.recordId)
      ? customer?.recordId
      : isUuid(customer?.id)
        ? customer?.id
        : undefined;
    if (!recordId) return;
    let cancelled = false;
    void usersApi
      .getById(recordId)
      .then((user) => {
        if (cancelled) return;
        const mapped = mapApiUserToAdminCustomer(user, 0);
        setCustomers((current) =>
          current.map((row) =>
            row.id === expandedId
              ? { ...row, ...mapped, id: row.id, orders: row.orders }
              : row,
          ),
        );
      })
      .catch((error) => {
        if (!cancelled) notifyApiError(error, "Failed to load customer details.");
      });
    return () => {
      cancelled = true;
    };
  }, [apiConfigured, expandedId, notifyApiError]);

  const selectedOrderRecordId = selected?.order.recordId;
  const selectedOrderKey = selected?.order.id;

  useEffect(() => {
    if (
      !apiConfigured ||
      !selectedOrderRecordId ||
      !isUuid(selectedOrderRecordId) ||
      !selectedOrderKey
    ) {
      return;
    }
    if (loadedOrderIds.current.has(selectedOrderRecordId)) return;
    let cancelled = false;
    void ordersApi
      .getById(selectedOrderRecordId)
      .then((order) => {
        if (cancelled) return;
        loadedOrderIds.current.add(selectedOrderRecordId);
        setSelected((current) =>
          current && current.order.id === selectedOrderKey
            ? { ...current, order: applyOrderDetail(order, current.order) }
            : current,
        );
      })
      .catch((error) => {
        if (!cancelled) notifyApiError(error, "Failed to load order details.");
      });
    return () => {
      cancelled = true;
    };
  }, [apiConfigured, notifyApiError, selectedOrderKey, selectedOrderRecordId]);

  const zipOptions = useMemo(
    () =>
      Array.from(
        new Set(customers.map((customer) => customer.zip).filter(Boolean)),
      ).sort() as string[],
    [customers],
  );

  const filtered = useMemo(() => {
    return customers.filter((customer) =>
      matchesCustomerListFilters(customer, {
        query: debouncedQuery,
        applyQuery: !apiConfigured,
        zipFilter,
        orderCountFilter,
      }),
    );
  }, [apiConfigured, customers, debouncedQuery, orderCountFilter, zipFilter]);

  const localWindow = useLazyWindow(
    filtered,
    `${debouncedQuery}|${zipFilter}|${orderCountFilter}`,
  );
  const visibleCustomers = apiConfigured ? filtered : localWindow.visible;
  const hasMore = apiConfigured
    ? !listExhausted && customers.length < total
    : localWindow.hasMore;

  function loadMoreCustomers() {
    if (apiConfigured) {
      if (loadLock.current || listExhausted || customers.length >= total)
        return;
      loadLock.current = true;
      setPage((current) => current + 1);
      return;
    }
    localWindow.loadMore();
  }

  const active = visibleCustomers.filter((customer) => !customer.blocked);
  const inactive = visibleCustomers.filter((customer) => customer.blocked);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[#FAFAFA]">
      <Header
        title="Customers"
        toolbar={
          <div className="flex w-full flex-wrap items-center gap-2 md:flex-nowrap">
            <SearchField
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search"
            />

            <Select
              value={zipFilter}
              onChange={setZipFilter}
              className="w-full sm:w-[150px]"
              aria-label="By Zip Code"
              options={[
                { value: "", label: "By Zip Code" },
                ...zipOptions.map((zip) => ({ value: zip, label: zip })),
              ]}
            />

            <Select
              value={orderCountFilter}
              onChange={setOrderCountFilter}
              className="w-full sm:w-[170px]"
              aria-label="All Order Counts"
              options={[
                { value: "", label: "All Order Counts" },
                { value: "1-10", label: "1–10 orders" },
                { value: "11-20", label: "11–20 orders" },
                { value: "21+", label: "21+ orders" },
              ]}
            />

            <ExportButton
              entityLabel="customers"
              recordCount={
                !apiConfigured || zipFilter || orderCountFilter
                  ? filtered.length
                  : total
              }
              filtersActive={Boolean(
                query.trim() || zipFilter || orderCountFilter,
              )}
              onExport={async (request: ExportRequest) => {
                let source = customers;
                if (apiConfigured) {
                  const users = await collectPaginated((page, limit) =>
                    usersApi.list({
                      page,
                      limit,
                      role: "customer",
                      ...(request.scope === "filtered" && debouncedQuery
                        ? { search: debouncedQuery }
                        : {}),
                    }),
                  );
                  source = users.map((user, index) =>
                    mapApiUserToAdminCustomer(user, index),
                  );
                }
                const rows =
                  request.scope === "all"
                    ? source
                    : source.filter((customer) =>
                        matchesCustomerListFilters(customer, {
                          query: debouncedQuery,
                          applyQuery: !apiConfigured,
                          zipFilter,
                          orderCountFilter,
                        }),
                      );
                downloadCustomersCsv(
                  rows,
                  exportFilename(
                    request.scope === "all" ? "customers-all" : "customers",
                  ),
                );
              }}
              className="w-full sm:ml-auto sm:w-auto"
            />
          </div>
        }
      />

      <div className="relative flex min-h-0 flex-1 flex-col bg-[#FAFAFA]">
        <div className="min-h-0 flex-1 overflow-auto px-4 py-5 md:px-7 md:py-5">
          {loading && customers.length === 0 ? (
            <AppLoader variant="table" label="Loading customers" />
          ) : (
            <>
              <section className="mb-6">
                <h2 className="mb-3 text-[15px] font-semibold text-[#111118]">
                  Active{" "}
                  <span className="font-semibold text-[#6B7180]">
                    ({active.length})
                  </span>
                </h2>
                <CustomerTable
                  customers={active}
                  expandedId={expandedId}
                  onToggle={(id) =>
                    setExpandedId((current) => (current === id ? null : id))
                  }
                  onViewOrder={(customer, order) =>
                    setSelected({ customer, order })
                  }
                />
              </section>

              <section>
                <h2 className="mb-3 text-[15px] font-semibold text-[#111118]">
                  Inactive{" "}
                  <span className="font-semibold text-[#6B7180]">
                    ({inactive.length})
                  </span>
                </h2>
                <CustomerTable
                  customers={inactive}
                  expandedId={expandedId}
                  onToggle={(id) =>
                    setExpandedId((current) => (current === id ? null : id))
                  }
                  onViewOrder={(customer, order) =>
                    setSelected({ customer, order })
                  }
                />
              </section>

              <InfiniteScrollSentinel
                hasMore={hasMore}
                loading={loadingMore}
                loadedCount={
                  apiConfigured ? customers.length : localWindow.loadedCount
                }
                onLoadMore={loadMoreCustomers}
              />
            </>
          )}
        </div>

        {selected ? (
          <OrderDetailDrawer
            selected={selected}
            onClose={() => setSelected(null)}
          />
        ) : null}
      </div>
    </div>
  );
}

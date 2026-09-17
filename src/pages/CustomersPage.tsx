import { useEffect, useMemo, useState } from "react";
import { ChevronRight, Flag, Search, X } from "lucide-react";

import { Header } from "@/components/layout/AdminHeader";
import { ExportButton } from "@/components/shared/ExportButton";
import { LocationHover } from "@/components/shared/LocationHover";
import { IdPill } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { ScrollTable } from "@/components/ui/ScrollTable";
import { Select } from "@/components/ui/Select";
import { ADMIN_CUSTOMERS } from "@/data/admin";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import {
  isApiConfigured,
  mapApiUserToAdminCustomer,
  normalizeUsersList,
  usersApi,
} from "@/lib/api";
import type {
  AdminCustomer,
  AdminCustomerOrder,
  AdminCustomerOrderStatus,
} from "@/types/admin";
import { cn } from "@/utils/cn";
import { resolveFullAddress } from "@/utils/format";

function currency(value: number) {
  return `$${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatShortDate(iso: string) {
  const date = new Date(`${iso}T12:00:00`);
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

const GRID =
  "grid grid-cols-[28px_56px_minmax(110px,1.1fr)_minmax(140px,1.3fr)_minmax(110px,1fr)_minmax(100px,1fr)_56px_72px_88px_96px] items-center gap-x-3";

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
    <aside className="absolute inset-y-0 right-0 z-40 flex w-full max-w-[600px] flex-col border-l border-[#ECECEA] bg-white shadow-[-8px_0_32px_rgba(0,0,0,0.08)]">
      <div className="flex items-start justify-between border-b border-[#F0F0EE] px-5 pt-3 pb-4">
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
            <div className="min-w-[320px] overflow-hidden rounded-[12px] border border-[#EBEBEB] bg-[#FBF9F9]">
              <div className="grid grid-cols-[1.6fr_50px_90px_70px] gap-2 border-b border-[#EBEBEB] bg-[#FBF9F9] px-3 py-2 text-[11px] font-semibold tracking-[0.06em] text-[#2E2E2E] uppercase">
                <div>Item / Order ID</div>
                <div>Qty</div>
                <div>Unit Price</div>
                <div className="text-right">Total</div>
              </div>
              {order.items.map((item) => (
                <div
                  key={`${order.id}-${item.itemName}`}
                  className="grid grid-cols-[1.6fr_50px_90px_70px] gap-2 border-b border-[#F3F3F1] bg-[#FBF9F9] px-3 py-2.5 text-[12px] text-[#111118] last:border-b-0"
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
              <div className="flex items-center justify-between border-t border-[#EBEBEB] bg-[#FBF9F9] px-3 py-3 text-[#111118]">
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
                  order.coolerIds!.map((id) => (
                    <IdPill key={id}>{id}</IdPill>
                  ))
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
  return (
    // Desktop pl-[26px]: row px-3 (12) + half of 28px chevron col (14) = expand-arrow center
    <div className="relative border-t border-[#F0F0EE] bg-[#FBF9F9] px-3 py-3 sm:py-4 md:pl-[26px] md:pr-6">
      {/* Full-height spine at expand-arrow center; sits 1px left of content so row bg doesn't cover it */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-8 bottom-0 left-[25px] hidden w-px bg-[#E4E4E0] md:block"
      />
      {/* Mobile: stacked order cards */}
      <div className="relative space-y-2 md:hidden">
        {customer.orders.map((order) => (
          <div
            key={order.id}
            className="rounded-[10px] border border-[#ECECEA] bg-white p-3"
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
        <ScrollTable minWidth={720} bare>
          <div className="grid grid-cols-[150px_100px_90px_120px_minmax(0,1fr)_88px_52px] items-center gap-x-5 border-b border-[#EBEBEB] bg-[#FBF9F9] py-2 pr-4 text-[11px] font-semibold tracking-[0.06em] text-[#2E2E2E] uppercase">
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
                className="grid grid-cols-[150px_100px_90px_120px_minmax(0,1fr)_88px_52px] items-center gap-x-5 border-b border-[#F0F0EE] bg-[#FBF9F9] py-3 pr-4 text-[13px] text-[#111118] last:border-b-0"
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
      <div className="rounded-[12px] border border-[#ECECEA] bg-white px-4 py-8 text-center text-[13px] text-[#8A8A8A]">
        No customers found
      </div>
    );
  }

  return (
    <>
      {/* Mobile cards */}
      <div className="space-y-2 md:hidden">
        {customers.map((customer) => {
          const open = expandedId === customer.id;
          return (
            <div
              key={customer.id}
              className="overflow-hidden rounded-[12px] border border-[#ECECEA] bg-white"
            >
              <div className="flex w-full items-start gap-3 p-3.5">
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
                <button
                  type="button"
                  onClick={() => onToggle(customer.id)}
                  className="min-w-0 flex-1 text-left"
                >
                  <div className="flex flex-wrap items-center gap-2">
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
        <ScrollTable minWidth={1020}>
          <div
            className={cn(
              GRID,
              "border-b border-[#ECECEA] bg-white px-3 py-2.5 text-[11px] font-semibold tracking-[0.06em] text-[#2E2E2E] uppercase",
            )}
          >
            <div />
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
            const open = expandedId === customer.id;
            const isLast = index === customers.length - 1;

            return (
              <div
                key={customer.id}
                className={cn(!isLast || open ? "border-b border-[#F0F0EE]" : "")}
              >
                <div className={cn(GRID, "px-3 py-3.5")}>
                  <button
                    type="button"
                    aria-label={open ? "Collapse" : "Expand"}
                    onClick={() => onToggle(customer.id)}
                    className="relative z-[1] flex justify-center"
                  >
                    <ChevronRight
                      size={14}
                      className={cn(
                        "text-[#B0B0B0] transition-transform",
                        open && "rotate-90 text-[#F57850]",
                      )}
                    />
                  </button>

                  <button
                    type="button"
                    onClick={() => onToggle(customer.id)}
                    className="cursor-pointer"
                  >
                    <IdPill>{customer.id}</IdPill>
                  </button>

                  <div className="flex min-w-0 items-center gap-1.5 text-[13px] font-semibold text-[#111118]">
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
                  <CustomerOrdersPanel
                    customer={customer}
                    onViewOrder={onViewOrder}
                  />
                ) : null}
              </div>
            );
          })}
        </ScrollTable>
      </div>
    </>
  );
}

export default function CustomersPage() {
  useDocumentTitle("Customers");

  const [customers, setCustomers] = useState(ADMIN_CUSTOMERS);
  const [query, setQuery] = useState("");
  const [zipFilter, setZipFilter] = useState("");
  const [orderCountFilter, setOrderCountFilter] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selected, setSelected] = useState<SelectedOrder | null>(null);

  useEffect(() => {
    if (!isApiConfigured()) return;
    let cancelled = false;

    void usersApi
      .list({ page: 1, limit: 100, role: "customer" })
      .then((payload) => {
        if (cancelled) return;
        const apiUsers = normalizeUsersList(payload);
        if (apiUsers.length === 0) return;

        const mapped = apiUsers.map(mapApiUserToAdminCustomer);
        // Prefer live API customers over local mock seeds.
        setCustomers(mapped);
      })
      .catch(() => {
        // Keep ADMIN_CUSTOMERS seed.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const zipOptions = useMemo(
    () =>
      Array.from(
        new Set(customers.map((customer) => customer.zip).filter(Boolean)),
      ).sort() as string[],
    [customers],
  );

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return customers.filter((customer) => {
      const matchesQuery =
        !normalized ||
        customer.id.toLowerCase().includes(normalized) ||
        `${customer.firstName} ${customer.lastName}`
          .toLowerCase()
          .includes(normalized);

      const matchesZip = !zipFilter || customer.zip === zipFilter;

      const matchesOrders =
        !orderCountFilter ||
        (orderCountFilter === "1-10" && customer.orderQuantity <= 10) ||
        (orderCountFilter === "11-20" &&
          customer.orderQuantity >= 11 &&
          customer.orderQuantity <= 20) ||
        (orderCountFilter === "21+" && customer.orderQuantity >= 21);

      return matchesQuery && matchesZip && matchesOrders;
    });
  }, [customers, orderCountFilter, query, zipFilter]);

  const active = filtered.filter((customer) => !customer.blocked);
  const inactive = filtered.filter((customer) => customer.blocked);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[#FAFAFA]">
      <Header
        title="Customers"
        toolbar={
          <div className="flex w-full flex-wrap items-center gap-2 md:flex-nowrap">
            <div className="relative w-full min-w-[160px] flex-1 sm:max-w-[220px] sm:flex-none">
              <Search
                size={13}
                className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[#111118]"
              />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search ID, customer name"
                className="w-full pl-8"
              />
            </div>

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
              recordCount={filtered.length}
              filtersActive={Boolean(
                query.trim() || zipFilter || orderCountFilter,
              )}
              className="w-full sm:ml-auto sm:w-auto"
            />
          </div>
        }
      />

      <div className="relative flex min-h-0 flex-1 flex-col bg-[#FAFAFA]">
        <div className="flex-1 overflow-auto px-4 py-5 md:px-7">
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
              onViewOrder={(customer, order) => setSelected({ customer, order })}
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
              onViewOrder={(customer, order) => setSelected({ customer, order })}
            />
          </section>
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

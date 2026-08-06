import { useMemo, useState } from "react";
import { ChevronRight, Flag, Search, X } from "lucide-react";

import { UserMenu } from "@/components/layout/UserMenu";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { ADMIN_CUSTOMERS } from "@/data/admin";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import type {
  AdminCustomer,
  AdminCustomerOrder,
  AdminCustomerOrderStatus,
} from "@/types/admin";
import { cn } from "@/utils/cn";

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
  "grid grid-cols-[28px_64px_1.3fr_1.4fr_1fr_1fr_60px_90px_90px_90px] items-center gap-2";

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
    <>
      <button
        type="button"
        aria-label="Close order details"
        className="absolute inset-0 z-30 bg-[#333333]/25"
        onClick={onClose}
      />
      <aside className="absolute inset-y-0 right-0 z-40 flex w-full max-w-[420px] flex-col border-l border-[#ECECEA] bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-[#F0F0EE] px-5 py-4">
          <div>
            <div className="text-[13px] font-semibold text-[#2E2E2E]">
              {order.id}
            </div>
            <div className="mt-0.5 text-[12px] text-[#8A8A8A]">
              Ordered: {order.orderedAt ?? formatShortDate(order.orderDate)}
            </div>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="rounded-md p-1 text-[#8A8A8A] hover:bg-[#F5F5F3]"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-auto px-5 py-5">
          <h2 className="text-[26px] font-semibold tracking-tight text-[#2E2E2E]">
            {customer.firstName} {customer.lastName}
          </h2>
          <div className="mt-2 inline-flex rounded-[6px] bg-[#E8F5EC] px-2 py-1 text-[12px] font-medium text-[#2F8F4E]">
            Payment Status: Paid
          </div>

          <section className="mt-6">
            <h3 className="mb-3 text-[13px] font-semibold text-[#2E2E2E]">
              Requested Items
            </h3>
            <div className="overflow-hidden rounded-[10px] border border-[#ECECEA]">
              <div className="grid grid-cols-[1.6fr_50px_80px_70px] gap-2 border-b border-[#ECECEA] bg-[#FAFAF8] px-3 py-2 text-[10px] font-semibold tracking-[0.04em] text-[#8A8A8A] uppercase">
                <div>Item</div>
                <div>Qty</div>
                <div>Unit Price</div>
                <div className="text-right">Total</div>
              </div>
              {order.items.map((item) => (
                <div
                  key={`${order.id}-${item.itemName}`}
                  className="grid grid-cols-[1.6fr_50px_80px_70px] gap-2 border-b border-[#F3F3F1] px-3 py-2.5 text-[12px] text-[#2E2E2E] last:border-b-0"
                >
                  <div>{item.itemName}</div>
                  <div>{item.quantity}</div>
                  <div>{currency(item.pricePerUnit)}</div>
                  <div className="text-right font-semibold">
                    {currency(item.totalPrice)}
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-between border-t border-[#ECECEA] bg-[#FAFAF8] px-3 py-2.5 text-[13px] font-semibold text-[#2E2E2E]">
                <span>Order Total</span>
                <span>{currency(order.orderPrice)}</span>
              </div>
            </div>
          </section>

          <section className="mt-6">
            <h3 className="mb-3 text-[13px] font-semibold text-[#2E2E2E]">
              Packing Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-[10px] font-semibold tracking-[0.05em] text-[#8A8A8A] uppercase">
                  Packer Assigned
                </div>
                <div className="mt-1 text-[13px] text-[#2E2E2E]">
                  {order.packerAssigned ?? "—"}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-semibold tracking-[0.05em] text-[#8A8A8A] uppercase">
                  Cooler ID
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {(order.coolerIds ?? []).length ? (
                    order.coolerIds!.map((id) => (
                      <span
                        key={id}
                        className="rounded-[6px] bg-[#F3F3F1] px-2 py-0.5 font-mono text-[11px] text-[#6B6B6B]"
                      >
                        {id}
                      </span>
                    ))
                  ) : (
                    <span className="text-[13px] text-[#8A8A8A]">—</span>
                  )}
                </div>
              </div>
            </div>
          </section>

          <section className="mt-6">
            <h3 className="mb-3 text-[13px] font-semibold text-[#2E2E2E]">
              Delivery Information
            </h3>
            <div className="mb-3 inline-flex rounded-[8px] bg-[#FFF0E8] px-2.5 py-1 text-[12px] font-medium text-[#E07A4F]">
              {formatDeliveryDate(order.deliveryDate)}
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              <div className="col-span-2">
                <div className="text-[10px] font-semibold tracking-[0.05em] text-[#8A8A8A] uppercase">
                  Street Address
                </div>
                <div className="mt-1 text-[13px] text-[#2E2E2E]">
                  {address.street || "—"}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-semibold tracking-[0.05em] text-[#8A8A8A] uppercase">
                  Apt/Unit
                </div>
                <div className="mt-1 text-[13px] text-[#2E2E2E]">
                  {address.apt || "—"}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-semibold tracking-[0.05em] text-[#8A8A8A] uppercase">
                  City
                </div>
                <div className="mt-1 text-[13px] text-[#2E2E2E]">
                  {address.city || "—"}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-semibold tracking-[0.05em] text-[#8A8A8A] uppercase">
                  State
                </div>
                <div className="mt-1 text-[13px] text-[#2E2E2E]">
                  {address.state || "—"}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-semibold tracking-[0.05em] text-[#8A8A8A] uppercase">
                  Zip
                </div>
                <div className="mt-1 text-[13px] text-[#2E2E2E]">
                  {address.zip || customer.zip || "—"}
                </div>
              </div>
            </div>
          </section>
        </div>
      </aside>
    </>
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
  return (
    <div className="overflow-hidden rounded-[12px] border border-[#ECECEA] bg-white">
      <div
        className={cn(
          GRID,
          "border-b border-[#ECECEA] bg-[#FAFAF8] px-4 py-2.5 text-[11px] font-semibold tracking-[0.04em] text-[#8A8A8A] uppercase",
        )}
      >
        <div />
        <div>ID</div>
        <div>Customer</div>
        <div>Email</div>
        <div>Phone</div>
        <div>Address</div>
        <div>Orders</div>
        <div>Total</div>
        <div>Last Order</div>
        <div>Delivery Day</div>
      </div>

      {customers.map((customer, index) => {
        const open = expandedId === customer.id;
        const isLast = index === customers.length - 1;

        return (
          <div
            key={customer.id}
            className={cn(!isLast || open ? "border-b border-[#F0F0EE]" : "")}
          >
            <div className={cn(GRID, "px-4 py-3.5")}>
              <button
                type="button"
                aria-label={open ? "Collapse" : "Expand"}
                onClick={() => onToggle(customer.id)}
                className="flex justify-center"
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
                className="w-fit rounded-[6px] bg-[#F3F3F1] px-1.5 py-0.5 font-mono text-[11px] font-medium text-[#6B6B6B]"
              >
                {customer.id}
              </button>

              <div className="flex items-center gap-1.5 text-[13px] font-semibold text-[#2E2E2E]">
                <span>
                  {customer.firstName} {customer.lastName}
                </span>
                {customer.flagged ? (
                  <Flag size={12} className="text-[#2E2E2E]" strokeWidth={1.75} />
                ) : null}
              </div>

              <div className="truncate text-[13px] text-[#2E2E2E]">
                {customer.email}
              </div>
              <div className="text-[13px] text-[#2E2E2E]">{customer.phone}</div>
              <div className="truncate text-[13px] text-[#2E2E2E]">
                {customer.shortLocation}
              </div>
              <div className="text-[13px] text-[#2E2E2E]">
                {customer.orderQuantity}
              </div>
              <div className="text-[13px] font-semibold text-[#2E2E2E]">
                {currency(customer.lifetimeTotal)}
              </div>
              <div className="text-[13px] text-[#2E2E2E]">
                {formatShortDate(customer.lastOrderedDate)}
              </div>
              <div className="text-[13px] font-medium text-[#1C5752]">
                {dayAbbrev(customer.deliveryDay)}
              </div>
            </div>

            {open ? (
              <div className="border-t border-[#F0F0EE] bg-[#FAFAF8] px-6 py-4">
                <div className="overflow-hidden rounded-[10px] border border-[#ECECEA] bg-white">
                  <div className="grid grid-cols-[1.2fr_1fr_1fr_1fr_70px_80px] gap-3 border-b border-[#ECECEA] bg-[#FAFAF8] px-4 py-2 text-[10px] font-semibold tracking-[0.04em] text-[#8A8A8A] uppercase">
                    <div>Order ID</div>
                    <div>Order Date</div>
                    <div>Delivery</div>
                    <div>Status</div>
                    <div>Total</div>
                    <div />
                  </div>
                  {customer.orders.map((order) => (
                    <div
                      key={order.id}
                      className="grid grid-cols-[1.2fr_1fr_1fr_1fr_70px_80px] items-center gap-3 border-b border-[#F3F3F1] px-4 py-3 text-[13px] text-[#2E2E2E] last:border-b-0"
                    >
                      <div className="font-medium">{order.id}</div>
                      <div>{formatShortDate(order.orderDate)}</div>
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
                      <div className="font-semibold">
                        {currency(order.orderPrice)}
                      </div>
                      <div className="text-right">
                        <button
                          type="button"
                          onClick={() => onViewOrder(customer, order)}
                          className="text-[13px] font-medium text-[#3B82F6]"
                        >
                          View
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export default function CustomersPage() {
  useDocumentTitle("Customers");

  const [query, setQuery] = useState("");
  const [zipFilter, setZipFilter] = useState("");
  const [orderCountFilter, setOrderCountFilter] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>("U001");
  const [selected, setSelected] = useState<SelectedOrder | null>(null);

  const zipOptions = useMemo(
    () =>
      Array.from(
        new Set(ADMIN_CUSTOMERS.map((customer) => customer.zip).filter(Boolean)),
      ).sort() as string[],
    [],
  );

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return ADMIN_CUSTOMERS.filter((customer) => {
      const matchesQuery =
        !normalized ||
        customer.id.toLowerCase().includes(normalized) ||
        `${customer.firstName} ${customer.lastName}`
          .toLowerCase()
          .includes(normalized) ||
        customer.email.toLowerCase().includes(normalized) ||
        customer.phone.includes(normalized) ||
        customer.shortLocation.toLowerCase().includes(normalized);

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
  }, [orderCountFilter, query, zipFilter]);

  const active = filtered.filter((customer) => !customer.blocked);
  const inactive = filtered.filter((customer) => customer.blocked);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-[#F5F5F3]">
      <div className="shrink-0 border-b border-[#ECECEA] bg-white px-7 pt-5 pb-4">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-[22px] font-semibold tracking-tight text-[#2E2E2E]">
            Customers
          </h1>
          <UserMenu showAvatar className="items-center" />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <div className="relative w-[220px]">
            <Search
              size={13}
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[#A9A9A9]"
            />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search ID, supplier name"
              className="h-[34px] rounded-[8px] border-[#E6E6E3] bg-white pl-8 text-[13px]"
            />
          </div>

          <Select
            value={zipFilter}
            onChange={setZipFilter}
            aria-label="By Zip Code"
            options={[
              { value: "", label: "By Zip Code" },
              ...zipOptions.map((zip) => ({ value: zip, label: zip })),
            ]}
          />

          <Select
            value={orderCountFilter}
            onChange={setOrderCountFilter}
            aria-label="All Order Counts"
            options={[
              { value: "", label: "All Order Counts" },
              { value: "1-10", label: "1–10 orders" },
              { value: "11-20", label: "11–20 orders" },
              { value: "21+", label: "21+ orders" },
            ]}
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto px-7 py-5">
        <section className="mb-6">
          <h2 className="mb-3 text-[15px] font-semibold text-[#2E2E2E]">
            Active ({active.length})
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
          <h2 className="mb-3 text-[15px] font-semibold text-[#2E2E2E]">
            Inactive ({inactive.length})
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
  );
}

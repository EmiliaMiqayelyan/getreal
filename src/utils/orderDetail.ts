import {
  centsToDollars,
  orderModelId,
  type ApiOrder,
  type ApiOrderItem,
} from "@/lib/api";
import { publicCode } from "@/utils/entityIds";

export type OrderDetailItem = {
  name: string;
  qty: number;
  unit: string;
  unitPrice: number;
};

/** Fields the order detail side panel renders. */
export type OrderDetail = {
  id: string;
  customerName: string;
  orderDate: string;
  deliveryDate: string;
  items: OrderDetailItem[];
  total: number;
  packerAssigned?: string;
  coolerIds?: string[];
  address: string;
  apt: string;
  city: string;
  state: string;
  zip: string;
};

export function currency(value: number) {
  return `$${value.toFixed(2)}`;
}

export function display(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : "N/A";
}

export function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function readNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

export function asRecord(value: unknown) {
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

export function formatOrderStamp(value: string) {
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

export function formatDeliveryBadge(value: string) {
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

export function orderLineItems(order: ApiOrder): OrderDetailItem[] {
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

export function orderTotalDollars(order: ApiOrder, lines: OrderDetailItem[]) {
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

export function readOrderCustomer(order: ApiOrder) {
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

/** Panel fields from GET /orders/:id. Callers fill in `packerAssigned`. */
export function orderDetailFromApi(
  order: ApiOrder,
  fallbackId: string,
): OrderDetail {
  const lines = orderLineItems(order);
  const customer = readOrderCustomer(order);
  return {
    id: orderModelId(order, fallbackId),
    customerName: customer.name,
    orderDate: order.createdAt ? formatOrderStamp(order.createdAt) : "",
    deliveryDate: order.deliveryDate
      ? formatDeliveryBadge(order.deliveryDate)
      : "",
    items: lines,
    total: orderTotalDollars(order, lines),
    coolerIds: order.coolerId ? [order.coolerId] : undefined,
    address: customer.address,
    apt: customer.apt,
    city: customer.city,
    state: customer.state,
    zip: customer.zip,
  };
}

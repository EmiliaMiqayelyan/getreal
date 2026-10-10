import type { Distributor } from "@/types/distributor";
import type { Item } from "@/types/item";
import type { ProductForSale } from "@/types/productForSale";
import type {
  DeliveredOrder,
  DeliveredOrderStatus,
  PlacedOrder,
} from "@/types/distributorOrder";
import { collectPaginated, ordersApi } from "@/lib/api";
import { formatApiError } from "@/lib/api/errors";
import { centsToDollars, orderModelId, orderRecordId } from "@/lib/api/mappers";
import type { ApiOrder, ApiOrderItem } from "@/lib/api/types";
import { isUuid } from "@/utils/entityIds";
import {
  deliveryDateIdFromValue,
  deliveryWeekId,
  formatExpectedDelivery,
  shiftDateId,
  toDeliveryDateId,
  upcomingWednesday,
} from "@/utils/deliveryCalendar";
import { formatOrderTimestamp } from "@/utils/distributorOrdersPage";
import {
  aggregateDemandDayIds,
  aggregateDemandHasItems,
  mapAggregateDemand,
  mergeDemandByDate,
  type DemandOrder,
} from "@/lib/distributorOrderWorkflow";

/** Delivered orders are fetched newest first, one server page at a time. */
export const DELIVERED_PAGE_SIZE = 100;

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function parseOrderDate(value: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return new Date(`${value}T12:00:00`);
  return new Date(value);
}

function findDistributor(order: ApiOrder, distributors: Distributor[]) {
  return distributors.find(
    (entry) =>
      entry.recordId === order.distributorId ||
      entry.id === order.distributorId,
  );
}

function readDistributorName(order: ApiOrder, distributors: Distributor[]) {
  const raw = order as ApiOrder & Record<string, unknown>;
  const direct = readString(raw.distributorName);
  if (direct) return direct;
  const nested = raw.distributor;
  if (typeof nested === "string" && nested.trim() && !isUuid(nested)) {
    return nested.trim();
  }
  if (nested && typeof nested === "object" && "name" in nested) {
    const name = readString((nested as { name?: unknown }).name);
    if (name) return name;
  }
  return findDistributor(order, distributors)?.name || "Distributor";
}

function readZip(order: ApiOrder, distributors: Distributor[]) {
  const raw = order as ApiOrder & Record<string, unknown>;
  const direct = [raw.zipCode, raw.zip, raw.distributorZip].find(
    (value) => typeof value === "string" && value.trim(),
  );
  if (typeof direct === "string" && direct.trim()) return direct.trim();
  const nested = raw.distributor;
  if (nested && typeof nested === "object" && "zipCode" in nested) {
    const zip = readString((nested as { zipCode?: unknown }).zipCode);
    if (zip) return zip;
  }
  return findDistributor(order, distributors)?.zip?.trim() || "";
}

function lineSource(line: ApiOrderItem) {
  const raw = line as ApiOrderItem & Record<string, unknown>;
  if (typeof raw.source === "string" && raw.source.trim()) return raw.source.trim();
  if (raw.source && typeof raw.source === "object" && "name" in raw.source) {
    const name = readString((raw.source as { name?: unknown }).name);
    if (name) return name;
  }
  return readString(raw.sourceName);
}

function lineSku(line: ApiOrderItem) {
  const raw = line as ApiOrderItem & Record<string, unknown>;
  return (
    readString(raw.itemCode) ||
    readString(raw.sku) ||
    readString(raw.productCode) ||
    "—"
  );
}

function linePrice(line: ApiOrderItem) {
  const raw = line as ApiOrderItem & Record<string, unknown>;
  const cents = line.price ?? raw.unitPrice ?? raw.buyingPrice;
  if (typeof cents === "number" && Number.isFinite(cents)) {
    return centsToDollars(cents);
  }
  if (typeof cents === "string" && cents.trim() !== "") {
    const parsed = Number(cents);
    if (Number.isFinite(parsed)) return centsToDollars(parsed);
  }
  return 0;
}

export function mapApiDistributorOrder(
  order: ApiOrder,
  distributors: Distributor[],
  index: number,
): PlacedOrder {
  const rawLines =
    order.items ??
    (order as ApiOrder & { orderItems?: unknown }).orderItems;
  const lines = Array.isArray(rawLines) ? rawLines : [];
  const items = lines.map((line) => ({
    sku: lineSku(line),
    itemName: readString(line.itemName) || readString(line.name) || "Item",
    source: lineSource(line),
    quantity: Number(line.quantity) || 0,
    price: linePrice(line),
    unit: readString(line.unit),
  }));
  const computed = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  const when = readString(order.deliveryDate);
  const created = readString(order.createdAt);
  const deliveryDate = when ? parseOrderDate(when) : null;
  const createdDate = created ? parseOrderDate(created) : null;

  return {
    id: orderRecordId(order) || orderModelId(order, `dist-${index + 1}`),
    recordId: orderRecordId(order),
    deliveryId:
      readString((order as ApiOrder & { deliveryCode?: string }).deliveryCode) ||
      orderModelId(order, `dist-${index + 1}`),
    distributor: readDistributorName(order, distributors),
    orderDate:
      createdDate && !Number.isNaN(createdDate.getTime())
        ? formatOrderTimestamp(createdDate)
        : "",
    deliveryDate:
      deliveryDate && !Number.isNaN(deliveryDate.getTime())
        ? formatExpectedDelivery(deliveryDate)
        : "",
    deliveryDateId: deliveryDateIdFromValue(when),
    totalPrice:
      order.totalPrice == null ? computed : centsToDollars(order.totalPrice),
    items,
  };
}

function weekAndDay(value: string) {
  const date = value ? parseOrderDate(value) : null;
  if (!date || Number.isNaN(date.getTime())) {
    return { week: "N/A", day: value || "N/A", timestamp: 0 };
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
  return { week, day, timestamp: date.getTime() };
}

function deliveredStatus(order: ApiOrder): DeliveredOrderStatus {
  return (order.status ?? "").trim().toLowerCase() === "partial"
    ? "Partial"
    : "Delivered";
}

export function mapApiDistributorDelivered(
  order: ApiOrder,
  distributors: Distributor[],
  index: number,
): DeliveredOrder {
  const placed = mapApiDistributorOrder(order, distributors, index);
  const stamp =
    order.deliveryDate?.trim() ||
    order.receivedAt?.trim() ||
    order.updatedAt?.trim() ||
    order.createdAt?.trim() ||
    "";
  const grouped = weekAndDay(stamp);
  return {
    ...placed,
    week: grouped.week,
    day: grouped.day,
    zipCode: readZip(order, distributors),
    status: deliveredStatus(order),
    sortTimestamp: grouped.timestamp,
  };
}

/**
 * In Progress is GET /orders?type=distributor&active=true. Distributor orders
 * only move requested → on_route → delivered, and `active` covers the first two.
 */
function loadOpenDistributorOrders(fresh: boolean) {
  return collectPaginated((page, limit) =>
    ordersApi.list({ page, limit, type: "distributor", active: true, fresh }),
  );
}

/** One page of GET /orders?type=distributor&status=delivered, newest first. */
export async function loadDeliveredDistributorOrders(
  distributors: Distributor[],
  page: number,
  options?: { fresh?: boolean },
): Promise<{ orders: DeliveredOrder[]; hasMore: boolean }> {
  const result = await ordersApi.list({
    page,
    limit: DELIVERED_PAGE_SIZE,
    type: "distributor",
    status: "delivered",
    fresh: options?.fresh,
  });
  const offset = (page - 1) * DELIVERED_PAGE_SIZE;
  return {
    orders: result.items.map((order, index) =>
      mapApiDistributorDelivered(order, distributors, offset + index),
    ),
    hasMore:
      result.items.length > 0 && offset + result.items.length < result.total,
  };
}

/** Every delivered distributor order, for "Export all". */
export async function loadAllDeliveredDistributorOrders(
  distributors: Distributor[],
): Promise<DeliveredOrder[]> {
  const listed = await collectPaginated((page, limit) =>
    ordersApi.list({
      page,
      limit,
      type: "distributor",
      status: "delivered",
      fresh: true,
    }),
  );
  return listed.map((order, index) =>
    mapApiDistributorDelivered(order, distributors, index),
  );
}

/** Keep a just-created distributor order in In Progress even if the list lags. */
export function mergeCreatedDistributorOrder(
  orders: PlacedOrder[],
  created: ApiOrder,
  distributors: Distributor[],
  deliveryDate?: string,
): { orders: PlacedOrder[]; placed: PlacedOrder } {
  const mapped = mapApiDistributorOrder(
    {
      ...created,
      type: created.type?.trim() || "distributor",
      deliveryDate: created.deliveryDate?.trim() || deliveryDate,
    },
    distributors,
    0,
  );
  const existing = orders.find(
    (order) =>
      (mapped.recordId && order.recordId === mapped.recordId) ||
      order.id === mapped.id,
  );
  if (existing) return { orders, placed: existing };
  return { orders: [mapped, ...orders], placed: mapped };
}

type DemandCatalog = { products: ProductForSale[]; items: Item[] };

/**
 * Without `deliveryDate` the endpoint sums every customer order ever placed,
 * so each day is requested on its own and filed under its Wednesday chip.
 */
async function loadDemandForDays(
  input: DemandCatalog,
  dayIds: string[],
): Promise<DemandOrder[]> {
  const payloads = await Promise.all(
    dayIds.map((dayId) => ordersApi.aggregateDemand(dayId)),
  );
  return mergeDemandByDate(
    payloads.flatMap((payload, index) =>
      aggregateDemandHasItems(payload)
        ? mapAggregateDemand({
            demand: payload,
            products: input.products,
            items: input.items,
            assignDateId: deliveryWeekId(dayIds[index]),
          }).orders
        : [],
    ),
  );
}

/**
 * Fresh Order List lines for one Wednesday chip: the chip's own day plus any
 * other day in that week listed in `knownDayIds` (from the screen load).
 * The dateless aggregate-demand sums every order ever, so it is not re-sent here.
 */
export async function loadDemandForWeek(
  input: DemandCatalog,
  weekId: string,
  knownDayIds: string[] = [],
): Promise<DemandOrder[]> {
  const days = [
    ...new Set([
      weekId,
      ...knownDayIds.filter((dayId) => deliveryWeekId(dayId) === weekId),
    ]),
  ].sort();
  return loadDemandForDays(input, days);
}

export async function loadDistributorOrderScreen(
  input: {
    distributors: Distributor[];
    products: ProductForSale[];
    items: Item[];
  },
  options?: { fresh?: boolean },
): Promise<{
  demand: DemandOrder[];
  demandDateIds: string[];
  /** Every day with customer orders, as listed by aggregate-demand. */
  demandDayIds: string[];
  demandError: string | null;
  inProgress: PlacedOrder[];
}> {
  const fresh = options?.fresh ?? false;
  const [demandResult, openOrders] = await Promise.all([
    ordersApi.aggregateDemand().then(
      (demand) => ({ demand, error: null as string | null }),
      (error: unknown) => ({
        demand: { dates: [], distributors: [] },
        error: formatApiError(error, "Failed to load order demand."),
      }),
    ),
    loadOpenDistributorOrders(fresh).catch(() => [] as ApiOrder[]),
  ]);

  // Older weeks load when their chip is opened.
  const firstWeekId = shiftDateId(toDeliveryDateId(upcomingWednesday()), -7);
  const demandDayIds = aggregateDemandDayIds(demandResult.demand);
  const days = demandDayIds.filter(
    (dayId) => deliveryWeekId(dayId) >= firstWeekId,
  );
  let demand: DemandOrder[] = [];
  let demandError = demandResult.error;
  if (!demandError && days.length > 0) {
    try {
      demand = await loadDemandForDays(input, days);
    } catch (error) {
      demandError = formatApiError(error, "Failed to load order demand.");
    }
  }
  const demandDateIds = [
    ...new Set(days.map((dayId) => deliveryWeekId(dayId))),
  ];
  const inProgress = openOrders.map((order, index) =>
    mapApiDistributorOrder(order, input.distributors, index),
  );

  return {
    demand,
    demandDateIds,
    demandDayIds,
    demandError,
    inProgress,
  };
}

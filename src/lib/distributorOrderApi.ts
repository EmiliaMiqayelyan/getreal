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
  formatExpectedDelivery,
} from "@/utils/deliveryCalendar";
import { formatOrderTimestamp } from "@/utils/distributorOrdersPage";
import {
  aggregateDemandHasItems,
  aggregateDemandItemKeys,
  mapAggregateDemand,
  type DemandOrder,
} from "@/lib/distributorOrderWorkflow";

const HIDDEN_STATUSES = new Set(["cancelled", "canceled", "archived"]);
const DELIVERED_STATUSES = new Set(["delivered", "partial", "received"]);

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function parseOrderDate(value: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return new Date(`${value}T12:00:00`);
  return new Date(value);
}

function isDistributorOrder(order: ApiOrder) {
  const type = (order.type ?? "").trim().toLowerCase();
  if (!type) return true;
  return type === "distributor" || type === "distributor_order";
}

function orderBucket(order: ApiOrder): "hidden" | "delivered" | "progress" {
  const status = (order.status ?? "").trim().toLowerCase();
  if (HIDDEN_STATUSES.has(status)) return "hidden";
  if (
    DELIVERED_STATUSES.has(status) ||
    Boolean(order.receivedAt) ||
    Boolean(order.validatedAt)
  ) {
    return "delivered";
  }
  return "progress";
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
  const items = (order.items ?? []).map((line) => ({
    sku: lineSku(line),
    itemName: line.itemName?.trim() || line.name?.trim() || "Item",
    source: lineSource(line),
    quantity: Number(line.quantity) || 0,
    price: linePrice(line),
    unit: line.unit?.trim() || "",
  }));
  const computed = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  const when = order.deliveryDate?.trim() || "";
  const created = order.createdAt?.trim() || "";
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
    deliveryDateId: deliveryDateIdFromValue(order.deliveryDate),
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

export async function loadDistributorOrderScreen(input: {
  distributors: Distributor[];
  products: ProductForSale[];
  items: Item[];
}): Promise<{
  demand: DemandOrder[];
  demandDateIds: string[];
  demandError: string | null;
  inProgress: PlacedOrder[];
  delivered: DeliveredOrder[];
}> {
  const [demandResult, remote] = await Promise.all([
    ordersApi.aggregateDemand().then(
      (demand) => ({ demand, error: null as string | null }),
      (error: unknown) => ({
        demand: { dates: [], distributors: [] },
        error: formatApiError(error, "Failed to load order demand."),
      }),
    ),
    collectPaginated((page, limit) =>
      ordersApi.list({ page, limit, type: "distributor" }),
    ),
  ]);

  const summary = mapAggregateDemand({
    demand: demandResult.demand,
    products: input.products,
    items: input.items,
  });
  const summaryDates = summary.dateIds;
  let demand = summary.orders;
  // A calendar day does not match a stored timestamp, so a per-date call can
  // come back with no lines and used to replace the list that had the order.
  if (!demandResult.error && summaryDates.length > 1) {
    const filtered = await Promise.all(
      summaryDates.map((dateId) =>
        ordersApi.aggregateDemand(dateId).catch(() => null),
      ),
    );
    const summaryKeys = new Set(aggregateDemandItemKeys(demandResult.demand));
    const splitKeys = new Set<string>();
    const split = summaryDates.flatMap((dateId, index) => {
      const payload = filtered[index];
      if (!payload || !aggregateDemandHasItems(payload)) return [];
      const keys = aggregateDemandItemKeys(payload);
      const sameAsSummary =
        keys.length === summaryKeys.size &&
        keys.every((key) => summaryKeys.has(key));
      if (sameAsSummary) return [];
      for (const key of keys) splitKeys.add(key);
      return mapAggregateDemand({
        demand: payload,
        products: input.products,
        items: input.items,
        assignDateId: dateId,
      }).orders;
    });
    const coversSummary = [...summaryKeys].every((key) => splitKeys.has(key));
    if (split.length > 0 && coversSummary) demand = split;
  }
  const demandDateIds = summaryDates.length
    ? summaryDates
    : demand.map((order) => order.deliveryDateId);
  const inProgress: PlacedOrder[] = [];
  const delivered: DeliveredOrder[] = [];

  remote.forEach((order, index) => {
    if (!isDistributorOrder(order)) return;
    const bucket = orderBucket(order);
    if (bucket === "hidden") return;
    if (bucket === "delivered") {
      delivered.push(mapApiDistributorDelivered(order, input.distributors, index));
      return;
    }
    inProgress.push(mapApiDistributorOrder(order, input.distributors, index));
  });

  return {
    demand,
    demandDateIds,
    demandError: demandResult.error,
    inProgress,
    delivered,
  };
}

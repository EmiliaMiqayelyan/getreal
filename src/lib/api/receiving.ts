import { apiRequest } from "./client";
import { normalizeNamedList } from "./normalize";

export type ApiDeliveryLine = {
  id?: string;
  orderId?: string;
  productId?: string;
  itemId?: string;
  itemCode?: string;
  name?: string;
  itemName?: string;
  category?: string;
  categoryName?: string;
  quantity?: number;
  unit?: string;
  source?: string;
  sourceName?: string;
  /** Integer cents on the live API. */
  unitPrice?: number;
  /** Integer cents on the live API. */
  price?: number;
  cost?: number;
  product?: {
    id?: string;
    name?: string;
    itemId?: string;
    unit?: string;
    singleItemUnit?: string;
    item?: { id?: string } | null;
  } | null;
  /**
   * Saved by POST /receiving/:orderId/validate.
   * GET /receiving/deliveries returns these on each line.
   */
  status?: string | null;
  reasons?: string[] | null;
  evidenceUrls?: string[] | null;
  expirationDate?: string | null;
};

export type ApiDelivery = {
  id?: string;
  name?: string;
  orderCode?: string;
  code?: string;
  deliveryCode?: string;
  distributorId?: string;
  distributorName?: string;
  distributor?: { id?: string; name?: string; zipCode?: string } | string;
  deliveryDate?: string;
  status?: string;
  validatedAt?: string | null;
  receivedAt?: string | null;
  /** Integer cents on the live API. */
  totalPrice?: number;
  items?: ApiDeliveryLine[];
  createdAt?: string;
  updatedAt?: string;
};

/** Live GET /receiving/deliveries wraps orders under `{ date, orders }`. */
export type ApiDeliveryGroup = {
  date?: string;
  orders?: ApiDelivery[];
};

export type ReceivingRejectReason =
  | "Wrong Item"
  | "Damaged"
  | "Not Fresh"
  | "Missing Exp Date";

export type ValidateDeliveryItem = {
  productId: string;
  status: "accepted" | "rejected";
  /** ISO-8601. Saved on the line and copied onto the warehouse inventory row. */
  expirationDate?: string;
  /** Required (at least one) when rejected. */
  reasons?: ReceivingRejectReason[];
  /** Required (1–3 http(s) URLs) when rejected. */
  evidenceUrls?: string[];
};

function isDeliveryGroup(value: unknown): value is ApiDeliveryGroup {
  if (!value || typeof value !== "object") return false;
  const record = value as ApiDeliveryGroup & { id?: string };
  return Array.isArray(record.orders) && !record.id;
}

/**
 * GET /receiving/deliveries returns `{ data: [{ date, orders }] }`.
 * Older payloads may be a flat order list. Both become one order per row.
 */
export function flattenDeliveries(payload: unknown): ApiDelivery[] {
  const rows = normalizeNamedList<ApiDelivery | ApiDeliveryGroup>(payload, [
    "deliveries",
    "orders",
    "items",
    "data",
    "results",
  ]);
  const orders: ApiDelivery[] = [];
  for (const row of rows) {
    if (isDeliveryGroup(row)) {
      const groupDate = row.date?.trim();
      for (const order of row.orders ?? []) {
        orders.push({
          ...order,
          deliveryDate: order.deliveryDate || groupDate,
        });
      }
      continue;
    }
    orders.push(row);
  }
  return orders;
}

export const receivingApi = {
  listDeliveries() {
    return apiRequest<unknown>("/receiving/deliveries").then(flattenDeliveries);
  },

  /**
   * POST /receiving/:orderId/validate
   * Every order line must be included. Saves status, reasons, evidenceUrls,
   * and expirationDate, marks the order delivered, and stocks accepted lines.
   */
  validate(orderId: string, items: ValidateDeliveryItem[]) {
    return apiRequest<unknown>(`/receiving/${orderId}/validate`, {
      method: "POST",
      body: JSON.stringify({
        items: items.map((item) => ({
          productId: item.productId,
          status: item.status,
          ...(item.expirationDate ? { expirationDate: item.expirationDate } : {}),
          ...(item.reasons?.length ? { reasons: item.reasons } : {}),
          ...(item.evidenceUrls?.length
            ? { evidenceUrls: item.evidenceUrls.slice(0, 3) }
            : {}),
        })),
      }),
    });
  },
};

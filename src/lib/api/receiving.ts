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
    item?: { id?: string } | null;
  } | null;
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

export type ValidateDeliveryItem = {
  productId: string;
  status: "accepted" | "rejected";
  /** ISO-8601. Saved on the line and copied onto the warehouse inventory row. */
  expirationDate?: string;
  reason?: string;
  evidenceUrl?: string;
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
   * Saves each line (status, reason, evidenceUrl, expirationDate) and creates
   * inventory at the default Warehouse location for accepted lines.
   * `evidenceUrl` must be an http(s) URL when sent.
   */
  validate(orderId: string, items: ValidateDeliveryItem[]) {
    return apiRequest<unknown>(`/receiving/${orderId}/validate`, {
      method: "POST",
      body: JSON.stringify({
        items: items.map((item) => ({
          productId: item.productId,
          status: item.status,
          ...(item.expirationDate ? { expirationDate: item.expirationDate } : {}),
          ...(item.reason ? { reason: item.reason } : {}),
          ...(item.evidenceUrl ? { evidenceUrl: item.evidenceUrl } : {}),
        })),
      }),
    });
  },
};

import { apiRequest } from "./client";
import { normalizeNamedList } from "./normalize";

export type ApiDeliveryLine = {
  id?: string;
  productId?: string;
  itemId?: string;
  name?: string;
  itemName?: string;
  category?: string;
  quantity?: number;
  unit?: string;
  source?: string;
  sourceName?: string;
  unitPrice?: number;
  price?: number;
};

export type ApiDelivery = {
  id?: string;
  name?: string;
  orderCode?: string;
  code?: string;
  distributorId?: string;
  distributorName?: string;
  distributor?: { id?: string; name?: string } | string;
  deliveryDate?: string;
  status?: string;
  validatedAt?: string | null;
  receivedAt?: string | null;
  totalPrice?: number;
  items?: ApiDeliveryLine[];
  createdAt?: string;
  updatedAt?: string;
};

export const receivingApi = {
  listDeliveries() {
    return apiRequest<unknown>("/receiving/deliveries").then((payload) =>
      normalizeNamedList<ApiDelivery>(payload, [
        "deliveries",
        "orders",
        "items",
        "data",
        "results",
      ]),
    );
  },

  /** Validate body is not documented. Send no JSON body. */
  validate(orderId: string) {
    return apiRequest<unknown>(`/receiving/${orderId}/validate`, {
      method: "POST",
    });
  },
};

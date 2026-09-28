import type { Item } from "@/types/item";
import type { ReceivingHandoffLine, ReceivingHandoffOrder } from "@/types/receiving";
import {
  catalogItemUuid,
  findCatalogItem,
  parentCategory,
} from "@/utils/inventoryView";

export function formatReceivedAt(date = new Date()) {
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).replace(",", " ·");
}

export function acceptedLinesOnly(order: ReceivingHandoffOrder): ReceivingHandoffOrder {
  return {
    ...order,
    items: order.items.filter((item) => item.status === "accepted"),
  };
}

export function formatExpirationLabel(iso: string) {
  if (!iso) return "";
  const date = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export type StockHandoffSection = {
  id: string;
  group: string;
  title: string;
  items: StockHandoffItem[];
};

export type StockHandoffItem = {
  id: string;
  orderId: string;
  deliveryId: string;
  /** Catalog item UUID for POST /inventory. */
  catalogItemId: string;
  itemName: string;
  source: string;
  qty: number;
  unit: string;
  purchased: string;
  qtyAfterUnpack: string;
  expDate: string;
  expirationIso: string;
  location: string;
  splits: Array<{ qty: number; location: string }>;
};

/** Build Inventory Stock Items sections from accepted receiving lines. */
export function handoffToStockSections(
  deliveryId: string,
  items: ReceivingHandoffLine[],
  catalog: Item[] = [],
): StockHandoffSection[] {
  const sections = new Map<string, StockHandoffSection>();

  for (const item of items) {
    if (item.status !== "accepted") continue;
    const linked = findCatalogItem(catalog, item.catalogItemId || item.itemId, item.itemName);
    const group = parentCategory(linked?.category || item.category || "");
    const title = linked?.subcategory?.trim() || item.category?.trim() || group;
    const id = `${group}::${title}`;
    const section = sections.get(id) ?? {
      id,
      group,
      title,
      items: [],
    };
    const preservedUnpack = item.qtyAfterUnpack?.trim();
    section.items.push({
      id: item.lineId.includes("-stock") ? item.lineId : `${item.lineId}-stock`,
      orderId: item.itemId,
      deliveryId,
      catalogItemId: catalogItemUuid(linked, item.catalogItemId || item.itemId),
      itemName: linked?.merchandisingName?.trim() || item.itemName,
      source: item.source || linked?.source || "",
      qty: item.quantity,
      unit: item.unit,
      purchased: item.priceLabel,
      qtyAfterUnpack: preservedUnpack ?? "0",
      expDate: formatExpirationLabel(item.expiration),
      expirationIso: item.expiration,
      location: item.location?.trim() ?? "",
      splits: item.splits ?? [],
    });
    sections.set(id, section);
  }

  return [...sections.values()];
}

export function printItemLabel(params: {
  itemName: string;
  itemId: string;
  deliveryId: string;
  distributor: string;
  expiration?: string;
}) {
  const exp = params.expiration
    ? formatExpirationLabel(params.expiration)
    : "—";
  const html = `<!doctype html>
<html>
<head>
  <title>Print Label · ${params.itemId}</title>
  <style>
    body { font-family: system-ui, sans-serif; padding: 24px; color: #111; }
    h1 { font-size: 18px; margin: 0 0 12px; }
    .row { margin: 6px 0; font-size: 13px; }
    .label { color: #666; font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; }
  </style>
</head>
<body>
  <h1>${params.itemName}</h1>
  <div class="row"><div class="label">Item / Order ID</div>${params.itemId}</div>
  <div class="row"><div class="label">Delivery ID</div>${params.deliveryId}</div>
  <div class="row"><div class="label">Distributor</div>${params.distributor}</div>
  <div class="row"><div class="label">Expiration</div>${exp}</div>
  <script>window.onload = () => { window.print(); };</script>
</body>
</html>`;

  const popup = window.open("", "_blank", "noopener,noreferrer,width=420,height=480");
  if (!popup) return;
  popup.document.write(html);
  popup.document.close();
}

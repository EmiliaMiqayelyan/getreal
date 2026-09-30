import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus,
} from "lucide-react";

import { CreateManualOrderFlow } from "@/components/orders/CreateManualOrderFlow";
import { DeliveryDateCalendar } from "@/components/orders/DeliveryDateCalendar";
import { Header } from "@/components/layout/AdminHeader";
import { UserMenu } from "@/components/layout/UserMenu";
import {
  DateNavButton,
  CalendarIcon,
  DATE_NAV_GROUP,
} from "@/components/shared/DateNavButton";
import {
  DeliveryDateChip,
  DATE_CHIP_ROW,
  DATE_CHIP_SCROLL,
} from "@/components/shared/DeliveryDateChip";
import { ExportButton } from "@/components/shared/ExportButton";
import { IdPill } from "@/components/ui/Badge";
import { AppLoader } from "@/components/ui/AppLoader";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { SearchField } from "@/components/ui/SearchField";
import { ScrollTable } from "@/components/ui/ScrollTable";
import { Select } from "@/components/ui/Select";
import { Tabs } from "@/components/ui/Tabs";
import {
  DELIVERED_ORDERS,
  DELIVERED_SORT_OPTIONS,
  DELIVERED_ORDER_STATUSES,
  DISTRIBUTOR_EMAILS,
  ORDER_CATEGORIES,
  ORDER_DEMAND_BY_DATE,
  ORDER_LIST_ITEMS,
} from "@/constants/distributorOrders";
import { PINNED_HEADER, TABLE_HEADER } from "@/constants/table";
import { useAppCatalog } from "@/context/AppCatalogContext";
import { useApiFeedback } from "@/hooks/useApiFeedback";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useLazyWindow } from "@/hooks/useLazyWindow";
import { InfiniteScrollSentinel } from "@/components/ui/InfiniteScrollSentinel";
import { DEFAULT_PAGE_LIMIT } from "@/constants/pagination";
import {
  collectPaginated,
  isApiConfigured,
  orderModelId,
  orderRecordId,
  ordersApi,
  type ApiOrder,
} from "@/lib/api";
import {
  syncManualDistributorOrder,
  syncReviewGroupOrder,
} from "@/lib/api/orderSync";
import type { Distributor } from "@/types/distributor";
import type {
  DeliveredOrder,
  ManualOrderDraft,
  OrderCategory,
  PlacedOrder,
  ReviewGroup,
  WorkingOrderRow,
} from "@/types/distributorOrder";
import type { ProductForSale } from "@/types/productForSale";
import type { ExportRequest } from "@/types/export";
import { cn } from "@/utils/cn";
import { exportFilename } from "@/utils/csvExport";
import { findByEntityRef, publicCode } from "@/utils/entityIds";
import {
  appendInProgressOrders,
  applyCalculatedQuantitiesForCategory,
  createPlacedOrderFromManualDraft,
  createPlacedOrderFromReviewGroup,
  type DeliveredFilterCriteria,
  downloadOrderInvoice,
  filterDeliveredOrders,
  filterOrderDemandRows,
  getDeliveredEmptyMessage,
  getOrderDemandCountForDate,
  getOrderDemandEmptyMessage,
  getOrderDemandForDate,
  groupDeliveredOrders,
  downloadDeliveredOrdersCsv,
  downloadDistributorOrdersCsv,
  makeWorkingRowsForDate,
  nextDeliveryId,
  productFilterOptions,
  sortDeliveredOrders,
  uniqueDeliveredFieldValues,
} from "@/utils/distributorOrdersPage";
import {
  formatDeliveryChipLabel,
  deliveryDateIdFromValue,
  formatExpectedDelivery,
  getDeliveryDatesInRange,
  getDeliveryWeekdayIndices,
  parseDeliveryDateId,
  startOfLocalDay,
  toDeliveryDateId,
} from "@/utils/deliveryCalendar";

const LINK = "text-[13px] font-medium text-[#3B7DC4] hover:underline";
const REVIEW_LINE_GRID =
  "grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_4.5rem_6rem_7rem] items-center gap-x-8";
const CHIP_WINDOW_SIZE = 3;
/** Shared prep-table tracks so QTY Needed steppers stay column-aligned across rows. */
const ORDER_PREP_COLS =
  "grid-cols-[minmax(0,1.3fr)_minmax(0,1.5fr)_minmax(0,0.85fr)_minmax(0,0.85fr)_minmax(0,0.95fr)_minmax(0,0.7fr)_120px]";
const PLACED_ORDER_COLUMNS =
  "grid grid-cols-[28px_112px_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,0.9fr)_minmax(0,1fr)_minmax(0,1fr)_100px] items-center gap-x-4 px-4";
const PREVIEW_COLUMNS =
  "grid grid-cols-[minmax(0,2fr)_minmax(0,1.1fr)_minmax(0,0.8fr)_minmax(0,1.2fr)_minmax(0,1.3fr)] items-center gap-x-4 px-4";

type View = "list" | "orderList" | "review" | "manual";
type Tab = "Orders" | "Delivered";

function money(value: number) {
  if (Number.isInteger(value)) return `$${value}`;
  return `$${value.toFixed(2).replace(/0$/, "").replace(/\.$/, "")}`;
}

function mapDistributorApiOrder(
  order: ApiOrder,
  index: number,
  catalogs: { distributors: Distributor[]; products: ProductForSale[] },
  page = 1,
): PlacedOrder {
  const distributorName =
    findByEntityRef(catalogs.distributors, order.distributorId)?.name ??
    order.distributorId ??
    "Distributor";
  const lines = (order.items ?? []).map((line) => {
    const product = findByEntityRef(catalogs.products, line.productId);
    return {
      sku: product
        ? (publicCode(product.id) ?? product.id)
        : (publicCode(line.productId) ?? ""),
      itemName: product?.merchandisingName ?? line.productId ?? "Item",
      source: product?.source ?? "",
      quantity: line.quantity ?? 0,
      price: product?.salesPrice ?? 0,
      unit: product?.unitOfSales ?? "Each",
    };
  });
  const totalPrice = lines.reduce(
    (sum, line) => sum + line.price * line.quantity,
    0,
  );
  const orderCode = orderModelId(order, `API-DO-${page}-${index + 1}`);
  const deliveryDateId = deliveryDateIdFromValue(order.deliveryDate);
  const deliveryDay = parseDeliveryDateId(deliveryDateId);
  return {
    id: orderCode,
    recordId: orderRecordId(order),
    deliveryId: orderCode,
    distributor: distributorName,
    orderDate: order.createdAt
      ? new Date(order.createdAt).toLocaleDateString()
      : "",
    deliveryDate: deliveryDay ? deliveryDay.toLocaleDateString("en-US") : "",
    deliveryDateId,
    totalPrice,
    items: lines,
  };
}

function placedOrderDateId(order: PlacedOrder) {
  return order.deliveryDateId || deliveryDateIdFromValue(order.deliveryDate);
}

function weekOfLabel(date: Date) {
  const start = new Date(date);
  const weekday = start.getDay();
  const mondayOffset = weekday === 0 ? -6 : 1 - weekday;
  start.setDate(start.getDate() + mondayOffset);
  return `Week of ${start.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })}`;
}

function mapDeliveredApiOrder(
  order: ApiOrder,
  index: number,
  catalogs: { distributors: Distributor[]; products: ProductForSale[] },
): DeliveredOrder {
  const placed = mapDistributorApiOrder(order, index, catalogs);
  const when = order.deliveryDate || order.updatedAt || order.createdAt || "";
  const date = when ? new Date(when) : new Date();
  const valid = !Number.isNaN(date.getTime());
  const distributor = catalogs.distributors.find(
    (entry) =>
      entry.id === order.distributorId ||
      entry.recordId === order.distributorId,
  );
  return {
    ...placed,
    week: valid ? weekOfLabel(date) : "Delivered",
    day: valid
      ? date.toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
        })
      : "—",
    zipCode: distributor?.zip || "",
    status: "Delivered",
    sortTimestamp: valid ? date.getTime() : 0,
  };
}

function filterPlacedOrders(
  orders: PlacedOrder[],
  criteria: {
    search: string;
    productFilter: string;
    distributorFilter: string;
    deliveryDateId?: string;
  },
) {
  const q = criteria.search.trim().toLowerCase();
  const seen = new Set<string>();
  return orders.filter((order) => {
    if (seen.has(order.id)) return false;
    seen.add(order.id);
    if (
      criteria.deliveryDateId &&
      placedOrderDateId(order) !== criteria.deliveryDateId
    ) {
      return false;
    }
    if (
      criteria.distributorFilter &&
      order.distributor !== criteria.distributorFilter
    ) {
      return false;
    }
    if (
      criteria.productFilter &&
      !order.items.some((item) => item.itemName === criteria.productFilter)
    ) {
      return false;
    }
    if (!q) return true;
    return (
      order.distributor.toLowerCase().includes(q) ||
      order.deliveryId.includes(q) ||
      order.items.some((item) => item.itemName.toLowerCase().includes(q))
    );
  });
}

function makeRows(dateId: string): WorkingOrderRow[] {
  return makeWorkingRowsForDate(dateId);
}

function buildReview(rows: WorkingOrderRow[]): ReviewGroup[] {
  const map = new Map<string, ReviewGroup>();

  for (const row of rows) {
    if (row.quantity <= 0) continue;
    const option = row.options[0];
    if (!option) continue;

    const lineTotal = option.price * row.quantity;
    const line = {
      itemName: row.itemName,
      source: option.source,
      quantity: row.quantity,
      price: option.price,
      unit: option.unit,
      lineTotal,
    };

    const existing = map.get(option.distributor);
    if (!existing) {
      map.set(option.distributor, {
        distributor: option.distributor,
        email: DISTRIBUTOR_EMAILS[option.distributor] ?? "orders@example.com",
        items: [line],
        itemCount: 1,
        totalPrice: lineTotal,
      });
      continue;
    }

    existing.items.push(line);
    existing.totalPrice += lineTotal;
  }

  return Array.from(map.values()).map((group) => ({
    ...group,
    itemCount: group.items.length,
  }));
}

function QtyStepper({
  value,
  onChange,
}: {
  value: number;
  onChange: (next: number) => void;
}) {
  return (
    <div className="flex shrink-0 items-center gap-2.5">
      <button
        type="button"
        aria-label="Decrease"
        onClick={() => onChange(Math.max(0, value - 1))}
        className="flex size-8 items-center justify-center rounded-[10px] bg-[#E8EEE9] text-[#111118] hover:bg-[#DDE6DF]"
      >
        <Minus className="size-3.5" strokeWidth={2.5} />
      </button>
      <span className="min-w-[1.25rem] text-center text-[15px] font-medium text-[#111118]">
        {value}
      </span>
      <button
        type="button"
        aria-label="Increase"
        onClick={() => onChange(value + 1)}
        className="flex size-8 items-center justify-center rounded-[10px] bg-[#E8EEE9] text-[#111118] hover:bg-[#DDE6DF]"
      >
        <Plus className="size-3.5" strokeWidth={2.5} />
      </button>
    </div>
  );
}

function ExpandableOrders({
  orders,
  expandedId,
  onToggle,
}: {
  orders: PlacedOrder[];
  expandedId: string | null;
  onToggle: (id: string) => void;
}) {
  return (
    <ScrollTable minWidth={1100}>
      <div
        className={cn(
          PLACED_ORDER_COLUMNS,
          TABLE_HEADER,
          PINNED_HEADER,
          "h-10 border-b border-[#00000014]",
        )}
      >
        <div />
        <div>Delivery ID</div>
        <div>Distributor</div>
        <div>Order Date</div>
        <div>Delivery Date</div>
        <div>Total Price</div>
        <div aria-hidden />
        <div className="text-right">Invoice</div>
      </div>
      {orders.map((order, orderIndex) => {
        const open = expandedId === order.id;
        return (
          <div key={`${order.id}-${order.deliveryId}-${orderIndex}`}>
            <div
              className={cn(
                PLACED_ORDER_COLUMNS,
                "border-b border-[#00000014] py-3",
                open && "bg-[#F7F7F5]",
              )}
            >
              <button
                type="button"
                aria-label={open ? "Collapse" : "Expand"}
                onClick={() => onToggle(order.id)}
                className="flex items-center justify-center"
              >
                <ChevronDown
                  className={cn(
                    "size-3.5 shrink-0 transition-transform",
                    open
                      ? "rotate-0 text-[#E25B5B]"
                      : "-rotate-90 text-[#6A6A6A]",
                  )}
                />
              </button>
              <div className="min-w-0 overflow-hidden">
                <IdPill>{order.deliveryId}</IdPill>
              </div>
              <div className="min-w-0 truncate text-[13px] font-semibold text-[#111118]">
                {order.distributor}
              </div>
              <div className="text-[13px] whitespace-nowrap text-[#4A4A4A]">
                {order.orderDate}
              </div>
              <div className="text-[13px] whitespace-nowrap text-[#4A4A4A]">
                {order.deliveryDate}
              </div>
              <div className="text-[13px] font-semibold whitespace-nowrap text-[#111118]">
                {money(order.totalPrice)}
              </div>
              <div aria-hidden />
              <div className="text-right">
                <button
                  type="button"
                  className={LINK}
                  aria-label={`Download invoice for ${order.distributor}`}
                  onClick={() => downloadOrderInvoice(order)}
                >
                  Download
                </button>
              </div>
            </div>
            {open
              ? order.items.map((item, itemIndex) => (
                  <div
                    key={`${order.id}-${item.sku}-${itemIndex}`}
                    className={cn(
                      PLACED_ORDER_COLUMNS,
                      "border-b border-[#00000014] bg-[#FBF9F9] py-2.5",
                    )}
                  >
                    <div />
                    <div className="min-w-0 overflow-hidden">
                      <IdPill>{item.sku}</IdPill>
                    </div>
                    <div className="min-w-0 truncate text-[13px] font-medium text-[#111118]">
                      {item.itemName}
                    </div>
                    <div className="min-w-0 truncate text-[13px] text-[#8A8A8A]">
                      {item.source || "—"}
                    </div>
                    <div className="text-[13px] font-medium whitespace-nowrap text-[#111118]">
                      {item.quantity}x
                    </div>
                    <div className="text-[13px] whitespace-nowrap text-[#111118]">
                      {money(item.price)}
                      {item.unit ? ` / ${item.unit}` : ""}
                    </div>
                    <div aria-hidden />
                    <div />
                  </div>
                ))
              : null}
          </div>
        );
      })}
    </ScrollTable>
  );
}

export default function ProductOrdersPage() {
  useDocumentTitle("Distributor Orders");
  const { distributors, products, items, isBootstrapping } = useAppCatalog();
  const { notifyApiError } = useApiFeedback();

  const [view, setView] = useState<View>("list");
  const [tab, setTab] = useState<Tab>("Orders");
  const [search, setSearch] = useState("");
  const [productFilter, setProductFilter] = useState("");
  const [distributorFilter, setDistributorFilter] = useState("");
  const [deliveredZipFilter, setDeliveredZipFilter] = useState("");
  const [deliveredDateFilter, setDeliveredDateFilter] = useState("");
  const [deliveredStatusFilter, setDeliveredStatusFilter] = useState("");
  const [deliveredSort, setDeliveredSort] = useState<
    "newest" | "oldest" | "distributor" | "total"
  >("newest");
  const [activeDeliveryDateId, setActiveDeliveryDateId] = useState(() =>
    toDeliveryDateId(new Date()),
  );
  const [chipWindowStart, setChipWindowStart] = useState(0);
  const [chipTotals, setChipTotals] = useState<Record<string, number>>({});
  const [calendarOpen, setCalendarOpen] = useState(false);

  const [inProgress, setInProgress] = useState<PlacedOrder[]>([]);
  const [deliveredOrders, setDeliveredOrders] = useState<DeliveredOrder[]>([]);
  const [loading, setLoading] = useState(() => isApiConfigured());
  const [loadingMoreOrders, setLoadingMoreOrders] = useState(false);
  const [orderPage, setOrderPage] = useState(1);
  const [remoteLoaded, setRemoteLoaded] = useState(0);
  const [remoteTotal, setRemoteTotal] = useState(0);
  const [remoteExhausted, setRemoteExhausted] = useState(false);
  const ordersLoadLock = useRef(false);
  const loadedDetailIds = useRef(new Set<string>());
  const inProgressRef = useRef(inProgress);
  const deliveredRef = useRef(deliveredOrders);
  inProgressRef.current = inProgress;
  deliveredRef.current = deliveredOrders;
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedDeliveredId, setExpandedDeliveredId] = useState<string | null>(
    null,
  );

  const [rows, setRows] = useState<WorkingOrderRow[]>(() =>
    makeRows(toDeliveryDateId(new Date())),
  );
  const [orderedDistributors, setOrderedDistributors] = useState<Set<string>>(
    () => new Set(),
  );
  const [confirmClose, setConfirmClose] = useState(false);
  const [toast, setToast] = useState(false);
  const [toastMessage, setToastMessage] = useState(
    "Orders created successfully",
  );

  const deliveryWeekdays = useMemo(
    () => getDeliveryWeekdayIndices(distributors, distributorFilter),
    [distributors, distributorFilter],
  );

  const deliveryDates = useMemo(() => {
    const weekdays =
      deliveryWeekdays.size > 0
        ? deliveryWeekdays
        : new Set([0, 1, 2, 3, 4, 5, 6]);
    const start = startOfLocalDay(new Date());
    start.setDate(start.getDate() - 90);
    const end = startOfLocalDay(new Date());
    end.setDate(end.getDate() + 180);
    return getDeliveryDatesInRange(start, end, weekdays);
  }, [deliveryWeekdays]);

  const chipDates = useMemo(() => {
    const window = deliveryDates.slice(
      chipWindowStart,
      chipWindowStart + CHIP_WINDOW_SIZE,
    );
    const selected = parseDeliveryDateId(activeDeliveryDateId);
    if (
      selected &&
      !window.some((date) => toDeliveryDateId(date) === activeDeliveryDateId)
    ) {
      return [selected, ...window];
    }
    return window;
  }, [activeDeliveryDateId, chipWindowStart, deliveryDates]);

  const visibleDeliveryChips = useMemo(() => {
    return chipDates.map((date) => {
      const id = toDeliveryDateId(date);
      return {
        id,
        label: formatDeliveryChipLabel(date),
        count: isApiConfigured()
          ? (chipTotals[id] ?? 0)
          : getOrderDemandCountForDate(id),
      };
    });
  }, [chipDates, chipTotals]);

  const activeDeliveryDate =
    parseDeliveryDateId(activeDeliveryDateId) ?? deliveryDates[0] ?? new Date();
  const activeDeliveryLabel = formatDeliveryChipLabel(activeDeliveryDate);
  const expectedDeliveryLabel = formatExpectedDelivery(activeDeliveryDate);

  const orderDemandCriteria = useMemo(
    () => ({
      query: search,
      productFilter,
    }),
    [productFilter, search],
  );

  const orderDemandRows = useMemo(() => {
    if (!isApiConfigured()) return getOrderDemandForDate(activeDeliveryDateId);
    return inProgress.flatMap((order) =>
      order.items.map((item) => ({
        id: `${order.id}-${item.sku || item.itemName}`,
        itemName: item.itemName,
        custOrderTotal: item.quantity,
        inStock: null,
        qtyReceiving: item.quantity,
        dateReceivingBy: order.deliveryDate,
      })),
    );
  }, [activeDeliveryDateId, inProgress]);

  const filteredPreview = useMemo(
    () => filterOrderDemandRows(orderDemandRows, orderDemandCriteria),
    [orderDemandCriteria, orderDemandRows],
  );
  const previewWindow = useLazyWindow(
    filteredPreview,
    `${search}|${productFilter}|${activeDeliveryDateId}`,
  );

  const productOptions = useMemo(() => {
    const names = new Set<string>(
      productFilterOptions(ORDER_LIST_ITEMS).map((option) => option.value),
    );
    for (const order of inProgress) {
      for (const item of order.items) {
        if (item.itemName.trim()) names.add(item.itemName);
      }
    }
    for (const rows of Object.values(ORDER_DEMAND_BY_DATE)) {
      for (const row of rows) {
        if (row.itemName.trim()) names.add(row.itemName);
      }
    }
    return [...names].sort().map((name) => ({ value: name, label: name }));
  }, [inProgress]);

  const showDistributorFilter = inProgress.length > 0;

  const canShiftChipsBack = chipWindowStart > 0;
  const canShiftChipsForward =
    chipWindowStart + CHIP_WINDOW_SIZE < deliveryDates.length;

  function selectDeliveryDate(dateId: string) {
    setActiveDeliveryDateId(dateId);
    setOrderPage(1);
    setRemoteExhausted(false);
  }

  function shiftChipWindow(delta: number) {
    setChipWindowStart((current) =>
      Math.max(
        0,
        Math.min(current + delta, deliveryDates.length - CHIP_WINDOW_SIZE),
      ),
    );
  }

  useEffect(() => {
    const openId = expandedId ?? expandedDeliveredId;
    if (!isApiConfigured() || !openId || loadedDetailIds.current.has(openId)) {
      return;
    }
    const placed =
      inProgressRef.current.find((order) => order.id === openId) ??
      deliveredRef.current.find((order) => order.id === openId);
    if (!placed?.recordId) return;
    let cancelled = false;
    void ordersApi
      .getById(placed.recordId)
      .then((remote) => {
        if (cancelled) return;
        loadedDetailIds.current.add(openId);
        const mapped = mapDistributorApiOrder(remote, 0, {
          distributors,
          products,
        });
        const items = mapped.items.length ? mapped.items : placed.items;
        setInProgress((current) =>
          current.map((row) =>
            row.id === openId ? { ...row, items, recordId: row.recordId } : row,
          ),
        );
        setDeliveredOrders((current) =>
          current.map((row) =>
            row.id === openId ? { ...row, items, recordId: row.recordId } : row,
          ),
        );
      })
      .catch((error) => {
        if (!cancelled) notifyApiError(error, "Failed to load order details.");
      });
    return () => {
      cancelled = true;
    };
  }, [
    distributors,
    expandedDeliveredId,
    expandedId,
    notifyApiError,
    products,
  ]);

  const chipDateKey = chipDates
    .map((date) => toDeliveryDateId(date))
    .join("|");

  useEffect(() => {
    if (!isApiConfigured() || isBootstrapping || !chipDateKey) return;
    let cancelled = false;
    const ids = chipDateKey.split("|");
    void Promise.all(
      ids.map(async (id) => {
        const result = await ordersApi.list({
          page: 1,
          limit: 1,
          type: "distributor",
          deliveryDate: id,
        });
        return [id, result.total] as const;
      }),
    )
      .then((entries) => {
        if (cancelled) return;
        setChipTotals((current) => {
          const next = { ...current };
          for (const [id, total] of entries) next[id] = total;
          return next;
        });
      })
      .catch((error) => {
        if (!cancelled) {
          notifyApiError(error, "Failed to load delivery date counts.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [chipDateKey, isBootstrapping, notifyApiError]);

  useEffect(() => {
    const index = deliveryDates.findIndex(
      (date) => toDeliveryDateId(date) === activeDeliveryDateId,
    );
    if (index === -1) return;
    setChipWindowStart((current) => {
      if (index >= current && index < current + CHIP_WINDOW_SIZE) {
        return current;
      }
      return Math.max(
        0,
        Math.min(index, Math.max(0, deliveryDates.length - CHIP_WINDOW_SIZE)),
      );
    });
  }, [activeDeliveryDateId, deliveryDates]);

  const filteredInProgress = useMemo(
    () =>
      filterPlacedOrders(inProgress, {
        search,
        productFilter,
        distributorFilter,
        deliveryDateId: isApiConfigured() ? undefined : activeDeliveryDateId,
      }),
    [
      activeDeliveryDateId,
      distributorFilter,
      inProgress,
      productFilter,
      search,
    ],
  );

  const inProgressWindow = useLazyWindow(
    filteredInProgress,
    `${search}|${distributorFilter}|${productFilter}|${activeDeliveryDateId}`,
  );

  const deliveredFilterCriteria = useMemo(
    () => ({
      query: search,
      zipCode: deliveredZipFilter,
      deliveryDate: deliveredDateFilter,
      status: deliveredStatusFilter,
      sortBy: deliveredSort,
    }),
    [
      deliveredDateFilter,
      deliveredSort,
      deliveredStatusFilter,
      deliveredZipFilter,
      search,
    ],
  );

  const deliveredSource = isApiConfigured() ? deliveredOrders : DELIVERED_ORDERS;

  const deliveredZipOptions = useMemo(
    () => uniqueDeliveredFieldValues(deliveredSource, "zipCode"),
    [deliveredSource],
  );
  const deliveredDateOptions = useMemo(
    () => uniqueDeliveredFieldValues(deliveredSource, "day"),
    [deliveredSource],
  );

  const deliveredFlat = useMemo(() => {
    const filtered = filterDeliveredOrders(
      deliveredSource,
      deliveredFilterCriteria,
    );
    return sortDeliveredOrders(filtered, deliveredFilterCriteria.sortBy);
  }, [deliveredFilterCriteria, deliveredSource]);
  const deliveredWindow = useLazyWindow(
    deliveredFlat,
    `${search}|${deliveredZipFilter}|${deliveredDateFilter}|${deliveredStatusFilter}|${deliveredSort}`,
  );
  const deliveredGroups = useMemo(
    () => groupDeliveredOrders(deliveredWindow.visible),
    [deliveredWindow.visible],
  );

  const deliveredCount = deliveredFlat.length;

  const exportCount =
    tab === "Orders"
      ? inProgress.length > 0
        ? filteredInProgress.length
        : filteredPreview.length
      : deliveredCount;
  const exportFiltersActive =
    tab === "Orders"
      ? Boolean(
          search.trim() ||
            productFilter ||
            distributorFilter ||
            activeDeliveryDateId,
        )
      : Boolean(
          search.trim() ||
          deliveredZipFilter ||
          deliveredDateFilter ||
          deliveredStatusFilter ||
          deliveredSort !== "newest",
        );

  const groupedRows = useMemo(() => {
    const groups: Record<OrderCategory, WorkingOrderRow[]> = {
      Meat: [],
      Fruits: [],
      Grains: [],
    };
    for (const row of rows) {
      groups[row.category].push(row);
    }
    return groups;
  }, [rows]);

  const reviewGroups = useMemo(() => buildReview(rows), [rows]);
  const pendingReviewGroups = useMemo(
    () =>
      reviewGroups.filter(
        (group) => !orderedDistributors.has(group.distributor),
      ),
    [orderedDistributors, reviewGroups],
  );
  const grandTotal = reviewGroups.reduce(
    (sum, group) => sum + group.totalPrice,
    0,
  );
  const pendingTotal = pendingReviewGroups.reduce(
    (sum, group) => sum + group.totalPrice,
    0,
  );
  const canReview = rows.some((row) => row.quantity > 0);
  const canOrderAll = pendingReviewGroups.length > 0;

  const distributorOptions = useMemo(() => {
    const names = new Set([
      ...ORDER_LIST_ITEMS.flatMap((r) => r.options.map((o) => o.distributor)),
      ...inProgress.map((o) => o.distributor),
      ...deliveredSource.map((o) => o.distributor),
    ]);
    return Array.from(names).sort();
  }, [deliveredSource, inProgress]);

  useEffect(() => {
    if (!isApiConfigured()) {
      setLoading(false);
      return;
    }
    // Wait for catalog bootstrap so mapping uses API distributors/products.
    if (isBootstrapping) return;

    let cancelled = false;
    const append = orderPage > 1;
    ordersLoadLock.current = true;
    if (append) setLoadingMoreOrders(true);
    else setLoading(true);

    void ordersApi
      .list({
        page: orderPage,
        limit: DEFAULT_PAGE_LIMIT,
        type: "distributor",
        deliveryDate: activeDeliveryDateId,
      })
      .then((result) => {
        if (cancelled) return;
        const remote = result.items;
        setRemoteTotal(result.total);
        setChipTotals((current) => ({
          ...current,
          [activeDeliveryDateId]: result.total,
        }));
        setRemoteLoaded((current) =>
          append ? current + remote.length : remote.length,
        );
        setRemoteExhausted(remote.length < DEFAULT_PAGE_LIMIT);

        const mapped: PlacedOrder[] = remote
          .filter((order) => order.status !== "delivered")
          .map((order, index) =>
            mapDistributorApiOrder(
              order,
              index,
              { distributors, products },
              orderPage,
            ),
          );

        setInProgress((prev) =>
          append ? appendInProgressOrders(prev, mapped) : mapped,
        );
      })
      .catch((error) => {
        if (cancelled) return;
        notifyApiError(error, "Failed to load distributor orders.");
      })
      .finally(() => {
        if (cancelled) return;
        ordersLoadLock.current = false;
        setLoading(false);
        setLoadingMoreOrders(false);
      });

    return () => {
      cancelled = true;
    };
    // Catalog identity is stable after bootstrap; paging should not refetch on those arrays.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDeliveryDateId, isBootstrapping, orderPage]);

  useEffect(() => {
    if (!isApiConfigured() || isBootstrapping) return;
    let cancelled = false;
    void ordersApi
      .list({ type: "distributor", status: "delivered", page: 1, limit: 100 })
      .then((result) => {
        if (cancelled) return;
        setDeliveredOrders(
          result.items.map((order, index) =>
            mapDeliveredApiOrder(order, index, { distributors, products }),
          ),
        );
      })
      .catch((error) => {
        if (!cancelled) {
          notifyApiError(error, "Failed to load delivered orders.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [distributors, isBootstrapping, notifyApiError, products]);

  function showToast(message = "Orders created successfully") {
    setToastMessage(message);
    setToast(true);
    window.setTimeout(() => setToast(false), 2800);
  }

  function openOrderFlow() {
    setRows(makeRows(activeDeliveryDateId));
    setOrderedDistributors(new Set());
    setConfirmClose(false);
    setView("orderList");
  }

  function openManualFlow() {
    setConfirmClose(false);
    setView("manual");
  }

  function resetToList() {
    setView("list");
    setConfirmClose(false);
    setTab("Orders");
  }

  function cancelOrderRequest() {
    setOrderedDistributors(new Set());
    setRows(makeRows(activeDeliveryDateId));
    resetToList();
  }

  function handleManualCreated(draft: ManualOrderDraft) {
    const order = createPlacedOrderFromManualDraft(
      draft,
      nextDeliveryId(inProgress),
    );
    setInProgress((prev) => appendInProgressOrders(prev, [order]));
    syncManualDistributorOrder(draft, distributors, products, items);
    setExpandedId(order.id);
    showToast("Order created successfully");
    resetToList();
  }

  function calculateQty(category: OrderCategory) {
    setRows((prev) => applyCalculatedQuantitiesForCategory(prev, category));
  }

  function setQty(id: string, quantity: number) {
    setRows((prev) =>
      prev.map((row) =>
        row.id === id ? { ...row, quantity: Math.max(0, quantity) } : row,
      ),
    );
  }

  function submitDistributorOrder(distributor: string) {
    if (orderedDistributors.has(distributor)) return;

    const group = reviewGroups.find(
      (entry) => entry.distributor === distributor,
    );
    if (!group) return;

    const order = createPlacedOrderFromReviewGroup(
      group,
      nextDeliveryId(inProgress),
      expectedDeliveryLabel,
      activeDeliveryDateId,
    );

    setInProgress((prev) => appendInProgressOrders(prev, [order]));
    syncReviewGroupOrder(group, distributors, products, items);
    setOrderedDistributors((prev) => new Set(prev).add(distributor));
    setExpandedId(order.id);
    showToast("Order submitted");
  }

  function submitRemainingOrders() {
    const remaining = reviewGroups.filter(
      (group) => !orderedDistributors.has(group.distributor),
    );
    if (remaining.length === 0) return;

    let deliveryCounter = inProgress;
    const created = remaining.map((group) => {
      const deliveryId = nextDeliveryId(deliveryCounter);
      const order = createPlacedOrderFromReviewGroup(
        group,
        deliveryId,
        expectedDeliveryLabel,
        activeDeliveryDateId,
      );
      deliveryCounter = [order, ...deliveryCounter];
      return order;
    });

    setInProgress((prev) => appendInProgressOrders(prev, created));
    for (const group of remaining) {
      syncReviewGroupOrder(group, distributors, products, items);
    }
    setOrderedDistributors(
      new Set(reviewGroups.map((group) => group.distributor)),
    );
    setExpandedId(created[0]?.id ?? null);
    showToast("Orders created successfully");
    resetToList();
  }

  function orderAll() {
    submitRemainingOrders();
  }

  function findPlacedOrderForDistributor(distributor: string) {
    return inProgress.find((order) => order.distributor === distributor);
  }

  if (view === "manual") {
    return (
      <CreateManualOrderFlow
        onClose={resetToList}
        onCreated={handleManualCreated}
      />
    );
  }

  if (view === "list") {
    return (
      <div className="relative flex h-full min-h-0 flex-col bg-[#FAFAFA]">
        <Header
          title="Distributor Orders"
          toolbar={
            <div className="flex w-full flex-wrap items-center gap-2 md:flex-nowrap">
              <SearchField
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search"
              />
              {tab === "Orders" ? (
                <>
                  <Select
                    value={productFilter}
                    onChange={setProductFilter}
                    placeholder="All products"
                    aria-label="All products"
                    className="w-full sm:w-[140px]"
                    options={[
                      { value: "", label: "All products" },
                      ...productOptions,
                    ]}
                  />
                  {showDistributorFilter ? (
                    <Select
                      value={distributorFilter}
                      onChange={setDistributorFilter}
                      placeholder="All Distributors"
                      aria-label="All Distributors"
                      className="w-full sm:w-[160px]"
                      options={[
                        { value: "", label: "All Distributors" },
                        ...distributorOptions.map((name) => ({
                          value: name,
                          label: name,
                        })),
                      ]}
                    />
                  ) : null}
                  <div className="flex w-full flex-wrap items-center gap-2 sm:ml-auto sm:w-auto sm:flex-nowrap">
                    <ExportButton
                      entityLabel="orders"
                      recordCount={exportCount}
                      filtersActive={exportFiltersActive}
                      onExport={async (request: ExportRequest) => {
                        let source = inProgress;
                        if (isApiConfigured()) {
                          const remote = await collectPaginated((page, limit) =>
                            ordersApi.list({
                              page,
                              limit,
                              type: "distributor",
                              deliveryDate:
                                request.scope === "all"
                                  ? undefined
                                  : activeDeliveryDateId,
                            }),
                          );
                          const mapped = remote.map((order, index) =>
                            mapDistributorApiOrder(order, index, {
                              distributors,
                              products,
                            }),
                          );
                          source = appendInProgressOrders(mapped, inProgress);
                        }
                          const orders =
                          request.scope === "all"
                            ? filterPlacedOrders(source, {
                                search: "",
                                productFilter: "",
                                distributorFilter: "",
                              })
                            : filterPlacedOrders(source, {
                                search,
                                productFilter,
                                distributorFilter,
                                deliveryDateId: isApiConfigured()
                                  ? undefined
                                  : activeDeliveryDateId,
                              });
                        const demand =
                          request.scope === "all"
                            ? Object.values(ORDER_DEMAND_BY_DATE).flat()
                            : filteredPreview;
                        const filename =
                          request.scope === "all"
                            ? exportFilename("distributor-orders-all")
                            : `distributor-orders-${activeDeliveryDateId}.csv`;
                        downloadDistributorOrdersCsv(orders, demand, filename);
                      }}
                      className="w-full sm:w-auto"
                    />
                    <Button
                      variant="primary"
                      onClick={openManualFlow}
                      className="w-full sm:w-auto"
                    >
                      <Plus className="size-3.5" />
                      Create Order
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <Select
                    value={deliveredZipFilter}
                    onChange={setDeliveredZipFilter}
                    placeholder="ZIP Code"
                    aria-label="ZIP Code"
                    className="w-full sm:w-[130px]"
                    options={[
                      { value: "", label: "ZIP Code" },
                      ...deliveredZipOptions.map((zip) => ({
                        value: zip,
                        label: zip,
                      })),
                    ]}
                  />
                  <Select
                    value={deliveredDateFilter}
                    onChange={setDeliveredDateFilter}
                    placeholder="Select Date"
                    aria-label="Select Date"
                    className="w-full sm:w-[190px]"
                    options={[
                      { value: "", label: "Select Date" },
                      ...deliveredDateOptions.map((day) => ({
                        value: day,
                        label: day,
                      })),
                    ]}
                  />
                  <Select
                    value={deliveredStatusFilter}
                    onChange={setDeliveredStatusFilter}
                    placeholder="Status"
                    aria-label="Status"
                    className="w-full sm:w-[130px]"
                    options={[
                      { value: "", label: "Status" },
                      ...DELIVERED_ORDER_STATUSES.map((status) => ({
                        value: status,
                        label: status,
                      })),
                    ]}
                  />
                  <Select
                    value={deliveredSort}
                    onChange={(value) =>
                      setDeliveredSort(
                        value as DeliveredFilterCriteria["sortBy"],
                      )
                    }
                    placeholder="Sort by"
                    aria-label="Sort by"
                    className="w-full sm:w-[140px]"
                    options={DELIVERED_SORT_OPTIONS.map((option) => ({
                      value: option.value,
                      label: option.label,
                    }))}
                  />
                  <ExportButton
                    entityLabel="orders"
                    recordCount={exportCount}
                    filtersActive={exportFiltersActive}
                    onExport={async (request: ExportRequest) => {
                      const groups =
                        request.scope === "all"
                          ? groupDeliveredOrders(
                              sortDeliveredOrders(deliveredSource, "newest"),
                            )
                          : groupDeliveredOrders(deliveredFlat);
                      downloadDeliveredOrdersCsv(
                        groups,
                        exportFilename(
                          request.scope === "all"
                            ? "delivered-orders-all"
                            : "delivered-orders",
                        ),
                      );
                    }}
                    className="w-full sm:ml-auto sm:w-auto"
                  />
                </>
              )}
            </div>
          }
          center={
            <Tabs
              embedded
              aria-label="Order views"
              items={[
                { id: "Orders", label: "Orders", width: 103 },
                { id: "Delivered", label: "Delivered", width: 93 },
              ]}
              value={tab}
              onChange={(id) => setTab(id as "Orders" | "Delivered")}
            />
          }
        />

        <div className="min-h-0 flex-1 overflow-y-auto bg-[#FAFAFA] px-4 py-5 md:px-7 md:py-5">
          {tab === "Orders" ? (
            <>
              <div className={DATE_CHIP_ROW}>
                <div className={DATE_CHIP_SCROLL}>
                  {visibleDeliveryChips.map((chip) => {
                    const active = chip.id === activeDeliveryDateId;
                    return (
                      <DeliveryDateChip
                        key={chip.id}
                        label={chip.label}
                        count={chip.count}
                        active={active}
                        onClick={() => selectDeliveryDate(chip.id)}
                      />
                    );
                  })}
                </div>
                <div className={cn("relative z-30 shrink-0", DATE_NAV_GROUP)}>
                  <DateNavButton
                    aria-label="Previous dates"
                    disabled={!canShiftChipsBack}
                    onClick={() => shiftChipWindow(-1)}
                  >
                    <ChevronLeft size={14} />
                  </DateNavButton>
                  <DateNavButton
                    aria-label="Next dates"
                    disabled={!canShiftChipsForward}
                    onClick={() => shiftChipWindow(1)}
                  >
                    <ChevronRight size={14} />
                  </DateNavButton>
                  <DateNavButton
                    aria-label="Calendar"
                    aria-expanded={calendarOpen}
                    onClick={() => setCalendarOpen((v) => !v)}
                  >
                    <CalendarIcon />
                  </DateNavButton>
                  {calendarOpen ? (
                    <DeliveryDateCalendar
                      selectedDateId={activeDeliveryDateId}
                      onSelectDate={selectDeliveryDate}
                      onClose={() => setCalendarOpen(false)}
                      initialMonth={activeDeliveryDate}
                    />
                  ) : null}
                </div>
              </div>

              {loading ? (
                <AppLoader variant="table" label="Loading orders" />
              ) : (
                <>
                  {filteredInProgress.length > 0 ? (
                    <section className="mb-8">
                      <h2 className="mb-4 text-[20px] font-semibold tracking-tight text-[#111118]">
                        In Progress
                      </h2>
                      <ExpandableOrders
                        orders={inProgressWindow.visible}
                        expandedId={expandedId}
                        onToggle={(id) =>
                          setExpandedId((cur) => (cur === id ? null : id))
                        }
                      />
                    </section>
                  ) : null}

                  <section>
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <h2 className="text-[20px] font-semibold tracking-tight text-[#111118]">
                        Order List
                      </h2>
                      <Button
                        variant="dark"
                        onClick={openOrderFlow}
                        disabled={filteredPreview.length === 0}
                        size="sm"
                      >
                        Order now
                      </Button>
                    </div>
                    <ScrollTable minWidth={960}>
                      <div
                        className={cn(
                          PREVIEW_COLUMNS,
                          TABLE_HEADER,
                          PINNED_HEADER,
                          "h-10 border-b border-[#00000014] bg-[#FAFAF8]",
                        )}
                      >
                        <span>Item Name</span>
                        <span>Cust. Order Total</span>
                        <span>In Stock</span>
                        <span>Quantity Receiving</span>
                        <span>Date Receiving By</span>
                      </div>
                      {filteredPreview.length === 0 ? (
                        <div className="px-5 py-12 text-center text-[14px] text-[#8A8A8A]">
                          {getOrderDemandEmptyMessage(orderDemandCriteria)}
                        </div>
                      ) : (
                        previewWindow.visible.map((row) => (
                          <div
                            key={row.id}
                            className={cn(
                              PREVIEW_COLUMNS,
                              "min-h-[48px] border-b border-[#00000014] text-[13px] font-medium text-[#111118] last:border-b-0",
                            )}
                          >
                            <span>{row.itemName}</span>
                            <span>{row.custOrderTotal}</span>
                            <span>{row.inStock ?? "—"}</span>
                            <span>{row.qtyReceiving}</span>
                            <span>{row.dateReceivingBy}</span>
                          </div>
                        ))
                      )}
                    </ScrollTable>
                  </section>
                </>
              )}
            </>
          ) : (
            <div className="space-y-8">
              {deliveredGroups.length === 0 ? (
                <div className="rounded-[10px] border border-dashed border-[#00000014] bg-white px-6 py-16 text-center text-[14px] text-[#8A8A8A]">
                  {getDeliveredEmptyMessage(deliveredFilterCriteria)}
                </div>
              ) : (
                deliveredGroups.map(({ week, days }) => (
                  <section key={week}>
                    <h2 className="mb-4 text-[22px] font-semibold tracking-tight text-[#111118]">
                      {week}
                    </h2>
                    {days.map(({ day, orders }) => (
                      <div key={day} className="mb-5">
                        <div className="mb-2 text-[13px] font-semibold text-[#111118]">
                          {day}
                          <span className="ml-2 text-[12px] font-medium text-[#8A8A8A]">
                            · {orders.length} orders
                          </span>
                        </div>
                        <ExpandableOrders
                          orders={orders}
                          expandedId={expandedDeliveredId}
                          onToggle={(id) =>
                            setExpandedDeliveredId((cur) =>
                              cur === id ? null : id,
                            )
                          }
                        />
                      </div>
                    ))}
                  </section>
                ))
              )}
            </div>
          )}
          <InfiniteScrollSentinel
            hasMore={
              tab === "Orders"
                ? previewWindow.hasMore ||
                  inProgressWindow.hasMore ||
                  (!remoteExhausted && remoteLoaded < remoteTotal)
                : deliveredWindow.hasMore
            }
            loading={tab === "Orders" && loadingMoreOrders}
            loadedCount={
              tab === "Orders"
                ? previewWindow.loadedCount +
                  inProgressWindow.loadedCount +
                  remoteLoaded
                : deliveredWindow.loadedCount
            }
            onLoadMore={() => {
              if (tab !== "Orders") {
                deliveredWindow.loadMore();
                return;
              }
              if (previewWindow.hasMore) previewWindow.loadMore();
              if (inProgressWindow.hasMore) {
                inProgressWindow.loadMore();
                return;
              }
              if (
                ordersLoadLock.current ||
                remoteExhausted ||
                remoteLoaded >= remoteTotal
              ) {
                return;
              }
              ordersLoadLock.current = true;
              setOrderPage((current) => current + 1);
            }}
          />
        </div>

        {toast ? (
          <div className="fixed right-6 bottom-6 z-50 flex items-center gap-2.5 rounded-[10px] bg-[#1F7A3A] px-4 py-3 text-[14px] font-medium text-white shadow-lg">
            <span className="flex size-5 items-center justify-center rounded-full bg-white/20">
              <Check className="size-3.5" />
            </span>
            {toastMessage}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="relative flex h-full min-h-0 flex-col bg-[#FAFAFA]">
      <div
        className={
          view === "review"
            ? "flex h-[77px] shrink-0 items-center justify-between gap-4 border-b-[1.33px] border-[#00000014] bg-white px-4 md:px-8"
            : "shrink-0 border-b border-[#00000014] bg-white px-4 py-5 md:px-8"
        }
      >
        <div
          className={
            view === "review"
              ? undefined
              : "flex w-full items-start justify-between gap-4"
          }
        >
          <div>
            <h1
              className={
                view === "review"
                  ? "text-[20px] leading-[30px] font-semibold tracking-normal text-[#111118]"
                  : "text-[28px] font-semibold tracking-tight text-[#111118]"
              }
            >
              {view === "review" ? "Review Order" : "Order List"}
            </h1>
            <p
              className={
                view === "review"
                  ? "text-[13px] leading-[16px] font-medium tracking-normal text-[#8A8A8A]"
                  : "mt-1 text-[13px] text-[#8A8A8A]"
              }
            >
              {view === "review" ? "Orders for" : "Item orders for"}{" "}
              <span
                className={
                  view === "review"
                    ? "font-bold text-[#111118]"
                    : "font-semibold text-[#111118]"
                }
              >
                {activeDeliveryLabel} delivery
              </span>
            </p>
          </div>
          {view === "review" ? null : <UserMenu className="items-center" />}
        </div>
        {view === "review" ? <UserMenu className="items-center" /> : null}
      </div>

      {view === "orderList" ? (
        <div className="min-h-0 flex-1 overflow-y-auto bg-[#FAFAFA] px-4 py-5 md:px-8">
          {ORDER_CATEGORIES.map((section) => {
            const sectionRows = groupedRows[section];
            if (sectionRows.length === 0) return null;
            return (
              <section key={section} className="mb-7">
                <h2 className="mb-3 text-[22px] font-semibold tracking-tight text-[#111118]">
                  {section}
                </h2>
                <div
                  className={cn(
                    "mb-1.5 grid items-center gap-x-4 px-4",
                    ORDER_PREP_COLS,
                  )}
                >
                  <span aria-hidden />
                  <span aria-hidden />
                  <span aria-hidden />
                  <span aria-hidden />
                  <span aria-hidden />
                  <span aria-hidden />
                  <button
                    type="button"
                    onClick={() => calculateQty(section)}
                    className="w-[120px] text-center text-[13px] font-medium text-[#4E7CFF]"
                  >
                    Calculate QTY
                  </button>
                </div>
                <ScrollTable minWidth={980}>
                  <div
                    className={cn(
                      "grid items-center gap-x-4 border-b border-[#00000014] px-4",
                      ORDER_PREP_COLS,
                      TABLE_HEADER,
                      PINNED_HEADER,
                      "h-10",
                    )}
                  >
                    <span>Item Name</span>
                    <span>Distributor / Source</span>
                    <span>Price</span>
                    <span>QTY per Unit</span>
                    <span>Cust. Order Total</span>
                    <span>In Stock</span>
                    <span className="w-[120px] text-center">QTY Needed</span>
                  </div>
                  {sectionRows.map((row) => {
                    const option = row.options[0];
                    return (
                      <div
                        key={row.id}
                        className={cn(
                          "grid items-center gap-x-4 border-b border-[#00000014] px-4 py-3.5 last:border-b-0",
                          ORDER_PREP_COLS,
                        )}
                      >
                        <span className="min-w-0 truncate text-[14px] text-[#111118]">
                          {row.itemName}
                        </span>
                        <span className="min-w-0 truncate text-[13px] text-[#111118]">
                          {option
                            ? `${option.distributor} / ${option.source}`
                            : "—"}
                        </span>
                        <span className="min-w-0 truncate text-[13px] text-[#111118]">
                          {option
                            ? `${money(option.price)} / ${option.unit}`
                            : "—"}
                        </span>
                        <span className="text-[13px] text-[#111118]">
                          {option?.qtyPerUnit ?? "—"}
                        </span>
                        <span className="text-[13px] text-[#111118]">
                          {row.custOrderTotal}
                        </span>
                        <span className="text-[13px] text-[#111118]">
                          {row.inStock ?? "—"}
                        </span>
                        <div className="flex w-[120px] justify-center">
                          <QtyStepper
                            value={row.quantity}
                            onChange={(q) => setQty(row.id, q)}
                          />
                        </div>
                      </div>
                    );
                  })}
                </ScrollTable>
              </section>
            );
          })}
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto bg-[#FAFAFA] px-4 py-5 md:px-8">
          <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_300px] xl:gap-8">
            <div className="min-w-0 space-y-3">
              {reviewGroups.map((group) => {
                const ordered = orderedDistributors.has(group.distributor);
                return (
                  <div
                    key={group.distributor}
                    className="rounded-[12px] border border-[#00000014] bg-white px-4 py-3.5"
                  >
                    <h3 className="mb-0.5 text-[18px] font-semibold tracking-tight text-[#111118]">
                      {group.distributor}
                    </h3>
                    <div>
                      {group.items.map((item) => (
                        <div
                          key={`${group.distributor}-${item.itemName}`}
                          className={cn(
                            REVIEW_LINE_GRID,
                            "border-b border-[#00000014] py-3 text-[13px]",
                          )}
                        >
                          <span className="min-w-0 truncate text-[#111118]">
                            {item.itemName}
                          </span>
                          <span className="min-w-0 truncate text-[#8A8A8A]">
                            {item.source}
                          </span>
                          <span className="text-right text-[#111118]">
                            {item.quantity}×
                          </span>
                          <span className="text-right whitespace-nowrap text-[#111118]">
                            {money(item.price)}
                          </span>
                          <span className="text-right font-semibold whitespace-nowrap text-[#111118]">
                            {money(item.lineTotal)}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className={cn(REVIEW_LINE_GRID, "pt-3")}>
                      <div className="col-span-4 flex min-w-0 flex-wrap items-center gap-2.5">
                        {ordered ? (
                          <div className="flex min-w-0 items-start gap-2">
                            <span className="mt-0.5 inline-flex size-4 shrink-0 items-center justify-center rounded-full bg-[#18BC33] text-white">
                              <Check className="size-2.5" />
                            </span>
                            <div className="flex min-w-0 flex-col items-start gap-1.5">
                              <div className="text-[12px] text-[#111118]">
                                Order sent to email{" "}
                                <span className="font-semibold">
                                  {group.email}
                                </span>
                                <span className="text-[#8A8A8A]">
                                  {" "}
                                  · Expected delivery{" "}
                                  <span className="font-semibold text-[#111118]">
                                    {expectedDeliveryLabel}
                                  </span>
                                </span>
                              </div>
                              <button
                                type="button"
                                className={LINK}
                                onClick={() => {
                                  const placed = findPlacedOrderForDistributor(
                                    group.distributor,
                                  );
                                  if (placed) downloadOrderInvoice(placed);
                                }}
                              >
                                Download order
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() =>
                                submitDistributorOrder(group.distributor)
                              }
                              className="font-semibold"
                            >
                              Order now
                            </Button>
                            <span className="text-[12px] text-[#8A8A8A]">
                              Expected delivery{" "}
                              <span className="font-semibold text-[#111118]">
                                {expectedDeliveryLabel}
                              </span>
                            </span>
                          </>
                        )}
                      </div>
                      <div className="shrink-0 text-right text-[18px] font-semibold text-[#111118]">
                        {money(group.totalPrice)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <aside className="h-fit shrink-0 rounded-[12px] border border-[#00000014] bg-white px-4 py-3.5 xl:sticky xl:top-4">
              <h3 className="mb-1 text-[15px] font-semibold text-[#111118]">
                Order Summary
              </h3>
              <div>
                {reviewGroups.map((group) => {
                  const submitted = orderedDistributors.has(group.distributor);
                  return (
                    <div
                      key={`sum-${group.distributor}`}
                      className="flex items-center justify-between gap-3 border-b border-[#00000014] py-3 text-[13px]"
                    >
                      <div className="min-w-0">
                        <div className="truncate font-medium text-[#111118]">
                          {group.distributor}
                        </div>
                        <div
                          className={cn(
                            "text-[12px]",
                            submitted ? "text-[#18BC33]" : "text-[#8A8A8A]",
                          )}
                        >
                          {submitted
                            ? "Submitted"
                            : `${group.itemCount} item${group.itemCount === 1 ? "" : "s"}`}
                        </div>
                      </div>
                      <div className="shrink-0 font-semibold text-[#111118]">
                        {money(group.totalPrice)}
                      </div>
                    </div>
                  );
                })}
              </div>
              {pendingReviewGroups.length > 0 ? (
                <div className="flex items-center justify-between border-b border-[#00000014] py-3 text-[12px] text-[#8A8A8A]">
                  <span>Remaining</span>
                  <span className="font-medium text-[#111118]">
                    {money(pendingTotal)}
                  </span>
                </div>
              ) : null}
              <div className="flex items-center justify-between pt-3">
                <span className="text-[14px] font-medium text-[#111118]">
                  Total
                </span>
                <span className="text-[18px] font-semibold text-[#111118]">
                  {money(grandTotal)}
                </span>
              </div>
            </aside>
          </div>
        </div>
      )}

      <div className="flex shrink-0 items-center justify-between gap-3 border-t border-[#00000014] bg-white px-4 py-3.5 md:px-8">
        {view === "review" ? (
          <button
            type="button"
            onClick={() => setView("orderList")}
            className="inline-flex items-center gap-1 text-[14px] font-medium text-[#111118] hover:opacity-80"
          >
            <ChevronLeft className="size-4" />
            Back
          </button>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => setConfirmClose(true)}>
            Cancel & Close
          </Button>
          <Button
            variant="primary"
            size="lg"
            disabled={view === "orderList" ? !canReview : !canOrderAll}
            onClick={() => {
              if (view === "review") orderAll();
              else setView("review");
            }}
            className="font-semibold"
          >
            {view === "review" ? "Order All" : "Review Order"}
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmClose}
        title="Cancel and Close Order"
        message="Are you sure you want to close order request?"
        confirmLabel="Cancel Order"
        onClose={() => setConfirmClose(false)}
        onConfirm={cancelOrderRequest}
      />

      {toast ? (
        <div className="fixed right-6 bottom-6 z-50 flex items-center gap-2.5 rounded-[10px] bg-[#1F7A3A] px-4 py-3 text-[14px] font-medium text-white shadow-lg">
          <span className="flex size-5 items-center justify-center rounded-full bg-white/20">
            <Check className="size-3.5" />
          </span>
          {toastMessage}
        </div>
      ) : null}
    </div>
  );
}

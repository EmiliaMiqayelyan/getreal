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
  DELIVERED_SORT_OPTIONS,
  DELIVERED_ORDER_STATUSES,
} from "@/constants/distributorOrders";
import { PINNED_HEADER, TABLE_HEADER } from "@/constants/table";
import { useAppCatalog, useCatalogSlice } from "@/context/AppCatalogContext";
import { useApiFeedback } from "@/hooks/useApiFeedback";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useLazyWindow } from "@/hooks/useLazyWindow";
import { InfiniteScrollSentinel } from "@/components/ui/InfiniteScrollSentinel";
import { inventoryApi, isApiConfigured, ordersApi } from "@/lib/api";
import { orderRecordId } from "@/lib/api/mappers";
import {
  loadDistributorOrderScreen,
  mapApiDistributorDelivered,
  mapApiDistributorOrder,
} from "@/lib/distributorOrderApi";
import {
  syncManualDistributorOrder,
  syncReviewGroupOrder,
} from "@/lib/api/orderSync";
import {
  buildReviewGroups,
  categorySections,
  demandDateIds,
  demandOrdersForDate,
  previewRowsForOrder,
  reviewGroupKey,
  type DemandOrder,
} from "@/lib/distributorOrderWorkflow";
import type { Distributor } from "@/types/distributor";
import type {
  DeliveredOrder,
  ManualOrderDraft,
  PlacedOrder,
  WorkingOrderRow,
} from "@/types/distributorOrder";
import type { ExportRequest } from "@/types/export";
import { cn } from "@/utils/cn";
import { exportFilename } from "@/utils/csvExport";
import {
  appendInProgressOrders,
  applyCalculatedQuantitiesForCategory,
  onHandForOrderLine,
  createPlacedOrderFromManualDraft,
  createPlacedOrderFromReviewGroup,
  type DeliveredFilterCriteria,
  filterDeliveredOrders,
  filterOrderDemandRows,
  getDeliveredEmptyMessage,
  getOrderDemandEmptyMessage,
  groupDeliveredOrders,
  downloadDeliveredOrdersCsv,
  downloadDistributorOrdersCsv,
  nextDeliveryId,
  openOrderInvoice,
  sortDeliveredOrders,
  uniqueDeliveredFieldValues,
} from "@/utils/distributorOrdersPage";
import {
  formatDeliveryChipLabel,
  deliveryDateIdFromValue,
  formatExpectedDelivery,
  isCurrentOrFutureDateId,
  isWednesdayDateId,
  parseDeliveryDateId,
  pickDefaultDeliveryChipId,
  toDeliveryDateId,
  upcomingWednesday,
  wednesdayChipsFromDateIds,
} from "@/utils/deliveryCalendar";
import { toOrderDeliveryDateIso } from "@/utils/manualOrder";

const LINK = "text-[13px] font-medium text-[#3B7DC4] hover:underline";
const REVIEW_LINE_GRID =
  "grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_4.5rem_6rem_7rem] items-center gap-x-8";
/** Shared prep-table tracks so QTY Needed steppers stay column-aligned across rows. */
const ORDER_PREP_COLS =
  "grid-cols-[minmax(0,1.3fr)_minmax(0,1.5fr)_minmax(0,0.85fr)_minmax(0,0.85fr)_minmax(0,0.95fr)_minmax(0,0.7fr)_120px]";
const PLACED_ORDER_COLUMNS =
  "grid grid-cols-[28px_112px_minmax(140px,1.35fr)_minmax(120px,0.95fr)_minmax(210px,1.25fr)_minmax(88px,0.7fr)_minmax(16px,0.4fr)_100px] items-center gap-x-4 px-4";
const PREVIEW_COLUMNS =
  "grid grid-cols-[minmax(0,2fr)_minmax(0,1.1fr)_minmax(0,0.8fr)_minmax(0,1.2fr)_minmax(0,1.3fr)] items-center gap-x-4 px-4";

type View = "list" | "orderList" | "review" | "manual";
type Tab = "Orders" | "Delivered";

function money(value: number) {
  if (Number.isInteger(value)) return `$${value}`;
  return `$${value.toFixed(2).replace(/0$/, "").replace(/\.$/, "")}`;
}

function placedOrderDateId(order: PlacedOrder) {
  return order.deliveryDateId || deliveryDateIdFromValue(order.deliveryDate);
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
    const orderDateId = placedOrderDateId(order);
    if (
      criteria.deliveryDateId &&
      orderDateId &&
      orderDateId !== criteria.deliveryDateId
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

function distributorContactEmail(name: string, distributors: Distributor[]) {
  const match = distributors.find(
    (entry) => entry.name === name || entry.id === name,
  );
  const email =
    match?.contacts.find((contact) => contact.primary && contact.email.trim())
      ?.email || match?.contacts.find((contact) => contact.email.trim())?.email;
  return email?.trim() || "N/A";
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
  loadingId = null,
}: {
  orders: PlacedOrder[];
  expandedId: string | null;
  onToggle: (id: string) => void;
  loadingId?: string | null;
}) {
  return (
    <ScrollTable minWidth={1120}>
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
                  onClick={() => openOrderInvoice(order)}
                >
                  Download
                </button>
              </div>
            </div>
            {open ? (
              loadingId === order.id && order.items.length === 0 ? (
                <div className="border-b border-[#00000014] bg-[#FBF9F9]">
                  <AppLoader
                    variant="section"
                    label="Loading items"
                    className="min-h-[96px] bg-transparent py-6"
                  />
                </div>
              ) : (
              order.items.map((item, itemIndex) => (
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
              )
            ) : null}
          </div>
        );
      })}
    </ScrollTable>
  );
}

export default function ProductOrdersPage() {
  useDocumentTitle("Distributor Orders");
  const { notifyApiError, showError } = useApiFeedback();
  const { distributors, products, items } = useAppCatalog();
  const catalogRef = useRef({ distributors, products, items });
  catalogRef.current = { distributors, products, items };

  const [view, setView] = useState<View>("list");
  const { ready: orderCatalogReady } = useCatalogSlice([
    "distributors",
    "items",
    "sources",
    "products",
  ]);
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
    toDeliveryDateId(upcomingWednesday()),
  );
  const [calendarOpen, setCalendarOpen] = useState(false);

  const [inProgress, setInProgress] = useState<PlacedOrder[]>([]);
  const [deliveredOrders, setDeliveredOrders] = useState<DeliveredOrder[]>([]);
  const [demandOrders, setDemandOrders] = useState<DemandOrder[]>([]);
  const [announcedDateIds, setAnnouncedDateIds] = useState<string[]>([]);
  const [demandReady, setDemandReady] = useState(false);
  const [placing, setPlacing] = useState<string | null>(null);
  const [activeDemandId, setActiveDemandId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedDeliveredId, setExpandedDeliveredId] = useState<string | null>(
    null,
  );
  const [detailLoadingId, setDetailLoadingId] = useState<string | null>(null);

  const [rows, setRows] = useState<WorkingOrderRow[]>([]);
  const [orderedDistributors, setOrderedDistributors] = useState<Set<string>>(
    () => new Set(),
  );
  const [confirmClose, setConfirmClose] = useState(false);
  const [toast, setToast] = useState(false);
  const [toastMessage, setToastMessage] = useState(
    "Orders created successfully",
  );

  const visibleDeliveryChips = useMemo(() => {
    const dateIds = [
      ...demandOrders.flatMap((order) => demandDateIds(order)),
      ...inProgress.map((order) => placedOrderDateId(order)),
    ];
    const chips = wednesdayChipsFromDateIds(dateIds, activeDeliveryDateId);
    const present = new Set(chips.map((chip) => chip.id));
    const extras = announcedDateIds
      .filter(
        (id) =>
          isWednesdayDateId(id) &&
          isCurrentOrFutureDateId(id) &&
          !present.has(id),
      )
      .map((id) => {
        const date = parseDeliveryDateId(id);
        return {
          id,
          label: date ? formatDeliveryChipLabel(date) : id,
          count: 0,
        };
      });
    return [...chips, ...extras].sort((left, right) =>
      left.id.localeCompare(right.id),
    );
  }, [activeDeliveryDateId, announcedDateIds, demandOrders, inProgress]);

  const activeDeliveryDate =
    parseDeliveryDateId(activeDeliveryDateId) ?? upcomingWednesday();
  const activeDeliveryLabel = formatDeliveryChipLabel(activeDeliveryDate);
  const expectedDeliveryLabel = formatExpectedDelivery(activeDeliveryDate);

  const orderDemandCriteria = useMemo(
    () => ({
      query: search,
      productFilter,
    }),
    [productFilter, search],
  );

  const ordersForDate = useMemo(
    () => demandOrdersForDate(demandOrders, activeDeliveryDateId),
    [activeDeliveryDateId, demandOrders],
  );

  const visibleDemandOrders = useMemo(() => {
    return ordersForDate
      .map((order) => ({
        order,
        lines: filterOrderDemandRows(
          previewRowsForOrder(order),
          orderDemandCriteria,
        ).map((row) => ({
          ...row,
          dateReceivingBy: row.dateReceivingBy || expectedDeliveryLabel,
        })),
      }))
      .filter((entry) => {
        if (!search.trim() && !productFilter) return true;
        return entry.lines.length > 0;
      });
  }, [
    expectedDeliveryLabel,
    orderDemandCriteria,
    ordersForDate,
    productFilter,
    search,
  ]);

  const filteredPreview = useMemo(
    () => visibleDemandOrders.flatMap((entry) => entry.lines),
    [visibleDemandOrders],
  );

  const productOptions = useMemo(() => {
    const names = new Set<string>();
    for (const order of demandOrders) {
      for (const line of order.lines) {
        if (line.itemName.trim()) names.add(line.itemName);
      }
    }
    for (const order of inProgress) {
      for (const item of order.items) {
        if (item.itemName.trim()) names.add(item.itemName);
      }
    }
    return [...names].sort().map((name) => ({ value: name, label: name }));
  }, [demandOrders, inProgress]);

  const showDistributorFilter = inProgress.length > 0;

  const activeChipIndex = visibleDeliveryChips.findIndex(
    (chip) => chip.id === activeDeliveryDateId,
  );
  const canShiftChipsBack =
    visibleDeliveryChips.length > 0 &&
    (activeChipIndex === -1 || activeChipIndex > 0);
  const canShiftChipsForward =
    visibleDeliveryChips.length > 0 &&
    (activeChipIndex === -1 ||
      activeChipIndex < visibleDeliveryChips.length - 1);

  function selectDeliveryDate(dateId: string) {
    if (!parseDeliveryDateId(dateId)) return;
    setActiveDeliveryDateId(dateId);
  }

  function shiftDeliveryDate(delta: number) {
    if (visibleDeliveryChips.length === 0) return;
    if (activeChipIndex === -1) {
      const edge =
        delta > 0
          ? visibleDeliveryChips[0]
          : visibleDeliveryChips[visibleDeliveryChips.length - 1];
      if (edge) selectDeliveryDate(edge.id);
      return;
    }
    const next = visibleDeliveryChips[activeChipIndex + delta];
    if (next) selectDeliveryDate(next.id);
  }

  useEffect(() => {
    if (!orderCatalogReady) return;
    let cancelled = false;

    if (!isApiConfigured()) {
      setDemandOrders([]);
      setAnnouncedDateIds([]);
      setInProgress([]);
      setDeliveredOrders([]);
      setDemandReady(true);
      return;
    }

    setDemandReady(false);
    void loadDistributorOrderScreen(catalogRef.current)
      .then((snapshot) => {
        if (cancelled) return;
        setDemandOrders(snapshot.demand);
        setAnnouncedDateIds(snapshot.demandDateIds);
        setInProgress(snapshot.inProgress);
        setDeliveredOrders(snapshot.delivered);
        if (snapshot.demandError) showError(snapshot.demandError);
      })
      .catch((error) => {
        if (cancelled) return;
        notifyApiError(error, "Failed to load distributor orders.");
        setDemandOrders([]);
        setAnnouncedDateIds([]);
        setInProgress([]);
        setDeliveredOrders([]);
      })
      .finally(() => {
        if (!cancelled) setDemandReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, [notifyApiError, orderCatalogReady, showError]);

  useEffect(() => {
    if (!demandReady) return;
    if (activeDeliveryDateId && parseDeliveryDateId(activeDeliveryDateId)) return;
    const dateId = pickDefaultDeliveryChipId(visibleDeliveryChips);
    if (dateId) setActiveDeliveryDateId(dateId);
  }, [activeDeliveryDateId, demandReady, visibleDeliveryChips]);

  const filteredInProgress = useMemo(
    () =>
      filterPlacedOrders(inProgress, {
        search,
        productFilter,
        distributorFilter,
        deliveryDateId: activeDeliveryDateId,
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

  const deliveredSource = deliveredOrders;

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

  const prepSections = useMemo(() => categorySections(rows), [rows]);

  const reviewGroups = useMemo(
    () =>
      buildReviewGroups(rows, (name) =>
        distributorContactEmail(name, distributors),
      ),
    [distributors, rows],
  );
  const pendingReviewGroups = useMemo(
    () =>
      reviewGroups.filter(
        (group) => !orderedDistributors.has(reviewGroupKey(group)),
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
  const canOrderAll = reviewGroups.length > 0;

  const distributorOptions = useMemo(() => {
    const names = new Set([
      ...demandOrders.flatMap((order) =>
        order.lines.flatMap((line) =>
          line.options.map((option) => option.distributor),
        ),
      ),
      ...inProgress.map((order) => order.distributor),
      ...deliveredSource.map((order) => order.distributor),
    ]);
    return Array.from(names).sort();
  }, [deliveredSource, demandOrders, inProgress]);

  const activeDemand = demandOrders.find(
    (order) => order.id === activeDemandId,
  );

  function showToast(message = "Orders created successfully") {
    setToastMessage(message);
    setToast(true);
    window.setTimeout(() => setToast(false), 2800);
  }

  function rememberLines(next: WorkingOrderRow[]) {
    setRows(next);
    if (!activeDemandId) return;
    setDemandOrders((current) =>
      current.map((order) =>
        order.id === activeDemandId ? { ...order, lines: next } : order,
      ),
    );
  }

  function openListedOrder() {
    const partial = visibleDemandOrders.find(
      (entry) => entry.order.phase === "partial",
    );
    const target = partial ?? visibleDemandOrders[0];
    if (!target) return;
    openOrderFlow(target.order.id);
  }

  function openOrderFlow(demandId: string) {
    const order = demandOrders.find((entry) => entry.id === demandId);
    if (!order) return;
    setActiveDemandId(demandId);
    setRows(order.lines.map((line) => ({ ...line })));
    setOrderedDistributors(new Set(order.sentDistributors));
    setConfirmClose(false);
    // A partial send reopens Review Order. A fresh order starts on QTY NEEDED.
    setView(order.sentDistributors.length > 0 ? "review" : "orderList");
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

  async function cancelOrderRequest() {
    const parent = demandOrders.find((order) => order.id === activeDemandId);
    const orderIds = [
      ...new Set(
        (parent?.sentGroups ?? [])
          .map((group) => group.orderId)
          .filter((id): id is string => Boolean(id)),
      ),
    ];

    if (!isApiConfigured() || orderIds.length === 0) {
      resetToList();
      return;
    }

    setPlacing("cancel");
    try {
      for (const id of orderIds) {
        await ordersApi.updateStatus(id, "cancelled");
      }
      const snapshot = await loadDistributorOrderScreen(catalogRef.current);
      setDemandOrders(snapshot.demand);
      setAnnouncedDateIds(snapshot.demandDateIds);
      setInProgress(snapshot.inProgress);
      setDeliveredOrders(snapshot.delivered);
      if (snapshot.demandError) showError(snapshot.demandError);
      showToast("Order cancelled");
      resetToList();
    } catch (error) {
      notifyApiError(error, "Failed to cancel order.");
    } finally {
      setPlacing(null);
    }
  }

  async function handleManualCreated(draft: ManualOrderDraft) {
    if (isApiConfigured()) {
      const created = await syncManualDistributorOrder(
        draft,
        distributors,
        products,
        items,
      );
      if (!created) return;
      try {
        const snapshot = await loadDistributorOrderScreen(catalogRef.current);
        const mapped = mapApiDistributorOrder(created, distributors, 0);
        const alreadyListed = snapshot.inProgress.some(
          (order) => order.recordId && order.recordId === mapped.recordId,
        );
        setDemandOrders(snapshot.demand);
        setAnnouncedDateIds(snapshot.demandDateIds);
        setDeliveredOrders(snapshot.delivered);
        if (snapshot.demandError) showError(snapshot.demandError);
        setInProgress(
          alreadyListed
            ? snapshot.inProgress
            : [mapped, ...snapshot.inProgress],
        );
        if (mapped.deliveryDateId && parseDeliveryDateId(mapped.deliveryDateId)) {
          setActiveDeliveryDateId(mapped.deliveryDateId);
        }
        setExpandedId(mapped.id);
      } catch (error) {
        notifyApiError(
          error,
          "Order was created, but the list failed to refresh.",
        );
      }
      showToast("Order created successfully");
      resetToList();
      return;
    }

    const order = createPlacedOrderFromManualDraft(
      draft,
      nextDeliveryId(inProgress),
    );
    setInProgress((prev) => appendInProgressOrders(prev, [order]));
    if (order.deliveryDateId && parseDeliveryDateId(order.deliveryDateId)) {
      setActiveDeliveryDateId(order.deliveryDateId);
    }
    setExpandedId(order.id);
    showToast("Order created successfully");
    resetToList();
  }

  async function calculateQty(category: string) {
    let onHand: ((row: WorkingOrderRow) => number | null) | undefined;
    if (isApiConfigured()) {
      try {
        const records = await inventoryApi.list();
        onHand = (row) => onHandForOrderLine(records, row);
      } catch (error) {
        notifyApiError(
          error,
          "Failed to load inventory. QTY uses the stock already shown.",
        );
      }
    }
    rememberLines(applyCalculatedQuantitiesForCategory(rows, category, onHand));
  }

  function setQty(id: string, quantity: number) {
    rememberLines(
      rows.map((row) =>
        row.id === id ? { ...row, quantity: Math.max(0, quantity) } : row,
      ),
    );
  }

  async function submitDistributorOrder(key: string) {
    if (placing || orderedDistributors.has(key)) return;

    const group = reviewGroups.find((entry) => reviewGroupKey(entry) === key);
    if (!group || !activeDemandId) return;
    let createdOrderId: string | undefined;

    if (isApiConfigured()) {
      setPlacing(key);
      try {
        const created = await syncReviewGroupOrder(
          group,
          distributors,
          products,
          items,
          toOrderDeliveryDateIso(activeDeliveryDateId),
        );
        if (!created) return;
        createdOrderId = orderRecordId(created);
      } finally {
        setPlacing(null);
      }
    }

    const sentGroup = { ...group, orderId: createdOrderId };
    setOrderedDistributors((prev) => new Set(prev).add(key));
    setDemandOrders((current) =>
      current.map((order) => {
        if (order.id !== activeDemandId) return order;
        return {
          ...order,
          phase: "partial",
          sentDistributors: order.sentDistributors.includes(key)
            ? order.sentDistributors
            : [...order.sentDistributors, key],
          sentGroups: [
            ...order.sentGroups.filter(
              (entry) => reviewGroupKey(entry) !== key,
            ),
            sentGroup,
          ],
        };
      }),
    );
    showToast(`Order sent to ${group.source}`);
  }

  async function orderAll() {
    const parent = demandOrders.find((order) => order.id === activeDemandId);
    if (!parent || reviewGroups.length === 0 || placing) return;

    const remaining = reviewGroups.filter(
      (group) => !orderedDistributors.has(reviewGroupKey(group)),
    );
    const groups = [...parent.sentGroups, ...remaining];
    if (groups.length === 0) return;

    if (isApiConfigured()) {
      setPlacing("all");
      try {
        for (const group of remaining) {
          const created = await syncReviewGroupOrder(
            group,
            distributors,
            products,
            items,
            toOrderDeliveryDateIso(activeDeliveryDateId),
          );
          if (!created) return;
          const key = reviewGroupKey(group);
          setOrderedDistributors((prev) => new Set(prev).add(key));
        }
        const snapshot = await loadDistributorOrderScreen(catalogRef.current);
        setInProgress(snapshot.inProgress);
        setDeliveredOrders(snapshot.delivered);
        if (snapshot.demandError) showError(snapshot.demandError);
        setDemandOrders((current) =>
          current.filter((order) => order.id !== parent.id),
        );
        setExpandedId(snapshot.inProgress[0]?.id ?? null);
        showToast("Orders created successfully");
        resetToList();
      } catch (error) {
        notifyApiError(error, "Failed to place distributor orders.");
      } finally {
        setPlacing(null);
      }
      return;
    }

    let deliveryCounter = inProgress;
    const created = groups.map((group) => {
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
    setDemandOrders((current) =>
      current.filter((order) => order.id !== parent.id),
    );
    setExpandedId(created[0]?.id ?? null);
    showToast("Orders created successfully");
    resetToList();
  }

  function togglePlacedOrder(id: string, delivered = false) {
    const setOpen = delivered ? setExpandedDeliveredId : setExpandedId;
    const openId = delivered ? expandedDeliveredId : expandedId;
    const nextOpen = openId === id ? null : id;
    setOpen(nextOpen);
    if (!nextOpen || !isApiConfigured()) return;

    const source = delivered ? deliveredOrders : inProgress;
    const order = source.find((entry) => entry.id === id);
    if (!order?.recordId || order.items.length > 0) return;

    setDetailLoadingId(id);
    void ordersApi
      .getById(order.recordId)
      .then((detail) => {
        if (delivered) {
          const mapped = mapApiDistributorDelivered(detail, distributors, 0);
          setDeliveredOrders((current) =>
            current.map((entry) =>
              entry.id === id ? { ...entry, items: mapped.items } : entry,
            ),
          );
          return;
        }
        const mapped = mapApiDistributorOrder(detail, distributors, 0);
        setInProgress((current) =>
          current.map((entry) =>
            entry.id === id ? { ...entry, items: mapped.items } : entry,
          ),
        );
      })
      .catch((error) => {
        notifyApiError(error, "Failed to load order details.");
      })
      .finally(() => {
        setDetailLoadingId((current) => (current === id ? null : current));
      });
  }

  function invoiceForDistributor(key: string) {
    const group =
      activeDemand?.sentGroups.find((entry) => reviewGroupKey(entry) === key) ??
      reviewGroups.find((entry) => reviewGroupKey(entry) === key);
    if (!group) return;
    openOrderInvoice(
      createPlacedOrderFromReviewGroup(
        group,
        activeDemand?.id ?? nextDeliveryId(inProgress),
        expectedDeliveryLabel,
        activeDeliveryDateId,
      ),
    );
  }

  if (view === "manual") {
    if (!orderCatalogReady) {
      return (
        <div className="flex min-h-0 flex-1 flex-col bg-[#FAFAFA] p-4 md:p-7">
          <AppLoader variant="table" label="Loading order form" />
        </div>
      );
    }
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
                        const orders =
                          request.scope === "all"
                            ? filterPlacedOrders(inProgress, {
                                search: "",
                                productFilter: "",
                                distributorFilter: "",
                              })
                            : filterPlacedOrders(inProgress, {
                                search,
                                productFilter,
                                distributorFilter,
                                deliveryDateId: activeDeliveryDateId,
                              });
                        const demand =
                          request.scope === "all"
                            ? demandOrders.flatMap((order) =>
                                previewRowsForOrder(order),
                              )
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
                    onClick={() => shiftDeliveryDate(-1)}
                  >
                    <ChevronLeft size={14} />
                  </DateNavButton>
                  <DateNavButton
                    aria-label="Next dates"
                    disabled={!canShiftChipsForward}
                    onClick={() => shiftDeliveryDate(1)}
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

              {!demandReady ? (
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
                        loadingId={detailLoadingId}
                        onToggle={(id) => togglePlacedOrder(id)}
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
                        onClick={openListedOrder}
                        disabled={visibleDemandOrders.length === 0}
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
                        <div className="px-4 py-12 text-center text-[14px] text-[#8A8A8A]">
                          {getOrderDemandEmptyMessage(orderDemandCriteria)}
                        </div>
                      ) : (
                        filteredPreview.map((row) => (
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
                          loadingId={detailLoadingId}
                          onToggle={(id) => togglePlacedOrder(id, true)}
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
                ? inProgressWindow.hasMore
                : deliveredWindow.hasMore
            }
            loading={false}
            loadedCount={
              tab === "Orders"
                ? inProgressWindow.loadedCount
                : deliveredWindow.loadedCount
            }
            onLoadMore={() => {
              if (tab !== "Orders") deliveredWindow.loadMore();
              else inProgressWindow.loadMore();
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
          {prepSections.map(({ category, rows: sectionRows }) => {
            if (sectionRows.length === 0) return null;
            return (
              <section key={category} className="mb-7">
                <h2 className="mb-3 text-[22px] font-semibold tracking-tight text-[#111118]">
                  {category}
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
                    onClick={() => calculateQty(category)}
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
                            ? option.unit
                              ? `${money(option.price)} / ${option.unit}`
                              : money(option.price)
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
                const key = reviewGroupKey(group);
                const ordered = orderedDistributors.has(key);
                return (
                  <div
                    key={key}
                    className="rounded-[12px] border border-[#00000014] bg-white px-4 py-3.5"
                  >
                    <h3 className="mb-0.5 text-[18px] font-semibold tracking-tight text-[#111118]">
                      {group.source}
                    </h3>
                    <p className="mb-1 text-[12px] text-[#8A8A8A]">
                      {group.distributor}
                    </p>
                    <div>
                      {group.items.map((item) => (
                        <div
                          key={`${key}-${item.itemName}`}
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
                                Order sent to{" "}
                                <span className="font-semibold">
                                  {group.source}
                                </span>
                                {group.email !== "N/A" ? (
                                  <span className="text-[#8A8A8A]">
                                    {" "}
                                    ({group.email})
                                  </span>
                                ) : null}
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
                                onClick={() => invoiceForDistributor(key)}
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
                              disabled={placing !== null}
                              onClick={() => submitDistributorOrder(key)}
                              className="font-semibold"
                            >
                              {placing === key ? "Sending..." : "Order now"}
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
                  const submitted = orderedDistributors.has(
                    reviewGroupKey(group),
                  );
                  return (
                    <div
                      key={`sum-${reviewGroupKey(group)}`}
                      className="flex items-center justify-between gap-3 border-b border-[#00000014] py-3 text-[13px]"
                    >
                      <div className="min-w-0">
                        <div className="truncate font-medium text-[#111118]">
                          {group.source}
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
          <Button
            variant="ghost"
            disabled={placing !== null}
            onClick={() => setConfirmClose(true)}
          >
            Cancel & Close
          </Button>
          <Button
            variant="primary"
            size="lg"
            disabled={
              placing !== null ||
              (view === "orderList" ? !canReview : !canOrderAll)
            }
            onClick={() => {
              if (view === "review") orderAll();
              else setView("review");
            }}
            className="font-semibold"
          >
            {view === "review"
              ? placing === "all"
                ? "Sending..."
                : "Order All"
              : "Review Order"}
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

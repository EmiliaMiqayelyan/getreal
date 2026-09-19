import { useEffect, useMemo, useState } from "react";
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
import { DateNavButton, CalendarIcon, DATE_NAV_GROUP } from "@/components/shared/DateNavButton";
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
  ORDER_LIST_ITEMS,
} from "@/constants/distributorOrders";
import { useAppCatalog } from "@/context/AppCatalogContext";
import { useApiFeedback } from "@/hooks/useApiFeedback";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { downloadListExport, isApiConfigured, ordersApi } from "@/lib/api";
import { syncReviewGroupOrder } from "@/lib/api/orderSync";
import type {
  ManualOrderDraft,
  OrderCategory,
  PlacedOrder,
  ReviewGroup,
  WorkingOrderRow,
} from "@/types/distributorOrder";
import type { ExportRequest } from "@/types/export";
import { cn } from "@/utils/cn";
import { findByEntityRef } from "@/utils/entityIds";
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
  makeWorkingRowsForDate,
  nextDeliveryId,
  productFilterOptions,
  sortDeliveredOrders,
  uniqueDeliveredFieldValues,
} from "@/utils/distributorOrdersPage";
import {
  formatDeliveryChipLabel,
  formatExpectedDelivery,
  getDeliveryDatesInRange,
  getDeliveryWeekdayIndices,
  parseDeliveryDateId,
  toDeliveryDateId,
} from "@/utils/deliveryCalendar";

const LINK = "text-[13px] font-medium text-[#3B7DC4] hover:underline";
const DEFAULT_DELIVERY_DATE_ID = "2026-07-14";
const CHIP_WINDOW_SIZE = 3;
/** Right-side price cluster widths shared by review item rows. */
const REVIEW_QTY_W = "w-8";
const REVIEW_UNIT_W = "w-[4.75rem]";
const REVIEW_LINE_W = "w-[3.75rem]";
/** Shared prep-table tracks so QTY Needed steppers stay column-aligned across rows. */
const ORDER_PREP_COLS =
  "grid-cols-[minmax(0,1.3fr)_minmax(0,1.5fr)_minmax(0,0.85fr)_minmax(0,0.85fr)_minmax(0,0.95fr)_minmax(0,0.7fr)_120px]";

type View = "list" | "orderList" | "review" | "manual";
type Tab = "Orders" | "Delivered";

function money(value: number) {
  if (Number.isInteger(value)) return `$${value}`;
  return `$${value.toFixed(2).replace(/0$/, "").replace(/\.$/, "")}`;
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
    <ScrollTable minWidth={920}>
      <table className="w-full table-fixed border-collapse text-left">
        <colgroup>
          <col className="w-10" />
          <col className="w-[132px]" />
          <col className="w-[240px]" />
          <col className="w-[168px]" />
          <col className="w-[220px]" />
          <col className="w-[140px]" />
          <col />
          <col className="w-[100px]" />
        </colgroup>
        <thead>
          <tr className="border-b border-[#00000014] bg-white text-[11px] font-semibold tracking-[0.06em] text-[#2E2E2E] uppercase">
            <th className="py-[10px] pl-[23px] font-semibold" />
            <th className="py-[10px] pr-10 font-semibold">Delivery ID</th>
            <th className="py-[10px] pr-10 font-semibold">Distributor</th>
            <th className="py-[10px] pr-10 font-semibold">Order Date</th>
            <th className="py-[10px] pr-10 font-semibold">Delivery Date</th>
            <th className="py-[10px] pr-10 pl-6 font-semibold">Total Price</th>
            <th aria-hidden className="py-[10px]" />
            <th className="py-[10px] pr-[23px] text-right font-semibold">
              Invoice
            </th>
          </tr>
        </thead>
        {orders.map((order, orderIndex) => {
          const open = expandedId === order.id;
          return (
            <tbody
              key={`${order.id}-${order.deliveryId}-${orderIndex}`}
              className={cn(
                "border-b border-[#00000014]",
                open && "bg-[#F7F7F5]",
              )}
            >
              <tr>
                <td className="py-[10px] pl-[23px] align-middle">
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
                </td>
                <td className="py-[10px] pr-10 align-middle">
                  <IdPill>{order.deliveryId}</IdPill>
                </td>
                <td className="truncate py-[10px] pr-10 text-[13px] font-semibold text-[#111118] align-middle">
                  {order.distributor}
                </td>
                <td className="py-[10px] pr-10 text-[13px] text-[#4A4A4A] align-middle whitespace-nowrap">
                  {order.orderDate}
                </td>
                <td className="py-[10px] pr-10 text-[13px] text-[#4A4A4A] align-middle whitespace-nowrap">
                  {order.deliveryDate}
                </td>
                <td className="py-[10px] pr-10 pl-6 text-[13px] font-semibold text-[#111118] align-middle whitespace-nowrap">
                  {money(order.totalPrice)}
                </td>
                <td aria-hidden className="py-[10px]" />
                <td className="py-[10px] pr-[23px] text-right align-middle">
                  <button
                    type="button"
                    className={LINK}
                    aria-label={`Download invoice for ${order.distributor}`}
                    onClick={() => downloadOrderInvoice(order)}
                  >
                    Download
                  </button>
                </td>
              </tr>
              {open
                ? order.items.map((item, itemIndex) => (
                    <tr
                      key={`${order.id}-${item.sku}-${itemIndex}`}
                      className="border-t border-[#00000014] bg-[#FBF9F9]"
                    >
                      <td
                        colSpan={2}
                        className="py-[10px] pl-[23px] align-middle"
                      >
                        <IdPill>{item.sku}</IdPill>
                      </td>
                      <td className="truncate py-[10px] pr-10 text-[13px] text-[#111118] align-middle">
                        {item.itemName}
                      </td>
                      <td className="truncate py-[10px] pr-10 text-[13px] text-[#8A8A8A] align-middle">
                        {item.source}
                      </td>
                      <td className="py-[10px] pr-10 text-[13px] font-semibold text-[#111118] align-middle whitespace-nowrap">
                        {item.quantity}x
                      </td>
                      <td className="py-[10px] pr-10 pl-6 text-[13px] text-[#111118] align-middle whitespace-nowrap">
                        {money(item.price)}
                        {item.unit ? ` / ${item.unit}` : ""}
                      </td>
                      <td aria-hidden className="py-[10px]" />
                      <td className="py-[10px] pr-[23px]" />
                    </tr>
                  ))
                : null}
            </tbody>
          );
        })}
      </table>
    </ScrollTable>
  );
}

export default function ProductOrdersPage() {
  useDocumentTitle("Distributor Orders");
  const { distributors, products, isBootstrapping } = useAppCatalog();
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
  const [activeDeliveryDateId, setActiveDeliveryDateId] = useState(
    DEFAULT_DELIVERY_DATE_ID,
  );
  const [chipWindowStart, setChipWindowStart] = useState(0);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const [inProgress, setInProgress] = useState<PlacedOrder[]>([]);
  const [loading, setLoading] = useState(() => isApiConfigured());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedDeliveredId, setExpandedDeliveredId] = useState<string | null>(
    null,
  );

  const [rows, setRows] = useState<WorkingOrderRow[]>(() =>
    makeRows(DEFAULT_DELIVERY_DATE_ID),
  );
  const [orderedDistributors, setOrderedDistributors] = useState<Set<string>>(
    () => new Set(),
  );
  const [confirmClose, setConfirmClose] = useState(false);
  const [toast, setToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("Orders created successfully");

  const deliveryWeekdays = useMemo(
    () => getDeliveryWeekdayIndices(distributors, distributorFilter),
    [distributors, distributorFilter],
  );

  const deliveryDates = useMemo(() => {
    const start = new Date(2026, 5, 1);
    const end = new Date(2026, 7, 31);
    return getDeliveryDatesInRange(start, end, deliveryWeekdays);
  }, [deliveryWeekdays]);

  const visibleDeliveryChips = useMemo(() => {
    return deliveryDates
      .slice(chipWindowStart, chipWindowStart + CHIP_WINDOW_SIZE)
      .map((date) => {
        const id = toDeliveryDateId(date);
        return {
          id,
          label: formatDeliveryChipLabel(date),
          count: getOrderDemandCountForDate(id),
        };
      });
  }, [chipWindowStart, deliveryDates]);

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

  const orderDemandRows = useMemo(
    () => getOrderDemandForDate(activeDeliveryDateId),
    [activeDeliveryDateId],
  );

  const filteredPreview = useMemo(
    () => filterOrderDemandRows(orderDemandRows, orderDemandCriteria),
    [orderDemandCriteria, orderDemandRows],
  );

  const productOptions = useMemo(
    () => productFilterOptions(ORDER_LIST_ITEMS),
    [],
  );

  const showDistributorFilter = inProgress.length > 0;

  const canShiftChipsBack = chipWindowStart > 0;
  const canShiftChipsForward =
    chipWindowStart + CHIP_WINDOW_SIZE < deliveryDates.length;

  function selectDeliveryDate(dateId: string) {
    setActiveDeliveryDateId(dateId);
    const index = deliveryDates.findIndex((date) => toDeliveryDateId(date) === dateId);
    if (index === -1) return;
    if (index < chipWindowStart) {
      setChipWindowStart(index);
      return;
    }
    if (index >= chipWindowStart + CHIP_WINDOW_SIZE) {
      setChipWindowStart(
        Math.max(0, index - CHIP_WINDOW_SIZE + 1),
      );
    }
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
    if (deliveryDates.length === 0) return;

    const activeValid = deliveryDates.some(
      (date) => toDeliveryDateId(date) === activeDeliveryDateId,
    );
    if (activeValid) return;

    const fallback =
      deliveryDates.find(
        (date) => toDeliveryDateId(date) === DEFAULT_DELIVERY_DATE_ID,
      ) ?? deliveryDates[0];
    const fallbackId = toDeliveryDateId(fallback);
    const fallbackIndex = deliveryDates.indexOf(fallback);

    setActiveDeliveryDateId(fallbackId);
    setChipWindowStart(Math.max(0, fallbackIndex - 1));
  }, [deliveryDates, activeDeliveryDateId]);

  const filteredInProgress = useMemo(() => {
    const q = search.trim().toLowerCase();
    const seen = new Set<string>();
    return inProgress.filter((order) => {
      if (seen.has(order.id)) return false;
      seen.add(order.id);
      if (distributorFilter && order.distributor !== distributorFilter)
        return false;
      if (!q) return true;
      return (
        order.distributor.toLowerCase().includes(q) ||
        order.deliveryId.includes(q) ||
        order.items.some((item) => item.itemName.toLowerCase().includes(q))
      );
    });
  }, [inProgress, search, distributorFilter]);

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

  const deliveredZipOptions = useMemo(
    () => uniqueDeliveredFieldValues(DELIVERED_ORDERS, "zipCode"),
    [],
  );
  const deliveredDateOptions = useMemo(
    () => uniqueDeliveredFieldValues(DELIVERED_ORDERS, "day"),
    [],
  );

  const deliveredGroups = useMemo(() => {
    const filtered = filterDeliveredOrders(
      DELIVERED_ORDERS,
      deliveredFilterCriteria,
    );
    const sorted = sortDeliveredOrders(filtered, deliveredFilterCriteria.sortBy);
    return groupDeliveredOrders(sorted);
  }, [deliveredFilterCriteria]);

  const deliveredCount = useMemo(
    () =>
      deliveredGroups.reduce(
        (sum, group) =>
          sum +
          group.days.reduce((daySum, day) => daySum + day.orders.length, 0),
        0,
      ),
    [deliveredGroups],
  );

  const exportCount =
    tab === "Orders"
      ? inProgress.length > 0
        ? filteredInProgress.length
        : filteredPreview.length
      : deliveredCount;
  const exportFiltersActive =
    tab === "Orders"
      ? Boolean(search.trim() || productFilter || distributorFilter)
      : Boolean(
          search.trim() ||
            deliveredZipFilter ||
            deliveredDateFilter ||
            deliveredStatusFilter ||
            deliveredSort,
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
  const grandTotal = reviewGroups.reduce((sum, group) => sum + group.totalPrice, 0);
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
      ...DELIVERED_ORDERS.map((o) => o.distributor),
    ]);
    return Array.from(names).sort();
  }, [inProgress]);

  useEffect(() => {
    if (!isApiConfigured()) {
      setLoading(false);
      return;
    }
    // Wait for catalog bootstrap so mapping uses API distributors/products.
    if (isBootstrapping) return;

    let cancelled = false;

    void ordersApi
      .list({ page: 1, limit: 50, type: "distributor" })
      .then((result) => {
        if (cancelled) return;
        const remote = result.items;
        if (remote.length === 0) return;

        const mapped: PlacedOrder[] = remote.map((order, index) => {
          const distributorName =
            findByEntityRef(distributors, order.distributorId)?.name ??
            order.distributorId ??
            "Distributor";
          const lines = (order.items ?? []).map((line) => {
            const product = findByEntityRef(products, line.productId);
            return {
              sku: line.productId ?? "",
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
          return {
            id: order.id ?? `API-DO-${index + 1}`,
            deliveryId: order.id ?? `API-DO-${index + 1}`,
            distributor: distributorName,
            orderDate: order.createdAt
              ? new Date(order.createdAt).toLocaleDateString()
              : "",
            deliveryDate: order.deliveryDate
              ? new Date(order.deliveryDate).toLocaleDateString()
              : "",
            totalPrice,
            items: lines,
          };
        });

        setInProgress((prev) => appendInProgressOrders(prev, mapped));
      })
      .catch((error) => {
        if (cancelled) return;
        notifyApiError(error, "Failed to load distributor orders.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // Fetch once after bootstrap. Do not refetch when catalog arrays change identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBootstrapping]);

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
    setInProgress((prev) =>
      appendInProgressOrders(prev, [order]),
    );
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

    const group = reviewGroups.find((entry) => entry.distributor === distributor);
    if (!group) return;

    const order = createPlacedOrderFromReviewGroup(
      group,
      nextDeliveryId(inProgress),
      expectedDeliveryLabel,
    );

    setInProgress((prev) =>
      appendInProgressOrders(prev, [order]),
    );
    syncReviewGroupOrder(group, distributors, products);
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
      );
      deliveryCounter = [order, ...deliveryCounter];
      return order;
    });

    setInProgress((prev) =>
      appendInProgressOrders(prev, created),
    );
    for (const group of remaining) {
      syncReviewGroupOrder(group, distributors, products);
    }
    setOrderedDistributors(new Set(reviewGroups.map((group) => group.distributor)));
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
                        await downloadListExport(
                          "/orders",
                          { type: "distributor" },
                          request.format,
                          "orders",
                        );
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
                      await downloadListExport(
                        "/orders",
                        { type: "distributor" },
                        request.format,
                        "orders",
                      );
                    }}
                    className="w-full sm:ml-auto sm:w-auto"
                  />
                </>
              )}
            </div>
          }
          below={
            <Tabs
              aria-label="Order views"
              items={[
                { id: "Orders", label: "Orders" },
                { id: "Delivered", label: "Delivered" },
              ]}
              value={tab}
              onChange={(id) => setTab(id as "Orders" | "Delivered")}
            />
          }
        />

        <div className="min-h-0 flex-1 overflow-y-auto bg-[#FAFAFA] px-4 py-5 md:px-7">
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
                <div className={cn("relative z-20 shrink-0", DATE_NAV_GROUP)}>
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
                      deliveryWeekdays={deliveryWeekdays}
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
                    orders={filteredInProgress}
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
                <ScrollTable minWidth={860}>
                  <div className="grid grid-cols-[2fr_1.1fr_0.8fr_1.2fr_1.3fr] items-center gap-4 border-b border-[#00000014] bg-[#FAFAF8] px-5 py-2.5 text-[11px] font-semibold tracking-[0.06em] text-[#2E2E2E] uppercase">
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
                    filteredPreview.map((row) => (
                      <div
                        key={row.id}
                        className="grid min-h-[48px] grid-cols-[2fr_1.1fr_0.8fr_1.2fr_1.3fr] items-center gap-4 border-b border-[#00000014] px-5 text-[13px] font-medium text-[#111118] last:border-b-0"
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
      <div className="shrink-0 border-b border-[#00000014] bg-white px-4 py-5 md:px-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[28px] font-semibold tracking-tight text-[#111118]">
              {view === "review" ? "Review Order" : "Order List"}
            </h1>
            <p className="mt-1 text-[13px] text-[#8A8A8A]">
              {view === "review" ? "Orders for" : "Item orders for"}{" "}
              <span className="font-semibold text-[#111118]">
                {activeDeliveryLabel} delivery
              </span>
            </p>
          </div>
          <UserMenu className="items-center" />
        </div>
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
                <div className="overflow-x-auto overscroll-x-contain">
                  <div className="w-full" style={{ minWidth: 980 }}>
                    <div
                      className={cn(
                        "mb-1.5 grid items-center gap-3 px-4",
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
                    <div className="overflow-hidden rounded-[12px] border border-[#00000014] bg-white">
                      <div
                        className={cn(
                          "grid gap-3 border-b border-[#00000014] px-4 py-3 text-[11px] font-semibold tracking-[0.06em] text-[#2E2E2E] uppercase",
                          ORDER_PREP_COLS,
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
                              "grid items-center gap-3 border-b border-[#00000014] px-4 py-3.5 last:border-b-0",
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
                    </div>
                  </div>
                </div>
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
                          className="flex items-center gap-3 border-b border-[#00000014] py-2.5 text-[12px]"
                        >
                          <span className="min-w-0 flex-[1.15] truncate text-[#111118]">
                            {item.itemName}
                          </span>
                          <span className="min-w-0 flex-1 truncate text-[#8A8A8A]">
                            {item.source}
                          </span>
                          <div className="ml-auto flex shrink-0 items-center gap-4">
                            <span
                              className={cn(
                                REVIEW_QTY_W,
                                "text-right font-medium text-[#111118]",
                              )}
                            >
                              {item.quantity}x
                            </span>
                            <span
                              className={cn(
                                REVIEW_UNIT_W,
                                "whitespace-nowrap text-right text-[#111118]",
                              )}
                            >
                              {money(item.price)}
                              {item.unit ? ` / ${item.unit}` : ""}
                            </span>
                            <span
                              className={cn(
                                REVIEW_LINE_W,
                                "text-right font-semibold whitespace-nowrap text-[#111118]",
                              )}
                            >
                              {money(item.lineTotal)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between gap-3 pt-3">
                      <div className="flex min-w-0 flex-wrap items-center gap-2.5">
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
                                  const placed =
                                    findPlacedOrderForDistributor(
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
                      <div
                        className={cn(
                          REVIEW_LINE_W,
                          "shrink-0 text-right text-[16px] font-semibold text-[#111118]",
                        )}
                      >
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

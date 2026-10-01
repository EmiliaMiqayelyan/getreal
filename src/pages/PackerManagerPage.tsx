import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Package,
} from "lucide-react";

import { DeliveryDateCalendar } from "@/components/orders/DeliveryDateCalendar";
import { Header } from "@/components/layout/AdminHeader";
import { DateNavButton, CalendarIcon, DATE_NAV_GROUP } from "@/components/shared/DateNavButton";
import {
  DeliveryDateChip,
  DATE_CHIP_ROW,
  DATE_CHIP_SCROLL,
} from "@/components/shared/DeliveryDateChip";
import { IdPill } from "@/components/ui/Badge";
import { AppLoader } from "@/components/ui/AppLoader";
import { ScrollTable } from "@/components/ui/ScrollTable";
import { SearchField } from "@/components/ui/SearchField";
import { Select } from "@/components/ui/Select";
import { usePackingHandoff } from "@/context/PackingHandoffContext";
import { useApiFeedback } from "@/hooks/useApiFeedback";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useFloatingMenu } from "@/hooks/useFloatingMenu";
import { useLazyWindow } from "@/hooks/useLazyWindow";
import { InfiniteScrollSentinel } from "@/components/ui/InfiniteScrollSentinel";
import { PINNED_HEADER } from "@/constants/table";
import { isApiConfigured, ordersApi, usersApi } from "@/lib/api";
import { orderModelId, orderRecordId } from "@/lib/api/mappers";
import type { ApiOrder } from "@/lib/api/types";
import { cn } from "@/utils/cn";
import { isUuid } from "@/utils/entityIds";
import { floatingMenuStyle } from "@/utils/floatingMenu";
import {
  deliveryDateIdFromValue,
  formatDeliveryChipLabel,
  formatTodayLabel,
  parseDeliveryDateId,
} from "@/utils/deliveryCalendar";

const MUTED_HEADER =
  "text-[11px] font-semibold tracking-[0.06em] text-[#2E2E2E] uppercase";

/** Eligible packing-role users only (§6). */
type Packer = {
  id: string;
  name: string;
  code: string;
  role: "packer";
};

type ManagerOrder = {
  id: string;
  recordId?: string;
  customer: string;
  code: string;
  itemCount: number;
  deliveryDate: string;
  deliveryDateId: string;
  packerId?: string;
};

/** Eligible packing-role users only (§6). Temporary seed - one packer. */
const ELIGIBLE_PACKERS: Packer[] = [];

/** Temporary seed - one order sample. */
const INITIAL_ORDERS: ManagerOrder[] = [];

const ROW_GRID =
  "grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,0.8fr)_minmax(0,0.8fr)_minmax(0,0.8fr)] items-center gap-x-4 px-4";

const ASSIGN_PANEL_WIDTH = 300;

function AssignPackerMenu({
  anchor,
  packers,
  onChoose,
  onClose,
}: {
  anchor: HTMLElement;
  packers: (Packer & { orderCount: number })[];
  onChoose: (packer: Packer) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const panelRef = useRef<HTMLDivElement>(null);
  const anchorRef = useRef(anchor);
  anchorRef.current = anchor;
  const menuBox = useFloatingMenu(true, anchorRef, panelRef, {
    width: ASSIGN_PANEL_WIDTH,
    maxHeight: 320,
  });

  const filtered = packers.filter((packer) => {
    const q = query.trim().toLowerCase();
    return (
      !q ||
      packer.name.toLowerCase().includes(q) ||
      packer.code.toLowerCase().includes(q)
    );
  });

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (panelRef.current?.contains(target) || anchor.contains(target)) return;
      onClose();
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [anchor, onClose]);

  return createPortal(
    <div
      ref={panelRef}
      role="listbox"
      aria-label="Assign packer"
      data-scroll-lock-allow
      className="ui-select-menu fixed z-[80] overflow-x-hidden overflow-y-auto overscroll-contain rounded-[10px] border border-[#00000014] bg-white shadow-[0_12px_32px_rgba(0,0,0,0.14)]"
      style={floatingMenuStyle(menuBox)}
    >
      <div className="sticky top-0 border-b border-[#00000014] bg-white p-2.5">
        <div className="relative">
          <SearchField
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search"
            fill
          />
        </div>
      </div>
      {filtered.map((packer) => (
        <button
          key={packer.id}
          type="button"
          onClick={() => onChoose(packer)}
          className="grid w-full grid-cols-[1fr_auto_auto] items-center gap-3 border-b border-[#00000014] px-3 py-2.5 text-left last:border-b-0 hover:bg-[#FAFAF8]"
        >
          <span className="text-[13px] font-medium text-[#111118]">
            {packer.name}
          </span>
          <span className="text-[12px] text-[#8A8A8A]">
            {packer.orderCount === 0
              ? "No orders"
              : `${packer.orderCount} order${packer.orderCount === 1 ? "" : "s"}`}
          </span>
          <IdPill>{packer.code}</IdPill>
        </button>
      ))}
      {!filtered.length ? (
        <div className="px-3 py-4 text-center text-[12px] text-[#8A8A8A]">
          No packers found
        </div>
      ) : null}
    </div>,
    document.body,
  );
}

function orderCustomerName(order: ApiOrder) {
  const raw = order as ApiOrder & {
    customerName?: string;
    customer?: { name?: string; firstName?: string; lastName?: string };
  };
  const users = Array.isArray(order.users) ? order.users[0] : order.users;
  const joined = [users?.firstName, users?.lastName].filter(Boolean).join(" ");
  return (
    joined ||
    users?.name?.trim() ||
    raw.customerName?.trim() ||
    [raw.customer?.firstName, raw.customer?.lastName].filter(Boolean).join(" ") ||
    raw.customer?.name ||
    "N/A"
  );
}

function mapManagerOrder(order: ApiOrder, index: number): ManagerOrder {
  const code = orderModelId(order, `ORD-${index + 1}`);
  const itemCount = (order.items ?? []).reduce(
    (sum, line) => sum + (line.quantity ?? 0),
    0,
  );
  const deliveryDate = order.deliveryDate ? new Date(order.deliveryDate) : null;
  const hasDelivery =
    deliveryDate != null && !Number.isNaN(deliveryDate.getTime());
  return {
    id: code,
    recordId: orderRecordId(order),
    customer: orderCustomerName(order),
    code,
    itemCount: itemCount || (order.items?.length ?? 0),
    deliveryDate: hasDelivery ? deliveryDate.toLocaleDateString() : "",
    deliveryDateId: deliveryDateIdFromValue(order.deliveryDate),
    packerId: order.packerId ?? undefined,
  };
}

export default function PackerManagerPage() {
  useDocumentTitle("Packer Manager");

  const { packingByCode, assignPacker: assignPackerHandoff } =
    usePackingHandoff();
  const { notifyApiError } = useApiFeedback();

  const [orders, setOrders] = useState(INITIAL_ORDERS);
  const [loading, setLoading] = useState(() => isApiConfigured());
  const [packers, setPackers] = useState(ELIGIBLE_PACKERS);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("");
  const [activeDateId, setActiveDateId] = useState("");
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [assignMenu, setAssignMenu] = useState<{
    orderId: string;
    code: string;
    anchor: HTMLElement;
  } | null>(null);

  const deliveryChips = useMemo(() => {
    const counts = new Map<string, number>();
    for (const order of orders) {
      if (!order.deliveryDateId) continue;
      counts.set(
        order.deliveryDateId,
        (counts.get(order.deliveryDateId) ?? 0) + 1,
      );
    }
    return [...counts.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([id, count]) => {
        const date = parseDeliveryDateId(id);
        return {
          id,
          label: date ? formatDeliveryChipLabel(date) : id,
          count,
        };
      });
  }, [orders]);

  useEffect(() => {
    if (!isApiConfigured()) return;
    let cancelled = false;
    void Promise.all([
      ordersApi.list({ type: "standard", limit: 100 }),
      usersApi.list({ role: "packer", limit: 100 }),
    ])
      .then(([orderPage, userPage]) => {
        if (cancelled) return;
        setOrders(orderPage.items.map(mapManagerOrder));
        const nextPackers = userPage.items
          .map((user) => {
            const id = user.id?.trim() ?? "";
            if (!isUuid(id)) return null;
            return {
              id,
              name: user.name?.trim() || "N/A",
              code: user.userCode?.trim() || id.slice(0, 8),
              role: "packer" as const,
            };
          })
          .filter((packer): packer is Packer => packer != null);
        setPackers(nextPackers);
      })
      .catch((error) => {
        if (!cancelled) notifyApiError(error, "Failed to load packer orders.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [notifyApiError]);

  const packersWithWorkload = useMemo(() => {
    return packers.map((packer) => ({
      ...packer,
      orderCount: Object.values(packingByCode).filter(
        (entry) => entry.packerId === packer.id,
      ).length,
    }));
  }, [packers, packingByCode]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();

    let next = orders
      .filter((order) => {
        const handoff = packingByCode[order.code];
        const packerName = handoff?.packerName ?? "";
        const matchesDate =
          !activeDateId ||
          !order.deliveryDateId ||
          order.deliveryDateId === activeDateId;
        const matchesSearch =
          !q ||
          order.customer.toLowerCase().includes(q) ||
          order.code.toLowerCase().includes(q) ||
          packerName.toLowerCase().includes(q);
        return matchesDate && matchesSearch;
      })
      .map((order) => {
        const handoff = packingByCode[order.code];
        return {
          ...order,
          packerId: handoff?.packerId,
          packerName: handoff?.packerName,
          packingStartedAt: handoff?.packingStartedAt,
          coolerReadyAt: handoff?.coolerReadyAt ?? handoff?.packedAt,
          loadedAt: handoff?.loadedAt,
        };
      });

    if (sortBy === "assigned-first") {
      next = [...next].sort(
        (a, b) => Number(Boolean(b.packerId)) - Number(Boolean(a.packerId)),
      );
    } else if (sortBy === "name") {
      next = [...next].sort((a, b) => a.customer.localeCompare(b.customer));
    }

    return next;
  }, [orders, packingByCode, search, sortBy, activeDateId]);

  const listWindow = useLazyWindow(rows, `${search}|${sortBy}|${activeDateId}`);

  function cycleChip(delta: number) {
    if (deliveryChips.length === 0) return;
    const index = Math.max(
      0,
      deliveryChips.findIndex((chip) => chip.id === activeDateId),
    );
    const next =
      (index + delta + deliveryChips.length) % deliveryChips.length;
    setActiveDateId(deliveryChips[next]!.id);
  }

  function handleAssign(orderCode: string, packer: Packer) {
    const order = orders.find((entry) => entry.code === orderCode);
    if (isApiConfigured()) {
      if (!order?.recordId || !isUuid(packer.id)) {
        notifyApiError(
          new Error("This order or packer is missing a server id."),
          "This order or packer is missing a server id.",
        );
        return;
      }
      void ordersApi.assignPacker(order.recordId, packer.id).catch((error) => {
        notifyApiError(error, "Failed to assign packer.");
      });
    }
    assignPackerHandoff(orderCode, {
      packerId: packer.id,
      packerName: packer.name,
    });
    setOrders((current) =>
      current.map((entry) =>
        entry.code === orderCode ? { ...entry, packerId: packer.id } : entry,
      ),
    );
    setAssignMenu(null);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#FAFAFA]">
      <Header
        title="Packer Manager"
        toolbar={
          <div className="flex w-full flex-wrap items-center gap-2 md:flex-nowrap">
            <SearchField
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search"
            />
            <Select
              value={sortBy}
              onChange={setSortBy}
              aria-label="Sort by"
              className="w-full sm:w-[140px]"
              options={[
                { value: "", label: "Sort by" },
                { value: "name", label: "Customer" },
                { value: "assigned-first", label: "Assigned first" },
              ]}
            />
            <div className="ml-auto text-[12px] text-[#8A8A8A]">
              {formatTodayLabel()}
            </div>
          </div>
        }
      />

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#FAFAFA] px-4 py-5 md:px-7 md:py-5">
        <div className={DATE_CHIP_ROW}>
          <div className={DATE_CHIP_SCROLL}>
            {deliveryChips.map((chip) => (
                <DeliveryDateChip
                  key={chip.id}
                  label={chip.label}
                  count={chip.count}
                  active={activeDateId === chip.id}
                  onClick={() => setActiveDateId(chip.id)}
                />
            ))}
          </div>

          <div className={cn("relative shrink-0", DATE_NAV_GROUP)}>
            <DateNavButton
              aria-label="Previous dates"
              onClick={() => cycleChip(-1)}
            >
              <ChevronLeft size={14} />
            </DateNavButton>
            <DateNavButton
              aria-label="Next dates"
              onClick={() => cycleChip(1)}
            >
              <ChevronRight size={14} />
            </DateNavButton>
            <DateNavButton
              aria-label="Calendar"
              aria-expanded={calendarOpen}
              onClick={() => setCalendarOpen((open) => !open)}
            >
              <CalendarIcon />
            </DateNavButton>

            {calendarOpen ? (
              <DeliveryDateCalendar
                selectedDateId={activeDateId}
                initialMonth={parseDeliveryDateId(activeDateId) ?? new Date()}
                onSelectDate={(dateId) => {
                  setActiveDateId(dateId);
                  setCalendarOpen(false);
                }}
                onClose={() => setCalendarOpen(false)}
              />
            ) : null}
          </div>
        </div>

        {loading ? (
          <AppLoader variant="table" label="Loading orders" className="mt-4" />
        ) : (
        <>
        <ScrollTable fill minWidth={960} className="mt-4">
          <div
            className={cn(
              ROW_GRID,
              MUTED_HEADER,
              PINNED_HEADER,
              "h-10 border-b border-[#00000014]",
            )}
          >
            <div>Customer Order ID</div>
            <div>Assign Packer</div>
            <div>Packing Started</div>
            <div>Cooler Ready</div>
            <div>Loaded</div>
          </div>

          {listWindow.visible.map((order) => {
            const assigned = packersWithWorkload.find(
              (packer) => packer.id === order.packerId,
            );

            return (
              <div
                key={order.id}
                className={cn(
                  ROW_GRID,
                  "min-h-[88px] border-b border-[#00000014] py-4 last:border-b-0",
                )}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1 text-[14px] font-semibold text-[#111118]">
                    {order.customer}
                    <ChevronRight size={14} className="text-[#A9A9A9]" />
                  </div>
                  <div className="mt-1.5 flex items-center gap-2">
                    <IdPill>{order.code}</IdPill>
                    <span className="text-[12px] text-[#8A8A8A]">
                      {order.itemCount} items
                    </span>
                  </div>
                </div>

                <div>
                  <button
                    type="button"
                    onClick={(event) => {
                      const anchor = event.currentTarget;
                      setAssignMenu((current) =>
                        current?.orderId === order.id
                          ? null
                          : {
                              orderId: order.id,
                              code: order.code,
                              anchor,
                            },
                      );
                    }}
                    className="inline-flex h-9 max-w-full items-center gap-2 rounded-[10px] border border-[#00000014] bg-white px-3 text-[13px] text-[#111118]"
                  >
                    <Package size={14} className="shrink-0 text-[#8A8A8A]" />
                    <span className="truncate">
                      {assigned?.name ?? order.packerName ?? "Assign Packer"}
                    </span>
                    <ChevronDown size={13} className="shrink-0 text-[#8A8A8A]" />
                  </button>
                  {assignMenu?.orderId === order.id ? (
                    <AssignPackerMenu
                      anchor={assignMenu.anchor}
                      packers={packersWithWorkload}
                      onClose={() => setAssignMenu(null)}
                      onChoose={(packer) => handleAssign(order.code, packer)}
                    />
                  ) : null}
                </div>

                <div className="text-[13px] text-[#111118]">
                  {order.packingStartedAt || "N/A"}
                </div>
                <div className="text-[13px] text-[#111118]">
                  {order.coolerReadyAt || "N/A"}
                </div>
                <div className="text-[13px] text-[#111118]">
                  {order.loadedAt || "N/A"}
                </div>
              </div>
            );
            })}
          <InfiniteScrollSentinel
            hasMore={listWindow.hasMore}
            loadedCount={listWindow.loadedCount}
            onLoadMore={listWindow.loadMore}
          />
        </ScrollTable>

        {!rows.length ? (
          <div className="mt-4 rounded-[10px] border border-[#00000014] bg-white px-6 py-12 text-center text-[14px] text-[#8A8A8A]">
            No orders match your filters.
          </div>
        ) : null}
        </>
        )}
      </div>
    </div>
  );
}

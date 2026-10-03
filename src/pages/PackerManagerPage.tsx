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
import { useRolesUsers } from "@/context/RolesUsersContext";
import { useApiFeedback } from "@/hooks/useApiFeedback";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useFloatingMenu } from "@/hooks/useFloatingMenu";
import { useLazyWindow } from "@/hooks/useLazyWindow";
import { InfiniteScrollSentinel } from "@/components/ui/InfiniteScrollSentinel";
import { PINNED_HEADER } from "@/constants/table";
import {
  createPackerManagerOrders,
  PACKER_MANAGER_API_ENABLED,
  workloadForPacker,
  type PackerManagerOrder,
} from "@/data/packerManager";
import { ELIGIBLE_PACKERS, type EligiblePacker } from "@/data/packers";
import { isApiConfigured, ordersApi, usersApi } from "@/lib/api";
import { orderModelId, orderRecordId } from "@/lib/api/mappers";
import type { ApiOrder, ApiUser, PaginatedResult } from "@/lib/api/types";
import type { PackingHandoffUpdate } from "@/types/packing";
import { cn } from "@/utils/cn";
import { isUuid } from "@/utils/entityIds";
import { floatingMenuStyle } from "@/utils/floatingMenu";
import {
  deliveryDateIdFromValue,
  formatTodayLabel,
  parseDeliveryDateId,
  shiftDateId,
  toDeliveryDateId,
  upcomingWednesday,
  weekWindowChips,
} from "@/utils/deliveryCalendar";
import { displayOperationalTimestamp } from "@/utils/packingTime";

const MUTED_HEADER =
  "text-[11px] font-semibold tracking-[0.06em] text-[#2E2E2E] uppercase";

/** Live orders and packers when the API URL is set. Timestamps stay read-only. */
function packerManagerApiLive() {
  return PACKER_MANAGER_API_ENABLED && isApiConfigured();
}

const PAGE_LIMIT = 100;

async function listAllPages<T>(
  load: (page: number) => Promise<PaginatedResult<T>>,
) {
  const items: T[] = [];
  for (let page = 1; page < 50; page += 1) {
    const result = await load(page);
    items.push(...result.items);
    if (result.items.length < PAGE_LIMIT) break;
  }
  return items;
}

/** Calendar day from `YYYY-MM-DD` or an ISO timestamp, without a timezone shift. */
function orderDeliveryDateId(value?: string | null) {
  const day = /^(\d{4}-\d{2}-\d{2})/.exec(value?.trim() ?? "");
  return day?.[1] ?? deliveryDateIdFromValue(value);
}

const ROW_GRID =
  "grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,0.8fr)_minmax(0,0.8fr)_minmax(0,0.8fr)] items-center gap-x-4 px-4";

const ASSIGN_PANEL_WIDTH = 300;

function itemLabel(count: number) {
  return `${count} ${count === 1 ? "item" : "items"}`;
}

function AssignPackerMenu({
  anchor,
  packers,
  onChoose,
  onClose,
}: {
  anchor: HTMLElement;
  packers: (EligiblePacker & { orderCount: number })[];
  onChoose: (packer: EligiblePacker) => void;
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
          role="option"
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
          {packer.code ? <IdPill>{packer.code}</IdPill> : null}
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

function packerNameFromOrder(order: ApiOrder) {
  const packer = order.packer;
  if (!packer) return undefined;
  const joined = [packer.firstName, packer.lastName].filter(Boolean).join(" ");
  return packer.name?.trim() || joined || undefined;
}

function packerCodeFromUser(user: ApiUser) {
  const raw = user as ApiUser & { packerCode?: string | null; staffCode?: string | null };
  return (
    raw.userCode?.trim() ||
    raw.packerCode?.trim() ||
    raw.staffCode?.trim() ||
    ""
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

/** Adapter for GET /orders. Timestamps are displayed, never edited here. */
function mapManagerOrder(order: ApiOrder, index: number): PackerManagerOrder {
  const code = orderModelId(order, `ORD-${index + 1}`);
  const lines = order.items ?? [];
  const deliveryDateId = orderDeliveryDateId(order.deliveryDate);
  const deliveryDate = parseDeliveryDateId(deliveryDateId);
  return {
    id: code,
    recordId: orderRecordId(order),
    customer: orderCustomerName(order),
    code,
    itemCount: lines.length,
    deliveryDate: deliveryDate ? deliveryDate.toLocaleDateString() : "",
    deliveryDateId,
    packerId: order.packerId ?? order.packer?.id ?? undefined,
    packerName: packerNameFromOrder(order),
    packingStartedAt: displayOperationalTimestamp(order.packingStartedAt),
    coolerReadyAt: displayOperationalTimestamp(order.coolerReadyAt),
    loadedAt: displayOperationalTimestamp(order.loadedAt),
  };
}

function withLiveAssignment(
  order: PackerManagerOrder,
  handoff: PackingHandoffUpdate | undefined,
): PackerManagerOrder {
  if (!handoff) return order;
  return {
    ...order,
    packerId: handoff.packerId ?? order.packerId,
    packerName: handoff.packerName || order.packerName,
    packingStartedAt: handoff.packingStartedAt ?? order.packingStartedAt,
    coolerReadyAt:
      handoff.coolerReadyAt ?? handoff.packedAt ?? order.coolerReadyAt,
    loadedAt: handoff.loadedAt ?? order.loadedAt,
  };
}

export default function PackerManagerPage() {
  useDocumentTitle("Packer Manager");

  const { packingByCode, assignPacker: assignPackerHandoff } =
    usePackingHandoff();
  const { sessionPermissions } = useRolesUsers();
  const canAssign = sessionPermissions.packerManagerAssignPacker;
  const { notifyApiError } = useApiFeedback();

  const apiLive = packerManagerApiLive();
  const [orders, setOrders] = useState(() =>
    apiLive ? [] : createPackerManagerOrders(),
  );
  const [loading, setLoading] = useState(apiLive);
  const [packers, setPackers] = useState(() =>
    apiLive ? [] : ELIGIBLE_PACKERS,
  );
  const [savingCode, setSavingCode] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("");
  const [activeDateId, setActiveDateId] = useState(() =>
    toDeliveryDateId(upcomingWednesday()),
  );
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
    return weekWindowChips(activeDateId, counts);
  }, [activeDateId, orders]);

  useEffect(() => {
    if (!apiLive) return;
    let cancelled = false;
    void Promise.all([
      listAllPages((page) =>
        ordersApi.list({ type: "standard", page, limit: PAGE_LIMIT }),
      ),
      listAllPages((page) =>
        usersApi.list({ role: "packer", page, limit: PAGE_LIMIT }),
      ),
    ])
      .then(([orderItems, userItems]) => {
        if (cancelled) return;
        setOrders(orderItems.map(mapManagerOrder));
        const nextPackers = userItems
          .map((user) => {
            const id = user.id?.trim() ?? "";
            const role = user.role?.trim().toLowerCase();
            if (!isUuid(id)) return null;
            if (role && role !== "packer") return null;
            const name =
              user.name?.trim() ||
              [user.firstName, user.lastName].filter(Boolean).join(" ") ||
              "N/A";
            return {
              id,
              name,
              code: packerCodeFromUser(user),
              role: "packer" as const,
              outsideOrderCount: 0,
            };
          })
          .filter((packer): packer is EligiblePacker => packer != null);
        setPackers(nextPackers);
      })
      .catch((error) => {
        if (!cancelled) {
          setOrders([]);
          setPackers([]);
          notifyApiError(error, "Failed to load packer orders.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [apiLive, notifyApiError]);

  const liveCatalog = useMemo(
    () =>
      orders.map((order) =>
        withLiveAssignment(order, packingByCode[order.code]),
      ),
    [orders, packingByCode],
  );

  const packersWithWorkload = useMemo(() => {
    return packers
      .filter((packer) => packer.role === "packer")
      .map((packer) => ({
        ...packer,
        orderCount: workloadForPacker(packer, liveCatalog),
      }));
  }, [packers, liveCatalog]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();

    let next = liveCatalog.filter((order) => {
      const matchesDate = order.deliveryDateId === activeDateId;
      const matchesSearch =
        !q ||
        order.customer.toLowerCase().includes(q) ||
        order.code.toLowerCase().includes(q) ||
        (order.packerName ?? "").toLowerCase().includes(q);
      return matchesDate && matchesSearch;
    });

    if (sortBy === "assigned-first") {
      next = [...next].sort(
        (a, b) => Number(Boolean(b.packerId)) - Number(Boolean(a.packerId)),
      );
    } else if (sortBy === "unassigned-first") {
      next = [...next].sort(
        (a, b) => Number(Boolean(a.packerId)) - Number(Boolean(b.packerId)),
      );
    } else if (sortBy === "name") {
      next = [...next].sort((a, b) => a.customer.localeCompare(b.customer));
    }

    return next;
  }, [liveCatalog, search, sortBy, activeDateId]);

  const listWindow = useLazyWindow(rows, `${search}|${sortBy}|${activeDateId}`);

  function cycleChip(delta: number) {
    setActiveDateId((current) => shiftDateId(current, delta * 7));
  }

  async function handleAssign(orderCode: string, packer: EligiblePacker) {
    if (!canAssign || savingCode) return;
    const order = orders.find((entry) => entry.code === orderCode);
    setAssignMenu(null);

    if (apiLive) {
      if (!order?.recordId || !isUuid(packer.id)) {
        notifyApiError(
          new Error("This order or packer is missing a server id."),
          "This order or packer is missing a server id.",
        );
        return;
      }
      setSavingCode(orderCode);
      try {
        const updated = await ordersApi.assignPacker(order.recordId, packer.id);
        const mapped = mapManagerOrder(updated, 0);
        setOrders((current) =>
          current.map((entry) =>
            entry.code === orderCode
              ? {
                  ...entry,
                  packerId: mapped.packerId ?? packer.id,
                  packerName: mapped.packerName || packer.name,
                  packingStartedAt:
                    mapped.packingStartedAt ?? entry.packingStartedAt,
                  coolerReadyAt: mapped.coolerReadyAt ?? entry.coolerReadyAt,
                  loadedAt: mapped.loadedAt ?? entry.loadedAt,
                }
              : entry,
          ),
        );
        assignPackerHandoff(orderCode, {
          packerId: mapped.packerId ?? packer.id,
          packerName: mapped.packerName || packer.name,
        });
      } catch (error) {
        notifyApiError(error, "Failed to assign packer.");
      } finally {
        setSavingCode(null);
      }
      return;
    }

    assignPackerHandoff(orderCode, {
      packerId: packer.id,
      packerName: packer.name,
    });
    setOrders((current) =>
      current.map((entry) =>
        entry.code === orderCode
          ? { ...entry, packerId: packer.id, packerName: packer.name }
          : entry,
      ),
    );
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
              className="w-full sm:w-[160px]"
              options={[
                { value: "", label: "Sort by" },
                { value: "unassigned-first", label: "Unassigned first" },
                { value: "assigned-first", label: "Assigned first" },
                { value: "name", label: "Customer" },
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
            const packerLabel =
              assigned?.name ?? order.packerName ?? "Assign Packer";

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
                      {itemLabel(order.itemCount)}
                    </span>
                  </div>
                </div>

                <div>
                  <button
                    type="button"
                    disabled={!canAssign || savingCode === order.code}
                    aria-haspopup={canAssign ? "listbox" : undefined}
                    aria-expanded={
                      canAssign ? assignMenu?.orderId === order.id : undefined
                    }
                    title={
                      canAssign
                        ? "Assign packer"
                        : "Only a Packer Manager can assign a packer"
                    }
                    onClick={(event) => {
                      if (!canAssign) return;
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
                    className="inline-flex h-9 max-w-full items-center gap-2 rounded-[10px] border border-[#00000014] bg-white px-3 text-[13px] text-[#111118] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Package size={14} className="shrink-0 text-[#8A8A8A]" />
                    <span className="truncate">{packerLabel}</span>
                    <ChevronDown size={13} className="shrink-0 text-[#8A8A8A]" />
                  </button>
                  {canAssign && assignMenu?.orderId === order.id ? (
                    <AssignPackerMenu
                      anchor={assignMenu.anchor}
                      packers={packersWithWorkload}
                      onClose={() => setAssignMenu(null)}
                      onChoose={(packer) => handleAssign(order.code, packer)}
                    />
                  ) : null}
                </div>

                <div className="text-[13px] text-[#111118]">
                  {displayOperationalTimestamp(order.packingStartedAt) ?? ""}
                </div>
                <div className="text-[13px] text-[#111118]">
                  {displayOperationalTimestamp(order.coolerReadyAt) ?? ""}
                </div>
                <div className="text-[13px] text-[#111118]">
                  {displayOperationalTimestamp(order.loadedAt) ?? ""}
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

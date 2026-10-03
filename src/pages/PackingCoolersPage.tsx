import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import { DeliveryDateCalendar } from "@/components/orders/DeliveryDateCalendar";
import { Header } from "@/components/layout/AdminHeader";
import { UserMenu } from "@/components/layout/UserMenu";
import { DateNavButton, CalendarIcon, DATE_NAV_GROUP } from "@/components/shared/DateNavButton";
import {
  DeliveryDateChip,
  DATE_CHIP_ROW,
  DATE_CHIP_SCROLL,
} from "@/components/shared/DeliveryDateChip";
import { LocationHover } from "@/components/shared/LocationHover";
import { IdPill } from "@/components/ui/Badge";
import { AppLoader } from "@/components/ui/AppLoader";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ScrollTable } from "@/components/ui/ScrollTable";
import { SearchField } from "@/components/ui/SearchField";
import { Select } from "@/components/ui/Select";
import { PINNED_HEADER, TABLE_HEADER } from "@/constants/table";
import { usePackingHandoff } from "@/context/PackingHandoffContext";
import { useApiFeedback } from "@/hooks/useApiFeedback";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useFloatingMenu } from "@/hooks/useFloatingMenu";
import { useLazyWindow } from "@/hooks/useLazyWindow";
import { InfiniteScrollSentinel } from "@/components/ui/InfiniteScrollSentinel";
import {
  categoryForItem,
  createPackingOrders,
  PACKING_COOLERS,
  sourcesForItem,
} from "@/data/packingInventory";
import { coolersApi, inventoryApi, isApiConfigured, ordersApi, productsApi } from "@/lib/api";
import type { ApiOrder, ApiOrderCooler } from "@/lib/api/types";
import type {
  PackingCoolerOption,
  PackingHandoffUpdate,
  PackingLine,
  PackingOrder,
  PackingSourceOption,
} from "@/types/packing";
import { cn } from "@/utils/cn";
import { orderModelId, orderRecordId } from "@/lib/api/mappers";
import { isUuid } from "@/utils/entityIds";
import { floatingMenuStyle } from "@/utils/floatingMenu";
import {
  deliveryDateIdFromValue,
  formatExpectedDelivery,
  formatTodayLabel,
  parseDeliveryDateId,
  shiftDateId,
  toDeliveryDateId,
  upcomingWednesday,
  weekWindowChips,
} from "@/utils/deliveryCalendar";
import {
  buildPackingCatalog,
  productItemIdMap,
  type PackingCatalog,
} from "@/utils/packingSources";

import {
  displayOperationalTimestamp,
  formatOperationalTimestamp,
} from "@/utils/packingTime";

const ORANGE = "#F57850";
const PACKED_GREEN = "#3AA149";
const LINK_BLUE = "#2165D4";
const MUTED_HEADER =
  "text-[11px] font-semibold tracking-[0.06em] text-[#2E2E2E] uppercase";

type PackOrder = PackingOrder;

type SourceOption = PackingSourceOption;

const COOLER_PLACEHOLDER = "Cooler";

const SOURCE_PANEL_WIDTH = 460;

/** Format like `7/29/26, 8:45am`. */
function formatPackTimestamp(date = new Date()): string {
  return formatOperationalTimestamp(date);
}

const OFFLINE_CATALOG: PackingCatalog = {
  optionsFor(line) {
    const name = line.name?.trim() || "N/A";
    return {
      category: categoryForItem(name),
      options: sourcesForItem(name),
    };
  },
};

function coolerToken(entry: ApiOrderCooler | string | null | undefined) {
  if (!entry) return "";
  if (typeof entry === "string") return entry.trim();
  return entry.coolerCode?.trim() || entry.id?.trim() || "";
}

function orderCoolerTokens(order: ApiOrder) {
  const tokens = [
    ...(order.coolers ?? []).map(coolerToken),
    coolerToken(order.cooler),
    order.coolerId?.trim() || "",
  ].filter(Boolean);
  return [...new Set(tokens)];
}

function displayCooler(token: string, labels: ReadonlyMap<string, string>) {
  return labels.get(token) ?? token;
}

function coolerUuid(token: string, options: PackingCoolerOption[]) {
  const match = options.find(
    (option) => option.id === token || option.label === token,
  );
  if (match && isUuid(match.id)) return match.id;
  return isUuid(token) ? token : "";
}

function coolerAssigned(coolerId: string) {
  return Boolean(coolerId) && coolerId !== COOLER_PLACEHOLDER;
}

function itemReady(item: PackingLine) {
  return Boolean(item.selected) && coolerAssigned(item.coolerId) && item.packed;
}

function applyHandoff(
  order: PackOrder,
  handoff: PackingHandoffUpdate | undefined,
): PackOrder {
  if (!handoff) return order;
  const items = handoff.items?.length ? handoff.items : order.items;
  return {
    ...order,
    items,
    itemCount: items.length,
    packingStartedAt: handoff.packingStartedAt ?? order.packingStartedAt,
    packedAt: handoff.coolerReadyAt ?? handoff.packedAt ?? order.packedAt,
    loadedAt: handoff.loadedAt ?? order.loadedAt,
    coolerIds: handoff.coolerIds?.length ? handoff.coolerIds : order.coolerIds,
    packerId: handoff.packerId ?? order.packerId,
    packerName: handoff.packerName || order.packerName,
  };
}
function collectCoolerIds(items: PackingLine[]): string[] {
  return Array.from(
    new Set(
      items
        .map((item) => item.coolerId)
        .filter((value) => coolerAssigned(value)),
    ),
  );
}

function isDraftDirty(original: PackOrder, draft: PackOrder): boolean {
  if (original.items.length !== draft.items.length) return true;
  return draft.items.some((item, index) => {
    const base = original.items[index];
    if (!base) return true;
    return (
      item.packed !== base.packed ||
      item.coolerId !== base.coolerId ||
      item.selected?.inventoryRecordId !== base.selected?.inventoryRecordId ||
      item.selected?.itemId !== base.selected?.itemId
    );
  });
}

function SourcePicker({
  anchor,
  options,
  onChoose,
  onClose,
}: {
  anchor: HTMLElement;
  options: SourceOption[];
  onChoose: (option: SourceOption) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const panelRef = useRef<HTMLDivElement>(null);
  const anchorRef = useRef(anchor);
  anchorRef.current = anchor;
  const menuBox = useFloatingMenu(true, anchorRef, panelRef, {
    width: SOURCE_PANEL_WIDTH,
    maxHeight: 320,
  });

  const filtered = options.filter((option) => {
    const q = query.trim().toLowerCase();
    return (
      !q ||
      option.distributor.toLowerCase().includes(q) ||
      option.source.toLowerCase().includes(q) ||
      option.expDate.toLowerCase().includes(q) ||
      option.itemId.toLowerCase().includes(q)
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
      aria-label="Distributor / Source"
      data-scroll-lock-allow
      className="ui-select-menu fixed z-[80] overflow-x-hidden overflow-y-auto overscroll-contain rounded-[10px] border border-[#00000014] bg-white shadow-[0_12px_32px_rgba(0,0,0,0.14)]"
      style={floatingMenuStyle(menuBox)}
    >
      <div className="sticky top-0 bg-white px-3 pt-3 pb-2">
        <div className="relative">
          <SearchField
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search"
            fill
          />
        </div>
      </div>
      <div className="px-1 pb-1.5">
        {filtered.map((option) => (
          <button
            key={option.inventoryRecordId}
            type="button"
            onClick={() => onChoose(option)}
            className="grid w-full grid-cols-[minmax(0,1.15fr)_minmax(0,1.25fr)_112px] items-center gap-x-4 rounded-[8px] px-3 py-2.5 text-left text-[13px] text-[#111118] hover:bg-[#FAFAF8]"
          >
            <span className="min-w-0 truncate">{option.distributor}</span>
            <span className="min-w-0 truncate">{option.source}</span>
            <span className="whitespace-nowrap">{option.expDate}</span>
          </button>
        ))}
        {!filtered.length ? (
          <div className="px-3 py-4 text-center text-[12px] text-[#8A8A8A]">
            No sources found
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}

function packCustomerName(order: ApiOrder) {
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

async function loadStandardOrders() {
  const orders: ApiOrder[] = [];
  for (let page = 1; page < 50; page += 1) {
    const result = await ordersApi.list({
      type: "standard",
      page,
      limit: 100,
    });
    orders.push(...result.items);
    if (result.items.length < 100) break;
  }
  return orders;
}

function mapStandardOrder(
  order: ApiOrder,
  index: number,
  catalog: PackingCatalog,
  coolerLabels: ReadonlyMap<string, string>,
): PackOrder {
  const code = orderModelId(order, `ORD-${index + 1}`);
  const customer = packCustomerName(order);
  const deliveryDateId = deliveryDateIdFromValue(order.deliveryDate);
  const deliveryDate = parseDeliveryDateId(deliveryDateId);
  const coolerIds = orderCoolerTokens(order).map((token) =>
    displayCooler(token, coolerLabels),
  );
  const lineCooler = coolerIds[0] || COOLER_PLACEHOLDER;
  const items: PackingLine[] = (order.items ?? []).map((line, lineIndex) => {
    const name = line.name || line.itemName || "N/A";
    const match = catalog.optionsFor({
      productId: line.productId,
      name,
      itemCode: line.itemCode,
    });
    const category =
      match.category !== "Items"
        ? match.category
        : line.subcategoryName?.trim() ||
          line.categoryName?.trim() ||
          categoryForItem(name);
    return {
      id: `${code}-${lineIndex + 1}`,
      catalogItemId: line.productId || `cat-${lineIndex + 1}`,
      name,
      category: category === "Items" ? categoryForItem(name) : category,
      qty: line.quantity ?? 0,
      coolerId: lineCooler,
      packed: false,
      options: match.options,
    };
  });
  const packerName = [order.packer?.firstName, order.packer?.lastName]
    .filter(Boolean)
    .join(" ")
    .trim() || order.packer?.name?.trim() || undefined;
  return {
    id: code,
    recordId: orderRecordId(order),
    customer,
    code,
    itemCount: items.length,
    deliveryDate: deliveryDate ? formatExpectedDelivery(deliveryDate) : "",
    deliveryDateId,
    packingStartedAt: displayOperationalTimestamp(order.packingStartedAt),
    packedAt: displayOperationalTimestamp(order.coolerReadyAt),
    loadedAt: displayOperationalTimestamp(order.loadedAt),
    packerId: order.packerId ?? undefined,
    packerName,
    coolerIds: coolerIds.filter((id) => id !== COOLER_PLACEHOLDER),
    items,
  };
}

function PackingDetail({
  order,
  coolerOptions,
  locked,
  onClose,
  onReady,
}: {
  order: PackOrder;
  coolerOptions: PackingCoolerOption[];
  locked: boolean;
  onClose: () => void;
  onReady: (order: PackOrder) => void;
}) {
  const [draft, setDraft] = useState(order);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<{
    id: string;
    anchor: HTMLElement;
  } | null>(null);

  const groups = useMemo(() => {
    const grouped = new Map<string, PackingLine[]>();
    for (const item of draft.items) {
      const title = item.category || "Items";
      const rows = grouped.get(title) ?? [];
      rows.push(item);
      grouped.set(title, rows);
    }
    return [...grouped.entries()];
  }, [draft.items]);

  const allReady = draft.items.every(itemReady);

  function updateItem(id: string, patch: Partial<PackingLine>) {
    setValidationError(null);
    setDraft((current) => ({
      ...current,
      items: current.items.map((item) =>
        item.id === id ? { ...item, ...patch } : item,
      ),
    }));
  }

  function requestClose() {
    if (!locked && isDraftDirty(order, draft)) {
      setLeaveConfirmOpen(true);
      return;
    }
    onClose();
  }

  function handleReady() {
    const incomplete = draft.items.filter((item) => !itemReady(item));
    if (incomplete.length) {
      const missing = incomplete[0]!;
      const parts: string[] = [];
      if (!missing.selected) parts.push("distributor/source");
      if (!coolerAssigned(missing.coolerId)) parts.push("cooler ID");
      if (!missing.packed) parts.push("Item Packed");
      setValidationError(
        `Complete all items before Cooler Ready. "${missing.name}" still needs ${parts.join(", ")}.`,
      );
      document
        .getElementById(`pack-item-${missing.id}`)
        ?.scrollIntoView({ block: "center", behavior: "smooth" });
      return;
    }

    const coolerIds = collectCoolerIds(draft.items);
    onReady({
      ...draft,
      coolerIds,
      packedAt: order.packedAt ?? formatPackTimestamp(),
      loadedAt: order.loadedAt,
      items: draft.items,
    });
  }

  function markPacked(item: PackingLine) {
    if (locked) return;
    if (!item.selected || !coolerAssigned(item.coolerId)) {
      const parts: string[] = [];
      if (!item.selected) parts.push("distributor/source");
      if (!coolerAssigned(item.coolerId)) parts.push("cooler ID");
      setValidationError(
        `"${item.name}" still needs ${parts.join(" and ")} before it can be packed.`,
      );
      return;
    }
    updateItem(item.id, { packed: true });
  }

  const cell = "min-w-0 text-[13px] text-[#111118]";

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#FAFAFA]">
      <div className="shrink-0 border-b border-[#00000014] bg-white px-4 pt-5 pb-4 md:px-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[22px] font-semibold tracking-tight text-[#111118]">
              Cooler Packing{" "}
              <span className="font-normal italic text-[#6B6B6B]">
                for {draft.customer}
              </span>
            </h1>
            <p className="mt-1 text-[13px] text-[#8A8A8A]">
              Delivery date{" "}
              <span className="font-semibold text-[#111118]">
                {draft.deliveryDate || "N/A"}
              </span>
            </p>
            {locked && order.loadedAt ? (
              <p className="mt-1 text-[13px] text-[#8A8A8A]">
                Loaded {order.loadedAt}. Packing is locked.
              </p>
            ) : null}
          </div>
          <UserMenu className="items-center" />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto bg-[#FAFAFA] px-4 py-5 md:px-7 md:py-5">
        {validationError ? (
          <div className="mb-4 rounded-[10px] border border-[#F5C2C2] bg-[#FDECEC] px-4 py-3 text-[13px] font-medium text-[#E25B5B]">
            {validationError}
          </div>
        ) : null}

        <div className="space-y-5">
          {groups.map(([title, items]) => (
            <section key={title}>
              <ScrollTable minWidth={1100}>
                <div className="flex h-10 items-center border-b border-[#00000014] bg-[#FBF9F9] px-4">
                  <span className="text-[14px] font-semibold text-[#111118]">
                    {title}
                  </span>
                </div>
                <div
                  className={cn(
                    PACK_COLUMNS,
                    TABLE_HEADER,
                    PINNED_HEADER,
                    "h-10 border-b border-[#00000014]",
                  )}
                >
                  <div>Item Name</div>
                  <div>Qty</div>
                  <div>
                    Distributor / Source
                    <span className="text-danger"> *</span>
                  </div>
                  <div>Exp Date</div>
                  <div>Item ID</div>
                  <div>Location</div>
                  <div>
                    Cooler ID
                    <span className="text-danger"> *</span>
                  </div>
                  <div aria-hidden />
                </div>
                <div>
                    {items.map((item) => {
                      const sourceOpen = openMenu?.id === item.id;

                      return (
                        <div
                          key={item.id}
                          id={`pack-item-${item.id}`}
                          className={cn(
                            PACK_COLUMNS,
                            "border-b border-[#00000014] py-3.5 last:border-b-0",
                            sourceOpen && "bg-[#FAFAF8]",
                          )}
                        >
                          <div className={cn(cell, "truncate font-medium")}>
                            {item.name}
                          </div>
                          <div className={cn(cell, "font-semibold")}>
                            {item.qty}
                          </div>
                          <div className={cell}>
                            <button
                              type="button"
                              disabled={locked}
                              onClick={(event) => {
                                const anchor = event.currentTarget;
                                setOpenMenu((current) =>
                                  current?.id === item.id
                                    ? null
                                    : { id: item.id, anchor },
                                );
                              }}
                              className="inline-flex max-w-full items-center gap-1 text-left text-[13px] disabled:cursor-default"
                              title={
                                item.selected
                                  ? `${item.selected.distributor} / ${item.selected.source}`
                                  : undefined
                              }
                            >
                              <ChevronDown
                                size={14}
                                className="shrink-0 text-[#8A8A8A]"
                              />
                              <span
                                className={cn(
                                  "truncate",
                                  item.selected
                                    ? "text-[#111118]"
                                    : "text-[#8A8A8A]",
                                )}
                              >
                                {item.selected
                                  ? `${item.selected.distributor} / ${item.selected.source}`
                                  : "Select"}
                              </span>
                            </button>
                            {sourceOpen ? (
                              <SourcePicker
                                anchor={openMenu.anchor}
                                options={item.options}
                                onClose={() => setOpenMenu(null)}
                                onChoose={(option) => {
                                  updateItem(item.id, {
                                    selected: option,
                                    packed: false,
                                  });
                                  setOpenMenu(null);
                                }}
                              />
                            ) : null}
                          </div>
                          <div className={cn(cell, "truncate")}>
                            {item.selected?.expDate ?? ""}
                          </div>
                          <div className={cell}>
                            {item.selected?.itemId ? (
                              <IdPill>{item.selected.itemId}</IdPill>
                            ) : null}
                          </div>
                          <div className={cell}>
                            <LocationHover
                              className="text-[13px] text-[#111118]"
                              fullAddress={item.selected?.address ?? ""}
                              label="Location"
                            >
                              {item.selected?.location ?? ""}
                            </LocationHover>
                          </div>
                          <div className={cell}>
                            <Select
                              value={item.coolerId}
                              disabled={locked}
                              onChange={(value) =>
                                updateItem(item.id, {
                                  coolerId: value,
                                  packed: coolerAssigned(value)
                                    ? item.packed
                                    : false,
                                })
                              }
                              aria-label="Cooler ID"
                              variant="flat"
                              className="w-auto"
                              buttonClassName={
                                item.coolerId === COOLER_PLACEHOLDER
                                  ? "text-[#8A8A8A]"
                                  : "text-[#111118]"
                              }
                              options={[
                                {
                                  value: COOLER_PLACEHOLDER,
                                  label: COOLER_PLACEHOLDER,
                                },
                                ...coolerOptions.map((cooler) => ({
                                  value: cooler.label,
                                  label: cooler.label,
                                })),
                              ]}
                            />
                          </div>
                          <div className="text-right">
                            {item.packed ? (
                              <span className="inline-flex items-center justify-end gap-2">
                                <span className="text-[13px] font-medium text-[#2F8F4E]">
                                  Packed
                                </span>
                                <span className="inline-flex size-5 items-center justify-center rounded-full bg-[#2F8F4E] text-white">
                                  <Check size={11} strokeWidth={3} />
                                </span>
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => markPacked(item)}
                                className="text-[13px] font-medium"
                                style={{ color: LINK_BLUE }}
                              >
                                Item Packed
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </ScrollTable>
            </section>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-end gap-5 border-t border-[#00000014] bg-white px-4 py-4 md:px-7">
        <button
          type="button"
          onClick={requestClose}
          className="text-[14px] font-medium text-[#111118]"
        >
          Cancel & Close
        </button>
        {locked ? null : (
          <button
            type="button"
            onClick={handleReady}
            className={cn(
              "rounded-[8px] px-6 py-2.5 text-[14px] font-semibold text-white",
              !allReady && "opacity-40",
            )}
            style={{ background: ORANGE }}
          >
            Cooler Ready
          </button>
        )}
      </div>

      <ConfirmDialog
        open={leaveConfirmOpen}
        title="Leave packing?"
        message="You have unsaved packing changes. Leave without completing Cooler Ready?"
        confirmLabel="Leave"
        onClose={() => setLeaveConfirmOpen(false)}
        onConfirm={onClose}
      />
    </div>
  );
}

const ROW_GRID =
  "grid grid-cols-[minmax(0,1.3fr)_minmax(0,1.1fr)_minmax(0,0.8fr)_minmax(0,1fr)] items-center gap-x-4 px-4";

const PACK_COLUMNS =
  "grid grid-cols-[minmax(0,1.3fr)_48px_minmax(0,1.2fr)_minmax(0,0.75fr)_minmax(0,0.75fr)_minmax(0,0.7fr)_minmax(0,0.9fr)_120px] items-center gap-x-4 px-4";

export default function PackingCoolersPage() {
  useDocumentTitle("Cooler Packing");

  const { upsertPacking, markLoaded, markPackingStarted, packingByCode } =
    usePackingHandoff();
  const { notifyApiError } = useApiFeedback();

  const apiLive = isApiConfigured();
  const catalogRef = useRef<PackingCatalog>(OFFLINE_CATALOG);
  const coolerLabelsRef = useRef<Map<string, string>>(new Map());
  const datePinned = useRef(false);

  const [orders, setOrders] = useState(() =>
    apiLive ? [] : createPackingOrders(),
  );
  const [loading, setLoading] = useState(apiLive);
  const [loadFailed, setLoadFailed] = useState(false);
  const [coolerOptions, setCoolerOptions] = useState<PackingCoolerOption[]>(
    () => (apiLive ? [] : PACKING_COOLERS),
  );
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("");
  const [activeDateId, setActiveDateId] = useState(() =>
    toDeliveryDateId(upcomingWednesday()),
  );
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const hydrated = useMemo(
    () =>
      orders.map((order) => applyHandoff(order, packingByCode[order.code])),
    [orders, packingByCode],
  );

  const deliveryChips = useMemo(() => {
    const counts = new Map<string, number>();
    for (const order of hydrated) {
      const assigned = Boolean(order.packerId);
      if (!assigned || !order.deliveryDateId) continue;
      counts.set(
        order.deliveryDateId,
        (counts.get(order.deliveryDateId) ?? 0) + 1,
      );
    }
    return weekWindowChips(activeDateId, counts);
  }, [activeDateId, hydrated]);

  const activeOrder =
    hydrated.find((order) => order.id === activeOrderId) ?? null;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let next = hydrated.filter((order) => {
      const assigned = Boolean(order.packerId);
      const matchesDate =
        !activeDateId ||
        !order.deliveryDateId ||
        order.deliveryDateId === activeDateId;
      const matchesSearch =
        !q ||
        order.customer.toLowerCase().includes(q) ||
        order.code.toLowerCase().includes(q) ||
        order.coolerIds.some((coolerId) => coolerId.toLowerCase().includes(q));
      return assigned && matchesDate && matchesSearch;
    });

    if (sortBy === "packed-first") {
      next = [...next].sort(
        (a, b) => Number(Boolean(b.packedAt)) - Number(Boolean(a.packedAt)),
      );
    } else if (sortBy === "name") {
      next = [...next].sort((a, b) => a.customer.localeCompare(b.customer));
    }

    return next;
  }, [hydrated, search, sortBy, activeDateId]);

  const listWindow = useLazyWindow(
    filtered,
    `${search}|${sortBy}|${activeDateId}`,
  );

  useEffect(() => {
    if (!apiLive) return;
    let cancelled = false;
    void Promise.all([
      loadStandardOrders(),
      coolersApi.list(),
      inventoryApi.list({ fresh: true }),
      productsApi.list(),
    ])
      .then(([orderItems, coolers, inventoryRows, products]) => {
        if (cancelled) return;
        const labels = new Map<string, string>();
        const options = coolers.flatMap((cooler) => {
          const id = cooler.id?.trim() ?? "";
          if (!id) return [];
          const label = cooler.coolerCode?.trim() || id;
          labels.set(id, label);
          labels.set(label, label);
          return [{ id, label }];
        });
        coolerLabelsRef.current = labels;
        if (options.length) setCoolerOptions(options);
        catalogRef.current = buildPackingCatalog(
          inventoryRows,
          productItemIdMap(products),
        );
        const mapped = orderItems.map((order, index) =>
          mapStandardOrder(order, index, catalogRef.current, labels),
        );
        setOrders(mapped);
        if (!datePinned.current) {
          const dates = [
            ...new Set(
              mapped
                .filter((order) => order.packerId && order.deliveryDateId)
                .map((order) => order.deliveryDateId),
            ),
          ].sort();
          if (dates.length) {
            setActiveDateId((current) =>
              dates.includes(current)
                ? current
                : (dates.find((date) => date >= current) ?? dates[dates.length - 1]!),
            );
          }
          datePinned.current = true;
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setLoadFailed(true);
          notifyApiError(error, "Failed to load packing orders.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [apiLive, notifyApiError]);

  function openPacking(order: PackOrder) {
    if (!order.packedAt && !order.loadedAt) {
      if (apiLive && order.recordId) {
        void ordersApi
          .startPacking(order.recordId)
          .then((remote) => {
            const started =
              displayOperationalTimestamp(remote.packingStartedAt) ??
              formatPackTimestamp();
            markPackingStarted(order.code, started);
          })
          .catch((error) => {
            notifyApiError(error, "Failed to start packing.");
          });
      } else {
        markPackingStarted(order.code, formatPackTimestamp());
      }
    }
    setActiveOrderId(order.id);
    if (apiLive && order.recordId) {
      void ordersApi
        .getById(order.recordId)
        .then((remote) => {
          const mapped = mapStandardOrder(
            remote,
            0,
            catalogRef.current,
            coolerLabelsRef.current,
          );
          setOrders((current) =>
            current.map((row) =>
              row.id === order.id
                ? {
                    ...row,
                    ...mapped,
                    id: row.id,
                    recordId: row.recordId ?? mapped.recordId,
                    code: row.code,
                    customer:
                      mapped.customer !== "N/A" ? mapped.customer : row.customer,
                    items: mapped.items.length ? mapped.items : row.items,
                  }
                : row,
            ),
          );
        })
        .catch((error) => {
          notifyApiError(error, "Failed to load order details.");
        });
    }
  }

  function cycleChip(delta: number) {
    setActiveDateId((current) => shiftDateId(current, delta * 7));
  }

  if (activeOrder) {
    return (
      <PackingDetail
        key={activeOrder.id}
        order={activeOrder}
        coolerOptions={coolerOptions}
        locked={Boolean(activeOrder.loadedAt)}
        onClose={() => setActiveOrderId(null)}
        onReady={(updated) => {
          void (async () => {
            let saved = updated;
            if (apiLive && updated.recordId) {
              const uuids = [
                ...new Set(
                  updated.coolerIds
                    .map((coolerId) => coolerUuid(coolerId, coolerOptions))
                    .filter(Boolean),
                ),
              ];
              if (updated.coolerIds.length && uuids.length !== new Set(updated.coolerIds).size) {
                notifyApiError(
                  new Error("A selected cooler has no server id."),
                  "A selected cooler has no server id.",
                );
                return;
              }
              try {
                for (const coolerId of uuids) {
                  await ordersApi.assignCooler(updated.recordId, coolerId);
                }
                const ready = await ordersApi.coolerReady(updated.recordId);
                const packedAt =
                  displayOperationalTimestamp(ready.coolerReadyAt) ??
                  updated.packedAt ??
                  formatPackTimestamp();
                const remoteCoolers = orderCoolerTokens(ready).map((token) =>
                  displayCooler(token, coolerLabelsRef.current),
                );
                saved = {
                  ...updated,
                  packedAt,
                  loadedAt:
                    displayOperationalTimestamp(ready.loadedAt) ?? updated.loadedAt,
                  coolerIds: remoteCoolers.length ? remoteCoolers : updated.coolerIds,
                };
              } catch (error) {
                notifyApiError(error, "Failed to mark the cooler ready.");
                return;
              }
            }
            setOrders((current) =>
              current.map((order) =>
                order.id === saved.id ? saved : order,
              ),
            );
            upsertPacking({
              orderCode: saved.code,
              packedAt: saved.packedAt,
              coolerReadyAt: saved.packedAt,
              loadedAt: saved.loadedAt,
              coolerIds: saved.coolerIds,
              packerName:
                packingByCode[saved.code]?.packerName || saved.packerName || "",
              packerId: packingByCode[saved.code]?.packerId || saved.packerId,
              packingStartedAt: packingByCode[saved.code]?.packingStartedAt,
              items: saved.items,
            });
            setActiveOrderId(null);
          })();
        }}
      />
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#FAFAFA]">
      <Header
        title="Cooler Packing"
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
                { value: "packed-first", label: "Packed first" },
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
        {filtered.length ? (
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
            <div>Action</div>
            <div>Cooler ID</div>
            <div>Loading</div>
          </div>

          {listWindow.visible.map((order) => {
            const packed = Boolean(order.packedAt);
            const loaded = Boolean(order.loadedAt);

            return (
              <div
                key={order.id}
                className={cn(
                  ROW_GRID,
                  "min-h-[88px] border-b border-[#00000014] py-4 last:border-b-0",
                )}
              >
                <button
                  type="button"
                  onClick={() => openPacking(order)}
                  className="min-w-0 text-left"
                >
                  <div className="flex items-center gap-1 text-[14px] font-semibold text-[#111118]">
                    {order.customer}
                    <ChevronRight size={14} className="text-[#A9A9A9]" />
                  </div>
                  <div className="mt-1.5 flex items-center gap-2">
                    <IdPill>{order.code}</IdPill>
                    <span className="text-[12px] text-[#8A8A8A]">
                      {order.itemCount}{" "}
                      {order.itemCount === 1 ? "item" : "items"}
                    </span>
                  </div>
                </button>

                <div>
                  {packed ? (
                    <div className="inline-flex flex-wrap items-center gap-3">
                      <span
                        className="inline-flex h-9 items-center gap-1.5 rounded-[10px] px-3.5 text-[12px] font-semibold text-white"
                        style={{ background: PACKED_GREEN }}
                      >
                        Packed
                        <Check size={12} strokeWidth={3} />
                      </span>
                      <span className="text-[12px] text-[#111118]">
                        {order.packedAt}
                      </span>
                    </div>
                  ) : (
                    <Button
                      variant="dark"
                      onClick={() => openPacking(order)}
                    >
                      Start Packing
                    </Button>
                  )}
                </div>

                <div>
                  {packed && order.coolerIds.length ? (
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col gap-1.5">
                        {order.coolerIds.map((coolerId) => (
                          <IdPill key={coolerId}>{coolerId}</IdPill>
                        ))}
                      </div>
                      {!loaded ? (
                        <button
                          type="button"
                          onClick={() => openPacking(order)}
                          className="inline-flex h-9 items-center text-[13px] font-medium"
                          style={{ color: LINK_BLUE }}
                        >
                          Edit
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                <div>
                  {packed ? (
                    loaded ? (
                      <div className="inline-flex flex-wrap items-center gap-3">
                        <span
                          className="inline-flex h-9 items-center gap-1.5 rounded-[10px] px-3.5 text-[12px] font-semibold text-white"
                          style={{ background: PACKED_GREEN }}
                        >
                          Loaded
                          <Check size={12} strokeWidth={3} />
                        </span>
                        <span className="text-[12px] text-[#111118]">
                          {order.loadedAt}
                        </span>
                      </div>
                    ) : (
                      <Button
                        variant="dark"
                        onClick={() => {
                          void (async () => {
                            let loadedAt = formatPackTimestamp();
                            if (apiLive && order.recordId) {
                              try {
                                const remote = await ordersApi.loaded(order.recordId);
                                loadedAt =
                                  displayOperationalTimestamp(remote.loadedAt) ??
                                  loadedAt;
                              } catch (error) {
                                notifyApiError(error, "Failed to mark the order loaded.");
                                return;
                              }
                            }
                            setOrders((current) =>
                              current.map((entry) =>
                                entry.id === order.id
                                  ? { ...entry, loadedAt }
                                  : entry,
                              ),
                            );
                            markLoaded(order.code, loadedAt);
                            upsertPacking({
                              orderCode: order.code,
                              packedAt: order.packedAt,
                              coolerReadyAt: order.packedAt,
                              loadedAt,
                              coolerIds: order.coolerIds,
                              packerName:
                                packingByCode[order.code]?.packerName ||
                                order.packerName ||
                                "",
                              packerId:
                                packingByCode[order.code]?.packerId ||
                                order.packerId,
                              packingStartedAt:
                                packingByCode[order.code]?.packingStartedAt,
                              items: order.items,
                            });
                          })();
                        }}
                        className="rounded-[10px] text-[12px]"
                      >
                        Load Now
                      </Button>
                    )
                  ) : null}
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
        ) : (
          <div className="mt-4 rounded-[10px] border border-[#00000014] bg-white px-6 py-12 text-center text-[14px] text-[#8A8A8A]">
            {loadFailed
              ? "Couldn't load packing orders."
              : apiLive && !hydrated.some((order) => order.packerId)
                ? "No orders have a packer yet. Assign one in Packer Manager."
                : "No orders match your filters."}
          </div>
        )}
        </>
        )}
      </div>
    </div>
  );
}

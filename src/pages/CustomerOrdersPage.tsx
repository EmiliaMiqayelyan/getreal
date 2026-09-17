import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  Search,
  Truck,
  X,
} from "lucide-react";

import { UserMenu } from "@/components/layout/UserMenu";
import { DateNavButton, CalendarIcon, DATE_NAV_GROUP } from "@/components/shared/DateNavButton";
import {
  DeliveryDateChip,
  DATE_CHIP_ROW,
  DATE_CHIP_SCROLL,
} from "@/components/shared/DeliveryDateChip";
import { ExportButton } from "@/components/shared/ExportButton";
import { LocationHover } from "@/components/shared/LocationHover";
import { IdPill } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { usePackingHandoff } from "@/context/PackingHandoffContext";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import {
  isApiConfigured,
  normalizeOrdersList,
  ordersApi,
} from "@/lib/api";
import type { PackingHandoffUpdate } from "@/types/packing";
import { cn } from "@/utils/cn";

const ORANGE = "#F57850";

type TimelineStepKey =
  | "requested"
  | "packing"
  | "onRoute"
  | "delivered"
  | "coolerPickup"
  | "return";

type TimelineStep = {
  key: TimelineStepKey;
  shortLabel?: string;
  person?: string;
  at?: string;
  done: boolean;
  final?: boolean;
};

type OrderItem = {
  name: string;
  qty: number;
  unit: string;
  unitPrice: number;
};

type CustomerOrderRow = {
  id: string;
  customerName: string;
  itemCount: number;
  address: string;
  apt: string;
  city: string;
  state: string;
  zip: string;
  orderDate: string;
  deliveryDate: string;
  deliveryLabel: string;
  paymentStatus: "Paid" | "Pending";
  total: number;
  items: OrderItem[];
  packerAssigned?: string;
  coolerIds?: string[];
  steps: TimelineStep[];
};

type DeliveryChip = {
  id: string;
  label: string;
  count: number;
};

type CompletedOrder = {
  id: string;
  customer: string;
  address: string;
  zip: string;
  orderDate: string;
  delivered: string;
  items: number;
  total: number;
  day: string;
  week: string;
};

const STEPS_META: { key: TimelineStepKey; header: string }[] = [
  { key: "requested", header: "Requested" },
  { key: "packing", header: "Packing" },
  { key: "onRoute", header: "On Route" },
  { key: "delivered", header: "Delivered" },
  { key: "coolerPickup", header: "Cooler Pickup" },
  { key: "return", header: "Return" },
];

const DELIVERY_CHIPS: DeliveryChip[] = [
  { id: "wed-20", label: "Wed, Jul 20", count: 1 },
];

/** Temporary seed - one line item sample. */
const SAMPLE_ITEMS: OrderItem[] = [
  { name: "Angus Chuck Ground Beef", qty: 1, unit: "lb", unitPrice: 33.75 },
];

function applyPackingHandoff(
  order: CustomerOrderRow,
  packing?: PackingHandoffUpdate,
): CustomerOrderRow {
  if (!packing) return order;

  const readyAt = packing.coolerReadyAt ?? packing.packedAt;

  const steps = order.steps.map((step) => {
    if (step.key !== "packing" || !readyAt) return step;
    return {
      ...step,
      done: true,
      person: packing.packerName || step.person,
      shortLabel:
        packing.packerName?.split(" ")[0] ?? step.shortLabel ?? "Packer",
      at: readyAt,
    };
  });

  return {
    ...order,
    coolerIds: packing.coolerIds.length ? packing.coolerIds : order.coolerIds,
    packerAssigned: packing.packerName || order.packerAssigned,
    steps,
  };
}

function makeSteps(doneCount: number): TimelineStep[] {
  const meta = [
    {
      shortLabel: undefined,
      person: "Ethan Carter",
      at: "Jul 16, 12:31 AM",
    },
    {
      shortLabel: "July A",
      person: "July Anderson",
      at: "Jul 16, 12:31 AM",
    },
    {
      shortLabel: "James O",
      person: "James Blazey",
      at: "Jul 20, 5:24 PM",
    },
    {
      shortLabel: undefined,
      person: "James Blazey",
      at: "Jul 20, 5:24 PM",
    },
    {
      shortLabel: "James O",
      person: "James Blazey",
      at: "Jul 21, 5:24 PM",
    },
    {
      shortLabel: undefined,
      person: undefined,
      at: "Jul 21, 5:24 PM",
    },
  ];

  return STEPS_META.map((step, index) => ({
    key: step.key,
    shortLabel: index < doneCount ? meta[index].shortLabel : undefined,
    person: index < doneCount ? meta[index].person : undefined,
    at: index < doneCount ? meta[index].at : undefined,
    done: index < doneCount,
    final: step.key === "return" && index < doneCount,
  }));
}

/** Temporary seed - one active order and one completed order. */
const ACTIVE_ORDERS: CustomerOrderRow[] = [
  {
    id: "ORD-U003-01",
    customerName: "Emily Rodriguez",
    itemCount: 1,
    address: "1523 Astoria Blvd",
    apt: "",
    city: "Queens",
    state: "NY",
    zip: "11102",
    orderDate: "Jul 16, 2026, 5:13 PM",
    deliveryDate: "Jul 20, 2026, Wednesday",
    deliveryLabel: "Wed, Jul 20",
    paymentStatus: "Paid",
    total: 33.75,
    items: SAMPLE_ITEMS,
    packerAssigned: "Packer Name 1",
    coolerIds: ["BL-0012", "FR-1423"],
    steps: makeSteps(1),
  },
];

const COMPLETED_ORDERS: CompletedOrder[] = [
  {
    id: "ORD-U004-08",
    customer: "Emma Thompson",
    address: "456 Elm St, Apt 12, New York, NY",
    zip: "90015",
    orderDate: "Apr 15, 2026, 3:30 PM",
    delivered: "Jul 15, 2026, 10:00 AM",
    items: 1,
    total: 33.75,
    day: "Wednesday, 7/15/2026",
    week: "Week of 7/14/2026",
  },
];

function currency(value: number) {
  return `$${value.toFixed(2)}`;
}

function HoverCard({
  step,
  order,
}: {
  step: TimelineStep;
  order: CustomerOrderRow;
}) {
  if (step.key === "requested") {
    return (
      <div className="w-[260px] rounded-[10px] border border-[#ECECEA] bg-white p-3 shadow-xl">
        <div className="text-[13px] font-semibold text-[#111118]">Ordered</div>
        <div className="mt-1 text-[12px] text-[#18A34A]">
          {step.at ? `${step.at}, 2026` : "Jul 16, 12:31 AM, 2026"}
        </div>
        <div className="mt-2 flex items-center gap-1.5 text-[12px] text-[#111118]">
          <span className="inline-flex size-4 items-center justify-center rounded-full bg-[#F57850] text-[9px] font-semibold text-white">
            {(step.person ?? order.customerName)[0]}
          </span>
          {step.person ?? order.customerName}
        </div>
        <div className="mt-3 space-y-1.5 border-t border-[#F0F0EE] pt-2">
          {order.items.map((item) => (
            <div
              key={item.name}
              className="grid grid-cols-[1fr_24px_56px] gap-2 text-[12px] text-[#111118]"
            >
              <span className="truncate">{item.name}</span>
              <span className="text-center text-[#8A8A8A]">{item.qty}</span>
              <span className="text-right font-medium">
                {currency(item.qty * item.unitPrice)}
              </span>
            </div>
          ))}
          <div className="flex items-center justify-between border-t border-[#F0F0EE] pt-2 text-[12px] font-bold text-[#111118]">
            <span>Order Total</span>
            <span>{currency(order.total)}</span>
          </div>
        </div>
      </div>
    );
  }

  if (step.key === "coolerPickup") {
    return (
      <div className="w-[200px] rounded-[10px] border border-[#ECECEA] bg-white p-3 shadow-xl">
        <div className="text-[13px] font-semibold text-[#111118]">
          Cooler Pickup
        </div>
        <div className="mt-1 text-[12px] text-[#18A34A]">
          {step.at ? `${step.at}, 2026` : "Jul 16, 12:31 AM, 2026"}
        </div>
        <div className="mt-2">
          <IdPill>{order.coolerIds?.[0] ?? "BS-402-27"}</IdPill>
        </div>
      </div>
    );
  }

  const titles: Record<string, string> = {
    packing: "Packed",
    onRoute: "On Route",
    delivered: "Delivered",
    return: "Return",
  };

  return (
    <div className="w-[220px] rounded-[10px] border border-[#ECECEA] bg-white p-3 shadow-xl">
      <div className="text-[13px] font-semibold text-[#111118]">
        {titles[step.key] ?? step.key}
      </div>
      <div className="mt-1 text-[12px] text-[#18A34A]">
        {step.at ? `${step.at}, 2026` : "Jul 16, 12:31 AM, 2026"}
      </div>
      {step.person ? (
        <div className="mt-2 flex items-center gap-1.5 text-[12px] text-[#111118]">
          <span className="inline-flex size-4 items-center justify-center rounded-full bg-[#F57850] text-[9px] font-semibold text-white">
            {step.person[0]}
          </span>
          {step.person}
        </div>
      ) : null}
      {step.key === "onRoute" ? (
        <div className="mt-3 grid grid-cols-2 gap-2 border-t border-[#F0F0EE] pt-2 text-[11px]">
          <div>
            <div className="text-[11px] font-semibold tracking-[0.06em] text-[#2E2E2E] uppercase">
              Street Address
            </div>
            <div className="mt-0.5 text-[#111118]">{order.address}</div>
          </div>
          <div>
            <div className="text-[11px] font-semibold tracking-[0.06em] text-[#2E2E2E] uppercase">
              Apt / Unit
            </div>
            <div className="mt-0.5 text-[#111118]">{order.apt}</div>
          </div>
          <div>
            <div className="text-[11px] font-semibold tracking-[0.06em] text-[#2E2E2E] uppercase">
              City
            </div>
            <div className="mt-0.5 text-[#111118]">{order.city}</div>
          </div>
          <div>
            <div className="text-[11px] font-semibold tracking-[0.06em] text-[#2E2E2E] uppercase">
              State
            </div>
            <div className="mt-0.5 text-[#111118]">{order.state}</div>
          </div>
          <div>
            <div className="text-[11px] font-semibold tracking-[0.06em] text-[#2E2E2E] uppercase">
              Zip
            </div>
            <div className="mt-0.5 text-[#111118]">{order.zip}</div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function StepNode({
  step,
  order,
  onStatusClick,
}: {
  step: TimelineStep;
  order: CustomerOrderRow;
  onStatusClick: (anchor: DOMRect) => void;
}) {
  const [hover, setHover] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, placeAbove: false });
  const nodeRef = useRef<HTMLDivElement>(null);
  const hideTimer = useRef(0);

  useEffect(() => () => window.clearTimeout(hideTimer.current), []);

  function place() {
    const rect = nodeRef.current?.getBoundingClientRect();
    if (!rect) return;

    const cardWidth = 260;
    const estimatedHeight = 160;
    const gap = 8;
    const spaceBelow = window.innerHeight - rect.bottom;
    const placeAbove = spaceBelow < estimatedHeight + gap;

    setPos({
      top: placeAbove ? rect.top - gap : rect.bottom + gap,
      left: Math.max(
        12,
        Math.min(
          rect.left + rect.width / 2 - cardWidth / 2,
          window.innerWidth - cardWidth - 12,
        ),
      ),
      placeAbove,
    });
  }

  function show() {
    if (!step.done) return;
    window.clearTimeout(hideTimer.current);
    place();
    setHover(true);
  }

  function hide() {
    hideTimer.current = window.setTimeout(() => setHover(false), 140);
  }

  return (
    <div
      ref={nodeRef}
      className="relative flex min-w-0 flex-col items-center px-0.5"
      onMouseEnter={show}
      onMouseLeave={hide}
    >
      <div className="mb-1.5 flex h-[14px] w-full items-end justify-center truncate text-center text-[10px] font-medium text-[#111118] sm:text-[11px]">
        {step.done && step.shortLabel ? step.shortLabel : null}
      </div>

      <button
        type="button"
        data-status-node
        onClick={(event) => {
          event.stopPropagation();
          onStatusClick(event.currentTarget.getBoundingClientRect());
        }}
        className={cn(
          "z-[1] flex size-[18px] shrink-0 items-center justify-center rounded-full",
          step.done
            ? step.final
              ? "bg-[#242424]"
              : "bg-[#F57850]"
            : "border border-[#D9D4CD] bg-[#EFEDEA]",
        )}
      >
        {step.done ? (
          <Check size={10} className="text-white" strokeWidth={3} />
        ) : null}
      </button>

      <div className="mt-1.5 min-h-[14px] w-full truncate text-center text-[11px] font-medium leading-tight text-[#6B7180]">
        {step.done && step.at ? step.at : null}
      </div>

      {hover && step.done
        ? createPortal(
            <div
              role="tooltip"
              className="pointer-events-auto fixed z-[80] hidden sm:block"
              style={{
                top: pos.top,
                left: pos.left,
                transform: pos.placeAbove ? "translateY(-100%)" : undefined,
              }}
              onMouseEnter={show}
              onMouseLeave={hide}
            >
              <HoverCard step={step} order={order} />
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

function OrderTimelineTrack({
  order,
  onStatusClick,
}: {
  order: CustomerOrderRow;
  onStatusClick: (stepKey: TimelineStepKey, anchor: DOMRect) => void;
}) {
  return (
    <div className="relative">
      <div className="pointer-events-none absolute top-[29px] right-[8%] left-[8%] flex">
        {order.steps.slice(0, -1).map((step, index) => {
          const segmentDone =
            order.steps[index]?.done && order.steps[index + 1]?.done;
          return (
            <div
              key={step.key}
              className={cn(
                "h-0 flex-1 border-t",
                segmentDone
                  ? "border-solid border-[#D9D4CD]"
                  : "border-dashed border-[#D9D4CD]",
              )}
            />
          );
        })}
      </div>
      <div className="relative grid grid-cols-6">
        {order.steps.map((step) => (
          <StepNode
            key={step.key}
            step={step}
            order={order}
            onStatusClick={(anchor) => onStatusClick(step.key, anchor)}
          />
        ))}
      </div>
    </div>
  );
}


function DayHeaderIcon() {
  const [useFallback, setUseFallback] = useState(false);

  if (useFallback) {
    return <Truck size={15} className="shrink-0 text-[#F57850]" aria-hidden />;
  }

  return (
    <img
      src="/icons/track-icon.png"
      alt=""
      className="size-[15px] shrink-0 object-contain"
      onError={() => setUseFallback(true)}
    />
  );
}

function OrderDetailPanel({
  order,
  onClose,
}: {
  order: CustomerOrderRow;
  onClose: () => void;
}) {
  return (
    <aside className="absolute inset-y-0 right-0 z-40 flex w-full max-w-[600px] flex-col border-l border-[#ECECEA] bg-white shadow-[-8px_0_32px_rgba(0,0,0,0.08)]">
        <div className="flex items-start justify-between border-b border-[#F0F0EE] px-5 pt-3 pb-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <IdPill>{order.id}</IdPill>
              <span className="text-[12px] text-[#8A8A8A]">
                Ordered:{" "}
                <span className="text-[#111118]">{order.orderDate}</span>
              </span>
            </div>
            <h2 className="mt-2 text-[26px] font-semibold tracking-tight text-[#111118]">
              {order.customerName}
            </h2>
            <div
              className={cn(
                "mt-2 inline-flex rounded-[6px] px-2 py-1 text-[12px] font-medium",
                order.paymentStatus === "Paid"
                  ? "bg-[#E8F5EC] text-[#2F8F4E]"
                  : "bg-[#FFF0E8] text-[#E07A4F]",
              )}
            >
              Payment Status: {order.paymentStatus}
            </div>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="rounded-md p-1 text-[#A9A9A9] hover:bg-background hover:text-[#6B6B6B]"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-auto px-5 py-5">
          <h3 className="mb-3 text-[13px] font-semibold text-[#111118]">
            Requested Items
          </h3>
          <div className="overflow-hidden rounded-[12px] border border-[#EBEBEB] bg-[#FBF9F9]">
            <div className="grid grid-cols-[1.6fr_50px_90px_70px] gap-2 border-b border-[#EBEBEB] bg-[#FBF9F9] px-3 py-2 text-[11px] font-semibold tracking-[0.06em] text-[#2E2E2E] uppercase">
              <div>Item / Order ID</div>
              <div>Qty</div>
              <div>Unit Price</div>
              <div className="text-right">Total</div>
            </div>
            {order.items.map((item) => (
              <div
                key={item.name}
                className="grid grid-cols-[1.6fr_50px_90px_70px] gap-2 border-b border-[#F3F3F1] bg-[#FBF9F9] px-3 py-2.5 text-[12px] text-[#111118] last:border-b-0"
              >
                <div className="min-w-0">
                  <div>{item.name}</div>
                  <div className="mt-0.5 font-mono text-[11px] text-[#8A8A8A]">
                    {order.id}
                  </div>
                </div>
                <div>{item.qty}</div>
                <div className="whitespace-nowrap">
                  <span>{currency(item.unitPrice)}</span>
                  <span className="text-[#8A8A8A]"> / {item.unit}</span>
                </div>
                <div className="text-right font-bold">
                  {currency(item.qty * item.unitPrice)}
                </div>
              </div>
            ))}
            <div className="flex items-center justify-between border-t border-[#EBEBEB] bg-[#FBF9F9] px-3 py-3 text-[#111118]">
              <span className="text-[14px] font-semibold">Order Total</span>
              <span className="text-[18px] font-bold tracking-tight">
                {currency(order.total)}
              </span>
            </div>
          </div>

          <h3 className="mt-6 mb-3 text-[13px] font-semibold text-[#111118]">
            Packing Information
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-[11px] font-semibold tracking-[0.06em] text-[#2E2E2E] uppercase">
                Packer Assigned
              </div>
              <div className="mt-1 text-[13px] text-[#99A1AF]">
                {order.packerAssigned ?? "—"}
              </div>
            </div>
            <div>
              <div className="text-[11px] font-semibold tracking-[0.06em] text-[#2E2E2E] uppercase">
                Cooler ID(s)
              </div>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {(order.coolerIds ?? []).map((coolerId) => (
                  <IdPill key={coolerId}>{coolerId}</IdPill>
                ))}
                {!order.coolerIds?.length ? (
                  <span className="text-[13px] text-[#99A1AF]">—</span>
                ) : null}
              </div>
            </div>
          </div>

          <h3 className="mt-6 mb-3 text-[13px] font-semibold text-[#111118]">
            Delivery Information
          </h3>
          <div className="mb-4 inline-flex items-center gap-1.5 rounded-[6px] bg-[#FFF0E8] px-2.5 py-1 text-[12px] font-medium text-[#F57850]">
            <Truck size={12} />
            {order.deliveryDate}
          </div>
          <div className="flex flex-col gap-3 bg-white text-[13px]">
            <div>
              <div className="text-[11px] font-semibold tracking-[0.06em] text-[#2E2E2E] uppercase">
                Street Address
              </div>
              <div className="mt-1 font-bold text-[#111118]">{order.address}</div>
            </div>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <div className="text-[11px] font-semibold tracking-[0.06em] text-[#2E2E2E] uppercase">
                  Apt / Unit
                </div>
                <div className="mt-1 font-bold text-[#111118]">{order.apt || "—"}</div>
              </div>
              <div>
                <div className="text-[11px] font-semibold tracking-[0.06em] text-[#2E2E2E] uppercase">
                  City
                </div>
                <div className="mt-1 font-bold text-[#111118]">{order.city}</div>
              </div>
              <div>
                <div className="text-[11px] font-semibold tracking-[0.06em] text-[#2E2E2E] uppercase">
                  State
                </div>
                <div className="mt-1 font-bold text-[#111118]">{order.state}</div>
              </div>
              <div>
                <div className="text-[11px] font-semibold tracking-[0.06em] text-[#2E2E2E] uppercase">
                  Zip
                </div>
                <div className="mt-1 font-bold text-[#111118]">{order.zip}</div>
              </div>
            </div>
          </div>
        </div>
    </aside>
  );
}

export default function CustomerOrdersPage() {
  useDocumentTitle("Customer Orders");

  const { packingByCode } = usePackingHandoff();

  const [orders, setOrders] = useState(ACTIVE_ORDERS);
  const [activeTab, setActiveTab] = useState<"Orders" | "Completed">("Orders");
  const [activeChip, setActiveChip] = useState("wed-20");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [zipFilter, setZipFilter] = useState("");
  const [sortBy, setSortBy] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState(19);
  const [statusMenu, setStatusMenu] = useState<{
    orderId: string;
    stepKey: TimelineStepKey;
    top: number;
    left: number;
    placeAbove: boolean;
  } | null>(null);

  useEffect(() => {
    if (!isApiConfigured()) return;
    let cancelled = false;

    void ordersApi
      .list({ page: 1, limit: 50, type: "standard" })
      .then((payload) => {
        if (cancelled) return;
        const remote = normalizeOrdersList(payload);
        if (remote.length === 0) return;

        const statusToDone: Record<string, number> = {
          requested: 1,
          packing: 2,
          cooler_ready: 2,
          loaded: 2,
          on_route: 3,
          delivered: 4,
          cancelled: 0,
        };

        const mapped: CustomerOrderRow[] = remote.map((order, index) => {
          const doneCount = statusToDone[order.status ?? "requested"] ?? 1;
          const itemCount = (order.items ?? []).reduce(
            (sum, line) => sum + (line.quantity ?? 0),
            0,
          );
          return {
            id: order.id ?? `API-CO-${index + 1}`,
            customerName: order.customerId ?? "Customer",
            itemCount: itemCount || (order.items?.length ?? 0),
            address: "",
            apt: "",
            city: "",
            state: "",
            zip: "",
            orderDate: order.createdAt
              ? new Date(order.createdAt).toLocaleDateString()
              : "",
            deliveryDate: order.deliveryDate
              ? new Date(order.deliveryDate).toLocaleDateString()
              : "",
            deliveryLabel: order.deliveryDate
              ? new Date(order.deliveryDate).toLocaleDateString()
              : "",
            paymentStatus: "Pending",
            total: 0,
            items: (order.items ?? []).map((line) => ({
              name: line.productId ?? "Item",
              qty: line.quantity ?? 0,
              unit: "Each",
              unitPrice: 0,
            })),
            steps: makeSteps(doneCount),
          };
        });

        setOrders((current) => {
          const byId = new Map(current.map((row) => [row.id, row]));
          for (const row of mapped) byId.set(row.id, row);
          return Array.from(byId.values());
        });
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!statusMenu) return;

    function onPointerDown(event: MouseEvent) {
      const target = event.target as HTMLElement | null;
      if (
        target?.closest("[data-status-menu]") ||
        target?.closest("[data-status-node]")
      ) {
        return;
      }
      setStatusMenu(null);
    }

    function onRepositionClose() {
      setStatusMenu(null);
    }

    document.addEventListener("mousedown", onPointerDown);
    window.addEventListener("resize", onRepositionClose);
    window.addEventListener("scroll", onRepositionClose, true);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("resize", onRepositionClose);
      window.removeEventListener("scroll", onRepositionClose, true);
    };
  }, [statusMenu]);

  const ordersWithPacking = useMemo(
    () =>
      orders.map((order) =>
        applyPackingHandoff(order, packingByCode[order.id]),
      ),
    [orders, packingByCode],
  );

  const filteredActive = useMemo(() => {
    const q = search.trim().toLowerCase();
    return ordersWithPacking.filter((order) => {
      const matchesSearch =
        !q ||
        order.customerName.toLowerCase().includes(q) ||
        order.id.toLowerCase().includes(q);
      const doneCount = order.steps.filter((step) => step.done).length;
      const matchesStatus =
        !statusFilter ||
        (statusFilter === "requested" && doneCount === 1) ||
        (statusFilter === "packing" && doneCount === 2) ||
        (statusFilter === "onRoute" && doneCount === 3) ||
        (statusFilter === "delivered" && doneCount >= 4);
      return matchesSearch && matchesStatus;
    });
  }, [ordersWithPacking, search, statusFilter]);

  const filteredCompleted = useMemo(() => {
    const q = search.trim().toLowerCase();
    let next = COMPLETED_ORDERS.filter(
      (order) =>
        (!q ||
          order.customer.toLowerCase().includes(q) ||
          order.id.toLowerCase().includes(q) ||
          order.zip.includes(q)) &&
        (!zipFilter || order.zip === zipFilter),
    );

    if (sortBy === "total") {
      next = [...next].sort((a, b) => b.total - a.total);
    } else if (sortBy === "customer") {
      next = [...next].sort((a, b) => a.customer.localeCompare(b.customer));
    }

    return next;
  }, [search, sortBy, zipFilter]);

  const completedGroups = useMemo(() => {
    const weeks = new Map<string, Map<string, CompletedOrder[]>>();
    filteredCompleted.forEach((order) => {
      if (!weeks.has(order.week)) weeks.set(order.week, new Map());
      const days = weeks.get(order.week)!;
      if (!days.has(order.day)) days.set(order.day, []);
      days.get(order.day)!.push(order);
    });
    return Array.from(weeks.entries());
  }, [filteredCompleted]);

  const zipOptions = useMemo(
    () =>
      Array.from(new Set(COMPLETED_ORDERS.map((order) => order.zip))).sort(),
    [],
  );

  const selectedOrder =
    ordersWithPacking.find((order) => order.id === selectedOrderId) ?? null;

  const exportCount =
    activeTab === "Orders" ? filteredActive.length : filteredCompleted.length;
  const exportFiltersActive =
    activeTab === "Orders"
      ? Boolean(search.trim() || statusFilter)
      : Boolean(search.trim() || zipFilter || statusFilter || sortBy);

  function advanceStatus(orderId: string, targetDoneCount: number) {
    setOrders((current) =>
      current.map((order) =>
        order.id === orderId
          ? { ...order, steps: makeSteps(targetDoneCount) }
          : order,
      ),
    );
    setStatusMenu(null);
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[#FAFAFA]">
      <div className="shrink-0 border-b border-[#ECECEA] bg-white">
        <div className="flex min-h-[52px] items-center px-4 md:px-7 lg:h-[52px]">
          <div className="flex w-full flex-col gap-3 lg:grid lg:grid-cols-[1fr_auto_1fr] lg:items-center lg:gap-4">
            <div className="flex items-center justify-between gap-3">
              <h1 className="text-[20px] font-semibold tracking-tight text-[#111118]">
                Customer Orders
              </h1>
              <div className="flex items-center border-l border-[#ECECEA] pl-5 lg:hidden">
                <UserMenu className="items-center" />
              </div>
            </div>

            <div className="flex h-full items-center gap-6 sm:gap-8">
              {(["Orders", "Completed"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab);
                    setSelectedOrderId(null);
                    setStatusMenu(null);
                  }}
                  className={cn(
                    "flex h-[52px] items-center border-b-2 text-[14px]",
                    activeTab === tab
                      ? "border-[#F57850] font-medium text-[#111118]"
                      : "border-transparent text-[#8A8A8A]",
                  )}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="hidden items-center justify-end border-l border-[#ECECEA] pl-5 lg:flex lg:justify-self-end">
              <UserMenu className="items-center" />
            </div>
          </div>
        </div>

        <div className="flex min-h-[52px] items-center border-t border-[#ECECEA] px-4 py-2 md:h-[52px] md:py-0 md:px-7">
          <div className="flex w-full flex-wrap items-center gap-2 md:flex-nowrap">
            <div className="relative w-full min-w-[160px] flex-1 sm:max-w-[220px] sm:flex-none">
              <Search
                size={13}
                className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[#111118]"
              />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search"
                className="w-full pl-8"
              />
            </div>

            {activeTab === "Orders" ? (
              <Select
                value={statusFilter}
                onChange={setStatusFilter}
                aria-label="All Statuses"
                className="w-full sm:w-[150px]"
                options={[
                  { value: "", label: "All Statuses" },
                  { value: "requested", label: "Requested" },
                  { value: "packing", label: "Packing" },
                  { value: "onRoute", label: "On Route" },
                  { value: "delivered", label: "Delivered+" },
                ]}
              />
            ) : (
              <>
                <Select
                  value={zipFilter}
                  onChange={setZipFilter}
                  aria-label="All Zip Codes"
                  className="w-full sm:w-[150px]"
                  options={[
                    { value: "", label: "All Zip Codes" },
                    ...zipOptions.map((zip) => ({ value: zip, label: zip })),
                  ]}
                />
                <button
                  type="button"
                  onClick={() => setCalendarOpen((open) => !open)}
                  className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-[8px] border border-[#E6E6E3] bg-white px-3 text-[13px] text-[#111118] sm:w-auto"
                >
                  <Calendar size={14} className="text-[#8A8A8A]" />
                  Select Date
                </button>
                <Select
                  value={statusFilter}
                  onChange={setStatusFilter}
                  aria-label="All Statuses"
                  className="w-full sm:w-[150px]"
                  options={[{ value: "", label: "All Statuses" }]}
                />
                <Select
                  value={sortBy}
                  onChange={setSortBy}
                  aria-label="Sort by"
                  className="w-full sm:w-[140px]"
                  options={[
                    { value: "", label: "Sort by" },
                    { value: "customer", label: "Customer" },
                    { value: "total", label: "Total" },
                  ]}
                />
              </>
            )}

            <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:ml-auto sm:w-auto sm:flex-nowrap">
              <ExportButton
                entityLabel="orders"
                recordCount={exportCount}
                filtersActive={exportFiltersActive}
                className="w-full sm:w-auto"
              />
              <div className="text-[12px] text-[#8A8A8A]">
                Today, Tue, Jul 16, 2026
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col bg-[#FAFAFA]">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#FAFAFA] px-4 py-5 md:px-7">
        {activeTab === "Orders" ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className={DATE_CHIP_ROW}>
              <div className={DATE_CHIP_SCROLL}>
                {DELIVERY_CHIPS.map((chip) => {
                  const active = chip.id === activeChip;
                  return (
                    <DeliveryDateChip
                      key={chip.id}
                      label={chip.label}
                      count={chip.count}
                      active={active}
                      onClick={() => setActiveChip(chip.id)}
                    />
                  );
                })}
              </div>

              <div className={cn("relative shrink-0", DATE_NAV_GROUP)}>
                <DateNavButton aria-label="Previous dates">
                  <ChevronLeft size={14} />
                </DateNavButton>
                <DateNavButton aria-label="Next dates">
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
                  <div className="absolute top-11 right-0 z-30 w-[280px] rounded-[12px] border border-[#ECECEA] bg-white p-4 shadow-xl">
                    <div className="mb-3 flex items-center justify-between text-[13px] font-semibold text-[#111118]">
                      <span>July 2026</span>
                      <div className="flex gap-1 text-[#8A8A8A]">
                        <ChevronLeft size={14} />
                        <ChevronRight size={14} />
                      </div>
                    </div>
                    <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-[#8A8A8A]">
                      {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
                        <div key={day} className="py-1">
                          {day}
                        </div>
                      ))}
                      {Array.from({ length: 31 }, (_, index) => {
                        const day = index + 1;
                        return (
                          <button
                            key={day}
                            type="button"
                            onClick={() => setSelectedDay(day)}
                            className={cn(
                              "rounded-full py-1.5 text-[#111118]",
                              selectedDay === day
                                ? "bg-[#E8E5E0] font-semibold"
                                : "hover:bg-background",
                            )}
                          >
                            {day}
                          </button>
                        );
                      })}
                    </div>
                    <div className="mt-3 flex items-center justify-end gap-3 border-t border-[#F0F0EE] pt-3">
                      <button
                        type="button"
                        onClick={() => setCalendarOpen(false)}
                        className="text-[13px] text-[#8A8A8A]"
                      >
                        Close
                      </button>
                      <button
                        type="button"
                        onClick={() => setCalendarOpen(false)}
                        className="rounded-[8px] px-4 py-1.5 text-[13px] font-medium text-white"
                        style={{ background: ORANGE }}
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-auto rounded-[10px] border border-[#ECECEA] bg-white">
              <div className="min-w-[900px]">
                <div className="grid grid-cols-[200px_repeat(6,minmax(0,1fr))] gap-2 border-b border-[#F0F0EE] px-5 py-3 text-[11px] font-semibold tracking-[0.06em] text-[#2E2E2E] uppercase">
                  <div>Order ID</div>
                  {STEPS_META.map((step) => (
                    <div key={step.key} className="text-center">
                      {step.header}
                    </div>
                  ))}
                </div>

                <div className="divide-y-[5px] divide-[#F0F0EE]">
                  {filteredActive.map((order) => (
                    <div
                      key={order.id}
                      className="relative bg-white px-4 py-4 sm:px-5"
                    >
                      <div className="grid grid-cols-[200px_minmax(0,1fr)] gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedOrderId(order.id)}
                          className="text-left"
                        >
                          <div className="flex items-center gap-1 text-[16px] font-semibold text-[#2E2E2E]">
                            {order.customerName}
                            <ChevronRight size={13} className="text-[#A9A9A9]" />
                          </div>
                          <div className="mt-1.5 flex flex-wrap items-center gap-2">
                            <IdPill>{order.id}</IdPill>
                            <span className="text-[12px] text-[#8A8A8A]">
                              {order.itemCount} items
                            </span>
                          </div>
                        </button>

                        <OrderTimelineTrack
                          order={order}
                          onStatusClick={(stepKey, anchor) => {
                            const menuWidth = 220;
                            const menuHeight = 88;
                            const gap = 8;
                            const placeAbove =
                              window.innerHeight - anchor.bottom <
                              menuHeight + gap;
                            setStatusMenu(
                              statusMenu?.orderId === order.id &&
                                statusMenu.stepKey === stepKey
                                ? null
                                : {
                                    orderId: order.id,
                                    stepKey,
                                    placeAbove,
                                    top: placeAbove
                                      ? anchor.top - gap
                                      : anchor.bottom + gap,
                                    left: Math.max(
                                      12,
                                      Math.min(
                                        anchor.left +
                                          anchor.width / 2 -
                                          menuWidth / 2,
                                        window.innerWidth - menuWidth - 12,
                                      ),
                                    ),
                                  },
                            );
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="min-h-0 flex-1 space-y-8 overflow-auto">
            {completedGroups.map(([week, days]) => (
              <section key={week}>
                <h2 className="mb-5 text-[22px] font-semibold tracking-tight text-[#111118]">
                  {week}
                </h2>
                {Array.from(days.entries()).map(([day, dayOrders]) => (
                  <div
                    key={day}
                    className="mb-6 overflow-hidden rounded-[10px] border border-[#ECECEA] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
                  >
                    <div className="flex h-10 items-center gap-2 border-b border-[#EBEBEB] bg-[#FBF9F9] px-4 text-[14px] font-semibold text-[#111118]">
                      <DayHeaderIcon />
                      <span>
                        {day}
                        <span className="font-medium text-[#8A8A8A]">
                          {" "}
                          · {dayOrders.length} orders
                        </span>
                      </span>
                    </div>
                    <div className="overflow-x-auto">
                      <div className="min-w-[860px]">
                        <div className="grid grid-cols-[110px_1fr_1.6fr_90px_1.2fr_1.2fr_70px_90px] gap-3 border-b border-[#F0F0EE] bg-white px-4 py-2.5 text-[11px] font-semibold tracking-[0.06em] text-[#2E2E2E] uppercase">
                          <div>Order ID</div>
                          <div>Customer</div>
                          <div>Address</div>
                          <div>Zip Code</div>
                          <div>Order Date</div>
                          <div>Delivered</div>
                          <div>Items</div>
                          <div>Total</div>
                        </div>
                        {dayOrders.map((order) => (
                          <div
                            key={order.id}
                            className="grid grid-cols-[110px_1fr_1.6fr_90px_1.2fr_1.2fr_70px_90px] gap-3 border-b border-[#F3F3F1] px-4 py-3.5 text-[13px] text-[#111118] last:border-b-0"
                          >
                            <IdPill>{order.id}</IdPill>
                            <div className="font-semibold">
                              {order.customer}
                            </div>
                            <LocationHover
                              className="text-[13px] text-[#111118]"
                              fullAddress={order.address}
                            >
                              {order.address}
                            </LocationHover>
                            <div>{order.zip}</div>
                            <div className="text-[#111118]">
                              {order.orderDate}
                            </div>
                            <div className="text-[#111118]">
                              {order.delivered}
                            </div>
                            <div>{order.items}</div>
                            <div className="font-bold">
                              {currency(order.total)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </section>
            ))}
          </div>
        )}
      </div>

      {statusMenu
        ? createPortal(
            <div
              data-status-menu
              className="fixed z-[80] w-max rounded-[10px] border border-[#ECECEA] bg-white p-3 shadow-xl"
              style={{
                top: statusMenu.top,
                left: statusMenu.left,
                transform: statusMenu.placeAbove
                  ? "translateY(-100%)"
                  : undefined,
              }}
            >
              <div className="mb-2 text-[12px] font-semibold text-[#111118]">
                Change Status
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded-[8px] bg-[#F3F3F1] px-3 py-1.5 text-[12px] text-[#111118]"
                  onClick={() => advanceStatus(statusMenu.orderId, 1)}
                >
                  Requested
                </button>
                <button
                  type="button"
                  className="rounded-[8px] px-3 py-1.5 text-[12px] text-white"
                  style={{ background: ORANGE }}
                  onClick={() => advanceStatus(statusMenu.orderId, 3)}
                >
                  On Route
                </button>
              </div>
            </div>,
            document.body,
          )
        : null}

      {selectedOrder ? (
        <OrderDetailPanel
          order={selectedOrder}
          onClose={() => setSelectedOrderId(null)}
        />
      ) : null}
      </div>
    </div>
  );
}

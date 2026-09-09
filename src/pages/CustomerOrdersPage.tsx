import { useMemo, useState } from "react";
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
import { LocationHover } from "@/components/shared/LocationHover";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { cn } from "@/utils/cn";

const ORANGE = "#F57850";
const GREEN = "#28402B";

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
  { id: "wed-14", label: "Wed, Jul 14", count: 13 },
  { id: "wed-20", label: "Wed, Jul 20", count: 7 },
  { id: "wed-27", label: "Wed, Jul 27", count: 3 },
];

const SAMPLE_ITEMS: OrderItem[] = [
  { name: "Angus Chuck Ground Beef", qty: 1, unit: "lb", unitPrice: 33.75 },
  { name: "Drumsticks", qty: 2, unit: "pack", unitPrice: 5 },
  { name: "Rib-eye Steak", qty: 3, unit: "ea", unitPrice: 2.5 },
  { name: "Red Beets", qty: 1, unit: "bunch", unitPrice: 12 },
  { name: "A2 Cheddar", qty: 4, unit: "oz", unitPrice: 2 },
];

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

const ACTIVE_ORDERS: CustomerOrderRow[] = [
  {
    id: "ORD-U003-01",
    customerName: "Emily Rodriguez",
    itemCount: 6,
    address: "1523 Astoria Blvd",
    apt: "748",
    city: "Queens",
    state: "NY",
    zip: "11102",
    orderDate: "Jul 16, 2026, 5:13 PM",
    deliveryDate: "Jul 20, 2026, Wednesday",
    deliveryLabel: "Wed, Jul 20",
    paymentStatus: "Paid",
    total: 71.25,
    items: SAMPLE_ITEMS,
    packerAssigned: "Packer Name 1",
    coolerIds: ["BL-0012", "FR-1423"],
    steps: makeSteps(1),
  },
  {
    id: "ORD-U003-02",
    customerName: "Lucas Bennett",
    itemCount: 6,
    address: "890 Broadway",
    apt: "12",
    city: "New York",
    state: "NY",
    zip: "10003",
    orderDate: "Jul 16, 2026, 1:10 AM",
    deliveryDate: "Jul 20, 2026, Wednesday",
    deliveryLabel: "Wed, Jul 20",
    paymentStatus: "Paid",
    total: 71.25,
    items: SAMPLE_ITEMS,
    packerAssigned: "July Anderson",
    coolerIds: ["BL-0012"],
    steps: makeSteps(2),
  },
  {
    id: "ORD-U003-03",
    customerName: "Sophia Martinez",
    itemCount: 4,
    address: "245 Bedford Ave",
    apt: "3B",
    city: "Brooklyn",
    state: "NY",
    zip: "11211",
    orderDate: "Jul 16, 2026, 12:31 AM",
    deliveryDate: "Jul 20, 2026, Wednesday",
    deliveryLabel: "Wed, Jul 20",
    paymentStatus: "Paid",
    total: 58.4,
    items: SAMPLE_ITEMS.slice(0, 3),
    packerAssigned: "July Anderson",
    coolerIds: ["FR-1423"],
    steps: makeSteps(3),
  },
  {
    id: "ORD-U003-04",
    customerName: "Ethan Carter",
    itemCount: 6,
    address: "1523 Astoria Blvd",
    apt: "748",
    city: "Queens",
    state: "NY",
    zip: "11102",
    orderDate: "Jul 16, 2026, 12:31 AM",
    deliveryDate: "Jul 20, 2026, Wednesday",
    deliveryLabel: "Wed, Jul 20",
    paymentStatus: "Paid",
    total: 71.25,
    items: SAMPLE_ITEMS,
    packerAssigned: "July Anderson",
    coolerIds: ["BL-0012", "FR-1423"],
    steps: makeSteps(4),
  },
  {
    id: "ORD-U003-05",
    customerName: "Liam Johnson",
    itemCount: 5,
    address: "456 Grove St",
    apt: "7",
    city: "Jersey City",
    state: "NJ",
    zip: "07302",
    orderDate: "Jul 15, 2026, 4:20 PM",
    deliveryDate: "Jul 20, 2026, Wednesday",
    deliveryLabel: "Wed, Jul 20",
    paymentStatus: "Paid",
    total: 64.1,
    items: SAMPLE_ITEMS.slice(0, 4),
    packerAssigned: "Packer Name 1",
    coolerIds: ["BS-402-27"],
    steps: makeSteps(5),
  },
  {
    id: "ORD-U003-06",
    customerName: "Ava Smith",
    itemCount: 7,
    address: "789 Washington St",
    apt: "1A",
    city: "Hoboken",
    state: "NJ",
    zip: "07030",
    orderDate: "Jul 14, 2026, 9:40 AM",
    deliveryDate: "Jul 20, 2026, Wednesday",
    deliveryLabel: "Wed, Jul 20",
    paymentStatus: "Paid",
    total: 88.5,
    items: SAMPLE_ITEMS,
    packerAssigned: "July Anderson",
    coolerIds: ["BL-0012"],
    steps: makeSteps(6),
  },
  {
    id: "ORD-U003-07",
    customerName: "Noah Brown",
    itemCount: 2,
    address: "321 E 149th St",
    apt: "4",
    city: "Bronx",
    state: "NY",
    zip: "10451",
    orderDate: "Jul 14, 2026, 11:15 AM",
    deliveryDate: "Jul 20, 2026, Wednesday",
    deliveryLabel: "Wed, Jul 20",
    paymentStatus: "Pending",
    total: 29.5,
    items: SAMPLE_ITEMS.slice(0, 2),
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
    items: 12,
    total: 150.75,
    day: "Wednesday, 7/15/2026",
    week: "Week of 7/14/2026",
  },
  {
    id: "ORD-U004-09",
    customer: "Oliver Wilson",
    address: "890 Broadway, Suite 12, New York, NY",
    zip: "10003",
    orderDate: "Apr 14, 2026, 1:10 PM",
    delivered: "Jul 15, 2026, 11:20 AM",
    items: 8,
    total: 98.4,
    day: "Wednesday, 7/15/2026",
    week: "Week of 7/14/2026",
  },
  {
    id: "ORD-U004-10",
    customer: "Mia Garcia",
    address: "245 Bedford Ave, Brooklyn, NY",
    zip: "11211",
    orderDate: "Apr 13, 2026, 5:45 PM",
    delivered: "Jul 15, 2026, 1:05 PM",
    items: 5,
    total: 67.2,
    day: "Wednesday, 7/15/2026",
    week: "Week of 7/14/2026",
  },
  {
    id: "ORD-U004-11",
    customer: "James Miller",
    address: "1523 Astoria Blvd, Queens, NY",
    zip: "11102",
    orderDate: "Apr 12, 2026, 9:00 AM",
    delivered: "Jul 15, 2026, 3:40 PM",
    items: 9,
    total: 112,
    day: "Wednesday, 7/15/2026",
    week: "Week of 7/14/2026",
  },
  {
    id: "ORD-U005-01",
    customer: "Charlotte Lee",
    address: "456 Grove St, Jersey City, NJ",
    zip: "07302",
    orderDate: "Apr 20, 2026, 2:15 PM",
    delivered: "Jul 22, 2026, 9:30 AM",
    items: 6,
    total: 84.5,
    day: "Wednesday, 7/22/2026",
    week: "Week of 7/21/2026",
  },
  {
    id: "ORD-U005-02",
    customer: "Henry Adams",
    address: "789 Washington St, Hoboken, NJ",
    zip: "07030",
    orderDate: "Apr 19, 2026, 4:00 PM",
    delivered: "Jul 22, 2026, 12:10 PM",
    items: 4,
    total: 55.25,
    day: "Wednesday, 7/22/2026",
    week: "Week of 7/21/2026",
  },
  {
    id: "ORD-U006-01",
    customer: "Amelia Scott",
    address: "1123 Astoria Blvd, Queens, NY",
    zip: "11102",
    orderDate: "Apr 25, 2026, 11:00 AM",
    delivered: "Jul 29, 2026, 2:15 PM",
    items: 7,
    total: 92.1,
    day: "Wednesday, 7/29/2026",
    week: "Week of 7/28/2026",
  },
  {
    id: "ORD-U006-02",
    customer: "Benjamin Clark",
    address: "78 Court St, Brooklyn, NY",
    zip: "11201",
    orderDate: "Apr 24, 2026, 3:45 PM",
    delivered: "Jul 29, 2026, 4:00 PM",
    items: 3,
    total: 41.5,
    day: "Wednesday, 7/29/2026",
    week: "Week of 7/28/2026",
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
          <div className="flex items-center justify-between border-t border-[#F0F0EE] pt-2 text-[12px] font-semibold text-[#111118]">
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
          <span className="rounded-[6px] bg-[#F3F3F1] px-2 py-0.5 font-mono text-[11px] text-[#6B6B6B]">
            {order.coolerIds?.[0] ?? "BS-402-27"}
          </span>
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
  onStatusClick: () => void;
}) {
  const [hover, setHover] = useState(false);

  return (
    <div
      className="relative flex min-w-0 flex-col items-center px-0.5"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div className="mb-1.5 flex h-[14px] w-full items-end justify-center truncate text-center text-[10px] font-medium text-[#111118] sm:text-[11px]">
        {step.done && step.shortLabel ? step.shortLabel : null}
      </div>

      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onStatusClick();
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

      <div className="mt-1.5 min-h-[14px] w-full truncate text-center text-[9px] leading-tight text-[#9A948C] sm:text-[10px]">
        {step.done && step.at ? step.at : null}
      </div>

      {hover && step.done ? (
        <div className="absolute top-[52px] left-1/2 z-30 hidden -translate-x-1/2 sm:block">
          <HoverCard step={step} order={order} />
        </div>
      ) : null}
    </div>
  );
}

function OrderTimelineTrack({
  order,
  onStatusClick,
}: {
  order: CustomerOrderRow;
  onStatusClick: (stepKey: TimelineStepKey) => void;
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
            onStatusClick={() => onStatusClick(step.key)}
          />
        ))}
      </div>
    </div>
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
        <div className="flex items-start justify-between border-b border-[#F0F0EE] px-5 py-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-[6px] bg-[#F3F3F1] px-2 py-0.5 font-mono text-[11px] text-[#6B6B6B]">
                {order.id}
              </span>
              <span className="text-[12px] text-[#8A8A8A]">
                Ordered: {order.orderDate}
              </span>
            </div>
            <h2 className="mt-2 text-[26px] font-semibold tracking-tight text-[#111118]">
              {order.customerName}
            </h2>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="rounded-md p-1 text-[#8A8A8A] hover:bg-background hover:text-[#111118]"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-auto px-5 py-5">
          <h3 className="mb-3 text-[13px] font-semibold text-[#111118]">
            Requested Items
          </h3>
          <div className="overflow-hidden rounded-[10px] border border-[#ECECEA]">
            <div className="grid grid-cols-[1.6fr_50px_90px_70px] gap-2 border-b border-[#ECECEA] bg-[#FAFAF8] px-3 py-2 text-[11px] font-semibold tracking-[0.06em] text-[#2E2E2E] uppercase">
              <div>Item</div>
              <div>Qty</div>
              <div>Unit Price</div>
              <div className="text-right">Total</div>
            </div>
            {order.items.map((item) => (
              <div
                key={item.name}
                className="grid grid-cols-[1.6fr_50px_90px_70px] gap-2 border-b border-[#F3F3F1] px-3 py-2.5 text-[12px] text-[#111118] last:border-b-0"
              >
                <div>{item.name}</div>
                <div>{item.qty}</div>
                <div>
                  {currency(item.unitPrice)} / {item.unit}
                </div>
                <div className="text-right font-semibold">
                  {currency(item.qty * item.unitPrice)}
                </div>
              </div>
            ))}
            <div className="flex items-center justify-between border-t border-[#ECECEA] bg-[#FAFAF8] px-3 py-2.5 text-[13px] font-semibold text-[#111118]">
              <span>Order Total</span>
              <span>{currency(order.total)}</span>
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
              <div className="mt-1 text-[13px] text-[#111118]">
                {order.packerAssigned ?? "—"}
              </div>
            </div>
            <div>
              <div className="text-[11px] font-semibold tracking-[0.06em] text-[#2E2E2E] uppercase">
                Cooler ID
              </div>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {(order.coolerIds ?? []).map((coolerId) => (
                  <span
                    key={coolerId}
                    className="rounded-[6px] bg-[#F3F3F1] px-2 py-0.5 font-mono text-[11px] text-[#6B6B6B]"
                  >
                    {coolerId}
                  </span>
                ))}
                {!order.coolerIds?.length ? (
                  <span className="text-[13px] text-[#8A8A8A]">—</span>
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
          <div className="grid grid-cols-2 gap-4 text-[13px]">
            <div>
              <div className="text-[11px] font-semibold tracking-[0.06em] text-[#2E2E2E] uppercase">
                Street Address
              </div>
              <div className="mt-1 text-[#111118]">{order.address}</div>
            </div>
            <div>
              <div className="text-[11px] font-semibold tracking-[0.06em] text-[#2E2E2E] uppercase">
                Apt / Unit
              </div>
              <div className="mt-1 text-[#111118]">{order.apt}</div>
            </div>
            <div>
              <div className="text-[11px] font-semibold tracking-[0.06em] text-[#2E2E2E] uppercase">
                City
              </div>
              <div className="mt-1 text-[#111118]">{order.city}</div>
            </div>
            <div>
              <div className="text-[11px] font-semibold tracking-[0.06em] text-[#2E2E2E] uppercase">
                State
              </div>
              <div className="mt-1 text-[#111118]">{order.state}</div>
            </div>
            <div>
              <div className="text-[11px] font-semibold tracking-[0.06em] text-[#2E2E2E] uppercase">
                Zip
              </div>
              <div className="mt-1 text-[#111118]">{order.zip}</div>
            </div>
          </div>
        </div>
    </aside>
  );
}

export default function CustomerOrdersPage() {
  useDocumentTitle("Customer Orders");

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
  } | null>(null);

  const filteredActive = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter((order) => {
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
  }, [orders, search, statusFilter]);

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
    orders.find((order) => order.id === selectedOrderId) ?? null;

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
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-background">
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

            <div className="hidden items-center justify-end gap-3 border-l border-[#ECECEA] pl-5 lg:flex lg:justify-self-end">
              <UserMenu className="items-center" />
              <div className="text-[12px] text-[#8A8A8A]">
                Today, Tue, Jul 16, 2026
              </div>
            </div>
          </div>
        </div>

        <div className="flex min-h-[52px] items-center border-t border-[#ECECEA] px-4 py-2 md:h-[52px] md:py-0 md:px-7">
          <div className="flex w-full flex-wrap items-center gap-2 md:flex-nowrap">
            <div className="relative w-full min-w-[160px] flex-1 sm:max-w-[220px] sm:flex-none">
              <Search
                size={13}
                className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[#A9A9A9]"
              />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search"
                className="h-[34px] rounded-[8px] border-[#E6E6E3] bg-white pl-8 text-[13px]"
              />
            </div>

            {activeTab === "Orders" ? (
              <Select
                value={statusFilter}
                onChange={setStatusFilter}
                aria-label="All Statuses"
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
                  options={[
                    { value: "", label: "All Zip Codes" },
                    ...zipOptions.map((zip) => ({ value: zip, label: zip })),
                  ]}
                />
                <button
                  type="button"
                  onClick={() => setCalendarOpen((open) => !open)}
                  className="inline-flex h-[34px] items-center gap-2 rounded-[8px] border border-[#E6E6E3] bg-white px-3 text-[13px] text-[#111118]"
                >
                  <Calendar size={13} className="text-[#8A8A8A]" />
                  Select Date
                </button>
                <Select
                  value={statusFilter}
                  onChange={setStatusFilter}
                  aria-label="All Statuses"
                  options={[{ value: "", label: "All Statuses" }]}
                />
                <Select
                  value={sortBy}
                  onChange={setSortBy}
                  aria-label="Sort by"
                  options={[
                    { value: "", label: "Sort by" },
                    { value: "customer", label: "Customer" },
                    { value: "total", label: "Total" },
                  ]}
                />
              </>
            )}
          </div>
        </div>
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col">
      <div className="flex-1 overflow-auto px-4 md:px-7 py-5">
        {activeTab === "Orders" ? (
          <>
            <div className="mb-5 flex items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                {DELIVERY_CHIPS.map((chip) => {
                  const active = chip.id === activeChip;
                  return (
                    <button
                      key={chip.id}
                      type="button"
                      onClick={() => setActiveChip(chip.id)}
                      className={cn(
                        "inline-flex items-center gap-2.5 rounded-full border px-3.5 py-2 text-left",
                        active
                          ? "border-transparent text-white"
                          : "border-[#ECECEA] bg-white text-[#111118]",
                      )}
                      style={active ? { background: GREEN } : undefined}
                    >
                      <span className="text-[13px] font-semibold">
                        {chip.label}
                      </span>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                          active
                            ? "bg-[#3D5A40] text-white"
                            : "bg-[#F3F3F1] text-[#6B6B6B]",
                        )}
                      >
                        {chip.count}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="relative flex items-center gap-2">
                <button
                  type="button"
                  className="flex size-8 items-center justify-center rounded-[8px] border border-[#ECECEA] bg-white text-[#8A8A8A]"
                >
                  <ChevronLeft size={15} />
                </button>
                <button
                  type="button"
                  className="flex size-8 items-center justify-center rounded-[8px] border border-[#ECECEA] bg-white text-[#8A8A8A]"
                >
                  <ChevronRight size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => setCalendarOpen((open) => !open)}
                  className={cn(
                    "flex size-8 items-center justify-center rounded-[8px] border bg-white",
                    calendarOpen
                      ? "border-[#28402B] text-[#28402B]"
                      : "border-[#ECECEA] text-[#8A8A8A]",
                  )}
                >
                  <Calendar size={14} />
                </button>

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

            <div className="overflow-x-auto rounded-[10px] border border-[#ECECEA] bg-white">
              <div className="min-w-[900px]">
                <div className="grid grid-cols-[200px_repeat(6,minmax(0,1fr))] gap-2 border-b border-[#F0F0EE] px-5 py-3 text-[11px] font-semibold tracking-[0.06em] text-[#2E2E2E] uppercase">
                  <div>Order ID</div>
                  {STEPS_META.map((step) => (
                    <div key={step.key} className="text-center">
                      {step.header}
                    </div>
                  ))}
                </div>

                {filteredActive.map((order) => (
                  <div
                    key={order.id}
                    className="relative border-b border-[#F3F3F1] px-4 py-4 last:border-b-0 sm:px-5"
                  >
                    <div className="grid grid-cols-[200px_minmax(0,1fr)] gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedOrderId(order.id)}
                        className="text-left"
                      >
                        <div className="flex items-center gap-1 text-[14px] font-semibold text-[#111118]">
                          {order.customerName}
                          <ChevronRight size={13} className="text-[#A9A9A9]" />
                        </div>
                        <div className="mt-1.5 flex flex-wrap items-center gap-2">
                          <span className="rounded-[6px] bg-[#F3F3F1] px-1.5 py-0.5 font-mono text-[11px] text-[#6B6B6B]">
                            {order.id}
                          </span>
                          <span className="text-[12px] text-[#8A8A8A]">
                            {order.itemCount} items
                          </span>
                        </div>
                      </button>

                      <OrderTimelineTrack
                        order={order}
                        onStatusClick={(stepKey) =>
                          setStatusMenu(
                            statusMenu?.orderId === order.id &&
                              statusMenu.stepKey === stepKey
                              ? null
                              : { orderId: order.id, stepKey },
                          )
                        }
                      />
                    </div>

                    {statusMenu?.orderId === order.id ? (
                      <div className="absolute top-12 left-[220px] z-20 w-max rounded-[10px] border border-[#ECECEA] bg-white p-3 shadow-xl">
                        <div className="mb-2 text-[12px] font-semibold text-[#111118]">
                          Change Status
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            className="rounded-[8px] bg-[#F3F3F1] px-3 py-1.5 text-[12px] text-[#111118]"
                            onClick={() => advanceStatus(order.id, 1)}
                          >
                            Requested
                          </button>
                          <button
                            type="button"
                            className="rounded-[8px] px-3 py-1.5 text-[12px] text-white"
                            style={{ background: ORANGE }}
                            onClick={() => advanceStatus(order.id, 3)}
                          >
                            On Route
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="space-y-8">
            {completedGroups.map(([week, days]) => (
              <section key={week}>
                <h2 className="mb-5 text-[22px] font-semibold tracking-tight text-[#111118]">
                  {week}
                </h2>
                {Array.from(days.entries()).map(([day, dayOrders]) => (
                  <div key={day} className="mb-6">
                    <div className="mb-3 flex items-center gap-2 text-[14px] font-semibold text-[#111118]">
                      <Truck size={15} className="text-[#F57850]" />
                      {day}
                      <span className="font-medium text-[#8A8A8A]">
                        · {dayOrders.length} orders
                      </span>
                    </div>
                    <div className="overflow-hidden rounded-[10px] border border-[#ECECEA] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                      <div className="overflow-x-auto">
                        <div className="min-w-[860px]">
                          <div className="grid grid-cols-[110px_1fr_1.6fr_90px_1.2fr_1.2fr_70px_90px] gap-3 border-b border-[#F0F0EE] px-4 py-2.5 text-[11px] font-semibold tracking-[0.06em] text-[#2E2E2E] uppercase">
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
                              <span className="w-fit rounded-[6px] bg-[#F3F3F1] px-1.5 py-0.5 font-mono text-[11px] text-[#6B6B6B]">
                                {order.id}
                              </span>
                              <div className="font-semibold">
                                {order.customer}
                              </div>
                              <LocationHover
                                className="text-[13px] text-[#6B6B6B]"
                                fullAddress={order.address}
                              >
                                {order.address}
                              </LocationHover>
                              <div>{order.zip}</div>
                              <div className="text-[#6B6B6B]">
                                {order.orderDate}
                              </div>
                              <div className="text-[#6B6B6B]">
                                {order.delivered}
                              </div>
                              <div>{order.items}</div>
                              <div className="font-semibold">
                                {currency(order.total)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </section>
            ))}
          </div>
        )}
      </div>

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

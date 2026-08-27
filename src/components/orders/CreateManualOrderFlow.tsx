import { useMemo, useState } from "react";
import { Calendar, ChevronLeft, Minus, Plus, X } from "lucide-react";

import { UserMenu } from "@/components/layout/UserMenu";
import { Select } from "@/components/ui/Select";
import {
  MANUAL_CATALOG,
  MANUAL_DISTRIBUTORS,
  MANUAL_TIME_SLOTS,
} from "@/constants/distributorOrders";
import { useScrollLock } from "@/hooks/useScrollLock";
import type { ManualLine, PlacedOrder } from "@/types/distributorOrder";
import { cn } from "@/utils/cn";

const ORANGE = "#F57850";

type Step = "create" | "review";

type CreateManualOrderFlowProps = {
  onClose: () => void;
  onCreated: (order: PlacedOrder) => void;
};

function money(value: number) {
  if (Number.isInteger(value)) return `$${value}`;
  return `$${value.toFixed(2).replace(/\.?0+$/, "")}`;
}

function QtyStepper({
  value,
  onChange,
}: {
  value: number;
  onChange: (next: number) => void;
}) {
  return (
    <div className="inline-flex h-8 items-center rounded-[8px] border border-[#E6E6E3] bg-[#F7F7F5]">
      <button
        type="button"
        aria-label="Decrease"
        onClick={() => onChange(Math.max(0, value - 1))}
        className="flex size-8 items-center justify-center text-[#5A5A5A]"
      >
        <Minus className="size-3.5" />
      </button>
      <span className="min-w-[24px] text-center text-[13px] font-medium text-[#111118]">
        {value}
      </span>
      <button
        type="button"
        aria-label="Increase"
        onClick={() => onChange(value + 1)}
        className="flex size-8 items-center justify-center text-[#5A5A5A]"
      >
        <Plus className="size-3.5" />
      </button>
    </div>
  );
}

export function CreateManualOrderFlow({
  onClose,
  onCreated,
}: CreateManualOrderFlowProps) {
  const [step, setStep] = useState<Step>("create");
  const [distributor, setDistributor] = useState("");
  const [lines, setLines] = useState<ManualLine[]>([]);
  const [deliveryDate, setDeliveryDate] = useState("");
  const [timeSlots, setTimeSlots] = useState<string[]>([]);
  const [confirmClose, setConfirmClose] = useState(false);
  useScrollLock(confirmClose);

  const total = useMemo(
    () => lines.reduce((sum, line) => sum + line.price * line.quantity, 0),
    [lines],
  );

  const selectedLines = useMemo(
    () => lines.filter((line) => line.quantity > 0),
    [lines],
  );

  const groupedBySource = useMemo(() => {
    const map = new Map<string, ManualLine[]>();
    for (const line of lines) {
      if (!map.has(line.source)) map.set(line.source, []);
      map.get(line.source)!.push(line);
    }
    return Array.from(map.entries());
  }, [lines]);

  const reviewBySource = useMemo(() => {
    const map = new Map<
      string,
      { source: string; itemCount: number; totalPrice: number }
    >();
    for (const line of selectedLines) {
      const lineTotal = line.price * line.quantity;
      const existing = map.get(line.source);
      if (!existing) {
        map.set(line.source, {
          source: line.source,
          itemCount: line.quantity,
          totalPrice: lineTotal,
        });
        continue;
      }
      existing.itemCount += line.quantity;
      existing.totalPrice += lineTotal;
    }
    return Array.from(map.values());
  }, [selectedLines]);

  const expectedDeliveryLabel = useMemo(() => {
    if (!deliveryDate) return "Tue, Jul 18, 06:00";
    const date = new Date(`${deliveryDate}T12:00:00`);
    const day = date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    const slot = timeSlots[0] ?? MANUAL_TIME_SLOTS[0];
    const start = slot.split("–")[0] ?? "06:00";
    return `${day}, ${start}`;
  }, [deliveryDate, timeSlots]);

  const canReview =
    Boolean(distributor) &&
    selectedLines.length > 0 &&
    Boolean(deliveryDate) &&
    timeSlots.length > 0;

  function selectDistributor(name: string) {
    setDistributor(name);
    if (!name) {
      setLines([]);
      return;
    }
    setLines(MANUAL_CATALOG.map((item) => ({ ...item, quantity: 0 })));
  }

  function setQty(id: string, quantity: number) {
    setLines((prev) =>
      prev.map((line) =>
        line.id === id ? { ...line, quantity: Math.max(0, quantity) } : line,
      ),
    );
  }

  function toggleTime(slot: string) {
    setTimeSlots((prev) =>
      prev.includes(slot) ? prev.filter((s) => s !== slot) : [...prev, slot],
    );
  }

  function createOrder() {
    const order: PlacedOrder = {
      id: `manual-${Date.now()}`,
      deliveryId: String(810 + Math.floor(Math.random() * 80)).padStart(4, "0"),
      distributor,
      orderDate: "Jul 16, 12:34 PM",
      deliveryDate: expectedDeliveryLabel,
      totalPrice: total,
      items: selectedLines.map((line) => ({
        sku: line.sku,
        itemName: line.name,
        source: line.source,
        quantity: line.quantity,
        price: line.price,
        unit: line.unit,
      })),
    };
    onCreated(order);
  }

  return (
    <div className="relative flex h-full min-h-0 flex-col bg-[#F5F5F3]">
      <div className="shrink-0 border-b border-[#ECECEA] bg-white px-4 py-5 md:px-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[28px] font-semibold tracking-tight text-[#111118]">
              {step === "review" ? "Review Order" : "Create Manual Order"}
            </h1>
            {step === "review" ? (
              <p className="mt-1 text-[13px] text-[#8A8A8A]">
                Orders for{" "}
                <span className="font-semibold text-[#111118]">
                  Wed, Jul 14 delivery
                </span>
              </p>
            ) : null}
          </div>
          <UserMenu
            showAvatar
            showBell={step === "create"}
            className="items-center"
          />
        </div>
      </div>

      {step === "create" ? (
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 md:px-8">
          <div className="mx-auto max-w-[920px] space-y-4">
            <section className="rounded-[12px] border border-[#ECECEA] bg-white p-5 md:p-6">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-[16px] font-semibold text-[#111118]">
                  Select Distributor
                </h2>
                {distributor ? (
                  <div className="text-[14px] font-semibold text-[#111118]">
                    Total: {money(total)}
                  </div>
                ) : null}
              </div>

              <Select
                value={distributor}
                onChange={selectDistributor}
                placeholder="Select"
                aria-label="Select Distributor"
                className="w-full max-w-[420px]"
                options={[
                  { value: "", label: "Select" },
                  ...MANUAL_DISTRIBUTORS.map((name) => ({
                    value: name,
                    label: name,
                  })),
                ]}
              />

              {distributor ? (
                <div className="mt-6">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="text-[11px] font-semibold tracking-[0.06em] text-[#8A8A8A] uppercase">
                      Select Items From Source
                    </div>
                    <button
                      type="button"
                      className="inline-flex h-8 items-center gap-1 rounded-[8px] bg-[#111118] px-3 text-[12px] font-semibold text-white"
                    >
                      <Plus className="size-3.5" />
                      Add Item
                    </button>
                  </div>

                  <div className="space-y-5">
                    {groupedBySource.map(([source, sourceLines]) => (
                      <div key={source}>
                        <h3 className="mb-2 text-[14px] font-semibold text-[#111118]">
                          {source}
                        </h3>
                        <div className="divide-y divide-[#F0F0EE] border-t border-[#F0F0EE]">
                          {sourceLines.map((line) => (
                            <div
                              key={line.id}
                              className="grid grid-cols-[72px_minmax(0,1.4fr)_0.9fr_0.9fr_auto] items-center gap-3 py-3"
                            >
                              <span className="w-fit rounded-full bg-[#F0F0EE] px-2 py-0.5 text-[11px] font-medium text-[#6A6A6A]">
                                {line.sku}
                              </span>
                              <span className="truncate text-[13px] font-medium text-[#111118]">
                                {line.name}
                              </span>
                              <span className="text-[12px] text-[#8A8A8A]">
                                In stock: {line.inStock}
                              </span>
                              <span className="text-[13px] text-[#111118]">
                                {money(line.price)}/{line.unit}
                              </span>
                              <QtyStepper
                                value={line.quantity}
                                onChange={(q) => setQty(line.id, q)}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </section>

            {distributor ? (
              <section className="rounded-[12px] border border-[#ECECEA] bg-white p-5 md:p-6">
                <h2 className="mb-4 text-[16px] font-semibold text-[#111118]">
                  Select Delivery Date
                </h2>
                <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                  <div className="relative w-full max-w-[220px] sm:w-[220px]">
                    <Calendar className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#8A8A8A]" />
                    <input
                      type="date"
                      value={deliveryDate}
                      onChange={(e) => setDeliveryDate(e.target.value)}
                      className="h-10 w-full rounded-[8px] border border-[#E6E6E3] bg-white pr-3 pl-10 text-[13px] text-[#111118] outline-none focus:border-[#C8C8C6]"
                      aria-label="Select Date"
                    />
                  </div>
                  <span className="text-[13px] font-medium text-[#111118]">
                    Select Time
                  </span>
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                    {MANUAL_TIME_SLOTS.map((slot) => (
                      <label
                        key={slot}
                        className="inline-flex cursor-pointer items-center gap-2 text-[13px] text-[#111118]"
                      >
                        <input
                          type="checkbox"
                          checked={timeSlots.includes(slot)}
                          onChange={() => toggleTime(slot)}
                          className="size-4 rounded border-[#C8C8C6] accent-[#28402B]"
                        />
                        {slot}
                      </label>
                    ))}
                  </div>
                </div>
              </section>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 md:px-8">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
            <div className="rounded-[12px] border border-[#ECECEA] bg-white p-5">
              <h3 className="mb-4 text-[22px] font-semibold tracking-tight text-[#111118]">
                {distributor}
              </h3>
              <div className="space-y-3">
                {selectedLines.map((line) => (
                  <div
                    key={line.id}
                    className="grid grid-cols-[1.4fr_1fr_0.45fr_0.9fr_0.7fr] gap-3 text-[13px]"
                  >
                    <span className="text-[#111118]">{line.name}</span>
                    <span className="text-[#8A8A8A]">{line.source}</span>
                    <span className="font-semibold text-[#111118]">
                      {line.quantity}x
                    </span>
                    <span className="text-[#111118]">
                      {money(line.price)}/{line.unit}
                    </span>
                    <span className="text-right font-semibold text-[#111118]">
                      {money(line.price * line.quantity)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#F0F0EE] pt-4">
                <span className="text-[13px] text-[#8A8A8A]">
                  Expected delivery{" "}
                  <span className="font-semibold text-[#111118]">
                    {expectedDeliveryLabel}
                  </span>
                </span>
                <span className="text-[18px] font-semibold text-[#111118]">
                  {money(total)}
                </span>
              </div>
            </div>

            <aside className="h-fit rounded-[12px] border border-[#ECECEA] bg-white p-5 xl:sticky xl:top-4">
              <h3 className="mb-4 text-[16px] font-semibold text-[#111118]">
                Order Summary
              </h3>
              <div className="space-y-3">
                {reviewBySource.map((group) => (
                  <div
                    key={group.source}
                    className="flex items-start justify-between gap-3 text-[13px]"
                  >
                    <div>
                      <div className="font-medium text-[#111118]">
                        {group.source}
                      </div>
                      <div className="text-[12px] text-[#8A8A8A]">
                        {group.itemCount} items
                      </div>
                    </div>
                    <div className="font-medium text-[#111118]">
                      {money(group.totalPrice)}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-[#F0F0EE] pt-4">
                <span className="text-[14px] font-semibold text-[#111118]">
                  Total
                </span>
                <span className="text-[22px] font-semibold text-[#111118]">
                  {money(total)}
                </span>
              </div>
            </aside>
          </div>
        </div>
      )}

      <div className="flex shrink-0 items-center justify-between gap-3 border-t border-[#ECECEA] bg-white px-4 py-3.5 md:px-8">
        {step === "review" ? (
          <button
            type="button"
            onClick={() => setStep("create")}
            className="inline-flex items-center gap-1 text-[14px] font-medium text-[#5A5A5A] hover:text-[#111118]"
          >
            <ChevronLeft className="size-4" />
            Back
          </button>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setConfirmClose(true)}
            className="rounded-[8px] px-3 py-2 text-[14px] font-medium text-[#5A5A5A] hover:bg-[#F5F5F3]"
          >
            Cancel & Close
          </button>
          <button
            type="button"
            disabled={step === "create" && !canReview}
            onClick={() => {
              if (step === "create") setStep("review");
              else createOrder();
            }}
            className={cn(
              "h-10 rounded-[8px] px-5 text-[14px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40",
            )}
            style={{ backgroundColor: ORANGE }}
          >
            {step === "create" ? "Review Order" : "Create Order"}
          </button>
        </div>
      </div>

      {confirmClose ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center overscroll-none bg-black/45 p-4">
          <div
            className="w-full max-w-[420px] overflow-hidden overscroll-contain rounded-[12px] bg-white p-6 shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="manual-cancel-title"
            data-scroll-lock-allow
          >
            <div className="mb-4 flex items-start justify-between">
              <h2
                id="manual-cancel-title"
                className="text-[18px] font-semibold text-[#111118]"
              >
                Cancel and Close Order
              </h2>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setConfirmClose(false)}
                className="rounded-md p-1 text-[#8A8A8A] hover:bg-[#F5F5F3]"
              >
                <X className="size-5" />
              </button>
            </div>
            <p className="mb-6 text-[14px] text-[#5A5A5A]">
              Are you sure you want to close order request?
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmClose(false)}
                className="rounded-[8px] px-4 py-2.5 text-[14px] font-medium text-[#5A5A5A] hover:bg-[#F5F5F3]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-[8px] bg-[#111118] px-5 py-2.5 text-[14px] font-medium text-white hover:bg-[#1A1A1A]"
              >
                Cancel Order
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

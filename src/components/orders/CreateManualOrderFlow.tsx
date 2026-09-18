import { useMemo, useState } from "react";
import { Check, ChevronLeft, Minus, Plus, X } from "lucide-react";

import { UserMenu } from "@/components/layout/UserMenu";
import { IdPill } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DatePicker } from "@/components/ui/DatePicker";
import { Select } from "@/components/ui/Select";
import {
  MANUAL_TIME_SLOTS,
} from "@/constants/distributorOrders";
import { TABLE_HEADER } from "@/constants/table";
import { useAppCatalog } from "@/context/AppCatalogContext";
import { useScrollLock } from "@/hooks/useScrollLock";
import type { ManualLine, ManualOrderDraft } from "@/types/distributorOrder";
import { cn } from "@/utils/cn";
import {
  createManualLines,
  formatManualDeliveryLabel,
  getManualCatalogForDistributor,
} from "@/utils/manualOrder";

type Step = "create" | "review";

type CreateManualOrderFlowProps = {
  onClose: () => void;
  onCreated: (draft: ManualOrderDraft) => void;
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
    <div className="flex shrink-0 items-center gap-2.5">
      <button
        type="button"
        aria-label="Decrease"
        onClick={() => onChange(Math.max(0, value - 1))}
        className="flex size-8 items-center justify-center rounded-[8px] bg-id-pill text-[#111118] hover:bg-[#E4E6EB]"
      >
        <Minus className="size-3.5" strokeWidth={2.5} />
      </button>
      <span className="min-w-[1.25rem] text-center text-[14px] font-medium text-[#111118]">
        {value}
      </span>
      <button
        type="button"
        aria-label="Increase"
        onClick={() => onChange(value + 1)}
        className="flex size-8 items-center justify-center rounded-[8px] bg-id-pill text-[#111118] hover:bg-[#E4E6EB]"
      >
        <Plus className="size-3.5" strokeWidth={2.5} />
      </button>
    </div>
  );
}

export function CreateManualOrderFlow({
  onClose,
  onCreated,
}: CreateManualOrderFlowProps) {
  const { distributors } = useAppCatalog();
  const [step, setStep] = useState<Step>("create");
  const [distributor, setDistributor] = useState("");
  const [lines, setLines] = useState<ManualLine[]>([]);
  const [deliveryDate, setDeliveryDate] = useState("");
  const [timeSlot, setTimeSlot] = useState("");
  const [confirmClose, setConfirmClose] = useState(false);
  useScrollLock(confirmClose);

  const distributorOptions = useMemo(
    () =>
      Array.from(new Set(distributors.map((entry) => entry.name))).sort(),
    [distributors],
  );

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

  const expectedDeliveryLabel = useMemo(
    () => formatManualDeliveryLabel(deliveryDate, timeSlot),
    [deliveryDate, timeSlot],
  );

  const canReview =
    Boolean(distributor) &&
    selectedLines.length > 0 &&
    Boolean(deliveryDate) &&
    Boolean(timeSlot);

  function selectDistributor(name: string) {
    setDistributor(name);
    setDeliveryDate("");
    setTimeSlot("");
    if (!name) {
      setLines([]);
      return;
    }
    setLines(createManualLines(getManualCatalogForDistributor(name)));
  }

  function setQty(id: string, quantity: number) {
    setLines((prev) =>
      prev.map((line) =>
        line.id === id ? { ...line, quantity: Math.max(0, quantity) } : line,
      ),
    );
  }

  function createOrder() {
    onCreated({
      distributor,
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
    });
  }

  return (
    <div className="relative flex h-full min-h-0 flex-col bg-[#FAFAFA]">
      <div className="shrink-0 border-b border-[#00000014] bg-white px-4 py-5 md:px-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[28px] font-semibold tracking-tight text-[#111118]">
              {step === "review" ? "Review Order" : "Create Manual Order"}
            </h1>
            {step === "review" ? (
              <p className="mt-1 text-[13px] text-[#8A8A8A]">
                Orders for{" "}
                <span className="font-semibold text-[#111118]">
                  {expectedDeliveryLabel} delivery
                </span>
              </p>
            ) : null}
          </div>
          <UserMenu className="items-center" />
        </div>
      </div>

      {step === "create" ? (
        <div className="min-h-0 flex-1 overflow-y-auto bg-[#FAFAFA] px-4 py-5 md:px-8">
          <div className="mx-auto max-w-[920px] space-y-4">
            <section className="overflow-hidden rounded-[8px] border border-[#00000014] bg-white">
              <div className="p-5 md:p-6">
                <h2 className="mb-4 text-[16px] font-semibold text-[#111118]">
                  Select Distributor
                </h2>
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <Select
                    value={distributor}
                    onChange={selectDistributor}
                    placeholder="Select"
                    aria-label="Select Distributor"
                    className="w-full max-w-[420px]"
                    options={[
                      { value: "", label: "Select" },
                      ...distributorOptions.map((name) => ({
                        value: name,
                        label: name,
                      })),
                    ]}
                  />
                  {distributor ? (
                    <div className="ml-auto text-[14px] font-semibold text-[#111118]">
                      Total: {money(total)}
                    </div>
                  ) : null}
                </div>
              </div>

              <div
                className={cn(
                  "border-t border-[#00000014]",
                  !distributor && "min-h-[220px] md:min-h-[280px]",
                )}
              >
                {distributor ? (
                  <div className="p-5 md:p-6">
                    <div className="mb-4">
                      <div className={TABLE_HEADER}>Select Items From Source</div>
                    </div>

                    <div className="space-y-6">
                      {groupedBySource.map(([source, sourceLines]) => (
                        <div key={source}>
                          <h3 className="mb-1 text-[16px] font-semibold text-[#111118]">
                            {source}
                          </h3>
                          <div>
                            {sourceLines.map((line) => (
                              <div
                                key={line.id}
                                className="flex items-center gap-4 border-b border-[#00000014] py-3 last:border-b-0"
                              >
                                <IdPill>{line.sku}</IdPill>
                                <span className="min-w-0 flex-[1.2] truncate text-[13px] font-medium text-[#111118]">
                                  {line.name}
                                </span>
                                <span className="w-[88px] shrink-0 text-[13px] text-[#111118]">
                                  In stock: {line.inStock}
                                </span>
                                <span className="w-[96px] shrink-0 text-[13px] text-[#111118]">
                                  {money(line.price)}/{line.unit}
                                </span>
                                <div className="ml-auto">
                                  <QtyStepper
                                    value={line.quantity}
                                    onChange={(q) => setQty(line.id, q)}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </section>

            {distributor ? (
              <section className="rounded-[8px] border border-[#00000014] bg-white p-5 md:p-6">
                <h2 className="mb-4 text-[16px] font-semibold text-[#111118]">
                  Select Delivery Date
                </h2>
                <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                  <DatePicker
                    value={deliveryDate}
                    onChange={setDeliveryDate}
                    className="w-full max-w-[220px] sm:w-[220px]"
                    placeholder="Select Date"
                    aria-label="Select Date"
                  />
                  <span className="text-[13px] font-medium text-[#111118]">
                    Select Time
                  </span>
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                    {MANUAL_TIME_SLOTS.map((slot) => {
                      const checked = timeSlot === slot;
                      return (
                        <label
                          key={slot}
                          className="inline-flex cursor-pointer items-center gap-2 text-[13px] text-[#111118]"
                        >
                          <button
                            type="button"
                            role="checkbox"
                            aria-checked={checked}
                            onClick={() => setTimeSlot(checked ? "" : slot)}
                            className={cn(
                              "flex size-4 shrink-0 items-center justify-center rounded-[4px] border transition-colors",
                              checked
                                ? "border-[#111118] bg-[#111118] text-white"
                                : "border-[#C5C5C5] bg-white",
                            )}
                          >
                            {checked ? (
                              <Check size={11} strokeWidth={3} />
                            ) : null}
                          </button>
                          <span>{slot}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
                {deliveryDate || timeSlot ? (
                  <p className="mt-4 text-[13px] text-[#8A8A8A]">
                    Selected delivery{" "}
                    <span className="font-semibold text-[#111118]">
                      {expectedDeliveryLabel}
                    </span>
                  </p>
                ) : null}
              </section>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto bg-[#FAFAFA] px-4 py-5 md:px-8">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
            <div className="rounded-[12px] border border-[#00000014] bg-white px-4 py-3.5">
              <h3 className="mb-0.5 text-[18px] font-semibold tracking-tight text-[#111118]">
                {distributor}
              </h3>
              <div>
                {selectedLines.map((line) => (
                  <div
                    key={line.id}
                    className="flex items-center gap-6 border-b border-[#00000014] py-2.5 text-[12px]"
                  >
                    <span className="min-w-0 max-w-[14rem] truncate text-[#111118]">
                      {line.name}
                    </span>
                    <span className="shrink-0 truncate text-[#8A8A8A]">
                      {line.source}
                    </span>
                    <div className="flex shrink-0 items-center gap-4">
                      <span className="w-8 text-right font-medium text-[#111118]">
                        {line.quantity}x
                      </span>
                      <span className="w-[4.75rem] whitespace-nowrap text-right text-[#111118]">
                        {money(line.price)}
                        {line.unit ? ` / ${line.unit}` : ""}
                      </span>
                      <span className="w-[3.75rem] text-right font-semibold whitespace-nowrap text-[#111118]">
                        {money(line.price * line.quantity)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3">
                <span className="text-[12px] text-[#8A8A8A]">
                  Expected delivery{" "}
                  <span className="font-semibold text-[#111118]">
                    {expectedDeliveryLabel}
                  </span>
                </span>
                <span className="w-[3.75rem] text-right text-[16px] font-semibold text-[#111118]">
                  {money(total)}
                </span>
              </div>
            </div>

            <aside className="h-fit rounded-[12px] border border-[#00000014] bg-white px-4 py-3.5 xl:sticky xl:top-4">
              <h3 className="mb-1 text-[15px] font-semibold text-[#111118]">
                Order Summary
              </h3>
              <div className="flex items-center justify-between gap-3 border-b border-[#00000014] py-3 text-[13px]">
                <div className="min-w-0">
                  <div className="truncate font-medium text-[#111118]">
                    {distributor}
                  </div>
                  <div className="text-[12px] text-[#8A8A8A]">
                    {selectedLines.length} item
                    {selectedLines.length === 1 ? "" : "s"}
                  </div>
                </div>
                <div className="shrink-0 font-semibold text-[#111118]">
                  {money(total)}
                </div>
              </div>
              <div className="flex items-center justify-between pt-3">
                <span className="text-[14px] font-medium text-[#111118]">
                  Total
                </span>
                <span className="text-[18px] font-semibold text-[#111118]">
                  {money(total)}
                </span>
              </div>
            </aside>
          </div>
        </div>
      )}

      <div className="flex shrink-0 items-center justify-between gap-3 border-t border-[#00000014] bg-white px-4 py-3.5 md:px-8">
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
          <Button variant="ghost" onClick={() => setConfirmClose(true)}>
            Cancel & Close
          </Button>
          <Button
            variant="primary"
            size="lg"
            disabled={step === "create" && !canReview}
            onClick={() => {
              if (step === "create") setStep("review");
              else createOrder();
            }}
            className="font-semibold"
          >
            {step === "create" ? "Review Order" : "Create Order"}
          </Button>
        </div>
      </div>

      {confirmClose ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center overscroll-none bg-black/45 p-4">
          <div
            className="w-full max-w-[420px] overflow-hidden overscroll-contain rounded-[12px] bg-white shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="manual-cancel-title"
            data-scroll-lock-allow
          >
            <div className="flex items-start justify-between border-b border-[#00000014] px-6 py-4">
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
                className="rounded-md p-1 text-[#8A8A8A] hover:bg-background"
              >
                <X className="size-5" />
              </button>
            </div>
            <p className="px-6 py-5 text-[14px] text-[#111118]">
              Are you sure you want to close order request?
            </p>
            <div className="flex items-center justify-end gap-3 border-t border-[#00000014] px-6 py-4">
              <Button
                variant="ghost"
                onClick={() => setConfirmClose(false)}
              >
                Cancel
              </Button>
              <Button variant="dark" onClick={onClose}>
                Cancel Order
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

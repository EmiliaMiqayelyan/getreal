import { useEffect, useRef } from "react";
import { X } from "lucide-react";

import { AppLoader } from "@/components/ui/AppLoader";
import { IdPill } from "@/components/ui/Badge";
import { cn } from "@/utils/cn";
import { currency, display, type OrderDetail } from "@/utils/orderDetail";

const DETAIL_LABEL =
  "text-[11px] font-medium tracking-[0.04em] text-[#9AA0A6] uppercase";
const DETAIL_VALUE = "mt-1 text-[13px] text-[#111118]";
const DETAIL_COLUMNS =
  "grid grid-cols-[minmax(0,1.7fr)_44px_minmax(108px,1fr)_72px] items-center gap-3 px-4";

/** Slide-over order details. The parent must be `relative`. */
export function OrderDetailPanel({
  order,
  itemsLoading = false,
  onClose,
}: {
  order: OrderDetail;
  itemsLoading?: boolean;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      const target = event.target;
      if (target instanceof Node && panelRef.current?.contains(target)) return;
      onCloseRef.current();
    }

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  return (
    <aside
      ref={panelRef}
      className="absolute top-[52px] right-0 bottom-0 z-40 flex w-full max-w-[560px] flex-col border-l border-[#ECECEC] bg-white shadow-[-8px_0_24px_rgba(0,0,0,0.06)]"
    >
      <div className="flex items-start justify-between gap-4 border-b border-[#ECECEC] px-6 pt-4 pb-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex h-5 w-max shrink-0 items-center rounded-[6px] bg-[#F3F4F6] px-1.5 font-mono text-[11px] font-medium leading-none whitespace-nowrap text-[#99A1AF]">
              {order.id}
            </span>
            <span className="text-[12px]">
              <span className="text-[#6D6F7B]">Ordered:</span>{" "}
              <span className="text-[#111118]">{display(order.orderDate)}</span>
            </span>
          </div>
          <h2 className="mt-2 text-[22px] leading-tight font-semibold tracking-tight text-[#111118]">
            {display(order.customerName)}
          </h2>
        </div>
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="shrink-0 rounded-md p-1 text-[#A9A9A9] hover:bg-[#F5F5F3] hover:text-[#6B6B6B]"
        >
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-auto px-6 pt-5 pb-6">
        <h3 className="mb-3 text-[15px] font-semibold text-[#111118]">
          Requested Items
        </h3>
        <div className="overflow-hidden rounded-[12px] border border-[#E6E6E8] bg-white">
          <div
            className={cn(
              DETAIL_COLUMNS,
              "border-b border-[#E6E6E8] bg-[#F7F7F8] py-2.5 text-[11px] font-medium tracking-[0.04em] text-[#9AA0A6] uppercase",
            )}
          >
            <div>Item</div>
            <div>Qty</div>
            <div>Unit Price</div>
            <div className="text-right">Total</div>
          </div>
          {itemsLoading ? (
            <AppLoader
              variant="section"
              label="Loading items"
              className="min-h-[96px] rounded-none border-0 bg-white py-6"
            />
          ) : (
          order.items.map((item, itemIndex) => {
            const label = item.name;
            return (
              <div
                key={`${order.id}-${itemIndex}`}
                className={cn(
                  DETAIL_COLUMNS,
                  "border-b border-[#E6E6E8] bg-white py-3 text-[13px] text-[#111118]",
                )}
              >
                <div className="min-w-0 break-words">{label}</div>
                <div>{item.qty}</div>
                <div className="whitespace-nowrap">
                  <span>{currency(item.unitPrice)}</span>
                  {item.unit ? (
                    <span className="text-[#9AA0A6]"> / {item.unit}</span>
                  ) : null}
                </div>
                <div className="text-right font-bold">
                  {currency(item.qty * item.unitPrice)}
                </div>
              </div>
            );
          })
          )}
          <div className="flex items-center justify-between bg-white px-4 py-3 text-[#111118]">
            <span className="text-[13px] font-medium">Order Total</span>
            <span className="text-[15px] font-bold tracking-tight">
              {currency(order.total)}
            </span>
          </div>
        </div>

        <h3 className="mt-6 mb-3 text-[15px] font-semibold text-[#111118]">
          Packing Information
        </h3>
        <div className="flex flex-wrap gap-x-10 gap-y-4">
          <div>
            <div className={DETAIL_LABEL}>Packer Assigned</div>
            <div className={DETAIL_VALUE}>{display(order.packerAssigned)}</div>
          </div>
          <div>
            <div className={DETAIL_LABEL}>Cooler ID</div>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {(order.coolerIds ?? []).map((coolerId) => (
                <IdPill key={coolerId}>{coolerId}</IdPill>
              ))}
              {!order.coolerIds?.length ? (
                <span className="text-[14px] text-[#111118]">N/A</span>
              ) : null}
            </div>
          </div>
        </div>

        <h3 className="mt-6 mb-3 text-[15px] font-semibold text-[#111118]">
          Delivery Information
        </h3>
        <div className="mb-4 inline-flex rounded-[8px] bg-[#FFF1EB] px-2.5 py-1 text-[12px] font-medium text-[#F57850]">
          {display(order.deliveryDate)}
        </div>
        <div className="flex flex-col gap-4">
          <div>
            <div className={DETAIL_LABEL}>Street Address</div>
            <div className={DETAIL_VALUE}>{display(order.address)}</div>
          </div>
          <div className="grid grid-cols-4 gap-4">
            <div>
              <div className={DETAIL_LABEL}>Apt / Unit</div>
              <div className={DETAIL_VALUE}>{display(order.apt)}</div>
            </div>
            <div>
              <div className={DETAIL_LABEL}>City</div>
              <div className={DETAIL_VALUE}>{display(order.city)}</div>
            </div>
            <div>
              <div className={DETAIL_LABEL}>State</div>
              <div className={DETAIL_VALUE}>{display(order.state)}</div>
            </div>
            <div>
              <div className={DETAIL_LABEL}>Zip</div>
              <div className={DETAIL_VALUE}>{display(order.zip)}</div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

import { useEffect, useRef, useState } from "react";
import { Calendar } from "lucide-react";

import { DeliveryDateCalendar } from "@/components/orders/DeliveryDateCalendar";
import { INPUT_LEADING_ICON_SIZE } from "@/components/ui/SearchField";
import { parseDeliveryDateId, startOfLocalDay } from "@/utils/deliveryCalendar";
import { cn } from "@/utils/cn";

type DatePickerProps = {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  "aria-label"?: string;
};

function formatTriggerLabel(value: string) {
  const date = parseDeliveryDateId(value);
  if (!date) return value;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function DatePicker({
  value,
  onChange,
  className,
  placeholder = "Select Date",
  "aria-label": ariaLabel = "Select Date",
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (rootRef.current?.contains(target)) return;
      setOpen(false);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const parsed = parseDeliveryDateId(value);
  const today = startOfLocalDay(new Date());
  const initialMonth =
    parsed && parsed.getTime() >= today.getTime() ? parsed : new Date();

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "relative flex h-10 w-full items-center rounded-[8px] border border-[#00000014] bg-white pr-3 pl-10 text-left text-[13px] text-[#111118] outline-none hover:border-[#00000014] focus:border-[#00000014]",
          open && "border-[#00000014]",
        )}
      >
        <Calendar
          size={INPUT_LEADING_ICON_SIZE}
          strokeWidth={2}
          className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-foreground"
        />
        <span className={cn(!value && "text-[#111118]")}>
          {value ? formatTriggerLabel(value) : placeholder}
        </span>
      </button>

      {open ? (
        <DeliveryDateCalendar
          disablePast
          selectedDateId={value}
          onSelectDate={onChange}
          onClose={() => setOpen(false)}
          initialMonth={initialMonth}
          className="top-[calc(100%+6px)] right-auto left-0"
        />
      ) : null}
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import { Calendar } from "lucide-react";

import { DeliveryDateCalendar } from "@/components/orders/DeliveryDateCalendar";
import { parseDeliveryDateId } from "@/utils/deliveryCalendar";
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

  const initialMonth = parseDeliveryDateId(value) ?? new Date();

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "relative flex h-10 w-full items-center rounded-[8px] border border-[#E6E6E3] bg-white pr-3 pl-10 text-left text-[13px] text-[#111118] outline-none hover:border-[#C8C8C6] focus:border-[#C8C8C6]",
          open && "border-[#C8C8C6]",
        )}
      >
        <Calendar className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#111118]" />
        <span className={cn(!value && "text-[#111118]")}>
          {value ? formatTriggerLabel(value) : placeholder}
        </span>
      </button>

      {open ? (
        <DeliveryDateCalendar
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

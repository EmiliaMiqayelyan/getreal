import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import {
  CALENDAR_WEEKDAY_HEADERS,
  formatCalendarMonth,
  getMonthGridCells,
  isDeliveryWeekday,
  toDeliveryDateId,
} from "@/utils/deliveryCalendar";
import { cn } from "@/utils/cn";

const ORANGE = "#F57850";

type DeliveryDateCalendarProps = {
  /** When omitted, every day in the month is selectable. */
  deliveryWeekdays?: Set<number>;
  selectedDateId: string;
  onSelectDate: (dateId: string) => void;
  onClose: () => void;
  initialMonth?: Date;
  className?: string;
};

export function DeliveryDateCalendar({
  deliveryWeekdays,
  selectedDateId,
  onSelectDate,
  onClose,
  initialMonth,
  className,
}: DeliveryDateCalendarProps) {
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const base = initialMonth ?? new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });
  const [pendingDateId, setPendingDateId] = useState(selectedDateId);

  useEffect(() => {
    setPendingDateId(selectedDateId);
  }, [selectedDateId]);

  const cells = useMemo(
    () => getMonthGridCells(visibleMonth.getFullYear(), visibleMonth.getMonth()),
    [visibleMonth],
  );

  function shiftMonth(delta: number) {
    setVisibleMonth(
      (current) =>
        new Date(current.getFullYear(), current.getMonth() + delta, 1),
    );
  }

  function handleApply() {
    onSelectDate(pendingDateId);
    onClose();
  }

  return (
    <div
      className={cn(
        "absolute top-11 right-0 z-30 w-[280px] rounded-[12px] border border-[#00000014] bg-white p-4 shadow-xl",
        className,
      )}
    >
      <div className="mb-3 flex items-center justify-between text-[13px] font-semibold text-[#111118]">
        <span>{formatCalendarMonth(visibleMonth)}</span>
        <div className="flex items-center gap-1 text-[#8A8A8A]">
          <button
            type="button"
            aria-label="Previous month"
            onClick={() => shiftMonth(-1)}
            className="flex size-7 items-center justify-center rounded-[6px] hover:bg-[#F5F5F3]"
          >
            <ChevronLeft size={14} />
          </button>
          <button
            type="button"
            aria-label="Next month"
            onClick={() => shiftMonth(1)}
            className="flex size-7 items-center justify-center rounded-[6px] hover:bg-[#F5F5F3]"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-[#8A8A8A]">
        {CALENDAR_WEEKDAY_HEADERS.map((day) => (
          <div key={day} className="py-1 font-medium uppercase">
            {day}
          </div>
        ))}
        {cells.map((day, index) => {
          if (!day) {
            return <div key={`empty-${index}`} className="py-1.5" aria-hidden />;
          }

          const date = new Date(
            visibleMonth.getFullYear(),
            visibleMonth.getMonth(),
            day,
          );
          const available =
            !deliveryWeekdays || isDeliveryWeekday(date, deliveryWeekdays);
          const dateId = toDeliveryDateId(date);
          const selected = dateId === pendingDateId;

          if (!available) {
            return (
              <div
                key={dateId}
                className="py-1.5 text-[12px] font-medium text-[#C8C8C4]"
                aria-hidden
              >
                {day}
              </div>
            );
          }

          return (
            <button
              key={dateId}
              type="button"
              onClick={() => setPendingDateId(dateId)}
              className={cn(
                "rounded-full py-1.5 text-[12px] font-medium transition-colors",
                selected
                  ? "bg-[#6A6A6A] font-semibold text-white"
                  : "text-[#111118] hover:bg-[#F5F5F3]",
              )}
            >
              {day}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 border-t border-[#00000014] pt-3">
        <button
          type="button"
          onClick={onClose}
          className="text-[13px] text-[#8A8A8A] hover:text-[#4A4A4A]"
        >
          Close
        </button>
        <button
          type="button"
          onClick={handleApply}
          className="rounded-[8px] px-4 py-1.5 text-[13px] font-medium text-white"
          style={{ backgroundColor: ORANGE }}
        >
          Apply
        </button>
      </div>
    </div>
  );
}

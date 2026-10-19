import { useEffect, useMemo, useState } from "react";

import { DATE_CHIP_WIDTH } from "@/components/shared/DeliveryDateChip";
import {
  earliestCurrentChipId,
  shiftDateId,
  weekChips,
  weeksBetween,
} from "@/utils/deliveryCalendar";

const INITIAL_CAPACITY = 3;

function centeredStart(activeDateId: string, capacity: number) {
  return shiftDateId(activeDateId, -Math.floor((capacity - 1) / 2) * 7);
}

function nextStart(start: string, activeDateId: string, capacity: number) {
  const offset = weeksBetween(start, activeDateId);
  if (offset == null) return centeredStart(activeDateId, capacity);
  if (offset >= 0 && offset < capacity) return start;
  if (offset === -1) return activeDateId;
  if (offset === capacity) return shiftDateId(start, 7);
  return centeredStart(activeDateId, capacity);
}

/**
 * Weekly date chips that fill the row they render in, up to the nav buttons.
 * Dates before today are left out, and the row fills forward from the current week.
 * Attach `chipRowRef` to the chip scroll container. The window holds still while the
 * active week is visible, slides one week when it steps past an edge, and recenters on jumps.
 */
export function useWeekChipWindow(
  activeDateId: string,
  counts: ReadonlyMap<string, number>,
) {
  const [row, setRow] = useState<HTMLElement | null>(null);
  const [capacity, setCapacity] = useState(INITIAL_CAPACITY);
  const [range, setRange] = useState(() => ({
    start: centeredStart(activeDateId, INITIAL_CAPACITY),
    capacity: INITIAL_CAPACITY,
  }));

  useEffect(() => {
    if (!row) return;
    const element = row;
    function measure() {
      const gap = Number.parseFloat(getComputedStyle(element).columnGap) || 0;
      const fit = Math.floor(
        (element.clientWidth + gap) / (DATE_CHIP_WIDTH + gap),
      );
      setCapacity(Math.max(1, fit));
    }
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [row]);

  const floor = earliestCurrentChipId(activeDateId);
  const unclamped =
    range.capacity === capacity
      ? nextStart(range.start, activeDateId, capacity)
      : centeredStart(activeDateId, capacity);
  const start = unclamped < floor ? floor : unclamped;
  if (start !== range.start || capacity !== range.capacity) {
    setRange({ start, capacity });
  }

  const chips = useMemo(
    () => weekChips(start, capacity, counts),
    [start, capacity, counts],
  );

  return { chipRowRef: setRow, chips };
}

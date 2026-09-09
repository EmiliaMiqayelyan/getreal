import { useEffect, useRef, useState } from "react";

import { cn } from "@/utils/cn";

type LocationHoverProps = {
  /** Short / truncated text shown in the cell. */
  children: string;
  /** Full address for the hover popover. Falls back to `children` when omitted. */
  fullAddress?: string | null;
  className?: string;
  /** Tooltip heading — matches Notes / Description hover labels. */
  label?: string;
};

/**
 * Truncated location cell that reveals the full address on hover,
 * using the same fixed popover style as Notes / Description "View" tooltips.
 */
export function LocationHover({
  children,
  fullAddress,
  className,
  label = "Address",
}: LocationHoverProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const cellRef = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<number>(0);

  const display = children;
  const trimmed = display.trim();
  const tooltip = (fullAddress?.trim() || trimmed).trim();
  const canHover = Boolean(tooltip && tooltip !== "—");

  useEffect(() => () => window.clearTimeout(hideTimer.current), []);

  function show() {
    if (!canHover) return;
    window.clearTimeout(hideTimer.current);
    const rect = cellRef.current?.getBoundingClientRect();
    if (rect) {
      setPos({
        top: rect.bottom + 8,
        left: Math.min(rect.left, window.innerWidth - 280),
      });
    }
    setOpen(true);
  }

  function hide() {
    hideTimer.current = window.setTimeout(() => setOpen(false), 140);
  }

  if (!trimmed) {
    return <span className={className} />;
  }

  return (
    <div
      ref={cellRef}
      className={cn("relative min-w-0", className)}
      onMouseEnter={show}
      onMouseLeave={hide}
    >
      <div className="truncate">{display}</div>
      {open && canHover ? (
        <div
          role="tooltip"
          className="fixed z-50 w-[260px] rounded-[10px] border border-[#ECECEA] bg-white px-3.5 py-3 shadow-[0_8px_24px_rgba(0,0,0,0.12)]"
          style={{ top: pos.top, left: pos.left }}
          onMouseEnter={show}
          onMouseLeave={hide}
        >
          <div className="mb-1.5 text-[10px] font-semibold tracking-[0.06em] text-[#8A8A8A] uppercase">
            {label}
          </div>
          <p className="text-[12px] leading-relaxed whitespace-pre-wrap text-[#111118]">
            {tooltip}
          </p>
        </div>
      ) : null}
    </div>
  );
}

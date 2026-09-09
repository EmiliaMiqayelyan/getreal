import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

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
 * Truncated location cell that reveals the full address on hover or tap,
 * using the same fixed popover style as Notes / Description "View" tooltips.
 * Tap support is required for tablet warehouse workflows.
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
  const panelRef = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<number>(0);

  const display = children;
  const trimmed = display.trim();
  const full = fullAddress?.trim() || "";
  // Show the full address when provided; otherwise fall back to the cell text.
  const tooltip = full || trimmed;
  const canHover = Boolean(tooltip && tooltip !== "—");

  useEffect(() => () => window.clearTimeout(hideTimer.current), []);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent | TouchEvent) {
      const target = event.target as Node;
      if (cellRef.current?.contains(target) || panelRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, [open]);

  function place() {
    const rect = cellRef.current?.getBoundingClientRect();
    if (!rect) return;
    const width = 260;
    setPos({
      top: rect.bottom + 8,
      left: Math.max(
        12,
        Math.min(rect.left, window.innerWidth - width - 12),
      ),
    });
  }

  function show() {
    if (!canHover) return;
    window.clearTimeout(hideTimer.current);
    place();
    setOpen(true);
  }

  function hide() {
    hideTimer.current = window.setTimeout(() => setOpen(false), 140);
  }

  function toggle() {
    if (!canHover) return;
    window.clearTimeout(hideTimer.current);
    if (open) {
      setOpen(false);
      return;
    }
    place();
    setOpen(true);
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
      onClick={toggle}
      role={canHover ? "button" : undefined}
      tabIndex={canHover ? 0 : undefined}
      onKeyDown={
        canHover
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                toggle();
              }
            }
          : undefined
      }
    >
      <div className="truncate">{display}</div>
      {open && canHover
        ? createPortal(
            <div
              ref={panelRef}
              role="tooltip"
              className="fixed z-[80] w-[260px] rounded-[10px] border border-[#ECECEA] bg-white px-3.5 py-3 shadow-[0_8px_24px_rgba(0,0,0,0.12)]"
              style={{ top: pos.top, left: pos.left }}
              onMouseEnter={show}
              onMouseLeave={hide}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-1.5 text-[10px] font-semibold tracking-[0.06em] text-[#8A8A8A] uppercase">
                {label}
              </div>
              <p className="text-[12px] leading-relaxed whitespace-pre-wrap text-[#111118]">
                {tooltip}
              </p>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

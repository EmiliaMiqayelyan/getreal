import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { useFloatingMenu } from "@/hooks/useFloatingMenu";
import { cn } from "@/utils/cn";
import { floatingMenuStyle } from "@/utils/floatingMenu";

type LocationHoverProps = {
  /** Short / truncated text shown in the cell. */
  children: string;
  /** Full address for the hover popover. Falls back to `children` when omitted. */
  fullAddress?: string | null;
  className?: string;
  /** Tooltip heading. Matches Notes / Description hover labels. */
  label?: string;
  /**
   * Location place shown under the name. When set, the popover lists the
   * name and this place on separate lines.
   */
  locationPlace?: string | null;
  placeLabel?: string;
  /** Hover only, so a parent row can stay the click target. */
  hoverOnly?: boolean;
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
  locationPlace,
  placeLabel = "Location place",
  hoverOnly = false,
}: LocationHoverProps) {
  const [open, setOpen] = useState(false);
  const cellRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<number>(0);
  const box = useFloatingMenu(open, cellRef, panelRef, {
    width: 260,
    gap: 8,
    maxHeight: 320,
  });

  const display = children;
  const trimmed = display.trim();
  const full = fullAddress?.trim() || "";
  const placeText = locationPlace?.trim() || "";
  const structured = locationPlace !== undefined;
  // Show the full address when provided; otherwise fall back to the cell text.
  const tooltip = structured ? trimmed || placeText : full || trimmed;
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

  function show() {
    if (!canHover) return;
    window.clearTimeout(hideTimer.current);
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
    setOpen(true);
  }

  if (!trimmed && !placeText) {
    return <span className={className} />;
  }

  return (
    <div
      ref={cellRef}
      className={cn("relative min-w-0", className)}
      onMouseEnter={show}
      onMouseLeave={hide}
      onClick={hoverOnly ? undefined : toggle}
      role={canHover && !hoverOnly ? "button" : undefined}
      tabIndex={canHover && !hoverOnly ? 0 : undefined}
      onKeyDown={
        canHover && !hoverOnly
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
              data-location-hover
              className="fixed z-[90] overflow-y-auto rounded-[10px] border border-[#00000014] bg-white px-3.5 py-3 shadow-[0_8px_24px_rgba(0,0,0,0.12)]"
              style={floatingMenuStyle(box)}
              onMouseEnter={show}
              onMouseLeave={hide}
              onClick={(event) => event.stopPropagation()}
            >
              {structured ? (
                <>
                  {trimmed ? (
                    <>
                      <div className="mb-1.5 text-[10px] font-semibold tracking-[0.06em] text-[#8A8A8A] uppercase">
                        {label}
                      </div>
                      <p className="text-[12px] leading-relaxed whitespace-pre-wrap text-[#111118]">
                        {trimmed}
                      </p>
                    </>
                  ) : null}
                  {placeText ? (
                    <>
                      <div
                        className={cn(
                          "mb-1.5 text-[10px] font-semibold tracking-[0.06em] text-[#8A8A8A] uppercase",
                          trimmed && "mt-2.5",
                        )}
                      >
                        {placeLabel}
                      </div>
                      <p className="text-[12px] leading-relaxed whitespace-pre-wrap text-[#111118]">
                        {placeText}
                      </p>
                    </>
                  ) : null}
                </>
              ) : (
                <>
                  <div className="mb-1.5 text-[10px] font-semibold tracking-[0.06em] text-[#8A8A8A] uppercase">
                    {label}
                  </div>
                  <p className="text-[12px] leading-relaxed whitespace-pre-wrap text-[#111118]">
                    {tooltip}
                  </p>
                </>
              )}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

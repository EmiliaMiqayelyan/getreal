import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { useFloatingMenu } from "@/hooks/useFloatingMenu";
import { floatingMenuStyle } from "@/utils/floatingMenu";

const NOTES_LINK =
  "cursor-pointer border-0 bg-transparent p-0 text-left text-[13px] font-medium italic underline leading-[18px] text-[#111118] hover:opacity-80";

type DescriptionHoverProps = {
  description: string;
  /** Tooltip heading. */
  label?: string;
};

/** "View" link that reveals long-form text in a fixed popover on hover. */
export function DescriptionHover({
  description,
  label = "Description",
}: DescriptionHoverProps) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<number>(0);
  const box = useFloatingMenu(open, btnRef, panelRef, {
    width: 360,
    gap: 8,
    maxHeight: 520,
  });

  useEffect(() => () => window.clearTimeout(hideTimer.current), []);

  function show() {
    window.clearTimeout(hideTimer.current);
    setOpen(true);
  }

  function hide() {
    hideTimer.current = window.setTimeout(() => setOpen(false), 140);
  }

  if (!description.trim()) {
    return <span className="text-[13px] text-[#8A8A8A]">—</span>;
  }

  return (
    <div
      className="relative justify-self-start"
      onMouseEnter={show}
      onMouseLeave={hide}
    >
      <button
        ref={btnRef}
        type="button"
        className={NOTES_LINK}
        aria-haspopup="true"
        aria-expanded={open}
      >
        View
      </button>
      {open
        ? createPortal(
            <div
              ref={panelRef}
              role="tooltip"
              className="fixed z-50 flex flex-col rounded-[10px] border border-[#00000014] bg-white px-4 py-3.5 shadow-[0_8px_24px_rgba(0,0,0,0.12)]"
              style={floatingMenuStyle(box)}
              onMouseEnter={show}
              onMouseLeave={hide}
            >
              <div className="mb-2 shrink-0 text-[10px] font-semibold tracking-[0.06em] text-[#8A8A8A] uppercase">
                {label}
              </div>
              <p className="min-h-0 overflow-y-auto pr-1 text-[13px] leading-relaxed whitespace-pre-wrap text-[#111118]">
                {description}
              </p>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

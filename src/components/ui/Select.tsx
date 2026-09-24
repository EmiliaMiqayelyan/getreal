import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";

import { cn } from "@/utils/cn";

export type SelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

type SelectProps = {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
  buttonClassName?: string;
  "aria-label"?: string;
  disabled?: boolean;
  size?: "sm" | "md";
  /** Bordered field (default) or Figma flat "v Label" control */
  variant?: "default" | "flat";
};

const ROW_H = 36;

export function Select({
  value,
  onChange,
  options,
  placeholder,
  className,
  buttonClassName,
  disabled = false,
  size = "md",
  variant = "default",
  "aria-label": ariaLabel,
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = useId();

  const cleanOptions = options.filter((option) => option.label.trim().length > 0);
  const selected = cleanOptions.find((option) => option.value === value);
  const displayLabel = selected?.label || placeholder || "";

  useLayoutEffect(() => {
    if (!open) return;

    function place() {
      const button = buttonRef.current;
      if (!button) return;
      const rect = button.getBoundingClientRect();
      const gap = 6;
      // Wide enough that filter labels (e.g. "Angus Chuck Ground Beef")
      // stay on one line instead of wrapping into uneven multi-line rows.
      const width = Math.min(
        Math.max(rect.width, 240),
        Math.max(160, window.innerWidth - 24),
      );
      let left = rect.left;
      if (left + width > window.innerWidth - 12) {
        left = Math.max(12, rect.right - width);
      }
      setPos({ top: rect.bottom + gap, left, width });
    }

    place();
    requestAnimationFrame(place);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (
        rootRef.current?.contains(target) ||
        listRef.current?.contains(target)
      ) {
        return;
      }
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

  const isFlat = variant === "flat";

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        aria-label={ariaLabel ?? displayLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "relative flex cursor-pointer items-center text-left outline-none transition-colors disabled:cursor-not-allowed disabled:opacity-50",
          isFlat
            ? "h-auto w-auto gap-1 border-0 bg-transparent p-0 text-[13px]"
            : cn(
                "w-full justify-between rounded-[9.38px] border border-[#00000014] bg-white",
                "focus:border-black/20",
                open && "border-black/20",
                size === "sm"
                  ? "h-[33.75px] py-0 pr-8 pl-3 text-[13px]"
                  : "h-[33.75px] py-0 pr-9 pl-3.5 text-[13px]",
              ),
          selected || displayLabel ? "text-foreground" : "text-muted",
          buttonClassName,
        )}
      >
        {isFlat ? (
          <ChevronDown
            size={14}
            className={cn(
              "shrink-0 text-muted transition-transform",
              open && "rotate-180",
            )}
          />
        ) : null}
        <span className="truncate">{displayLabel || "\u00A0"}</span>
        {!isFlat ? (
          <ChevronDown
            size={14}
            className={cn(
              "pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-muted transition-transform",
              open && "rotate-180",
            )}
          />
        ) : null}
      </button>

      {open
        ? createPortal(
            <ul
              ref={listRef}
              id={listId}
              role="listbox"
              aria-label={ariaLabel ?? displayLabel}
              className={cn(
                "ui-select-menu fixed z-[80] max-h-60 overflow-x-hidden overflow-y-auto overscroll-contain",
                "flex flex-col gap-0 rounded-[8px] border border-[#00000014] bg-white p-0",
                "shadow-[0_8px_24px_rgba(0,0,0,0.12)]",
              )}
              style={{ top: pos.top, left: pos.left, width: pos.width }}
            >
              {cleanOptions.map((option, index) => {
                const isSelected = option.value === value;
                const label = option.label.trim() || "\u00A0";

                return (
                  <li
                    key={`${option.value}::${option.label}::${index}`}
                    role="presentation"
                    className="m-0 block h-9 max-h-9 min-h-9 shrink-0 list-none overflow-hidden p-0"
                    style={{ height: ROW_H, maxHeight: ROW_H, minHeight: ROW_H }}
                  >
                    <button
                      type="button"
                      role="option"
                      title={option.label}
                      aria-selected={isSelected}
                      disabled={option.disabled}
                      onClick={() => {
                        if (option.disabled) return;
                        onChange(option.value);
                        setOpen(false);
                      }}
                      className={cn(
                        "flex h-full w-full cursor-pointer items-center overflow-hidden px-3 text-left text-[13px] leading-none whitespace-nowrap transition-colors",
                        "disabled:cursor-not-allowed disabled:opacity-40",
                        isSelected
                          ? "bg-[#28402B] font-medium text-white hover:bg-[#28402B]"
                          : "bg-white text-[#111118] hover:bg-[#F5F5F3]",
                      )}
                      style={{ height: ROW_H }}
                    >
                      <span className="block min-w-0 flex-1 truncate overflow-hidden text-ellipsis whitespace-nowrap">
                        {label}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>,
            document.body,
          )
        : null}
    </div>
  );
}

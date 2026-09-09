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

export function Select({
  value,
  onChange,
  options,
  placeholder,
  className,
  buttonClassName,
  disabled = false,
  size = "sm",
  variant = "default",
  "aria-label": ariaLabel,
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = useId();

  const selected = options.find((option) => option.value === value);
  const displayLabel = selected?.label || placeholder || "";

  useLayoutEffect(() => {
    if (!open) return;

    function place() {
      const button = buttonRef.current;
      if (!button) return;
      const rect = button.getBoundingClientRect();
      const gap = 6;
      let left = rect.left;
      const width = Math.max(rect.width, 120);
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
                "w-full justify-between rounded-[8px] border border-[#E6E6E3] bg-white",
                "focus:border-[#C8C8C6]",
                open && "border-[#C8C8C6]",
                size === "sm"
                  ? "h-[34px] py-0 pr-8 pl-3 text-[13px]"
                  : "h-10 py-2 pr-9 pl-3.5 text-sm",
              ),
          selected || displayLabel ? "text-[#111118]" : "text-[#8A8A8A]",
          buttonClassName,
        )}
      >
        {isFlat ? (
          <ChevronDown
            size={14}
            className={cn(
              "shrink-0 text-[#8A8A8A] transition-transform",
              open && "rotate-180",
            )}
          />
        ) : null}
        <span className="truncate">{displayLabel || "\u00A0"}</span>
        {!isFlat ? (
          <ChevronDown
            size={13}
            className={cn(
              "pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-[#8A8A8A] transition-transform",
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
              className="fixed z-[80] max-h-60 overflow-auto rounded-[8px] border border-[#E6E6E3] bg-white py-1 shadow-[0_8px_24px_rgba(0,0,0,0.12)]"
              style={{ top: pos.top, left: pos.left, width: pos.width }}
            >
              {options.map((option) => {
                const isSelected = option.value === value;

                return (
                  <li key={option.value || "__empty"} role="presentation">
                    <button
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      disabled={option.disabled}
                      onClick={() => {
                        if (option.disabled) return;
                        onChange(option.value);
                        setOpen(false);
                      }}
                      className={cn(
                        "flex w-full cursor-pointer px-3 py-2 text-left text-[13px] transition-colors",
                        "disabled:cursor-not-allowed disabled:opacity-40",
                        isSelected
                          ? "bg-[#28402B] font-medium text-white"
                          : "text-[#111118] hover:bg-[#F5F5F3]",
                      )}
                    >
                      {option.label || "\u00A0"}
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

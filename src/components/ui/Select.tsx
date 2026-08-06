import { useEffect, useId, useRef, useState } from "react";
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
  "aria-label": ariaLabel,
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const selected = options.find((option) => option.value === value);
  const displayLabel = selected?.label || placeholder || "";

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
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

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        disabled={disabled}
        aria-label={ariaLabel ?? displayLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "relative flex w-full items-center justify-between rounded-[8px] border border-[#E6E6E3] bg-white text-left outline-none transition-colors",
          "focus:border-[#C8C8C6] disabled:cursor-not-allowed disabled:opacity-50",
          open && "border-[#C8C8C6]",
          size === "sm"
            ? "h-[34px] py-0 pr-8 pl-3 text-[13px]"
            : "h-10 py-2 pr-9 pl-3.5 text-sm",
          selected || displayLabel ? "text-[#2E2E2E]" : "text-[#8A8A8A]",
          buttonClassName,
        )}
      >
        <span className="truncate">{displayLabel || "\u00A0"}</span>
        <ChevronDown
          size={13}
          className={cn(
            "pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-[#8A8A8A] transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open ? (
        <ul
          id={listId}
          role="listbox"
          aria-label={ariaLabel ?? displayLabel}
          className="absolute top-[calc(100%+6px)] right-0 left-0 z-50 max-h-60 overflow-auto rounded-[8px] border border-[#E6E6E3] bg-white py-1 shadow-[0_8px_24px_rgba(0,0,0,0.12)]"
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
                    "flex w-full px-3 py-2 text-left text-[13px] transition-colors",
                    "disabled:cursor-not-allowed disabled:opacity-40",
                    isSelected
                      ? "bg-[#28402B] font-medium text-white"
                      : "text-[#2E2E2E] hover:bg-[#F5F5F3]",
                  )}
                >
                  {option.label || "\u00A0"}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

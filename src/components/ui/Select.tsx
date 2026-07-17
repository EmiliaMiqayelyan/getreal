"use client";

import { useEffect, useId, useRef, useState } from "react";

import { ChevronDownIcon } from "@/components/icons";
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
  "aria-label"?: string;
  disabled?: boolean;
};

export function Select({
  value,
  onChange,
  options,
  placeholder,
  className,
  disabled = false,
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
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-lg border border-[#E4E6EB] bg-white py-2 pr-3 pl-3.5 text-left text-sm outline-none transition-colors",
          "focus:border-sidebar/40 disabled:cursor-not-allowed disabled:opacity-50",
          open && "border-sidebar/40",
          selected ? "text-foreground" : "text-muted",
        )}
      >
        <span className="truncate">{displayLabel || "\u00A0"}</span>
        <ChevronDownIcon
          className={cn(
            "ml-2 shrink-0 text-muted transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open ? (
        <ul
          id={listId}
          role="listbox"
          aria-label={ariaLabel}
          className="absolute top-[calc(100%+4px)] right-0 left-0 z-50 max-h-60 overflow-auto rounded-lg border border-border bg-surface py-1 font-sans shadow-lg"
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
                    "flex w-full px-3.5 py-2 text-left text-sm transition-colors",
                    "disabled:cursor-not-allowed disabled:opacity-40",
                    isSelected
                      ? "bg-[#1C5752] font-medium text-white"
                      : "text-foreground hover:bg-[#1C5752] hover:text-white",
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

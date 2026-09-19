import type { InputHTMLAttributes } from "react";
import { Search } from "lucide-react";

import { Input } from "@/components/ui/Input";
import {
  SEARCH_FIELD_WIDTH,
  SEARCH_ICON,
  SEARCH_INPUT,
} from "@/constants/table";
import { cn } from "@/utils/cn";

/** Canonical size for icons inside inputs (search, calendar, etc.). */
export const INPUT_LEADING_ICON_SIZE = 14;

type SearchFieldProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "size"
> & {
  /** Extra wrapper classes (not for overriding toolbar width - use `fill`). */
  className?: string;
  /** Extra classes on the input (merged with shared search padding). */
  inputClassName?: string;
  /**
   * When true, stretches to the parent (dropdowns / popovers).
   * Default false uses the shared header toolbar width (220px from sm up).
   */
  fill?: boolean;
};

/**
 * Toolbar / filter search input with a consistent leading icon and width.
 */
export function SearchField({
  className,
  inputClassName,
  fill = false,
  "aria-label": ariaLabel = "Search",
  ...props
}: SearchFieldProps) {
  return (
    <div
      className={cn(
        "relative min-w-0",
        fill ? "w-full" : SEARCH_FIELD_WIDTH,
        className,
      )}
    >
      <Search
        size={INPUT_LEADING_ICON_SIZE}
        strokeWidth={2}
        className={SEARCH_ICON}
        aria-hidden
      />
      <Input
        type="search"
        aria-label={ariaLabel}
        className={cn(SEARCH_INPUT, inputClassName)}
        {...props}
      />
    </div>
  );
}

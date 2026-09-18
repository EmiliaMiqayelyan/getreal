import type { InputHTMLAttributes } from "react";

import { cn } from "@/utils/cn";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  /**
   * @deprecated Shared Input uses the Figma control height (33.75px).
   * Kept for call-site compatibility.
   */
  inputSize?: "md" | "lg";
};

/** True when className already sets a width utility (fixed, full, min, or max). */
function hasWidthClass(className?: string) {
  if (!className) return false;
  return /(^|\s)!?(min-|max-)?w-/.test(className);
}

export function Input({
  className,
  inputSize: _inputSize,
  ...props
}: InputProps) {
  return (
    <input
      className={cn(
        "h-[33.75px] rounded-[9.38px] border border-[#00000014] bg-white px-3 text-[13px] text-foreground outline-none",
        "placeholder:text-placeholder focus:border-black/20",
        "disabled:cursor-not-allowed disabled:bg-surface-muted disabled:opacity-60",
        !hasWidthClass(className) && "w-auto",
        className,
      )}
      {...props}
    />
  );
}

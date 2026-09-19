import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "@/utils/cn";

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  /** Accessible name - required for icon-only buttons. */
  "aria-label": string;
  size?: "sm" | "md";
};

/** Icon-only action button (close, edit, delete). */
export function IconButton({
  children,
  className,
  size = "md",
  type = "button",
  ...props
}: IconButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex shrink-0 cursor-pointer items-center justify-center rounded-md text-muted transition-colors",
        "hover:bg-surface-hover hover:text-foreground",
        "focus-visible:ring-2 focus-visible:ring-[#2E2E2E]/20 focus-visible:outline-none",
        "disabled:pointer-events-none disabled:opacity-40",
        size === "sm" ? "p-1" : "p-1.5",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

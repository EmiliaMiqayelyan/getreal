import type { ReactNode } from "react";

import { cn } from "@/utils/cn";

type BadgeProps = {
  children: ReactNode;
  className?: string;
};

export function CountBadge({ children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "bg-badge inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-[4px] px-1 text-[10px] leading-none font-semibold text-white",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function IdPill({ children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "bg-id-pill text-muted-strong inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Tag({ children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "bg-id-pill text-muted-strong inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        className,
      )}
    >
      {children}
    </span>
  );
}

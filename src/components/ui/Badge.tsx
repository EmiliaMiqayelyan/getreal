import type { ReactNode } from "react";

import { ID_PILL } from "@/constants/table";
import { cn } from "@/utils/cn";

type BadgeProps = {
  children: ReactNode;
  className?: string;
};

type StatusVariant = "success" | "warning" | "danger" | "info" | "neutral";

const statusClasses: Record<StatusVariant, string> = {
  success: "bg-success-soft text-success",
  warning: "bg-[#FFF1EB] text-warning",
  danger: "bg-danger-soft text-danger",
  info: "bg-[#EAF1FC] text-info",
  neutral: "bg-id-pill text-muted-strong",
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
  const title =
    typeof children === "string" || typeof children === "number"
      ? String(children)
      : undefined;

    return (
      <span className={cn(ID_PILL, className)} title={title}>
        <span className="block min-w-0 truncate text-left">{children}</span>
      </span>
    );
}

export function Tag({ children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "bg-id-pill text-muted-strong inline-flex items-center rounded-[6px] px-2 py-1 text-[12px] font-medium",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function StatusBadge({
  children,
  variant = "neutral",
  className,
}: BadgeProps & { variant?: StatusVariant }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[6px] px-2 py-0.5 text-[12px] font-medium",
        statusClasses[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}

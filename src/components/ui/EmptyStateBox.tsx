import type { ReactNode } from "react";

import { cn } from "@/utils/cn";

type EmptyStateBoxProps = {
  children: ReactNode;
  className?: string;
  variant?: "dashed" | "solid";
};

export function EmptyStateBox({
  children,
  className,
  variant = "dashed",
}: EmptyStateBoxProps) {
  return (
    <div
      className={cn(
        "text-muted flex min-h-[88px] items-center justify-center rounded-xl px-4 py-6 text-center text-sm",
        variant === "dashed" &&
          "border border-dashed border-border bg-[#fafbfc]",
        variant === "solid" && "border border-border bg-white",
        className,
      )}
    >
      {children}
    </div>
  );
}

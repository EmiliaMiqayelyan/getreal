import type { ReactNode } from "react";

import { cn } from "@/utils/cn";

type EmptyStateBoxProps = {
  children: ReactNode;
  className?: string;
};

export function EmptyStateBox({ children, className }: EmptyStateBoxProps) {
  return (
    <div
      className={cn(
        "text-muted flex min-h-[88px] items-center justify-center rounded-xl border border-dashed border-[#00000014] bg-[#fafbfc] px-4 py-6 text-center text-sm",
        className,
      )}
    >
      {children}
    </div>
  );
}

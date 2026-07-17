import type { LabelHTMLAttributes, ReactNode } from "react";

import { cn } from "@/utils/cn";

type LabelProps = LabelHTMLAttributes<HTMLLabelElement> & {
  children: ReactNode;
};

export function Label({ children, className, ...props }: LabelProps) {
  return (
    <label
      className={cn(
        "text-foreground mb-1.5 block text-sm font-medium",
        className,
      )}
      {...props}
    >
      {children}
    </label>
  );
}

type SectionTitleProps = {
  children: ReactNode;
  className?: string;
  action?: ReactNode;
};

export function SectionTitle({
  children,
  className,
  action,
}: SectionTitleProps) {
  return (
    <div className={cn("mb-3 flex items-center justify-between", className)}>
      <h3 className="text-muted text-[11px] font-semibold tracking-[0.08em] uppercase">
        {children}
      </h3>
      {action}
    </div>
  );
}

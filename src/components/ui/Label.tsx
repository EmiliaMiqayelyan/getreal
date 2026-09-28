import type { LabelHTMLAttributes, ReactNode } from "react";

import { cn } from "@/utils/cn";

type LabelProps = LabelHTMLAttributes<HTMLLabelElement> & {
  children: ReactNode;
  required?: boolean;
};

export function Label({
  children,
  className,
  required,
  ...props
}: LabelProps) {
  return (
    <label
      className={cn(
        "mb-1.5 block text-[11px] font-semibold text-[#2E2E2E]",
        className,
      )}
      {...props}
    >
      {children}
      {required ? <span className="text-danger"> *</span> : null}
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
      <h3 className="text-[11px] font-semibold tracking-[0.08em] text-[#2E2E2E] uppercase">
        {children}
      </h3>
      {action}
    </div>
  );
}

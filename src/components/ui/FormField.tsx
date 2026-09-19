import type { ReactNode } from "react";

import { Label } from "@/components/ui/Label";
import { cn } from "@/utils/cn";

type FormFieldProps = {
  label: string;
  htmlFor?: string;
  required?: boolean;
  error?: string;
  helper?: string;
  children: ReactNode;
  className?: string;
};

/** Label + control + error/helper for consistent form fields. */
export function FormField({
  label,
  htmlFor,
  required,
  error,
  helper,
  children,
  className,
}: FormFieldProps) {
  return (
    <div className={cn("min-w-0", className)}>
      <Label htmlFor={htmlFor}>
        {label}
        {required ? <span className="text-danger"> *</span> : null}
      </Label>
      {children}
      {error ? (
        <p className="mt-1 text-[11px] text-danger">{error}</p>
      ) : helper ? (
        <p className="mt-1 text-[11px] text-muted">{helper}</p>
      ) : null}
    </div>
  );
}

export const INVALID_FIELD_BORDER =
  "border-danger focus:border-danger";

import type { InputHTMLAttributes, ReactNode } from "react";

import { cn } from "@/utils/cn";

type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label: ReactNode;
};

export function Checkbox({ label, className, id, ...props }: CheckboxProps) {
  const inputId = id ?? String(label);

  return (
    <label
      htmlFor={inputId}
      className="text-foreground inline-flex cursor-pointer items-center gap-2 text-sm"
    >
      <input
        id={inputId}
        type="checkbox"
        className={cn(
          "bg-surface checked:border-foreground checked:bg-foreground size-4 appearance-none rounded-[4px] border border-[#00000014] checked:bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20fill%3D%22none%22%20stroke%3D%22%23fff%22%20stroke-width%3D%221.5%22%20d%3D%22M2.5%206.5%204.8%208.8%209.5%203.5%22%2F%3E%3C%2Fsvg%3E')] checked:bg-center checked:bg-no-repeat",
          className,
        )}
        {...props}
      />
      <span>{label}</span>
    </label>
  );
}

type RadioProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label: ReactNode;
};

export function Radio({ label, className, id, ...props }: RadioProps) {
  const inputId = id ?? `${props.name}-${props.value}`;

  return (
    <label
      htmlFor={inputId}
      className="text-foreground inline-flex cursor-pointer items-center gap-2 text-sm"
    >
      <input
        id={inputId}
        type="radio"
        className={cn(
          "bg-surface checked:border-foreground size-4 appearance-none rounded-full border border-[#00000014] checked:bg-[radial-gradient(circle_at_center,#1a1a1a_0_35%,transparent_38%)]",
          className,
        )}
        {...props}
      />
      <span>{label}</span>
    </label>
  );
}

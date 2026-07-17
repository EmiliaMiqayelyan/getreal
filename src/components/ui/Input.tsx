import type { InputHTMLAttributes } from "react";

import { cn } from "@/utils/cn";

type InputProps = InputHTMLAttributes<HTMLInputElement>;

export function Input({ className, ...props }: InputProps) {
  return (
    <input
      className={cn(
        "border-[#E4E6EB] bg-white text-foreground placeholder:text-muted focus:border-sidebar/40 h-10 w-full rounded-lg border px-3.5 text-sm outline-none",
        className,
      )}
      {...props}
    />
  );
}

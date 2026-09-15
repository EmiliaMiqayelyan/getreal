import type { TextareaHTMLAttributes } from "react";

import { cn } from "@/utils/cn";

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export function Textarea({ className, ...props }: TextareaProps) {
  return (
    <textarea
      className={cn(
        "min-h-[110px] w-full resize-y rounded-[8px] border border-border-strong bg-white px-3 py-2.5 text-[13px] text-foreground outline-none",
        "placeholder:text-placeholder focus:border-[#2E2E2E]/35",
        "disabled:cursor-not-allowed disabled:bg-surface-muted disabled:opacity-60",
        className,
      )}
      {...props}
    />
  );
}

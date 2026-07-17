import type { TextareaHTMLAttributes } from "react";

import { cn } from "@/utils/cn";

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export function Textarea({ className, ...props }: TextareaProps) {
  return (
    <textarea
      className={cn(
        "border-border bg-surface text-foreground placeholder:text-muted focus:border-sidebar/40 min-h-[96px] w-full resize-y rounded-lg border px-3.5 py-2.5 text-sm outline-none",
        className,
      )}
      {...props}
    />
  );
}

import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "@/utils/cn";

type ButtonVariant = "primary" | "secondary" | "dark" | "ghost" | "icon";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: ButtonVariant;
};

export function Button({
  children,
  className,
  variant = "primary",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-lg text-sm font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50",
        variant === "primary" &&
          "bg-badge h-10 px-4 text-white hover:bg-[#e86a42] active:bg-[#d95f3a]",
        variant === "secondary" &&
          "border-border bg-surface text-foreground hover:bg-background h-10 border px-4",
        variant === "dark" &&
          "h-10 bg-[#333333] px-4 text-white hover:bg-[#2a2a2a]",
        variant === "ghost" &&
          "text-muted-strong hover:text-foreground h-10 px-3 font-medium",
        variant === "icon" && "bg-badge size-10 text-white hover:bg-[#e86a42]",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

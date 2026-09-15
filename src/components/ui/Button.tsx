import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "@/utils/cn";

export type ButtonVariant =
  | "primary"
  | "dark"
  | "secondary"
  | "outline"
  | "ghost"
  | "danger"
  | "dangerGhost"
  | "link"
  | "icon";

/** @deprecated Layout comes from Figma button tokens; kept for call-site compatibility. */
export type ButtonSize = "sm" | "md" | "lg";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: ButtonVariant;
  /** Ignored — size comes from the shared Button token. Kept for compatibility. */
  size?: ButtonSize;
};

const isTextOnly = (variant: ButtonVariant) =>
  variant === "ghost" || variant === "dangerGhost" || variant === "link";

export function Button({
  children,
  className,
  variant = "primary",
  size: _size,
  type = "button",
  ...props
}: ButtonProps) {
  const textOnly = isTextOnly(variant);
  const isDark = variant === "dark";

  return (
    <button
      type={type}
      className={cn(
        "inline-flex w-fit items-center justify-center transition-colors",
        "text-[12px] leading-4 font-semibold tracking-normal",
        "focus-visible:ring-2 focus-visible:ring-[#2E2E2E]/20 focus-visible:outline-none",
        "disabled:pointer-events-none disabled:opacity-40",
        textOnly && "gap-[5.63px] px-0",
        !textOnly &&
          !isDark &&
          "h-[30px] gap-[5.63px] rounded-[9.38px] px-[15px]",
        /* Black / dark buttons — Figma Save / Create / Add to List */
        isDark &&
          "h-[33.75px] gap-[5.63px] rounded-[9.38px] bg-dark px-[18.75px] text-white hover:bg-dark-hover",
        variant === "primary" &&
          "bg-primary text-white hover:bg-primary-hover",
        variant === "secondary" &&
          "border border-border-strong bg-surface text-foreground hover:bg-surface-hover",
        variant === "outline" &&
          "border border-border-strong bg-white text-foreground hover:bg-surface-hover",
        variant === "ghost" &&
          "bg-transparent text-muted hover:text-foreground",
        variant === "danger" && "bg-danger text-white hover:bg-[#d14d4d]",
        variant === "dangerGhost" &&
          "bg-transparent text-danger hover:text-[#c94444]",
        variant === "link" && "bg-transparent text-link hover:underline",
        variant === "icon" &&
          "border border-border bg-white text-muted hover:bg-surface-hover hover:text-foreground",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

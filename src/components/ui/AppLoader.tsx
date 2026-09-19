import { Loader2 } from "lucide-react";

import { cn } from "@/utils/cn";

type AppLoaderSize = "sm" | "md" | "lg";
type AppLoaderVariant = "page" | "section" | "table" | "inline";

type AppLoaderProps = {
  /** Accessible status text. Shown visually except for inline. */
  label?: string;
  size?: AppLoaderSize;
  /**
   * page = fill parent (route Suspense)
   * section = padded content block
   * table = bordered white panel matching admin tables
   * inline = spinner only
   */
  variant?: AppLoaderVariant;
  className?: string;
};

const SIZE_PX: Record<AppLoaderSize, number> = {
  sm: 18,
  md: 28,
  lg: 36,
};

export function AppLoader({
  label = "Loading",
  size = "md",
  variant = "page",
  className,
}: AppLoaderProps) {
  const spinner = (
    <Loader2
      size={SIZE_PX[size]}
      className="animate-spin text-primary"
      aria-hidden
    />
  );

  if (variant === "inline") {
    return (
      <span
        role="status"
        aria-label={label}
        className={cn("inline-flex items-center justify-center", className)}
      >
        {spinner}
        <span className="sr-only">{label}</span>
      </span>
    );
  }

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={cn(
        "flex w-full flex-col items-center justify-center gap-3 text-muted",
        variant === "page" && "min-h-0 flex-1",
        variant === "section" && "min-h-[220px] py-12",
        variant === "table" &&
          "min-h-[220px] rounded-[12px] border border-[#00000014] bg-white py-16",
        className,
      )}
    >
      {spinner}
      <span className="text-[13px] font-medium tracking-tight">{label}</span>
    </div>
  );
}

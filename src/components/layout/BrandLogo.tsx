import { APP_NAME } from "@/constants";
import { cn } from "@/utils/cn";

export const BRAND_LOGOS = {
  /** Full wordmark, white + colored carrot — dark backgrounds */
  whiteColor: "/brand/logo-white-color.png",
  /** Full wordmark, all white — dark backgrounds */
  white: "/brand/logo-white.png",
  /** Full wordmark, black + colored carrot — light backgrounds */
  blackColor: "/brand/logo-black-color.png",
  /** Full wordmark, all black — light backgrounds */
  black: "/brand/logo-black.png",
  /** Compact R + carrot + H mark — favicon / tight headers */
  icon: "/brand/icon.png",
} as const;

export type BrandLogoVariant = keyof typeof BRAND_LOGOS;

type BrandLogoProps = {
  /** Prefer white* on dark UI, black* on light UI, icon for compact. */
  variant?: BrandLogoVariant;
  className?: string;
  /** Fixed display width in px (height scales). */
  width?: number;
  /** Cap display height in px (keeps aspect ratio). */
  maxHeight?: number;
};

export function BrandLogo({
  variant = "whiteColor",
  className,
  width,
  maxHeight,
}: BrandLogoProps) {
  return (
    <img
      src={BRAND_LOGOS[variant]}
      alt={APP_NAME}
      width={width ?? 140}
      height={maxHeight ?? 90}
      className={cn("block object-contain object-left", className)}
      style={{
        width: width != null ? `${width}px` : undefined,
        maxHeight: maxHeight != null ? `${maxHeight}px` : undefined,
        height: "auto",
      }}
      decoding="async"
    />
  );
}

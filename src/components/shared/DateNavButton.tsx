import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/utils/cn";

export const DATE_NAV_GROUP = "flex items-center gap-1.5";

const DATE_NAV_BUTTON =
  "flex size-[30px] shrink-0 items-center justify-center rounded-[10px] border border-[#EBEBEB] bg-white text-[#111118] disabled:opacity-40";

export function DateNavButton({
  className,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type={type} className={cn(DATE_NAV_BUTTON, className)} {...props} />;
}

export function CalendarIcon({ size = 14 }: { size?: number }) {
  return (
    <img
      src="/icons/calendar.png"
      alt=""
      width={size}
      height={size}
      draggable={false}
      className="shrink-0 object-contain"
      aria-hidden
    />
  );
}

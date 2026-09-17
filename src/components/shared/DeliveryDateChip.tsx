import { cn } from "@/utils/cn";

/** Shared row for date chips + nav controls. Keeps nav pinned; chips scroll on narrow screens. */
export const DATE_CHIP_ROW = "mb-5 flex items-center gap-2 sm:gap-3";

export const DATE_CHIP_SCROLL =
  "flex min-w-0 flex-1 items-center gap-2 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

type DeliveryDateChipProps = {
  label: string;
  count: number;
  active?: boolean;
  onClick?: () => void;
};

export function DeliveryDateChip({
  label,
  count,
  active = false,
  onClick,
}: DeliveryDateChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-[50px] w-[160px] shrink-0 items-center justify-between rounded-[12px] border px-3.5 text-left",
        active
          ? "border-transparent bg-[#2B5B31]"
          : "border-[#EBEBEB] bg-white",
      )}
    >
      <span
        className={cn(
          "text-[14px] font-bold",
          active ? "text-white" : "text-black",
        )}
      >
        {label}
      </span>
      <span
        className={cn(
          "inline-flex h-[18px] items-center justify-center rounded-[7px] text-[11px] font-semibold",
          active
            ? "w-[22px] bg-[#EDF4F033] text-white"
            : "w-[27px] bg-[#EDF4F0] text-black",
        )}
      >
        {count}
      </span>
    </button>
  );
}

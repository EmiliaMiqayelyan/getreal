import { cn } from "@/utils/cn";

type SwitchProps = {
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
  label: string;
  className?: string;
  disabled?: boolean;
};

/** Shared toggle switch (Products For Sale live toggle pattern). */
export function Switch({
  checked,
  onCheckedChange,
  label,
  className,
  disabled = false,
}: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative inline-flex h-[22px] w-[40px] shrink-0 cursor-pointer items-center rounded-full p-[2px] transition-colors",
        "disabled:pointer-events-none disabled:opacity-40",
        checked ? "bg-badge" : "bg-[#D0D0CC]",
        className,
      )}
    >
      <span
        className={cn(
          "block h-[18px] w-[18px] rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,0.2)] transition-transform",
          checked ? "translate-x-[18px]" : "translate-x-0",
        )}
      />
    </button>
  );
}

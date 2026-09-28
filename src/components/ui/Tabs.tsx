import { cn } from "@/utils/cn";

export type TabItem = {
  id: string;
  label: string;
  /** Fixed tab width, used by the header tabs. */
  width?: number;
};

type TabsProps = {
  items: TabItem[];
  value: string;
  onChange: (id: string) => void;
  className?: string;
  /** Strip height. Defaults to the 36px category tab bar. */
  heightClass?: string;
  /** Label alignment inside each tab. */
  align?: "start" | "center";
  /** Place the tab group in the center of the strip. */
  centered?: boolean;
  /** Sit inside the title row. The header owns the bottom border. */
  embedded?: boolean;
  "aria-label"?: string;
};

/** Underline tab strip for page header layer 3 (36px, border included). */
export function Tabs({
  items,
  value,
  onChange,
  className,
  heightClass = "h-9",
  align = "center",
  centered = false,
  embedded = false,
  "aria-label": ariaLabel = "Tabs",
}: TabsProps) {
  const alignStart = align === "start";

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        "box-border flex shrink-0",
        embedded
          ? "h-7 items-end gap-3 overflow-visible bg-transparent"
          : cn(
              "w-full overflow-x-auto overflow-y-hidden border-b border-border bg-white px-4 md:px-7",
              heightClass,
            ),
        !embedded && (centered ? "justify-center" : "justify-start"),
        className,
      )}
    >
      {items.map((item) => {
        const active = value === item.id;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.id)}
            style={
              embedded && item.width != null ? { width: item.width } : undefined
            }
            className={cn(
              "relative shrink-0 cursor-pointer transition-colors",
              embedded
                ? "h-7"
                : cn(
                    "flex h-full items-center pb-2 text-[13px] font-medium",
                    alignStart
                      ? "mr-6 justify-start px-0 text-left"
                      : "min-w-[77px] justify-center px-4",
                    active
                      ? "text-foreground"
                      : "text-muted hover:text-foreground",
                  ),
            )}
          >
            {embedded ? (
              <span
                className={cn(
                  "absolute top-[-3px] right-0 left-0 text-center text-[12px] leading-[15px] tracking-normal",
                  active
                    ? "font-semibold text-[#000000]"
                    : "font-medium text-[#6B7180] hover:text-[#000000]",
                )}
              >
                {item.label}
              </span>
            ) : (
              item.label
            )}
            {active ? (
              <span
                className={cn(
                  "absolute inset-x-0 bg-[#F57850]",
                  embedded ? "top-[26px] h-[2px]" : "-bottom-px h-[3px]",
                )}
                aria-hidden
              />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

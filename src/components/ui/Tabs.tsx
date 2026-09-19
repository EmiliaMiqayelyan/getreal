import { cn } from "@/utils/cn";

export type TabItem = {
  id: string;
  label: string;
};

type TabsProps = {
  items: TabItem[];
  value: string;
  onChange: (id: string) => void;
  className?: string;
  "aria-label"?: string;
};

/** Underline tab strip for page header layer 3 (~28px / h-7). */
export function Tabs({
  items,
  value,
  onChange,
  className,
  "aria-label": ariaLabel = "Tabs",
}: TabsProps) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        "flex overflow-x-auto overflow-y-hidden border-b border-border bg-white px-4 md:px-7",
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
            className={cn(
              "relative flex h-7 min-w-[77px] shrink-0 cursor-pointer items-center justify-center px-4 text-[13px] font-medium transition-colors",
              active
                ? "text-foreground"
                : "text-muted hover:text-foreground",
            )}
          >
            {item.label}
            {active ? (
              <span
                className="absolute inset-x-0 -bottom-px h-[3px] bg-badge"
                aria-hidden
              />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

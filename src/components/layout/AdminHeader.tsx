import type { ReactNode } from "react";

import { UserMenu } from "@/components/layout/UserMenu";
import { PAGE_TITLE } from "@/constants/table";
import { cn } from "@/utils/cn";

type HeaderProps = {
  title: string;
  toolbar?: ReactNode;
  /** Optional content centered in the title row (e.g. page tabs). */
  center?: ReactNode;
  /** Optional content below the filter subheader (e.g. tabs). */
  below?: ReactNode;
  className?: string;
  /**
   * Bottom border under the toolbar. Defaults to true when there is no `below`
   * layer, and false when `below` is set (tabs own the separator).
   */
  toolbarBorder?: boolean;
};

/**
 * Shared page chrome. Layer heights (desktop):
 * - L1 title + UserMenu: 52px
 * - L2 toolbar (filters / actions): 64px when present
 * - L3 tabs: 28px (h-7) when present
 *
 * Section order stays title → filters → tabs. No spacer when tabs are absent.
 *
 * Heights live on each layer (not the shared ROW base) so `md:h-[52px]` and
 * `md:h-[64px]` never compete in the same class list (`cn` does not twMerge).
 */
const ROW = "flex items-center bg-white px-4 md:px-7";

export function Header({
  title,
  toolbar,
  center,
  below,
  className,
  toolbarBorder,
}: HeaderProps) {
  const showToolbarBorder = toolbarBorder ?? !below;

  return (
    <div className={cn("shrink-0", className)}>
      <header
        className={cn(
          ROW,
          "relative min-h-[52px] justify-between gap-4 border-b border-border md:h-[52px]",
        )}
      >
        <h1 className={cn("relative z-10 min-w-0", PAGE_TITLE)}>{title}</h1>
        {center ? (
          <div className="pointer-events-none absolute inset-0 flex items-end justify-center">
            <div className="pointer-events-auto flex h-7">{center}</div>
          </div>
        ) : null}
        <div className="relative z-10 flex shrink-0 items-center border-l border-border pl-5">
          <UserMenu className="items-center" />
        </div>
      </header>

      {toolbar ? (
        <div
          className={cn(
            ROW,
            // Always reserve 1px border so filter controls share the same box
            // model with or without tabs (visible vs transparent).
            "box-border min-h-[52px] border-b py-3.5 md:h-[64px] md:py-3",
            showToolbarBorder ? "border-border" : "border-transparent",
          )}
        >
          <div className="flex w-full min-w-0 items-center">{toolbar}</div>
        </div>
      ) : null}

      {below}
    </div>
  );
}

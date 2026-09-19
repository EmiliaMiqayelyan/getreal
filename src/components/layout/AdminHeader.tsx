import type { ReactNode } from "react";

import { UserMenu } from "@/components/layout/UserMenu";
import { PAGE_TITLE } from "@/constants/table";
import { cn } from "@/utils/cn";

type HeaderProps = {
  title: string;
  toolbar?: ReactNode;
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
 * - L3 below (e.g. Tabs): ~28px (h-7) when present — omit when unused
 */
const ROW =
  "flex min-h-[52px] items-center bg-white px-4 md:h-[52px] md:px-7";

export function Header({
  title,
  toolbar,
  below,
  className,
  toolbarBorder,
}: HeaderProps) {
  const showToolbarBorder = toolbarBorder ?? !below;

  return (
    <div className={cn("shrink-0", className)}>
      <header className={cn(ROW, "justify-between gap-4 border-b border-border")}>
        <h1 className={cn("min-w-0", PAGE_TITLE)}>{title}</h1>
        <div className="flex shrink-0 items-center border-l border-border pl-5">
          <UserMenu className="items-center" />
        </div>
      </header>

      {toolbar ? (
        <div
          className={cn(
            ROW,
            "py-3.5 md:h-[64px] md:py-3",
            showToolbarBorder && "border-b border-border",
          )}
        >
          <div className="flex w-full min-w-0 items-center">{toolbar}</div>
        </div>
      ) : null}

      {below}
    </div>
  );
}

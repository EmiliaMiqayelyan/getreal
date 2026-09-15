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
};

const ROW =
  "flex min-h-[52px] items-center bg-white px-4 md:h-[52px] md:px-7";

export function Header({ title, toolbar, below, className }: HeaderProps) {
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
            "border-b border-border py-3.5 md:h-[64px] md:py-3",
          )}
        >
          <div className="flex w-full min-w-0 items-center">{toolbar}</div>
        </div>
      ) : null}

      {below}
    </div>
  );
}

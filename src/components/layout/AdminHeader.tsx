import type { ReactNode } from "react";

import { UserMenu } from "@/components/layout/UserMenu";
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
      <header
        className={cn(
          ROW,
          "justify-between gap-4 border-b border-[#ECECEA]",
        )}
      >
        <h1 className="min-w-0 text-[20px] font-semibold tracking-tight text-[#111118]">
          {title}
        </h1>
        <div className="flex shrink-0 items-center border-l border-[#ECECEA] pl-5">
          <UserMenu className="items-center" />
        </div>
      </header>

      {toolbar ? (
        <div
          className={cn(
            ROW,
            "border-b border-[#ECECEA] py-2 md:py-0",
          )}
        >
          <div className="flex w-full min-w-0 items-center">{toolbar}</div>
        </div>
      ) : null}

      {below}
    </div>
  );
}

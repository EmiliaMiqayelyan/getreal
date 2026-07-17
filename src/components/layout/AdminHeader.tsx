import type { ReactNode } from "react";

import { BellIcon } from "@/components/icons";

type HeaderProps = {
  title: string;
  toolbar?: ReactNode;
};

export function Header({ title, toolbar }: HeaderProps) {
  return (
    <div className="shrink-0">
      <header className="flex h-[72px] items-center justify-between bg-white px-8">
        <h1 className="text-[22px] font-semibold tracking-tight text-foreground">
          {title}
        </h1>

        <div className="flex items-center gap-5">
          <button
            type="button"
            aria-label="Notifications"
            className="relative rounded-full p-1.5 text-muted-strong transition-colors hover:bg-background"
          >
            <BellIcon className="size-5" />
            <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-danger" />
          </button>

          <div className="flex items-center gap-3">
            <div className="size-9 rounded-full bg-[#d1d5db]" aria-hidden />
            <div className="leading-tight">
              <p className="text-sm font-semibold text-foreground">
                James Miller
              </p>
              <p className="text-xs text-muted">Manager</p>
            </div>
          </div>
        </div>
      </header>

      {toolbar ? (
        <div className="border-t border-[#E4E6EB] bg-background px-8 py-4">
          {toolbar}
        </div>
      ) : null}
    </div>
  );
}

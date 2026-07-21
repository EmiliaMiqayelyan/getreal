import { useEffect, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router";

import { BellIcon, ChevronDownIcon } from "@/components/icons";
import { ROUTES } from "@/constants";
import { logout } from "@/lib/auth";
import { cn } from "@/utils/cn";

type HeaderProps = {
  title: string;
  toolbar?: ReactNode;
};

export function Header({ title, toolbar }: HeaderProps) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;

    function onPointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  function handleLogout() {
    setMenuOpen(false);
    logout();
    navigate(ROUTES.login, { replace: true });
  }

  return (
    <div className="shrink-0">
      <header className="flex h-[72px] items-center justify-between bg-white px-8">
        <h1 className="text-foreground text-[22px] font-semibold tracking-tight">
          {title}
        </h1>

        <div className="flex items-center gap-5">
          <button
            type="button"
            aria-label="Notifications"
            className="text-muted-strong hover:bg-background relative rounded-full p-1.5 transition-colors"
          >
            <BellIcon className="size-5" />
            <span className="bg-danger absolute top-1.5 right-1.5 size-1.5 rounded-full" />
          </button>

          <div ref={menuRef} className="relative">
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-label="User menu"
              onClick={() => setMenuOpen((open) => !open)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-1.5 py-1 transition-colors",
                "hover:bg-background",
                menuOpen && "bg-background",
              )}
            >
              <div className="size-9 rounded-full bg-[#d1d5db]" aria-hidden />
              <div className="text-left leading-tight">
                <p className="text-foreground text-sm font-semibold">
                  James Miller
                </p>
                <p className="text-muted text-xs">Manager</p>
              </div>
              <ChevronDownIcon
                className={cn(
                  "text-muted shrink-0 transition-transform",
                  menuOpen && "rotate-180",
                )}
              />
            </button>

            {menuOpen ? (
              <div
                role="menu"
                className="border-border bg-surface absolute top-[calc(100%+6px)] right-0 z-50 min-w-[160px] rounded-lg border py-1 shadow-lg"
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleLogout}
                  className="text-foreground hover:bg-background w-full px-3.5 py-2 text-left text-sm font-medium transition-colors"
                >
                  Log out
                </button>
              </div>
            ) : null}
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

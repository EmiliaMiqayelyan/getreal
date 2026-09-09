import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";

import { ROUTES } from "@/constants";
import { getRole, logout } from "@/lib/auth";
import { cn } from "@/utils/cn";

const ROLE_LABELS = {
  superadmin: "Super Admin",
  warehouse: "Warehouse",
} as const;

type UserMenuProps = {
  className?: string;
};

export function UserMenu({ className }: UserMenuProps) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const roleLabel = ROLE_LABELS[getRole() ?? "superadmin"];

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function handleLogout() {
    setOpen(false);
    logout();
    navigate(ROUTES.login, { replace: true });
  }

  return (
    <div className={cn("flex items-start gap-4", className)}>
      <div ref={rootRef} className="relative">
        <button
          type="button"
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label="User menu"
          onClick={() => setOpen((current) => !current)}
          className="flex items-center gap-2.5 rounded-lg px-1.5 py-1 transition-colors hover:bg-[#F5F4F1]"
        >
          <div className="leading-tight text-right">
            <div className="text-[13px] font-semibold text-[#111118]">
              James Miller
            </div>
            <div className="text-[11px] text-[#8F8F8F]">{roleLabel}</div>
          </div>
        </button>

        {open ? (
          <div
            role="menu"
            className="absolute top-[calc(100%+6px)] right-0 z-50 min-w-[160px] rounded-lg border border-[#ECE7DF] bg-white py-1 shadow-lg"
          >
            <button
              type="button"
              role="menuitem"
              onClick={handleLogout}
              className="w-full px-3.5 py-2 text-left text-[13px] font-medium text-[#111118] transition-colors hover:bg-[#F7F6F3]"
            >
              Log out
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

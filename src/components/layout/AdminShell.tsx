import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router";
import { Menu } from "lucide-react";

import { Sidebar } from "@/components/layout/Sidebar";
import { APP_NAME } from "@/constants";
import { getRoleHome } from "@/constants/navigation";
import { getRole } from "@/lib/auth";

type AdminShellProps = {
  children: React.ReactNode;
};

export function AdminShell({ children }: AdminShellProps) {
  const [navOpen, setNavOpen] = useState(false);
  const { pathname } = useLocation();
  const home = getRoleHome(getRole());

  useEffect(() => {
    setNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!navOpen) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setNavOpen(false);
    }

    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [navOpen]);

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      {navOpen ? (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setNavOpen(false)}
        />
      ) : null}

      <Sidebar open={navOpen} onClose={() => setNavOpen(false)} />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background">
        <div className="flex h-14 shrink-0 items-center gap-3 border-b border-[#ECECEA] bg-white px-4 lg:hidden">
          <button
            type="button"
            aria-label="Open menu"
            aria-expanded={navOpen}
            onClick={() => setNavOpen(true)}
            className="inline-flex size-9 items-center justify-center rounded-[8px] border border-[#E6E6E3] text-[#111118]"
          >
            <Menu size={18} />
          </button>
          <Link
            to={home}
            className="text-[15px] font-semibold tracking-tight text-[#111118]"
          >
            {APP_NAME}
          </Link>
        </div>

        {children}
      </div>
    </div>
  );
}

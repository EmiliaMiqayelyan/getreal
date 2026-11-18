import { useEffect, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router";
import { Menu } from "lucide-react";

import { BrandLogo } from "@/components/layout/BrandLogo";
import { Sidebar } from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/Button";
import { APP_NAME, ROUTES } from "@/constants";
import { getRoleHome } from "@/constants/navigation";
import { useRolesUsers } from "@/context/RolesUsersContext";
import { logout } from "@/lib/auth";
import { canAccessPath } from "@/utils/rolesUsers";

type AdminShellProps = {
  children: React.ReactNode;
};

function NoPageAccess() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
      <h1 className="text-[18px] font-semibold text-[#111118]">
        No pages available
      </h1>
      <p className="max-w-sm text-[13px] leading-relaxed text-[#6B6B6B]">
        Your account does not have access to any pages. Ask an administrator
        to update your role.
      </p>
      <Button
        variant="dark"
        onClick={() => {
          logout();
          navigate(ROUTES.login, { replace: true });
        }}
      >
        Log out
      </Button>
    </div>
  );
}

export function AdminShell({ children }: AdminShellProps) {
  const [navOpen, setNavOpen] = useState(false);
  const { pathname } = useLocation();
  const { sessionPermissions } = useRolesUsers();
  const home = getRoleHome(sessionPermissions);
  const allowed = canAccessPath(sessionPermissions, pathname);

  useEffect(() => {
    setNavOpen(false);
  }, [pathname]);

  // Keep the admin chrome glued to the viewport. Without this, flex min-content
  // can grow past 100dvh and the document scrolls into empty body white space.
  useEffect(() => {
    const html = document.documentElement;
    const { body } = document;
    const previous = {
      htmlOverflow: html.style.overflow,
      htmlOverscroll: html.style.overscrollBehavior,
      bodyOverflow: body.style.overflow,
      bodyOverscroll: body.style.overscrollBehavior,
    };

    html.style.overflow = "hidden";
    html.style.overscrollBehavior = "none";
    body.style.overflow = "hidden";
    body.style.overscrollBehavior = "none";

    return () => {
      html.style.overflow = previous.htmlOverflow;
      html.style.overscrollBehavior = previous.htmlOverscroll;
      body.style.overflow = previous.bodyOverflow;
      body.style.overscrollBehavior = previous.bodyOverscroll;
    };
  }, []);

  useEffect(() => {
    if (!navOpen) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setNavOpen(false);
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [navOpen]);

  const fallback =
    !allowed && home && home !== pathname && canAccessPath(sessionPermissions, home)
      ? home
      : null;

  if (fallback) {
    return <Navigate to={fallback} replace />;
  }

  return (
    <div className="bg-background flex h-full max-h-full min-h-0 overflow-hidden">
      {navOpen ? (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setNavOpen(false)}
        />
      ) : null}

      <Sidebar open={navOpen} onClose={() => setNavOpen(false)} />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[#FAFAFA]">
        <div className="flex h-14 shrink-0 items-center gap-3 overflow-hidden border-b border-[#00000014] bg-white px-4 lg:hidden">
          <button
            type="button"
            aria-label="Open menu"
            aria-expanded={navOpen}
            onClick={() => setNavOpen(true)}
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-[8px] border border-[#00000014] text-[#111118]"
          >
            <Menu size={18} />
          </button>
          <Link
            to={home ?? ROUTES.distributors}
            className="flex h-9 max-w-[140px] items-center"
            aria-label={APP_NAME}
          >
            <BrandLogo variant="icon" width={96} maxHeight={36} />
          </Link>
        </div>

        {allowed ? children : <NoPageAccess />}
      </div>
    </div>
  );
}

import { Suspense } from "react";
import { Navigate, Outlet } from "react-router";

import { AppCatalogProvider } from "@/context/AppCatalogContext";
import { AdminShell } from "@/components/layout/AdminShell";
import { ROUTES } from "@/constants";
import { useIdleLogout } from "@/hooks/useIdleLogout";
import { isAuthenticated } from "@/lib/auth";

function AuthenticatedShell() {
  useIdleLogout();

  return (
    <AdminShell>
      <Suspense fallback={null}>
        <Outlet />
      </Suspense>
    </AdminShell>
  );
}

export function AdminLayout() {
  if (!isAuthenticated()) {
    return <Navigate to={ROUTES.login} replace />;
  }

  return (
    <AppCatalogProvider>
      <AuthenticatedShell />
    </AppCatalogProvider>
  );
}

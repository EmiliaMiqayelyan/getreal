import { Suspense } from "react";
import { Navigate, Outlet } from "react-router";

import { ApiBootstrap } from "@/components/api/ApiBootstrap";
import { AppCatalogProvider } from "@/context/AppCatalogContext";
import { PackingHandoffProvider } from "@/context/PackingHandoffContext";
import { ReceivingHandoffProvider } from "@/context/ReceivingHandoffContext";
import { RolesUsersProvider } from "@/context/RolesUsersContext";
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
      <ReceivingHandoffProvider>
        <PackingHandoffProvider>
          <RolesUsersProvider>
            <ApiBootstrap />
            <AuthenticatedShell />
          </RolesUsersProvider>
        </PackingHandoffProvider>
      </ReceivingHandoffProvider>
    </AppCatalogProvider>
  );
}

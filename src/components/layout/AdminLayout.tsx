import { Suspense } from "react";
import { Navigate, Outlet } from "react-router";

import { AdminShell } from "@/components/layout/AdminShell";
import { ROUTES } from "@/constants";
import { isAuthenticated } from "@/lib/auth";

export function AdminLayout() {
  if (!isAuthenticated()) {
    return <Navigate to={ROUTES.login} replace />;
  }

  return (
    <AdminShell>
      <Suspense fallback={null}>
        <Outlet />
      </Suspense>
    </AdminShell>
  );
}

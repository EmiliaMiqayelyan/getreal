import { lazy } from "react";
import { createBrowserRouter, Navigate } from "react-router";

import { AdminLayout } from "@/components/layout/AdminLayout";
import { ROUTES } from "@/constants";
import { getHomeRoute, getRole, isAuthenticated } from "@/lib/auth";
import LoginPage from "@/pages/LoginPage";

const DashboardPage = lazy(() => import("@/pages/DashboardPage"));
const InventoryPage = lazy(() => import("@/pages/InventoryPage"));
const ProductsForSalePage = lazy(() => import("@/pages/ProductsForSalePage"));
const ProductOrdersPage = lazy(() => import("@/pages/ProductOrdersPage"));
const DistributorDeliveriesPage = lazy(
  () => import("@/pages/DistributorDeliveriesPage"),
);
const PackingCoolersPage = lazy(() => import("@/pages/PackingCoolersPage"));
const DistributorsPage = lazy(() => import("@/pages/DistributorsPage"));
const CustomerOrdersPage = lazy(() => import("@/pages/CustomerOrdersPage"));
const CustomersPage = lazy(() => import("@/pages/CustomersPage"));
const RolesPage = lazy(() => import("@/pages/RolesPage"));

function HomeRedirect() {
  return (
    <Navigate
      to={isAuthenticated() ? getHomeRoute() : ROUTES.login}
      replace
    />
  );
}

function RoleGuard({
  allow,
  children,
}: {
  allow: Array<"superadmin" | "warehouse">;
  children: React.ReactNode;
}) {
  const role = getRole();
  if (!role || !allow.includes(role)) {
    return <Navigate to={getHomeRoute()} replace />;
  }
  return children;
}

export const router = createBrowserRouter([
  {
    path: ROUTES.home,
    element: <HomeRedirect />,
  },
  {
    path: ROUTES.login,
    element: <LoginPage />,
  },
  {
    element: <AdminLayout />,
    children: [
      {
        path: ROUTES.dashboard,
        element: (
          <RoleGuard allow={["superadmin"]}>
            <DashboardPage />
          </RoleGuard>
        ),
      },
      {
        path: ROUTES.inventory,
        element: (
          <RoleGuard allow={["superadmin", "warehouse"]}>
            <InventoryPage />
          </RoleGuard>
        ),
      },
      {
        path: ROUTES.productsForSale,
        element: (
          <RoleGuard allow={["superadmin"]}>
            <ProductsForSalePage />
          </RoleGuard>
        ),
      },
      {
        path: ROUTES.productOrders,
        element: (
          <RoleGuard allow={["superadmin"]}>
            <ProductOrdersPage />
          </RoleGuard>
        ),
      },
      {
        path: ROUTES.distributorDeliveries,
        element: (
          <RoleGuard allow={["warehouse"]}>
            <DistributorDeliveriesPage />
          </RoleGuard>
        ),
      },
      {
        path: ROUTES.packingCoolers,
        element: (
          <RoleGuard allow={["warehouse"]}>
            <PackingCoolersPage />
          </RoleGuard>
        ),
      },
      {
        path: ROUTES.distributors,
        element: (
          <RoleGuard allow={["superadmin", "warehouse"]}>
            <DistributorsPage />
          </RoleGuard>
        ),
      },
      {
        path: ROUTES.customerOrders,
        element: (
          <RoleGuard allow={["superadmin"]}>
            <CustomerOrdersPage />
          </RoleGuard>
        ),
      },
      {
        path: ROUTES.customers,
        element: (
          <RoleGuard allow={["superadmin"]}>
            <CustomersPage />
          </RoleGuard>
        ),
      },
      {
        path: ROUTES.roles,
        element: (
          <RoleGuard allow={["superadmin"]}>
            <RolesPage />
          </RoleGuard>
        ),
      },
    ],
  },
  {
    path: "*",
    element: <HomeRedirect />,
  },
]);

import { createBrowserRouter, Navigate } from "react-router";

import { AdminLayout } from "@/components/layout/AdminLayout";
import { ROUTES } from "@/constants";
import { getHomeRoute, getRole, isAuthenticated } from "@/lib/auth";
import { lazyPage } from "@/lib/lazyPage";
import LoginPage from "@/pages/LoginPage";

const DashboardPage = lazyPage(() => import("@/pages/DashboardPage"));
const InventoryPage = lazyPage(() => import("@/pages/InventoryPage"));
const ProductsForSalePage = lazyPage(
  () => import("@/pages/ProductsForSalePage"),
);
const ProductOrdersPage = lazyPage(() => import("@/pages/ProductOrdersPage"));
const DistributorDeliveriesPage = lazyPage(
  () => import("@/pages/DistributorDeliveriesPage"),
);
const PackingCoolersPage = lazyPage(() => import("@/pages/PackingCoolersPage"));
const PackerManagerPage = lazyPage(() => import("@/pages/PackerManagerPage"));
const DistributorsPage = lazyPage(() => import("@/pages/DistributorsPage"));
const SourcePage = lazyPage(() => import("@/pages/SourcePage"));
const ItemsPage = lazyPage(() => import("@/pages/ItemsPage"));
const CustomerOrdersPage = lazyPage(() => import("@/pages/CustomerOrdersPage"));
const CustomersPage = lazyPage(() => import("@/pages/CustomersPage"));
const RolesPage = lazyPage(() => import("@/pages/RolesPage"));
const PushNotificationsPage = lazyPage(
  () => import("@/pages/PushNotificationsPage"),
);

function HomeRedirect() {
  return (
    <Navigate to={isAuthenticated() ? getHomeRoute() : ROUTES.login} replace />
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
        path: ROUTES.distributors,
        element: (
          <RoleGuard allow={["superadmin", "warehouse"]}>
            <DistributorsPage />
          </RoleGuard>
        ),
      },
      {
        path: ROUTES.source,
        element: (
          <RoleGuard allow={["superadmin"]}>
            <SourcePage />
          </RoleGuard>
        ),
      },
      {
        path: ROUTES.items,
        element: (
          <RoleGuard allow={["superadmin"]}>
            <ItemsPage />
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
        path: ROUTES.inventory,
        element: (
          <RoleGuard allow={["superadmin", "warehouse"]}>
            <InventoryPage />
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
        path: ROUTES.customerOrders,
        element: (
          <RoleGuard allow={["superadmin"]}>
            <CustomerOrdersPage />
          </RoleGuard>
        ),
      },
      {
        path: ROUTES.distributorDeliveries,
        element: (
          <RoleGuard allow={["superadmin", "warehouse"]}>
            <DistributorDeliveriesPage />
          </RoleGuard>
        ),
      },
      {
        path: ROUTES.packingCoolers,
        element: (
          <RoleGuard allow={["superadmin", "warehouse"]}>
            <PackingCoolersPage />
          </RoleGuard>
        ),
      },
      {
        path: ROUTES.packerManager,
        element: (
          <RoleGuard allow={["superadmin"]}>
            <PackerManagerPage />
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
      {
        path: ROUTES.notifications,
        element: (
          <RoleGuard allow={["superadmin"]}>
            <PushNotificationsPage />
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

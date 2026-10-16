import { createBrowserRouter, Navigate } from "react-router";

import { AdminLayout } from "@/components/layout/AdminLayout";
import { ROUTES } from "@/constants";
import { getRoleHome } from "@/constants/navigation";
import { isAuthenticated } from "@/lib/auth";
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
  if (!isAuthenticated()) {
    return <Navigate to={ROUTES.login} replace />;
  }
  return <Navigate to={getRoleHome() ?? ROUTES.distributors} replace />;
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
        element: <DashboardPage />,
      },
      {
        path: ROUTES.distributors,
        element: <DistributorsPage />,
      },
      {
        path: ROUTES.source,
        element: <SourcePage />,
      },
      {
        path: ROUTES.items,
        element: <ItemsPage />,
      },
      {
        path: ROUTES.productsForSale,
        element: <ProductsForSalePage />,
      },
      {
        path: ROUTES.productOrders,
        element: <ProductOrdersPage />,
      },
      {
        path: ROUTES.inventory,
        element: <InventoryPage />,
      },
      {
        path: ROUTES.customers,
        element: <CustomersPage />,
      },
      {
        path: ROUTES.customerOrders,
        element: <CustomerOrdersPage />,
      },
      {
        path: ROUTES.distributorDeliveries,
        element: <DistributorDeliveriesPage />,
      },
      {
        path: ROUTES.packingCoolers,
        element: <PackingCoolersPage />,
      },
      {
        path: ROUTES.packerManager,
        element: <PackerManagerPage />,
      },
      {
        path: ROUTES.roles,
        element: <RolesPage />,
      },
      {
        path: ROUTES.notifications,
        element: <PushNotificationsPage />,
      },
    ],
  },
  {
    path: "*",
    element: <HomeRedirect />,
  },
]);

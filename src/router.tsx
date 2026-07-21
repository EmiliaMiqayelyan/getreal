import { lazy } from "react";
import { createBrowserRouter, Navigate } from "react-router";

import { AdminLayout } from "@/components/layout/AdminLayout";
import { ROUTES } from "@/constants";
import { isAuthenticated } from "@/lib/auth";
import LoginPage from "@/pages/LoginPage";

const DashboardPage = lazy(() => import("@/pages/DashboardPage"));
const InventoryPage = lazy(() => import("@/pages/InventoryPage"));
const ProductsForSalePage = lazy(() => import("@/pages/ProductsForSalePage"));
const ProductOrdersPage = lazy(() => import("@/pages/ProductOrdersPage"));
const DistributorsPage = lazy(() => import("@/pages/DistributorsPage"));
const CustomerOrdersPage = lazy(() => import("@/pages/CustomerOrdersPage"));
const CustomersPage = lazy(() => import("@/pages/CustomersPage"));
const RolesPage = lazy(() => import("@/pages/RolesPage"));

function HomeRedirect() {
  return (
    <Navigate
      to={isAuthenticated() ? ROUTES.dashboard : ROUTES.login}
      replace
    />
  );
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
      { path: ROUTES.dashboard, element: <DashboardPage /> },
      { path: ROUTES.inventory, element: <InventoryPage /> },
      { path: ROUTES.productsForSale, element: <ProductsForSalePage /> },
      { path: ROUTES.productOrders, element: <ProductOrdersPage /> },
      { path: ROUTES.distributors, element: <DistributorsPage /> },
      { path: ROUTES.customerOrders, element: <CustomerOrdersPage /> },
      { path: ROUTES.customers, element: <CustomersPage /> },
      { path: ROUTES.roles, element: <RolesPage /> },
    ],
  },
  {
    path: "*",
    element: <HomeRedirect />,
  },
]);

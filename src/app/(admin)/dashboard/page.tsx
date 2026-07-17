import type { Metadata } from "next";

import { Header } from "@/components/layout/AdminHeader";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default function DashboardPage() {
  return <Header title="Dashboard" />;
}

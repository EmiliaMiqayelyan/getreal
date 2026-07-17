import type { Metadata } from "next";

import { Header } from "@/components/layout/AdminHeader";

export const metadata: Metadata = { title: "Customer Orders" };

export default function CustomerOrdersPage() {
  return <Header title="Customer Orders" />;
}

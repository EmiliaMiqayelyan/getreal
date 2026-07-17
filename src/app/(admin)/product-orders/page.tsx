import type { Metadata } from "next";

import { Header } from "@/components/layout/AdminHeader";

export const metadata: Metadata = { title: "Product Orders" };

export default function ProductOrdersPage() {
  return <Header title="Product Orders" />;
}

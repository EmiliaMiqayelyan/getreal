import type { Metadata } from "next";

import { Header } from "@/components/layout/AdminHeader";

export const metadata: Metadata = { title: "Inventory" };

export default function InventoryPage() {
  return <Header title="Inventory" />;
}

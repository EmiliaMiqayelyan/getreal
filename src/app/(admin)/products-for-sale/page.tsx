import type { Metadata } from "next";

import { Header } from "@/components/layout/AdminHeader";

export const metadata: Metadata = { title: "Products For Sale" };

export default function ProductsForSalePage() {
  return <Header title="Products For Sale" />;
}

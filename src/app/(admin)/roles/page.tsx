import type { Metadata } from "next";

import { Header } from "@/components/layout/AdminHeader";

export const metadata: Metadata = { title: "Roles" };

export default function RolesPage() {
  return <Header title="Roles" />;
}

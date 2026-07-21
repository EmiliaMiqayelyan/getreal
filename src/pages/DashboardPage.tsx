import { Header } from "@/components/layout/AdminHeader";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

export default function DashboardPage() {
  useDocumentTitle("Dashboard");
  return <Header title="Dashboard" />;
}

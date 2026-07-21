import { Header } from "@/components/layout/AdminHeader";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

export default function CustomerOrdersPage() {
  useDocumentTitle("Customer Orders");
  return <Header title="Customer Orders" />;
}

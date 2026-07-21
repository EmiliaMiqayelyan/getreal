import { Header } from "@/components/layout/AdminHeader";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

export default function ProductOrdersPage() {
  useDocumentTitle("Product Orders");
  return <Header title="Product Orders" />;
}

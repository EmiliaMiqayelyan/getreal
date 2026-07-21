import { Header } from "@/components/layout/AdminHeader";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

export default function InventoryPage() {
  useDocumentTitle("Inventory");
  return <Header title="Inventory" />;
}

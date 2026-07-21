import { Header } from "@/components/layout/AdminHeader";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

export default function ProductsForSalePage() {
  useDocumentTitle("Products For Sale");
  return <Header title="Products For Sale" />;
}

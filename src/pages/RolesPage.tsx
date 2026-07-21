import { Header } from "@/components/layout/AdminHeader";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

export default function RolesPage() {
  useDocumentTitle("Roles");
  return <Header title="Roles" />;
}

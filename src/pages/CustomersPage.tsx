import { CustomersView } from "@/components/customers/CustomersView";
import { CUSTOMERS } from "@/constants/customers";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

export default function CustomersPage() {
  useDocumentTitle("Customers");
  return <CustomersView customers={CUSTOMERS} />;
}

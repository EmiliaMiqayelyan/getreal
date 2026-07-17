import type { Metadata } from "next";

import { CustomersView } from "@/components/customers/CustomersView";
import { CUSTOMERS } from "@/constants/customers";

export const metadata: Metadata = {
  title: "Customers",
};

export default function CustomersPage() {
  return <CustomersView customers={CUSTOMERS} />;
}

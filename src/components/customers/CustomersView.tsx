import { useMemo, useState } from "react";

import { CustomerFilters } from "@/components/customers/CustomerFilters";
import { CustomerSection } from "@/components/customers/CustomerSection";
import { Header } from "@/components/layout/AdminHeader";
import type { Customer } from "@/types/customer";

type CustomersViewProps = {
  customers: Customer[];
};

export function CustomersView({ customers }: CustomersViewProps) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    return customers.filter((customer) => {
      const matchesQuery =
        !normalized ||
        customer.name.toLowerCase().includes(normalized) ||
        customer.email.toLowerCase().includes(normalized);

      const matchesStatus = !statusFilter || customer.status === statusFilter;

      return matchesQuery && matchesStatus;
    });
  }, [customers, query, statusFilter]);

  const active = filtered.filter((customer) => customer.status === "active");
  const inactive = filtered.filter(
    (customer) => customer.status === "inactive",
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#FAFAFA]">
      <Header
        title="Customers"
        toolbar={
          <CustomerFilters
            query={query}
            status={statusFilter}
            onQueryChange={setQuery}
            onStatusChange={setStatusFilter}
          />
        }
      />

      <div className="flex flex-1 flex-col gap-6 overflow-auto bg-[#FAFAFA] px-8 py-6">
        <CustomerSection title="Active" customers={active} />
        <CustomerSection title="Inactive" customers={inactive} />
      </div>
    </div>
  );
}

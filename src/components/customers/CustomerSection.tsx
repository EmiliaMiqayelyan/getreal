import { CustomerTable } from "@/components/customers/CustomerTable";
import type { Customer } from "@/types/customer";

type CustomerSectionProps = {
  title: string;
  customers: Customer[];
};

export function CustomerSection({ title, customers }: CustomerSectionProps) {
  return (
    <section className="space-y-3">
      <h2 className="text-foreground text-[15px] font-semibold">
        {title}{" "}
        <span className="font-semibold text-[#6B7180]">
          ({customers.length})
        </span>
      </h2>
      <CustomerTable customers={customers} />
    </section>
  );
}

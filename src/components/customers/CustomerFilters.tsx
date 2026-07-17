import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";

type CustomerFiltersProps = {
  query: string;
  status: string;
  onQueryChange: (value: string) => void;
  onStatusChange: (value: string) => void;
};

export function CustomerFilters({
  query,
  status,
  onQueryChange,
  onStatusChange,
}: CustomerFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Input
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        placeholder="Customer name or email"
        className="max-w-[280px]"
        aria-label="Search customers"
      />
      <Select
        value={status}
        onChange={onStatusChange}
        className="w-[120px]"
        aria-label="Filter by status"
        options={[
          { value: "", label: " " },
          { value: "active", label: "Active" },
          { value: "inactive", label: "Inactive" },
        ]}
      />
    </div>
  );
}

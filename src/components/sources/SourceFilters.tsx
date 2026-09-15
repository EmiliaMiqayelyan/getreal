import { Plus, Search } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { SEARCH_ICON, SEARCH_INPUT } from "@/constants/table";

type SourceFiltersProps = {
  query: string;
  location: string;
  distributor: string;
  locationOptions: string[];
  distributorOptions: string[];
  onQueryChange: (value: string) => void;
  onLocationChange: (value: string) => void;
  onDistributorChange: (value: string) => void;
  onAdd: () => void;
};

export function SourceFilters({
  query,
  location,
  distributor,
  locationOptions,
  distributorOptions,
  onQueryChange,
  onLocationChange,
  onDistributorChange,
  onAdd,
}: SourceFiltersProps) {
  return (
    <div className="flex w-full flex-wrap items-center gap-2 md:flex-nowrap">
      <div className="relative w-full min-w-[160px] flex-1 sm:max-w-[220px] sm:flex-none">
        <Search size={14} className={SEARCH_ICON} />
        <Input
          inputSize="md"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search name"
          aria-label="Search name"
          className={SEARCH_INPUT}
        />
      </div>

      <Select
        value={location}
        onChange={onLocationChange}
        className="w-full sm:w-[150px]"
        aria-label="Location"
        placeholder="Location"
        options={[
          { value: "", label: "Location" },
          ...locationOptions.map((option) => ({
            value: option,
            label: option,
          })),
        ]}
      />

      <Select
        value={distributor}
        onChange={onDistributorChange}
        className="w-full sm:w-[160px]"
        aria-label="Distributor"
        placeholder="Distributor"
        options={[
          { value: "", label: "Distributor" },
          ...distributorOptions.map((option) => ({
            value: option,
            label: option,
          })),
        ]}
      />

      <Button
        variant="primary"
        onClick={onAdd}
        className="w-full sm:ml-auto sm:w-auto"
      >
        <Plus size={14} />
        Add Source
      </Button>
    </div>
  );
}

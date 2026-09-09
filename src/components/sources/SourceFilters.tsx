import { Plus, Search } from "lucide-react";

import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";

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
        <Search
          size={13}
          className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[#A9A9A9]"
        />
        <Input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search name"
          aria-label="Search name"
          className="h-[34px] rounded-[8px] border-[#E6E6E3] bg-white pl-8 text-[13px]"
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

      <button
        type="button"
        onClick={onAdd}
        className="inline-flex h-[34px] w-full cursor-pointer items-center justify-center gap-1.5 rounded-[8px] bg-badge px-3.5 text-[13px] font-medium text-white sm:ml-auto sm:w-auto"
      >
        <Plus size={14} />
        Add Source
      </button>
    </div>
  );
}

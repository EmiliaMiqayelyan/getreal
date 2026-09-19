import { Plus } from "lucide-react";

import { ExportButton } from "@/components/shared/ExportButton";
import { Button } from "@/components/ui/Button";
import { SearchField } from "@/components/ui/SearchField";
import { Select } from "@/components/ui/Select";
import type { ExportHandler } from "@/types/export";

type SourceFiltersProps = {
  query: string;
  location: string;
  distributor: string;
  locationOptions: string[];
  distributorOptions: string[];
  recordCount?: number;
  onQueryChange: (value: string) => void;
  onLocationChange: (value: string) => void;
  onDistributorChange: (value: string) => void;
  onAdd: () => void;
  onExport?: ExportHandler;
};

export function SourceFilters({
  query,
  location,
  distributor,
  locationOptions,
  distributorOptions,
  recordCount,
  onQueryChange,
  onLocationChange,
  onDistributorChange,
  onAdd,
  onExport,
}: SourceFiltersProps) {
  const filtersActive = Boolean(query.trim() || location || distributor);

  return (
    <div className="flex w-full flex-wrap items-center gap-2 md:flex-nowrap">
      <SearchField
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        placeholder="Search"
        aria-label="Search"
      />

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

      <div className="flex w-full flex-wrap items-center gap-2 sm:ml-auto sm:w-auto sm:flex-nowrap">
        <ExportButton
          entityLabel="sources"
          recordCount={recordCount}
          filtersActive={filtersActive}
          onExport={onExport}
          className="w-full sm:w-auto"
        />
        <Button
          variant="primary"
          onClick={onAdd}
          className="w-full sm:w-auto"
        >
          <Plus size={14} />
          Add Source
        </Button>
      </div>
    </div>
  );
}

import { Plus } from "lucide-react";

import { ExportButton } from "@/components/shared/ExportButton";
import { Button } from "@/components/ui/Button";
import { SearchField } from "@/components/ui/SearchField";
import { Select } from "@/components/ui/Select";
import type { ExportHandler } from "@/types/export";
import { WEEK_DAYS } from "@/utils/format";

type DistributorFiltersProps = {
  query: string;
  location: string;
  weekday: string;
  locationOptions: string[];
  recordCount?: number;
  onQueryChange: (value: string) => void;
  onLocationChange: (value: string) => void;
  onWeekdayChange: (value: string) => void;
  onAdd: () => void;
  onExport?: ExportHandler;
};

export function DistributorFilters({
  query,
  location,
  weekday,
  locationOptions,
  recordCount,
  onQueryChange,
  onLocationChange,
  onWeekdayChange,
  onAdd,
  onExport,
}: DistributorFiltersProps) {
  const filtersActive = Boolean(query.trim() || location || weekday);

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
        value={weekday}
        onChange={onWeekdayChange}
        className="w-full sm:w-[150px]"
        aria-label="Weekday"
        placeholder="Weekday"
        options={[
          { value: "", label: "Weekday" },
          ...WEEK_DAYS.map((day) => ({ value: day, label: day })),
        ]}
      />

      <div className="flex w-full flex-wrap items-center gap-2 sm:ml-auto sm:w-auto sm:flex-nowrap">
        <ExportButton
          entityLabel="distributors"
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
          Add Distributor
        </Button>
      </div>
    </div>
  );
}

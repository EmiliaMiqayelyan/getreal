import { Plus, Search } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { SEARCH_ICON, SEARCH_INPUT } from "@/constants/table";
import { WEEK_DAYS } from "@/utils/format";

type DistributorFiltersProps = {
  query: string;
  location: string;
  weekday: string;
  locationOptions: string[];
  onQueryChange: (value: string) => void;
  onLocationChange: (value: string) => void;
  onWeekdayChange: (value: string) => void;
  onAdd: () => void;
};

export function DistributorFilters({
  query,
  location,
  weekday,
  locationOptions,
  onQueryChange,
  onLocationChange,
  onWeekdayChange,
  onAdd,
}: DistributorFiltersProps) {
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

      <Button
        variant="primary"
        onClick={onAdd}
        className="w-full sm:ml-auto sm:w-auto"
      >
        <Plus size={14} />
        Add Distributor
      </Button>
    </div>
  );
}

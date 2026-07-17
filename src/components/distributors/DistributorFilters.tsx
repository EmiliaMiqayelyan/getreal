import { PlusIcon } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";

type DistributorFiltersProps = {
  query: string;
  category: string;
  location: string;
  categoryOptions: string[];
  locationOptions: string[];
  onQueryChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onLocationChange: (value: string) => void;
  onAdd?: () => void;
};

export function DistributorFilters({
  query,
  category,
  location,
  categoryOptions,
  locationOptions,
  onQueryChange,
  onCategoryChange,
  onLocationChange,
  onAdd,
}: DistributorFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Input
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        placeholder="Supplier name"
        className="max-w-[220px]"
        aria-label="Search suppliers"
      />
      <Select
        value={category}
        onChange={onCategoryChange}
        className="w-[130px]"
        aria-label="Filter by category"
        options={[
          { value: "", label: " " },
          ...categoryOptions.map((option) => ({
            value: option,
            label: option,
          })),
        ]}
      />
      <Select
        value={location}
        onChange={onLocationChange}
        className="w-[130px]"
        aria-label="Filter by location"
        options={[
          { value: "", label: " " },
          ...locationOptions.map((option) => ({
            value: option,
            label: option,
          })),
        ]}
      />

      <div className="ml-auto">
        <Button onClick={onAdd}>
          <PlusIcon className="size-4" />
          Add Distributor
        </Button>
      </div>
    </div>
  );
}

import { useMemo, useState } from "react";

import { AddDistributorModal } from "@/components/distributors/AddDistributorModal";
import { DistributorFilters } from "@/components/distributors/DistributorFilters";
import { DistributorTable } from "@/components/distributors/DistributorTable";
import { Header } from "@/components/layout/AdminHeader";
import type { Distributor } from "@/types/distributor";
import {
  filterDistributors,
  uniqueDistributorLocations,
} from "@/utils/distributors";

type DistributorsViewProps = {
  distributors: Distributor[];
};

export function DistributorsView({ distributors }: DistributorsViewProps) {
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [weekday, setWeekday] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);

  const locationOptions = useMemo(
    () => uniqueDistributorLocations(distributors),
    [distributors],
  );

  const filtered = useMemo(
    () => filterDistributors(distributors, { query, location, weekday }),
    [distributors, location, query, weekday],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#FAFAFA]">
      <Header
        title="Distributors"
        toolbar={
          <DistributorFilters
            query={query}
            location={location}
            weekday={weekday}
            locationOptions={locationOptions}
            onQueryChange={setQuery}
            onLocationChange={setLocation}
            onWeekdayChange={setWeekday}
            onAdd={() => setIsAddOpen(true)}
          />
        }
      />

      <div className="flex-1 overflow-auto bg-[#FAFAFA] px-8 py-6">
        <DistributorTable distributors={filtered} />
      </div>

      <AddDistributorModal
        open={isAddOpen}
        onClose={() => setIsAddOpen(false)}
      />
    </div>
  );
}

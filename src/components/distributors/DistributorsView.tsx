"use client";

import { useMemo, useState } from "react";

import { AddDistributorModal } from "@/components/distributors/AddDistributorModal";
import { DistributorFilters } from "@/components/distributors/DistributorFilters";
import { DistributorTable } from "@/components/distributors/DistributorTable";
import { Header } from "@/components/layout/AdminHeader";
import type { Distributor } from "@/types/distributor";

type DistributorsViewProps = {
  distributors: Distributor[];
};

export function DistributorsView({ distributors }: DistributorsViewProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);

  const categoryOptions = useMemo(
    () => [...new Set(distributors.flatMap((item) => item.categories))].sort(),
    [distributors],
  );

  const locationOptions = useMemo(
    () => [...new Set(distributors.map((item) => item.location))].sort(),
    [distributors],
  );

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    return distributors.filter((distributor) => {
      const matchesQuery =
        !normalized ||
        distributor.name.toLowerCase().includes(normalized) ||
        distributor.contact.toLowerCase().includes(normalized);

      const matchesCategory =
        !category || distributor.categories.includes(category);

      const matchesLocation = !location || distributor.location === location;

      return matchesQuery && matchesCategory && matchesLocation;
    });
  }, [distributors, query, category, location]);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
      <Header
        title="Distributors"
        toolbar={
          <DistributorFilters
            query={query}
            category={category}
            location={location}
            categoryOptions={categoryOptions}
            locationOptions={locationOptions}
            onQueryChange={setQuery}
            onCategoryChange={setCategory}
            onLocationChange={setLocation}
            onAdd={() => setIsAddOpen(true)}
          />
        }
      />

      <div className="flex-1 overflow-auto px-8 py-6">
        <DistributorTable distributors={filtered} />
      </div>

      <AddDistributorModal
        open={isAddOpen}
        onClose={() => setIsAddOpen(false)}
      />
    </div>
  );
}

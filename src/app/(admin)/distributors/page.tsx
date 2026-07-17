import type { Metadata } from "next";

import { DistributorsView } from "@/components/distributors/DistributorsView";
import { DISTRIBUTORS } from "@/constants/distributors";

export const metadata: Metadata = {
  title: "Distributors",
};

export default function DistributorsPage() {
  return <DistributorsView distributors={DISTRIBUTORS} />;
}

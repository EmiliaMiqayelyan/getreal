import { DistributorsView } from "@/components/distributors/DistributorsView";
import { DISTRIBUTORS } from "@/constants/distributors";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

export default function DistributorsPage() {
  useDocumentTitle("Distributors");
  return <DistributorsView distributors={DISTRIBUTORS} />;
}

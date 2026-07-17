export type DistributorProduct = {
  id: string;
  name: string;
  source: string;
  price: number;
  unit: string;
  category: string;
  lastUpdate: string;
  updatedByAvatar?: boolean;
};

export type Distributor = {
  id: string;
  name: string;
  paymentTerms: string;
  contact: string;
  phone: string;
  categories: string[];
  location: string;
  delivery: string;
  items: number;
  docs: string | null;
  products: DistributorProduct[];
};

export type DistributorProduct = {
  id: string;
  name: string;
  product: string;
  source: string;
  price: number;
  qty: number;
  unit: string;
  category: string;
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

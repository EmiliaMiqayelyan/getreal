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

export type DistributorContact = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  title: string;
  primary: boolean;
};

export type DistributorDocument = {
  id: string;
  name: string;
  size: string;
  /** Object/data URL when file bytes are available; omitted for mock metadata-only docs. */
  url?: string;
};

export type DistributorDeliverySlot = {
  day: string;
  time: string;
};

export type Distributor = {
  id: string;
  name: string;
  paymentTerms: string;
  contact: string;
  phone: string;
  location: string;
  fullAddress: string;
  delivery: string;
  deliveryDays: DistributorDeliverySlot[];
  documents: DistributorDocument[];
  notes: string;
  contacts: DistributorContact[];
  categories: string[];
  items: number;
  docs: string | null;
  products: DistributorProduct[];
};

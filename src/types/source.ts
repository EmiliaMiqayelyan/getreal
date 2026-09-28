export type Source = {
  id: string;
  /** Backend record UUID when known. API paths use the business code in `id`. */
  recordId?: string;
  name: string;
  location: string;
  fullAddress: string;
  street?: string;
  apt?: string;
  city?: string;
  state?: string;
  zip?: string;
  distributor: string;
  distributorId?: string;
  description: string;
  logoUrl: string | null;
  logoName?: string;
};

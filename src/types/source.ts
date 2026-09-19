export type Source = {
  id: string;
  /** Backend record UUID when known; used for API paths and FK payloads. */
  recordId?: string;
  name: string;
  location: string;
  fullAddress: string;
  distributor: string;
  distributorId?: string;
  description: string;
  logoUrl: string | null;
  logoName?: string;
};

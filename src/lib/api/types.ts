/** Generic API envelope from GetReal backend */
export type ApiEnvelope<T> = {
  status?: string;
  message?: string;
  data?: T;
  errors?: Array<{ field?: string; message?: string }>;
};

export type ApiProduct = {
  id?: string;
  productId?: string;
  itemId?: string;
  merchandisingName?: string;
  description?: string | null;
  marginSugPrice?: number;
  sellingPrice?: number;
  finalMargin?: string | null;
  isLive?: boolean;
  position?: number;
  /** Legacy fields from older collection */
  name?: string;
  categoryNames?: string[];
  type?: string;
  price?: number;
  createdAt?: string;
  updatedAt?: string;
};

export type ApiCategory = {
  id?: string;
  name?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type ApiSubcategory = {
  id?: string;
  name?: string;
  categoryId?: string;
  category?: string | { id?: string; name?: string };
  createdAt?: string;
  updatedAt?: string;
};

/** UI/catalog representation of a subcategory (name keyed by category). */
export type CatalogSubcategory = {
  id?: string;
  name: string;
  category: string;
  categoryId?: string;
};

export type ApiItem = {
  id?: string;
  itemCode?: string;
  name?: string;
  categoryId?: string;
  subcategoryId?: string | null;
  distributorId?: string;
  sourceId?: string | null;
  /** Integer cents. Backend derives costPerUnit = buyingPrice / contents. */
  buyingPrice?: number;
  contents?: number;
  /** Backend-computed cost per unit/piece in cents. */
  costPerUnit?: number;
  /** Free-form unit label, e.g. Unit / Case. */
  buyingUnit?: string | null;
  singleItemUnit?: string | null;
  /** Array of uploaded image URLs (strings, not objects). */
  photos?: string[] | null;
  merchandisingName?: string;
  description?: string | null;
  category?: string;
  subcategory?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type ApiDistributorContact = {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  title?: string;
};

/** Backend shape: `{ "Mon": "08:00", "Wed": "09:30" }` */
export type ApiDeliverySchedule = Record<string, string>;

export type ApiDistributorDocument = {
  id?: string;
  name?: string;
  url?: string;
  size?: string;
};

export type ApiDistributor = {
  id?: string;
  distributorCode?: string;
  name?: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  paymentTerms?: string | null;
  deliverySchedule?: ApiDeliverySchedule | null;
  contacts?: ApiDistributorContact[] | null;
  documents?: ApiDistributorDocument[] | null;
  notes?: string | null;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type ApiSource = {
  id?: string;
  sourceCode?: string;
  name?: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  logoUrl?: string | null;
  description?: string | null;
  distributorId?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type ApiInventory = {
  id?: string;
  itemId?: string;
  quantity?: number;
  location?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type ApiOrderItem = {
  productId?: string;
  quantity?: number;
  frequency?: string;
};

export type ApiOrder = {
  id?: string;
  type?: string;
  status?: string;
  distributorId?: string;
  customerId?: string;
  communicationChannel?: string;
  deliveryDate?: string;
  items?: ApiOrderItem[];
  createdAt?: string;
  updatedAt?: string;
};

export type ApiDashboardStats = Record<string, unknown>;

export type ApiChartPoint = {
  name?: string;
  label?: string;
  value?: number;
  total?: number;
};

export type ApiUser = {
  id?: string;
  email?: string;
  name?: string;
  role?: string;
  roleId?: string;
  status?: string;
  phone?: string;
  phoneNumber?: string;
  isBlocked?: boolean;
  firstName?: string;
  lastName?: string;
  address?: string | null;
  aptUnit?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  heardFrom?: string | null;
};

export type ApiRole = {
  id?: string;
  name?: string;
  description?: string;
  permissions?: string[];
};

export type LoginResponse = {
  token: string;
  user?: ApiUser;
};

/** Normalized list page from any paginated API endpoint. */
export type PaginatedResult<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
};

export type PaginatedUsers = {
  users?: ApiUser[];
  items?: ApiUser[];
  data?: ApiUser[];
  total?: number;
  page?: number;
  limit?: number;
};

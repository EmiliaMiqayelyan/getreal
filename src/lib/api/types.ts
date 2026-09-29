/** Generic API envelope from GetReal backend */
export type ApiEnvelope<T> = {
  status?: string;
  message?: string;
  data?: T;
  errors?: Array<{ field?: string; message?: string }>;
};

export type ApiProduct = {
  id?: string;
  /** Business code, e.g. PR-A724549F. This is the public product id. */
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
  categoryCode?: string;
  name?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type ApiSubcategory = {
  id?: string;
  subcategoryCode?: string;
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
  inventoryCode?: string;
  itemId?: string;
  /** Filled from a nested `item` when the list does not send a flat name. */
  itemName?: string | null;
  category?: string | null;
  subcategory?: string | null;
  quantity?: number;
  location?: string | null;
  /** Full address shown on the location hover. */
  address?: string | null;
  distributorOrderId?: string | null;
  /** Public order code for the Order ID column. Null when the lot has no order. */
  orderCode?: string | null;
  distributorName?: string | null;
  sourceName?: string | null;
  deliveryDate?: string | null;
  /** Purchase price, as returned by the inventory list. */
  purchased?: string | number | null;
  unit?: string | null;
  expirationDate?: string | null;
  status?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type ApiOrderItem = {
  productId?: string;
  name?: string;
  itemName?: string;
  quantity?: number;
  /** Unit price in integer cents. */
  price?: number;
  unit?: string;
  frequency?: string;
};

export type ApiOrder = {
  id?: string;
  orderCode?: string;
  code?: string;
  type?: string;
  status?: string;
  distributorId?: string;
  customerId?: string;
  /** Customer record included on the order. The API names this relation `users`. */
  users?: ApiUser | ApiUser[] | null;
  communicationChannel?: string;
  deliveryDate?: string;
  items?: ApiOrderItem[];
  /** Order total in integer cents. */
  totalPrice?: number;
  paymentStatus?: string;
  packerId?: string | null;
  coolerId?: string | null;
  packingStartedAt?: string | null;
  coolerReadyAt?: string | null;
  loadedAt?: string | null;
  receivedAt?: string | null;
  validatedAt?: string | null;
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
  userCode?: string;
  roleCode?: string;
  distributorCode?: string;
  /** Public customer id shown in the Customers ID column. */
  customerCode?: string;
  distributor?:
    { distributorCode?: string; id?: string; name?: string } | string;
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
  isSubscribed?: boolean;
  /** Order count from the customers list. */
  orderCount?: number | null;
  /** Lifetime spend in cents. */
  totalAmount?: number | null;
  lastOrderDate?: string | null;
  /** Next or latest delivery timestamp. The table shows its weekday. */
  deliveryDate?: string | null;
};

export type ApiRoleUser = {
  id?: string;
  userId?: string;
  userCode?: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
};

/** One roles-list row: a role plus the user assigned to it. */
export type ApiRole = {
  id?: string;
  roleId?: string;
  roleCode?: string;
  name?: string;
  roleName?: string;
  description?: string;
  permissions?: string[];
  user?: ApiRoleUser | null;
};

export type ApiNotificationRule = {
  id?: string;
  notificationRuleCode?: string;
  ruleCode?: string;
  code?: string;
  /** Event path that fires the rule, e.g. `/api/v1/orders`. */
  action?: string;
  actionEndpoint?: string;
  /** HTTP method that fires the rule. */
  httpMethod?: string;
  triggerMethod?: string;
  title?: string;
  subtext?: string;
  scheduleDelay?: number | string;
  scheduleUnit?: string;
  createdAt?: string;
  updatedAt?: string;
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

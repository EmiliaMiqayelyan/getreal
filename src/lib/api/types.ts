/** Generic API envelope from GetReal backend */
export type ApiEnvelope<T> = {
  status?: string;
  message?: string;
  data?: T;
};

export type ApiProduct = {
  id?: string;
  name?: string;
  categoryNames?: string[];
  type?: string;
  price?: number;
  description?: string;
};

export type ApiCategory = {
  id?: string;
  name?: string;
};

export type ApiOrder = {
  id?: string;
  type?: string;
  status?: string;
  distributorId?: string;
  items?: Array<{ productId?: string; quantity?: number }>;
  createdAt?: string;
  deliveryDate?: string;
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
  status?: string;
  phone?: string;
  isBlocked?: boolean;
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

export type PaginatedUsers = {
  users?: ApiUser[];
  items?: ApiUser[];
  data?: ApiUser[];
  total?: number;
  page?: number;
  limit?: number;
};

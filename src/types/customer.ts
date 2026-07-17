export type CustomerStatus = "active" | "inactive";

export type CustomerOrder = {
  id: string;
  date: string;
  items: number;
  total: number;
  status: "Delivered" | "Processing" | "Cancelled";
};

export type Customer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  orders: number;
  total: number;
  lastOrder: string;
  hasNote: boolean;
  status: CustomerStatus;
  orderHistory: CustomerOrder[];
};

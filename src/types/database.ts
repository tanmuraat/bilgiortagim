export type Profile = {
  id: string;
  full_name: string;
  company_name: string;
  tax_number: string;
  phone: string;
  email: string;
  tax_document_url: string | null;
  status: "pending" | "active" | "suspended";
  role: "user" | "admin";
  subscription_plan: "none" | "pro" | "premium";
};

export type Vehicle = {
  id: string;
  user_id: string;
  plate: string;
  brand: string;
  model: string;
  year: number;
  status: "available" | "rented" | "maintenance" | "inactive";
  created_at: string;
};

export type Rental = {
  id: string;
  user_id: string;
  vehicle_id: string;
  customer_name: string;
  start_date: string;
  end_date: string;
  status: "active" | "completed" | "cancelled";
  total_amount: number;
  created_at: string;
};

export type Transaction = {
  id: string;
  user_id: string;
  rental_id: string | null;
  vehicle_id: string | null;
  type: "income" | "expense";
  category: string;
  amount: number;
  description: string;
  created_at: string;
};

export type Notification = {
  id: string;
  user_id: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
};

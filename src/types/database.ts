// NOT: Bu dosya şu an hiçbir aktif sayfa tarafından import edilmiyor
// (sayfalar Supabase sorgularını `any` ile çalıştırıyor). Gelecekte tip
// güvenliği eklenmek istenirse referans olması için güncel tutulmuştur.
// 005_unified_schema_fix.sql migration'ı ile eklenen alanlar burada da
// yansıtılmıştır.

export type Profile = {
  id: string;
  full_name: string;
  company_name: string;
  tax_number: string;
  tax_office: string | null;
  city: string | null;
  district: string | null;
  website: string | null;
  fleet_size: string | null;
  phone: string;
  email: string;
  tc_number_encrypted: string | null;
  birth_date: string | null;
  tax_document_url: string | null;
  tax_document_path: string | null;
  status: "pending" | "approved" | "rejected" | "blocked";
  role: "user" | "admin";
  subscription_plan: "none" | "pro" | "premium";
  subscription_start: string | null;
  subscription_end: string | null;
  auto_renew: boolean;
  auto_renew_plan: string | null;
  sub_warning_sent: boolean;
  rejection_reason: string | null;
  is_sub_user: boolean;
  parent_user_id: string | null;
  permissions: string[];
  kvkk_accepted: boolean;
  contract_accepted: boolean;
  kvkk_accepted_at: string | null;
  contract_accepted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Vehicle = {
  id: string;
  user_id: string;
  plate: string;
  brand: string;
  model: string;
  year: number;
  color: string | null;
  fuel_type: string | null;
  transmission: string | null;
  status: "available" | "rented" | "maintenance" | "inactive";
  current_km: number;
  insurance_expiry: string | null;
  inspection_expiry: string | null;
  notes: string | null;
  created_at: string;
};

export type Rental = {
  id: string;
  user_id: string;
  vehicle_id: string;
  customer_name: string;
  customer_tc_hash: string | null;
  customer_phone_encrypted: string | null;
  start_date: string;
  end_date: string;
  pickup_km: number | null;
  return_km: number | null;
  daily_price: number;
  total_price: number;
  deposit: number;
  payment_status: "pending" | "partial" | "paid";
  payment_method: string | null;
  paid_amount: number;
  contract_url: string | null;
  notes: string | null;
  status: "active" | "completed" | "cancelled";
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
  transaction_date: string;
  receipt_url: string | null;
  status: "completed" | "cancelled";
  created_at: string;
};

export type Notification = {
  id: string;
  user_id: string | null;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  is_read: boolean;
  created_by: string | null;
  source_type: string | null;
  source_id: string | null;
  created_at: string;
};

export type SubUser = {
  id: string;
  parent_user_id: string;
  auth_user_id: string | null;
  full_name: string;
  email: string;
  phone: string | null;
  role: "staff" | "manager";
  permissions: string[];
  status: "active" | "inactive";
  created_at: string;
  updated_at: string;
};

export type Subscription = {
  id: string;
  user_id: string;
  plan: "pro" | "premium";
  months: number;
  price: number;
  payment_method: "online" | "manual";
  payment_status: "pending" | "completed" | "failed" | "refunded";
  starts_at: string;
  ends_at: string;
  created_at: string;
};

export type SystemSetting = {
  id: string;
  key: string;
  value: Record<string, unknown>;
  description: string | null;
  updated_at: string;
  updated_by: string | null;
};

export type LandingContent = {
  id: string;
  section: string;
  key: string;
  value: Record<string, unknown>;
  display_order: number;
  updated_at: string;
};

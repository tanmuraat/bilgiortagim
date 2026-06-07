export type CustomerRecordItem = {
  id: string;
  record_type: "rental" | "negative" | "payment" | "damage";
  title: string;
  description: string | null;
  category_label: string | null;
  company_name: string;
  vehicle_plate: string | null;
  amount: number;
  payment_status: "paid" | "unpaid" | "collected" | null;
  occurred_at: string;
};

export type CustomerSearchResult = {
  id: string;
  full_name: string;
  risk_status: "safe" | "risky";
  tc_masked: string;
  birth_date: string | null;
  phone_masked: string;
  email: string | null;
  address: string | null;
  total_records: number;
  negative_records: number;
  total_debt: number;
  last_rental_at: string | null;
  last_company_name: string | null;
  queried_at: string;
  items: CustomerRecordItem[];
};

export type MusteriSorguResponse =
  | { success: true; data: CustomerSearchResult }
  | { success: false; error: string };

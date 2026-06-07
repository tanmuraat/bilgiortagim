export type VehicleStatus = "available" | "rented" | "maintenance" | "inactive";

export type FuelType = "benzin" | "dizel" | "lpg" | "elektrik" | "hibrit";

export type Transmission = "manuel" | "otomatik";

export type Vehicle = {
  id: string;
  user_id: string;
  plate: string;
  brand: string;
  model: string;
  year: number;
  color: string | null;
  fuel_type: FuelType | null;
  transmission: Transmission | null;
  status: VehicleStatus;
  current_km: number;
  insurance_expiry: string | null;
  inspection_expiry: string | null;
  notes: string | null;
  created_at: string;
};

export type VehicleKmLog = {
  id: string;
  vehicle_id: string;
  previous_km: number;
  new_km: number;
  difference_km: number;
  note: string | null;
  logged_at: string;
};

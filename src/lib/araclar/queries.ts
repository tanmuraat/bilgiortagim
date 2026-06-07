import { format, startOfMonth, subMonths } from "date-fns";
import { tr } from "date-fns/locale";

import { createClient } from "@/lib/supabase/server";
import type { Vehicle, VehicleKmLog } from "@/types/vehicle";

export type VehicleStats = {
  total: number;
  rented: number;
  available: number;
  maintenance: number;
};

export type KmChartPoint = {
  month: string;
  km: number;
};

export async function getVehicles(userId: string): Promise<Vehicle[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("vehicles")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return (data ?? []) as Vehicle[];
}

export async function getVehicleStats(userId: string): Promise<VehicleStats> {
  const vehicles = await getVehicles(userId);
  return {
    total: vehicles.length,
    rented: vehicles.filter((v) => v.status === "rented").length,
    available: vehicles.filter((v) => v.status === "available").length,
    maintenance: vehicles.filter((v) => v.status === "maintenance").length,
  };
}

export async function getKmChartData(
  userId: string,
  vehicleId?: string | null
): Promise<KmChartPoint[]> {
  const supabase = await createClient();
  const months = Array.from({ length: 6 }, (_, i) =>
    startOfMonth(subMonths(new Date(), 5 - i))
  );

  let query = supabase
    .from("vehicle_km_logs")
    .select("difference_km, logged_at, vehicle_id")
    .eq("user_id", userId);

  if (vehicleId) {
    query = query.eq("vehicle_id", vehicleId);
  }

  const { data: logs } = await query;
  const rows = (logs ?? []) as Pick<
    VehicleKmLog,
    "difference_km" | "logged_at"
  >[];

  return months.map((monthStart) => {
    const key = format(monthStart, "yyyy-MM");
    const label = format(monthStart, "MMM", { locale: tr });
    const km = rows
      .filter((r) => format(new Date(r.logged_at), "yyyy-MM") === key)
      .reduce((s, r) => s + r.difference_km, 0);
    return { month: label, km };
  });
}

export async function getVehicleCount(userId: string) {
  const supabase = await createClient();
  const { count } = await supabase
    .from("vehicles")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);
  return count ?? 0;
}

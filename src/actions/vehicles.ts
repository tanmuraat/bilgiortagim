"use server";

import { revalidatePath } from "next/cache";

import { PLAN_LIMITS, type SubscriptionPlan } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import type { FuelType, Transmission, VehicleStatus } from "@/types/vehicle";

export type VehicleActionState = {
  error?: string;
  success?: boolean;
};

async function getAuthContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Oturum açmanız gerekiyor." as const };

  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_plan")
    .eq("id", user.id)
    .single();

  return {
    supabase,
    user,
    plan: (profile?.subscription_plan ?? "none") as SubscriptionPlan,
  };
}

export async function createVehicleAction(
  _prev: VehicleActionState,
  formData: FormData
): Promise<VehicleActionState> {
  const ctx = await getAuthContext();
  if ("error" in ctx) return { error: ctx.error };

  const { supabase, user, plan } = ctx;
  const limit = PLAN_LIMITS[plan].vehicles;

  if (Number.isFinite(limit)) {
    const { count } = await supabase
      .from("vehicles")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    if ((count ?? 0) >= limit) {
      return {
        error: `Pro planda en fazla ${limit} araç ekleyebilirsiniz. Premium'a geçin.`,
      };
    }
  }

  const plate = String(formData.get("plate") ?? "").trim().toUpperCase();
  const brand = String(formData.get("brand") ?? "").trim();
  const model = String(formData.get("model") ?? "").trim();
  const year = parseInt(String(formData.get("year") ?? ""), 10);
  const color = String(formData.get("color") ?? "").trim() || null;
  const fuel_type = String(formData.get("fuel_type") ?? "") as FuelType;
  const transmission = String(formData.get("transmission") ?? "") as Transmission;
  const current_km = parseInt(String(formData.get("current_km") ?? "0"), 10) || 0;
  const insurance_expiry =
    String(formData.get("insurance_expiry") ?? "") || null;
  const inspection_expiry =
    String(formData.get("inspection_expiry") ?? "") || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!plate || !brand || !model || !year) {
    return { error: "Plaka, marka, model ve yıl zorunludur." };
  }

  const { data: created, error } = await supabase
    .from("vehicles")
    .insert({
      user_id: user.id,
      plate,
      brand,
      model,
      year,
      color,
      fuel_type: fuel_type || null,
      transmission: transmission || null,
      status: "available" as VehicleStatus,
      current_km,
      insurance_expiry: insurance_expiry || null,
      inspection_expiry: inspection_expiry || null,
      notes,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  if (current_km > 0 && created?.id) {
    await supabase.from("vehicle_km_logs").insert({
      vehicle_id: created.id,
      user_id: user.id,
      previous_km: 0,
      new_km: current_km,
      difference_km: current_km,
      note: "İlk KM kaydı",
    });
  }

  revalidatePath("/araclarim");
  return { success: true };
}

export async function updateVehicleAction(
  _prev: VehicleActionState,
  formData: FormData
): Promise<VehicleActionState> {
  const ctx = await getAuthContext();
  if ("error" in ctx) return { error: ctx.error };

  const id = String(formData.get("id") ?? "");
  const { supabase, user } = ctx;

  const { error } = await supabase
    .from("vehicles")
    .update({
      plate: String(formData.get("plate") ?? "").trim().toUpperCase(),
      brand: String(formData.get("brand") ?? "").trim(),
      model: String(formData.get("model") ?? "").trim(),
      year: parseInt(String(formData.get("year") ?? ""), 10),
      color: String(formData.get("color") ?? "").trim() || null,
      fuel_type: String(formData.get("fuel_type") ?? "") || null,
      transmission: String(formData.get("transmission") ?? "") || null,
      status: String(formData.get("status") ?? "available") as VehicleStatus,
      insurance_expiry: String(formData.get("insurance_expiry") ?? "") || null,
      inspection_expiry: String(formData.get("inspection_expiry") ?? "") || null,
      notes: String(formData.get("notes") ?? "").trim() || null,
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/araclarim");
  return { success: true };
}

export async function deleteVehicleAction(
  vehicleId: string
): Promise<VehicleActionState> {
  const ctx = await getAuthContext();
  if ("error" in ctx) return { error: ctx.error };

  const { error } = await ctx.supabase
    .from("vehicles")
    .delete()
    .eq("id", vehicleId)
    .eq("user_id", ctx.user.id);

  if (error) return { error: error.message };
  revalidatePath("/araclarim");
  return { success: true };
}

export async function updateKmAction(
  _prev: VehicleActionState,
  formData: FormData
): Promise<VehicleActionState> {
  const ctx = await getAuthContext();
  if ("error" in ctx) return { error: ctx.error };

  const vehicleId = String(formData.get("vehicle_id") ?? "");
  const newKm = parseInt(String(formData.get("new_km") ?? ""), 10);
  const note = String(formData.get("note") ?? "").trim() || null;

  if (!vehicleId || Number.isNaN(newKm) || newKm < 0) {
    return { error: "Geçerli bir KM değeri girin." };
  }

  const { supabase, user } = ctx;

  const { data: vehicle } = await supabase
    .from("vehicles")
    .select("current_km")
    .eq("id", vehicleId)
    .eq("user_id", user.id)
    .single();

  if (!vehicle) return { error: "Araç bulunamadı." };

  const previousKm = vehicle.current_km ?? 0;
  if (newKm < previousKm) {
    return { error: "Yeni KM, mevcut KM'den küçük olamaz." };
  }

  const difference = newKm - previousKm;

  const { error: logError } = await supabase.from("vehicle_km_logs").insert({
    vehicle_id: vehicleId,
    user_id: user.id,
    previous_km: previousKm,
    new_km: newKm,
    difference_km: difference,
    note,
  });

  if (logError) return { error: logError.message };

  const { error } = await supabase
    .from("vehicles")
    .update({ current_km: newKm })
    .eq("id", vehicleId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/araclarim");
  return { success: true };
}

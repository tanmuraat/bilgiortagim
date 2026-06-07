"use client";

import { differenceInCalendarDays, format, parseISO } from "date-fns";
import { tr } from "date-fns/locale";
import { Gauge, Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";

import {
  createVehicleAction,
  deleteVehicleAction,
  updateKmAction,
  updateVehicleAction,
  type VehicleActionState,
} from "@/actions/vehicles";
import { KmChart } from "@/components/araclar/km-chart";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { KmChartPoint, VehicleStats } from "@/lib/araclar/queries";
import { PLAN_LIMITS, type SubscriptionPlan } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { Vehicle, VehicleStatus } from "@/types/vehicle";

const initial: VehicleActionState = {};

const STATUS_LABEL: Record<
  VehicleStatus,
  { label: string; className: string }
> = {
  available: { label: "Müsait", className: "bg-emerald-500/15 text-emerald-400" },
  rented: { label: "Kirada", className: "bg-blue-500/15 text-blue-400" },
  maintenance: { label: "Bakımda", className: "bg-amber-500/15 text-amber-400" },
  inactive: { label: "Pasif", className: "bg-[#2A2A2A] text-[#737373]" },
};

function expiryColor(dateStr: string | null): string {
  if (!dateStr) return "text-[#737373]";
  const days = differenceInCalendarDays(parseISO(dateStr), new Date());
  if (days < 0) return "text-[#E02424] font-medium";
  if (days <= 30) return "text-amber-400 font-medium";
  return "text-[#737373]";
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "—";
  return format(parseISO(dateStr), "d MMM yyyy", { locale: tr });
}

type Props = {
  vehicles: Vehicle[];
  stats: VehicleStats;
  chartData: KmChartPoint[];
  plan: SubscriptionPlan;
  selectedVehicleId: string | null;
  atVehicleLimit: boolean;
};

export function AraclarimView({
  vehicles,
  stats,
  chartData,
  plan,
  selectedVehicleId,
  atVehicleLimit,
}: Props) {
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);
  const [editVehicle, setEditVehicle] = useState<Vehicle | null>(null);
  const [kmVehicle, setKmVehicle] = useState<Vehicle | null>(null);

  const [createState, createAction, createPending] = useActionState(
    createVehicleAction,
    initial
  );
  const [updateState, updateAction, updatePending] = useActionState(
    updateVehicleAction,
    initial
  );
  const [kmState, kmAction, kmPending] = useActionState(updateKmAction, initial);

  useEffect(() => {
    if (createState.success) {
      setAddOpen(false);
      router.refresh();
    }
  }, [createState.success, router]);

  useEffect(() => {
    if (updateState.success) {
      setEditVehicle(null);
      router.refresh();
    }
  }, [updateState.success, router]);

  useEffect(() => {
    if (kmState.success) {
      setKmVehicle(null);
      router.refresh();
    }
  }, [kmState.success, router]);

  const limit = PLAN_LIMITS[plan].vehicles;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-[#F5F5F5]">Araçlarım</h2>
          <p className="mt-1 text-sm text-[#737373]">
            Filonuzu yönetin, KM ve belge takibini yapın.
          </p>
        </div>
        <Button
          type="button"
          className="bg-[#E02424] hover:bg-[#c41f1f]"
          onClick={() => setAddOpen(true)}
          disabled={atVehicleLimit}
        >
          <Plus className="mr-2 size-4" />
          Araç Ekle
        </Button>
      </div>

      {atVehicleLimit ? (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          Pro planda en fazla {limit} araç ekleyebilirsiniz.{" "}
          <a href="/ayarlar" className="font-medium text-[#E02424] underline">
            Premium&apos;a geç
          </a>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Toplam Araç" value={stats.total} />
        <StatCard label="Kirada" value={stats.rented} accent="text-blue-400" />
        <StatCard label="Boşta" value={stats.available} accent="text-emerald-400" />
        <StatCard label="Bakımda" value={stats.maintenance} accent="text-amber-400" />
      </div>

      <div className="overflow-x-auto rounded-xl border border-[#2A2A2A] bg-[#141414]">
        <table className="w-full min-w-[1000px] text-sm">
          <thead>
            <tr className="border-b border-[#2A2A2A] text-left text-xs text-[#737373]">
              {[
                "Plaka",
                "Marka",
                "Model",
                "Yıl",
                "Renk",
                "Yakıt",
                "Vites",
                "Durum",
                "Güncel KM",
                "Sigorta Bitiş",
                "Muayene Bitiş",
                "Aksiyonlar",
              ].map((h) => (
                <th key={h} className="px-3 py-3 font-medium first:pl-5 last:pr-5">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {vehicles.length === 0 ? (
              <tr>
                <td colSpan={12} className="px-5 py-12 text-center text-[#737373]">
                  Henüz araç eklenmedi.
                </td>
              </tr>
            ) : (
              vehicles.map((v) => {
                const st = STATUS_LABEL[v.status] ?? STATUS_LABEL.available;
                return (
                  <tr key={v.id} className="border-b border-[#2A2A2A]/60">
                    <td className="px-5 py-3 font-medium text-[#F5F5F5]">{v.plate}</td>
                    <td className="px-3 py-3 text-[#a3a3a3]">{v.brand}</td>
                    <td className="px-3 py-3 text-[#a3a3a3]">{v.model}</td>
                    <td className="px-3 py-3 text-[#a3a3a3]">{v.year}</td>
                    <td className="px-3 py-3 text-[#a3a3a3]">{v.color ?? "—"}</td>
                    <td className="px-3 py-3 text-[#a3a3a3]">{v.fuel_type ?? "—"}</td>
                    <td className="px-3 py-3 text-[#a3a3a3]">{v.transmission ?? "—"}</td>
                    <td className="px-3 py-3">
                      <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", st.className)}>
                        {st.label}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-[#F5F5F5]">
                      {v.current_km.toLocaleString("tr-TR")} km
                    </td>
                    <td className={cn("px-3 py-3", expiryColor(v.insurance_expiry))}>
                      {formatDate(v.insurance_expiry)}
                    </td>
                    <td className={cn("px-3 py-3", expiryColor(v.inspection_expiry))}>
                      {formatDate(v.inspection_expiry)}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex gap-1">
                        <button
                          type="button"
                          title="KM Güncelle"
                          className="rounded p-1.5 text-[#737373] hover:bg-[#2A2A2A] hover:text-[#F5F5F5]"
                          onClick={() => setKmVehicle(v)}
                        >
                          <Gauge className="size-4" />
                        </button>
                        <button
                          type="button"
                          title="Düzenle"
                          className="rounded p-1.5 text-[#737373] hover:bg-[#2A2A2A] hover:text-[#F5F5F5]"
                          onClick={() => setEditVehicle(v)}
                        >
                          <Pencil className="size-4" />
                        </button>
                        <button
                          type="button"
                          title="Sil"
                          className="rounded p-1.5 text-[#737373] hover:bg-[#E02424]/20 hover:text-[#E02424]"
                          onClick={async () => {
                            if (confirm(`${v.plate} plakalı aracı silmek istiyor musunuz?`)) {
                              await deleteVehicleAction(v.id);
                              router.refresh();
                            }
                          }}
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="rounded-xl border border-[#2A2A2A] bg-[#141414] p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-semibold text-[#F5F5F5]">KM Analiz</h3>
            <p className="text-xs text-[#737373]">Son 6 aylık aylık KM artışı</p>
          </div>
          <select
            className="h-10 rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] px-3 text-sm text-[#F5F5F5]"
            value={selectedVehicleId ?? ""}
            onChange={(e) => {
              const id = e.target.value;
              router.push(id ? `/araclarim?vehicleId=${id}` : "/araclarim");
            }}
          >
            <option value="">Tüm araçlar</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.plate} — {v.brand} {v.model}
              </option>
            ))}
          </select>
        </div>
        <KmChart data={chartData} />
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen} title="Araç Ekle">
        <form action={createAction} className="space-y-4">
          {createState.error ? (
            <p className="text-sm text-[#E02424]">{createState.error}</p>
          ) : null}
          <VehicleFormFields />
          <Button
            type="submit"
            disabled={createPending}
            className="w-full bg-[#E02424] hover:bg-[#c41f1f]"
          >
            {createPending ? "Kaydediliyor..." : "Kaydet"}
          </Button>
        </form>
      </Dialog>

      <Dialog
        open={Boolean(editVehicle)}
        onOpenChange={(o) => !o && setEditVehicle(null)}
        title="Aracı Düzenle"
      >
        {editVehicle ? (
          <form action={updateAction} className="space-y-4">
            <input type="hidden" name="id" value={editVehicle.id} />
            {updateState.error ? (
              <p className="text-sm text-[#E02424]">{updateState.error}</p>
            ) : null}
            <VehicleFormFields vehicle={editVehicle} includeStatus />
            <Button
              type="submit"
              disabled={updatePending}
              className="w-full bg-[#E02424] hover:bg-[#c41f1f]"
            >
              {updatePending ? "Güncelleniyor..." : "Güncelle"}
            </Button>
          </form>
        ) : null}
      </Dialog>

      <Dialog
        open={Boolean(kmVehicle)}
        onOpenChange={(o) => !o && setKmVehicle(null)}
        title="KM Güncelle"
        description={
          kmVehicle
            ? `${kmVehicle.plate} — Mevcut: ${kmVehicle.current_km.toLocaleString("tr-TR")} km`
            : undefined
        }
      >
        {kmVehicle ? (
          <form action={kmAction} className="space-y-4">
            <input type="hidden" name="vehicle_id" value={kmVehicle.id} />
            {kmState.error ? (
              <p className="text-sm text-[#E02424]">{kmState.error}</p>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="new_km">Yeni KM</Label>
              <Input
                id="new_km"
                name="new_km"
                type="number"
                min={kmVehicle.current_km}
                required
                placeholder={String(kmVehicle.current_km + 1000)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="note">Not</Label>
              <Input id="note" name="note" placeholder="Opsiyonel not" />
            </div>
            <Button
              type="submit"
              disabled={kmPending}
              className="w-full bg-[#E02424] hover:bg-[#c41f1f]"
            >
              {kmPending ? "Kaydediliyor..." : "KM Kaydet"}
            </Button>
          </form>
        ) : null}
      </Dialog>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: string;
}) {
  return (
    <div className="rounded-xl border border-[#2A2A2A] bg-[#141414] p-4">
      <p className="text-xs text-[#737373]">{label}</p>
      <p className={cn("mt-1 text-2xl font-bold text-[#F5F5F5]", accent)}>{value}</p>
    </div>
  );
}

function VehicleFormFields({
  vehicle,
  includeStatus,
}: {
  vehicle?: Vehicle;
  includeStatus?: boolean;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <Label>Plaka</Label>
        <Input name="plate" defaultValue={vehicle?.plate} required />
      </div>
      <div className="space-y-2">
        <Label>Marka</Label>
        <Input name="brand" defaultValue={vehicle?.brand} required />
      </div>
      <div className="space-y-2">
        <Label>Model</Label>
        <Input name="model" defaultValue={vehicle?.model} required />
      </div>
      <div className="space-y-2">
        <Label>Yıl</Label>
        <Input
          name="year"
          type="number"
          min={1990}
          max={2030}
          defaultValue={vehicle?.year}
          required
        />
      </div>
      <div className="space-y-2">
        <Label>Renk</Label>
        <Input name="color" defaultValue={vehicle?.color ?? ""} />
      </div>
      <div className="space-y-2">
        <Label>Yakıt Tipi</Label>
        <select
          name="fuel_type"
          defaultValue={vehicle?.fuel_type ?? "benzin"}
          className="flex h-10 w-full rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] px-3 text-sm text-[#F5F5F5]"
        >
          <option value="benzin">Benzin</option>
          <option value="dizel">Dizel</option>
          <option value="lpg">LPG</option>
          <option value="elektrik">Elektrik</option>
          <option value="hibrit">Hibrit</option>
        </select>
      </div>
      <div className="space-y-2">
        <Label>Vites</Label>
        <select
          name="transmission"
          defaultValue={vehicle?.transmission ?? "manuel"}
          className="flex h-10 w-full rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] px-3 text-sm text-[#F5F5F5]"
        >
          <option value="manuel">Manuel</option>
          <option value="otomatik">Otomatik</option>
        </select>
      </div>
      {!includeStatus ? (
        <div className="space-y-2">
          <Label>Mevcut KM</Label>
          <Input
            name="current_km"
            type="number"
            min={0}
            defaultValue={vehicle?.current_km ?? 0}
          />
        </div>
      ) : null}
      <div className="space-y-2">
        <Label>Sigorta Bitiş</Label>
        <Input
          name="insurance_expiry"
          type="date"
          defaultValue={vehicle?.insurance_expiry ?? ""}
        />
      </div>
      <div className="space-y-2">
        <Label>Muayene Bitiş</Label>
        <Input
          name="inspection_expiry"
          type="date"
          defaultValue={vehicle?.inspection_expiry ?? ""}
        />
      </div>
      {includeStatus ? (
        <div className="space-y-2 sm:col-span-2">
          <Label>Durum</Label>
          <select
            name="status"
            defaultValue={vehicle?.status ?? "available"}
            className="flex h-10 w-full rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] px-3 text-sm text-[#F5F5F5]"
          >
            <option value="available">Müsait</option>
            <option value="rented">Kirada</option>
            <option value="maintenance">Bakımda</option>
            <option value="inactive">Pasif</option>
          </select>
        </div>
      ) : null}
      <div className="space-y-2 sm:col-span-2">
        <Label>Notlar</Label>
        <Input name="notes" defaultValue={vehicle?.notes ?? ""} />
      </div>
    </div>
  );
}

import Link from "next/link";
import { MoreHorizontal } from "lucide-react";

import type { VehicleRow } from "@/lib/dashboard/queries";
import { cn } from "@/lib/utils";

type Props = {
  vehicles: VehicleRow[];
  pagination: {
    page: number;
    totalPages: number;
    total: number;
    from: number;
    to: number;
  };
};

const todayDot: Record<VehicleRow["todayStatus"], string> = {
  Kirada: "bg-[#E02424]",
  Boşta: "bg-emerald-400",
  Bakımda: "bg-amber-400",
};

const todayText: Record<VehicleRow["todayStatus"], string> = {
  Kirada: "text-[#E02424]",
  Boşta: "text-emerald-400",
  Bakımda: "text-amber-400",
};

export function VehiclesTable({ vehicles, pagination }: Props) {
  return (
    <div className="rounded-xl border border-[#2A2A2A] bg-[#141414]">
      <div className="border-b border-[#2A2A2A] px-5 py-4">
        <h2 className="font-semibold text-[#F5F5F5]">Araçlarım</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-[#2A2A2A] text-left text-xs text-[#737373]">
              <th className="px-5 py-3 font-medium">Plaka</th>
              <th className="px-3 py-3 font-medium">Marka</th>
              <th className="px-3 py-3 font-medium">Model</th>
              <th className="px-3 py-3 font-medium">Yıl</th>
              <th className="px-3 py-3 font-medium">Durum</th>
              <th className="px-3 py-3 font-medium">Bugünkü Durum</th>
              <th className="px-3 py-3 font-medium">Son İşlem</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {vehicles.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-5 py-10 text-center text-[#737373]"
                >
                  Henüz araç eklenmemiş.
                </td>
              </tr>
            ) : (
              vehicles.map((v) => (
                <tr
                  key={v.id}
                  className="border-b border-[#2A2A2A]/60 last:border-0"
                >
                  <td className="px-5 py-3 font-medium text-[#F5F5F5]">
                    {v.plate}
                  </td>
                  <td className="px-3 py-3 text-[#a3a3a3]">{v.brand}</td>
                  <td className="px-3 py-3 text-[#a3a3a3]">{v.model}</td>
                  <td className="px-3 py-3 text-[#a3a3a3]">{v.year}</td>
                  <td className="px-3 py-3">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5",
                        v.statusLabel === "Aktif"
                          ? "text-emerald-400"
                          : "text-amber-400"
                      )}
                    >
                      <span
                        className={cn(
                          "size-1.5 rounded-full",
                          v.statusLabel === "Aktif"
                            ? "bg-emerald-400"
                            : "bg-amber-400"
                        )}
                      />
                      {v.statusLabel}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5",
                        todayText[v.todayStatus]
                      )}
                    >
                      <span
                        className={cn(
                          "size-1.5 rounded-full",
                          todayDot[v.todayStatus]
                        )}
                      />
                      {v.todayStatus}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-[#737373]">{v.lastAction}</td>
                  <td className="px-5 py-3">
                    <button
                      type="button"
                      className="rounded p-1 text-[#737373] hover:bg-[#2A2A2A] hover:text-[#F5F5F5]"
                    >
                      <MoreHorizontal className="size-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between border-t border-[#2A2A2A] px-5 py-3 text-xs text-[#737373]">
        <span>
          {pagination.total === 0
            ? "0 araç"
            : `${pagination.from}-${pagination.to} / ${pagination.total} araç gösteriliyor`}
        </span>
        <div className="flex gap-1">
          {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(
            (p) => (
              <Link
                key={p}
                href={`/dashboard?page=${p}`}
                className={cn(
                  "flex size-7 items-center justify-center rounded",
                  p === pagination.page
                    ? "bg-[#E02424] text-white"
                    : "text-[#737373] hover:bg-[#2A2A2A]"
                )}
              >
                {p}
              </Link>
            )
          )}
        </div>
      </div>
    </div>
  );
}

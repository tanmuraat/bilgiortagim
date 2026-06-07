"use client";

import Link from "next/link";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";

import { formatCurrency } from "@/lib/utils";

type Props = {
  income: number;
  expense: number;
  profit: number;
  profitPct: string;
};

export function IncomeExpenseChart({
  income,
  expense,
  profit,
  profitPct,
}: Props) {
  const data = [
    { name: "Gelir", value: income || 0.01, color: "#22c55e" },
    { name: "Gider", value: expense || 0.01, color: "#E02424" },
  ];

  return (
    <div className="rounded-xl border border-[#2A2A2A] bg-[#141414]">
      <div className="border-b border-[#2A2A2A] px-5 py-4">
        <h2 className="font-semibold text-[#F5F5F5]">Gelir-Gider Özeti</h2>
      </div>
      <div className="relative mx-auto h-[200px] w-full max-w-[260px] py-4">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={62}
              outerRadius={88}
              paddingAngle={2}
              dataKey="value"
              stroke="none"
            >
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-xs text-[#737373]">Kâr</p>
          <p className="text-base font-bold text-[#F5F5F5]">
            {formatCurrency(profit)}
          </p>
          <p className="text-sm text-emerald-400">%{profitPct}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 px-5 pb-4">
        <div>
          <p className="flex items-center gap-2 text-xs text-[#737373]">
            <span className="size-2 rounded-full bg-emerald-500" />
            Gelir
          </p>
          <p className="mt-1 text-sm font-semibold text-[#F5F5F5]">
            {formatCurrency(income)}
          </p>
        </div>
        <div className="text-right">
          <p className="flex items-center justify-end gap-2 text-xs text-[#737373]">
            <span className="size-2 rounded-full bg-[#E02424]" />
            Gider
          </p>
          <p className="mt-1 text-sm font-semibold text-[#F5F5F5]">
            {formatCurrency(expense)}
          </p>
        </div>
      </div>
      <div className="border-t border-[#2A2A2A] px-5 py-3">
        <Link
          href="/raporlar"
          className="text-sm font-medium text-[#E02424] hover:underline"
        >
          Detaylı Raporu Gör →
        </Link>
      </div>
    </div>
  );
}

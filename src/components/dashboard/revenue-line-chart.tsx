"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const monthlyData = [
  { ay: "Tem", gelir: 82000, gider: 58000 },
  { ay: "Ağu", gelir: 95000, gider: 62000 },
  { ay: "Eyl", gelir: 88000, gider: 71000 },
  { ay: "Eki", gelir: 102000, gider: 68000 },
  { ay: "Kas", gelir: 115000, gider: 79000 },
  { ay: "Ara", gelir: 125000, gider: 86250 },
];

export function RevenueLineChart() {
  return (
    <div className="rounded-xl border border-[#262626] bg-[#141414]">
      <div className="border-b border-[#262626] px-5 py-4">
        <h2 className="font-semibold text-white">Aylık Gelir Trendi</h2>
        <p className="mt-1 text-xs text-[#737373]">Son 6 ay</p>
      </div>
      <div className="h-[240px] w-full px-2 py-4">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={monthlyData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="#262626" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="ay"
              tick={{ fill: "#737373", fontSize: 12 }}
              axisLine={{ stroke: "#262626" }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "#737373", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip
              contentStyle={{
                background: "#141414",
                border: "1px solid #262626",
                borderRadius: 8,
                color: "#F5F5F5",
              }}
              formatter={(value) => [
                `${Number(value ?? 0).toLocaleString("tr-TR")} ₺`,
                "",
              ]}
            />
            <Line
              type="monotone"
              dataKey="gelir"
              name="Gelir"
              stroke="#22c55e"
              strokeWidth={2}
              dot={{ fill: "#22c55e", r: 3 }}
              activeDot={{ r: 5 }}
            />
            <Line
              type="monotone"
              dataKey="gider"
              name="Gider"
              stroke="#E02424"
              strokeWidth={2}
              dot={{ fill: "#E02424", r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="flex justify-center gap-6 border-t border-[#262626] px-5 py-3 text-xs">
        <span className="flex items-center gap-2 text-[#a3a3a3]">
          <span className="size-2 rounded-full bg-emerald-500" /> Gelir
        </span>
        <span className="flex items-center gap-2 text-[#a3a3a3]">
          <span className="size-2 rounded-full bg-[#E02424]" /> Gider
        </span>
      </div>
    </div>
  );
}

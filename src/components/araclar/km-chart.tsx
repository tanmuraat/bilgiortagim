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

import type { KmChartPoint } from "@/lib/araclar/queries";

export function KmChart({ data }: { data: KmChartPoint[] }) {
  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#2A2A2A" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fill: "#737373", fontSize: 12 }}
            axisLine={{ stroke: "#2A2A2A" }}
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
              border: "1px solid #2A2A2A",
              borderRadius: 8,
              color: "#F5F5F5",
            }}
            formatter={(value) => [
              `${Number(value ?? 0).toLocaleString("tr-TR")} km`,
              "Artış",
            ]}
          />
          <Line
            type="monotone"
            dataKey="km"
            stroke="#E02424"
            strokeWidth={2}
            dot={{ fill: "#E02424", r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

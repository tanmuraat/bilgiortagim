import {
  Calendar,
  Car,
  Coins,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";

import type { DashboardStat } from "@/lib/dashboard/queries";
import { cn } from "@/lib/utils";

const icons: LucideIcon[] = [Calendar, Car, Car, Coins, TrendingUp];
const iconStyles = [
  "bg-blue-500/10 text-blue-400",
  "bg-emerald-500/10 text-emerald-400",
  "bg-violet-500/10 text-violet-400",
  "bg-amber-500/10 text-amber-400",
  "bg-[#E02424]/10 text-[#E02424]",
];

export function StatCards({ stats }: { stats: DashboardStat[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      {stats.map((stat, i) => {
        const Icon = icons[i] ?? Calendar;
        return (
          <div
            key={stat.label}
            className="rounded-xl border border-[#2A2A2A] bg-[#141414] p-4"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs text-[#737373]">{stat.label}</p>
                <p className="mt-2 truncate text-2xl font-bold text-[#F5F5F5]">
                  {stat.value}
                </p>
              </div>
              <div
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-lg",
                  iconStyles[i]
                )}
              >
                <Icon className="size-5" />
              </div>
            </div>
            <p
              className={cn(
                "mt-3 text-xs",
                stat.trend.direction === "up" && "text-emerald-400",
                stat.trend.direction === "down" && "text-[#E02424]",
                stat.trend.direction === "neutral" && "text-[#737373]"
              )}
            >
              {stat.trend.label}
            </p>
          </div>
        );
      })}
    </div>
  );
}

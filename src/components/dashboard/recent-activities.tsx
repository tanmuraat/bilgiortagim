import {
  AlertTriangle,
  Car,
  CreditCard,
  RefreshCw,
  type LucideIcon,
} from "lucide-react";

import type { ActivityItem } from "@/lib/dashboard/queries";
import { cn } from "@/lib/utils";

const typeConfig: Record<
  ActivityItem["type"],
  { icon: LucideIcon; className: string }
> = {
  rental: { icon: Car, className: "text-emerald-400 bg-emerald-500/10" },
  payment: { icon: CreditCard, className: "text-blue-400 bg-blue-500/10" },
  damage: { icon: AlertTriangle, className: "text-[#E02424] bg-[#E02424]/10" },
  extension: { icon: RefreshCw, className: "text-amber-400 bg-amber-500/10" },
  other: { icon: Car, className: "text-[#737373] bg-[#2A2A2A]" },
};

export function RecentActivities({ activities }: { activities: ActivityItem[] }) {
  return (
    <div className="rounded-xl border border-[#2A2A2A] bg-[#141414]">
      <div className="border-b border-[#2A2A2A] px-5 py-4">
        <h2 className="font-semibold text-[#F5F5F5]">Son İşlemler</h2>
      </div>
      {activities.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-[#737373]">
          Henüz işlem kaydı yok.
        </p>
      ) : (
        <ul className="divide-y divide-[#2A2A2A]">
          {activities.map((item) => {
            const cfg = typeConfig[item.type];
            const Icon = cfg.icon;
            return (
              <li key={item.id} className="flex gap-4 px-5 py-4">
                <div
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-full",
                    cfg.className
                  )}
                >
                  <Icon className="size-4" />
                </div>
                <p className="min-w-0 flex-1 text-sm text-[#F5F5F5]">{item.text}</p>
                <span className="shrink-0 text-xs text-[#737373]">{item.time}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

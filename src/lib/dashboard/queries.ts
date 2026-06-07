import {
  endOfMonth,
  format,
  startOfMonth,
  subMonths,
  differenceInCalendarDays,
  parseISO,
  isWithinInterval,
} from "date-fns";
import { tr } from "date-fns/locale";

import { createClient } from "@/lib/supabase/server";
import type { Rental, Transaction, Vehicle } from "@/types/database";

const PER_PAGE = 6;

export type StatTrend = {
  label: string;
  direction: "up" | "down" | "neutral";
};

export type DashboardStat = {
  label: string;
  value: string;
  trend: StatTrend;
};

export type VehicleRow = Vehicle & {
  todayStatus: "Kirada" | "Boşta" | "Bakımda";
  lastAction: string;
  statusLabel: "Aktif" | "Bakımda";
};

export type UpcomingDelivery = {
  date: string;
  month: string;
  time: string;
  plate: string;
  customer: string;
  urgent: boolean;
};

export type ActivityItem = {
  id: string;
  type: "rental" | "payment" | "damage" | "extension" | "other";
  text: string;
  time: string;
};

function calcTrend(current: number, previous: number): StatTrend {
  if (previous === 0 && current === 0) {
    return { label: "— değişim yok", direction: "neutral" };
  }
  if (previous === 0) {
    return { label: "+ 100% geçen aya göre", direction: "up" };
  }
  const pct = ((current - previous) / previous) * 100;
  const rounded = Math.abs(Math.round(pct));
  if (rounded === 0) return { label: "— değişim yok", direction: "neutral" };
  const sign = pct > 0 ? "+" : "-";
  return {
    label: `${sign} ${rounded}% geçen aya göre`,
    direction: pct > 0 ? "up" : "down",
  };
}

function rentalDaysInMonth(
  rentals: Rental[],
  monthStart: Date,
  monthEnd: Date
): number {
  let days = 0;
  for (const r of rentals) {
    const start = parseISO(r.start_date);
    const end = parseISO(r.end_date);
    const overlapStart = start < monthStart ? monthStart : start;
    const overlapEnd = end > monthEnd ? monthEnd : end;
    if (overlapStart <= overlapEnd) {
      days += differenceInCalendarDays(overlapEnd, overlapStart) + 1;
    }
  }
  return days;
}

function sumTransactions(
  transactions: Transaction[],
  type: "income" | "expense",
  from: Date,
  to: Date
): number {
  return transactions
    .filter((t) => {
      if (t.type !== type) return false;
      const d = parseISO(t.created_at);
      return isWithinInterval(d, { start: from, end: to });
    })
    .reduce((s, t) => s + Number(t.amount), 0);
}

function formatRelativeTime(iso: string): string {
  const d = parseISO(iso);
  const diffMs = Date.now() - d.getTime();
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  if (hours < 1) return "Az önce";
  if (hours < 24) return `${hours} saat önce`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} gün önce`;
  return format(d, "d MMM yyyy", { locale: tr });
}

export async function getDashboardData(userId: string, page = 1) {
  const supabase = await createClient();
  const now = new Date();
  const thisMonthStart = startOfMonth(now);
  const thisMonthEnd = endOfMonth(now);
  const lastMonthStart = startOfMonth(subMonths(now, 1));
  const lastMonthEnd = endOfMonth(subMonths(now, 1));
  const todayStr = format(now, "yyyy-MM-dd");

  const [
    { data: vehicles },
    { data: rentals },
    { data: transactions },
    { count: vehicleCount },
  ] = await Promise.all([
    supabase
      .from("vehicles")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    supabase.from("rentals").select("*").eq("user_id", userId),
    supabase.from("transactions").select("*").eq("user_id", userId),
    supabase
      .from("vehicles")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId),
  ]);

  const vehicleList = (vehicles ?? []) as Vehicle[];
  const rentalList = (rentals ?? []) as Rental[];
  const txList = (transactions ?? []) as Transaction[];

  const activeRentals = rentalList.filter((r) => r.status === "active");
  const rentedTodayVehicleIds = new Set(
    activeRentals
      .filter((r) => r.start_date <= todayStr && r.end_date >= todayStr)
      .map((r) => r.vehicle_id)
  );

  const thisMonthDays = rentalDaysInMonth(
    rentalList,
    thisMonthStart,
    thisMonthEnd
  );
  const lastMonthDays = rentalDaysInMonth(
    rentalList,
    lastMonthStart,
    lastMonthEnd
  );

  const activeNow = activeRentals.filter(
    (r) => r.start_date <= todayStr && r.end_date >= todayStr
  ).length;
  const activeLastMonth = rentalList.filter((r) => {
    const mid = format(lastMonthStart, "yyyy-MM-dd");
    return r.status === "active" && r.start_date <= mid && r.end_date >= mid;
  }).length;

  const thisIncome = sumTransactions(
    txList,
    "income",
    thisMonthStart,
    thisMonthEnd
  );
  const lastIncome = sumTransactions(
    txList,
    "income",
    lastMonthStart,
    lastMonthEnd
  );
  const thisExpense = sumTransactions(
    txList,
    "expense",
    thisMonthStart,
    thisMonthEnd
  );
  const lastExpense = sumTransactions(
    txList,
    "expense",
    lastMonthStart,
    lastMonthEnd
  );
  const thisProfit = thisIncome - thisExpense;
  const lastProfit = lastIncome - lastExpense;

  const stats: DashboardStat[] = [
    {
      label: "Bu Ay Kiralanan Gün",
      value: String(thisMonthDays),
      trend: calcTrend(thisMonthDays, lastMonthDays),
    },
    {
      label: "Aktif Kiralamalar",
      value: String(activeNow),
      trend: calcTrend(activeNow, activeLastMonth),
    },
    {
      label: "Toplam Araç",
      value: String(vehicleCount ?? 0),
      trend: calcTrend(vehicleCount ?? 0, vehicleCount ?? 0),
    },
    {
      label: "Bu Ay Gelir",
      value: `${thisIncome.toLocaleString("tr-TR")} ₺`,
      trend: calcTrend(thisIncome, lastIncome),
    },
    {
      label: "Bu Ay Kâr",
      value: `${thisProfit.toLocaleString("tr-TR")} ₺`,
      trend: calcTrend(thisProfit, lastProfit),
    },
  ];

  const totalVehicles = vehicleList.length;
  const totalPages = Math.max(1, Math.ceil(totalVehicles / PER_PAGE));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const pageVehicles = vehicleList.slice(
    (safePage - 1) * PER_PAGE,
    safePage * PER_PAGE
  );

  const vehicleRows: VehicleRow[] = pageVehicles.map((v) => {
    const isRented = rentedTodayVehicleIds.has(v.id);
    const lastTx = txList
      .filter((t) => t.vehicle_id === v.id)
      .sort(
        (a, b) =>
          parseISO(b.created_at).getTime() - parseISO(a.created_at).getTime()
      )[0];
    const lastRental = rentalList
      .filter((r) => r.vehicle_id === v.id)
      .sort(
        (a, b) =>
          parseISO(b.created_at).getTime() - parseISO(a.created_at).getTime()
      )[0];

    let todayStatus: VehicleRow["todayStatus"] = "Boşta";
    if (v.status === "maintenance" || v.status === "inactive")
      todayStatus = "Bakımda";
    else if (isRented || v.status === "rented") todayStatus = "Kirada";

    const lastAction = lastTx
      ? formatRelativeTime(lastTx.created_at)
      : lastRental
        ? formatRelativeTime(lastRental.created_at)
        : formatRelativeTime(v.created_at);

    return {
      ...v,
      todayStatus,
      lastAction,
      statusLabel:
        v.status === "maintenance" || v.status === "inactive"
          ? "Bakımda"
          : "Aktif",
    };
  });

  const plateMap = Object.fromEntries(vehicleList.map((v) => [v.id, v.plate]));

  const upcoming = rentalList
    .filter((r) => r.status === "active" && r.end_date >= todayStr)
    .sort((a, b) => a.end_date.localeCompare(b.end_date))
    .slice(0, 6)
    .map((r): UpcomingDelivery => {
      const end = parseISO(r.end_date);
      const daysLeft = differenceInCalendarDays(end, now);
      return {
        date: format(end, "d"),
        month: format(end, "MMM", { locale: tr }).toUpperCase(),
        time: "10:00",
        plate: plateMap[r.vehicle_id] ?? "—",
        customer: r.customer_name,
        urgent: daysLeft <= 2,
      };
    });

  const activities: ActivityItem[] = txList
    .sort(
      (a, b) =>
        parseISO(b.created_at).getTime() - parseISO(a.created_at).getTime()
    )
    .slice(0, 8)
    .map((t) => {
      let type: ActivityItem["type"] = "other";
      if (t.type === "income") type = "payment";
      if (t.category.toLowerCase().includes("hasar")) type = "damage";
      if (t.category.toLowerCase().includes("kiralama")) type = "rental";
      if (t.description.toLowerCase().includes("uzat")) type = "extension";

      const plate = t.vehicle_id ? plateMap[t.vehicle_id] : "";
      const text = plate
        ? `${t.description} (${plate})`
        : t.description;

      return {
        id: t.id,
        type,
        text,
        time: format(parseISO(t.created_at), "d MMM yyyy HH:mm", {
          locale: tr,
        }),
      };
    });

  const profitPct =
    thisIncome > 0 ? ((thisProfit / thisIncome) * 100).toFixed(1) : "0";

  return {
    stats,
    vehicles: vehicleRows,
    pagination: {
      page: safePage,
      totalPages,
      total: totalVehicles,
      from: totalVehicles === 0 ? 0 : (safePage - 1) * PER_PAGE + 1,
      to: Math.min(safePage * PER_PAGE, totalVehicles),
    },
    upcoming,
    income: thisIncome,
    expense: thisExpense,
    profit: thisProfit,
    profitPct,
    activities,
    monthLabel: format(now, "MMMM yyyy", { locale: tr }),
  };
}

export async function getUnreadNotificationCount(userId: string) {
  const supabase = await createClient();
  const { count } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("read", false);
  return count ?? 0;
}

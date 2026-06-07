import { ChevronDown, Download } from "lucide-react";

import { IncomeExpenseChart } from "@/components/dashboard/income-expense-chart";
import { RecentActivities } from "@/components/dashboard/recent-activities";
import { StatCards } from "@/components/dashboard/stat-cards";
import { UpcomingDeliveries } from "@/components/dashboard/upcoming-deliveries";
import { VehiclesTable } from "@/components/dashboard/vehicles-table";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { getDashboardData, getUnreadNotificationCount } from "@/lib/dashboard/queries";
import { createClient } from "@/lib/supabase/server";

type Props = {
  searchParams: Promise<{ page?: string }>;
};

export default async function DashboardPage({ searchParams }: Props) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const [{ data: profile }, dashboard, unreadNotifications] = await Promise.all([
    supabase
      .from("profiles")
      .select("company_name")
      .eq("id", user.id)
      .single(),
    getDashboardData(user.id, page),
    getUnreadNotificationCount(user.id),
  ]);

  const companyName = profile?.company_name ?? "Firmanız";

  return (
    <>
      <Header
        title="Dashboard"
        companyName={companyName}
        unreadNotifications={unreadNotifications}
      />
      <main className="flex-1 space-y-6 p-4 lg:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-[#F5F5F5]">
              Hoş geldiniz, {companyName} 👋
            </h2>
            <p className="mt-1 text-sm text-[#737373]">
              İşletmenizin güncel özetini buradan takip edebilirsiniz.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              className="gap-2 border-[#2A2A2A] bg-[#141414] text-[#F5F5F5] hover:bg-[#1a1a1a]"
            >
              {dashboard.monthLabel}
              <ChevronDown className="size-4" />
            </Button>
            <Button className="gap-2 bg-[#E02424] text-white hover:bg-[#c41f1f]">
              <Download className="size-4" />
              Rapor İndir
            </Button>
          </div>
        </div>

        <StatCards stats={dashboard.stats} />

        <div className="grid gap-6 xl:grid-cols-3">
          <div className="xl:col-span-2">
            <VehiclesTable
              vehicles={dashboard.vehicles}
              pagination={dashboard.pagination}
            />
          </div>
          <div className="space-y-6">
            <UpcomingDeliveries deliveries={dashboard.upcoming} />
            <IncomeExpenseChart
              income={dashboard.income}
              expense={dashboard.expense}
              profit={dashboard.profit}
              profitPct={dashboard.profitPct}
            />
          </div>
        </div>

        <RecentActivities activities={dashboard.activities} />
      </main>
    </>
  );
}

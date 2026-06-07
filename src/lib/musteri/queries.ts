import { startOfMonth } from "date-fns";

import { createClient } from "@/lib/supabase/server";

export type QueryStats = {
  totalQueries: number;
  riskyCustomers: number;
  safeCustomers: number;
};

export type QueryHistoryRow = {
  id: string;
  created_at: string;
  result_found: boolean;
  customer_name: string | null;
  risk_status: string | null;
};

export async function getMonthlyQueryStats(userId: string): Promise<QueryStats> {
  const supabase = await createClient();
  const monthStart = startOfMonth(new Date()).toISOString();

  const { data: logs } = await supabase
    .from("query_logs")
    .select("id, customer_id, customer_records(risk_status)")
    .eq("user_id", userId)
    .gte("created_at", monthStart);

  const rows = logs ?? [];
  let risky = 0;
  let safe = 0;

  for (const row of rows) {
    const raw = row.customer_records;
    const cr = (Array.isArray(raw) ? raw[0] : raw) as {
      risk_status: string;
    } | null;
    if (!cr) continue;
    if (cr.risk_status === "risky") risky++;
    else if (cr.risk_status === "safe") safe++;
  }

  return {
    totalQueries: rows.length,
    riskyCustomers: risky,
    safeCustomers: safe,
  };
}

export async function getQueryHistory(
  userId: string,
  limit = 25
): Promise<QueryHistoryRow[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("query_logs")
    .select(
      "id, created_at, result_found, customer_records(full_name, risk_status)"
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []).map((row) => {
    const raw = row.customer_records;
    const cr = (Array.isArray(raw) ? raw[0] : raw) as {
      full_name: string;
      risk_status: string;
    } | null;
    return {
      id: row.id,
      created_at: row.created_at,
      result_found: row.result_found,
      customer_name: cr?.full_name ?? null,
      risk_status: cr?.risk_status ?? null,
    };
  });
}

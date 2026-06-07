"use client";

import { format, parseISO } from "date-fns";
import { tr } from "date-fns/locale";
import {
  AlertTriangle,
  Car,
  ChevronDown,
  CreditCard,
  History,
  Search,
  ShieldAlert,
  User,
} from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { QueryHistoryRow, QueryStats } from "@/lib/musteri/queries";
import { formatCurrency, cn } from "@/lib/utils";
import type {
  CustomerRecordItem,
  CustomerSearchResult,
} from "@/types/customer";

type TabKey = "all" | "negative" | "payment" | "damage";

const TAB_LABELS: Record<TabKey, string> = {
  all: "Tüm Kayıtlar",
  negative: "Olumsuz Kayıtlar",
  payment: "Ödeme Kayıtları",
  damage: "Hasar Kayıtları",
};

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function recordIcon(type: CustomerRecordItem["record_type"]) {
  switch (type) {
    case "rental":
      return { Icon: Car, className: "text-emerald-400 bg-emerald-500/10" };
    case "negative":
      return { Icon: ShieldAlert, className: "text-[#E02424] bg-[#E02424]/10" };
    case "payment":
      return { Icon: CreditCard, className: "text-blue-400 bg-blue-500/10" };
    case "damage":
      return { Icon: AlertTriangle, className: "text-amber-400 bg-amber-500/10" };
    default:
      return { Icon: User, className: "text-[#737373] bg-[#2A2A2A]" };
  }
}

function paymentStatusLabel(
  status: CustomerRecordItem["payment_status"]
): { text: string; className: string } {
  switch (status) {
    case "paid":
      return { text: "Ödendi", className: "text-emerald-400" };
    case "unpaid":
      return { text: "Ödenmedi", className: "text-[#E02424]" };
    case "collected":
      return { text: "Tahsil Edildi", className: "text-blue-400" };
    default:
      return { text: "—", className: "text-[#737373]" };
  }
}

type Props = {
  stats: QueryStats;
  history: QueryHistoryRow[];
};

export function MusteriSorgulamaView({ stats, history }: Props) {
  const [tc, setTc] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CustomerSearchResult | null>(null);
  const [tab, setTab] = useState<TabKey>("all");
  const [visibleCount, setVisibleCount] = useState(5);
  const [historyOpen, setHistoryOpen] = useState(false);

  const tabCounts = useMemo(() => {
    if (!result) return { all: 0, negative: 0, payment: 0, damage: 0 };
    const items = result.items;
    return {
      all: items.length,
      negative: items.filter((i) => i.record_type === "negative").length,
      payment: items.filter((i) => i.record_type === "payment").length,
      damage: items.filter((i) => i.record_type === "damage").length,
    };
  }, [result]);

  const filteredItems = useMemo(() => {
    if (!result) return [];
    if (tab === "all") return result.items;
    return result.items.filter((i) => i.record_type === tab);
  }, [result, tab]);

  const visibleItems = filteredItems.slice(0, visibleCount);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setResult(null);
    setTab("all");
    setVisibleCount(5);

    try {
      const res = await fetch("/api/musteri/sorgula", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tc }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error ?? "Sorgu başarısız.");
        return;
      }
      setResult(json.data);
    } catch {
      setError("Bağlantı hatası. Lütfen tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  }

  function handleNewQuery() {
    setResult(null);
    setTc("");
    setError(null);
    setTab("all");
    setVisibleCount(5);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-[#F5F5F5]">
            Müşteri Sorgulama
          </h2>
          <p className="mt-1 text-sm text-[#737373]">
            TC kimlik numarası ile sektör kayıtlarını sorgulayın.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="gap-2 border-[#2A2A2A] bg-[#141414] text-[#F5F5F5] hover:bg-[#1a1a1a]"
          onClick={() => setHistoryOpen(true)}
        >
          <History className="size-4" />
          Sorgu Geçmişi
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-[#2A2A2A] bg-[#141414] p-5">
          <h3 className="font-semibold text-[#F5F5F5]">TC Kimlik No ile Sorgula</h3>
          <form onSubmit={handleSearch} className="mt-4 space-y-4">
            <div className="relative">
              <User className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#737373]" />
              <Input
                value={tc}
                onChange={(e) =>
                  setTc(e.target.value.replace(/\D/g, "").slice(0, 11))
                }
                placeholder="12345678901"
                className="pl-10"
                maxLength={11}
                inputMode="numeric"
                required
              />
            </div>
            {error ? (
              <p className="text-sm text-[#E02424]">{error}</p>
            ) : null}
            <Button
              type="submit"
              disabled={loading || tc.length !== 11}
              className="h-11 w-full bg-[#E02424] text-white hover:bg-[#c41f1f]"
            >
              <Search className="mr-2 size-4" />
              {loading ? "Sorgulanıyor..." : "Sorgula"}
            </Button>
          </form>
          <p className="mt-4 text-xs text-[#737373]">
            Sorguladığınız bilgiler yalnızca yasal amaçlarla kullanılmaktadır.
          </p>
        </div>

        <div className="rounded-xl border border-[#2A2A2A] bg-[#141414] p-5">
          <h3 className="font-semibold text-[#F5F5F5]">Hızlı İstatistikler</h3>
          <p className="text-xs text-[#737373]">Bu ay</p>
          <div className="mt-4 space-y-4">
            <StatRow label="Toplam Sorgu" value={stats.totalQueries} />
            <StatRow
              label="Riskli Müşteriler"
              value={stats.riskyCustomers}
              valueClass="text-[#E02424]"
            />
            <StatRow
              label="Sorunsuz Müşteriler"
              value={stats.safeCustomers}
              valueClass="text-emerald-400"
            />
          </div>
        </div>
      </div>

      {result ? (
        <>
          <div className="rounded-xl border border-[#2A2A2A] bg-[#141414] p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex gap-4">
                <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-[#2A2A2A] text-lg font-bold text-[#F5F5F5]">
                  {initials(result.full_name)}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-semibold text-[#F5F5F5]">
                      {result.full_name}
                    </h3>
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-0.5 text-xs font-medium",
                        result.risk_status === "safe"
                          ? "bg-emerald-500/15 text-emerald-400"
                          : "bg-[#E02424]/15 text-[#E02424]"
                      )}
                    >
                      {result.risk_status === "safe" ? "Sorunsuz" : "Riskli"}
                    </span>
                  </div>
                  <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
                    <Info label="TC Kimlik" value={result.tc_masked} />
                    <Info
                      label="Doğum Tarihi"
                      value={
                        result.birth_date
                          ? format(parseISO(result.birth_date), "d MMMM yyyy", {
                              locale: tr,
                            })
                          : "—"
                      }
                    />
                    <Info label="Telefon" value={result.phone_masked} />
                    <Info label="E-posta" value={result.email ?? "—"} />
                    <Info
                      label="Adres"
                      value={result.address ?? "—"}
                      className="sm:col-span-2"
                    />
                  </div>
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                <p className="text-xs text-[#737373]">
                  Son Sorgulama:{" "}
                  {format(parseISO(result.queried_at), "d MMM yyyy HH:mm", {
                    locale: tr,
                  })}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="border-[#2A2A2A] text-[#F5F5F5]"
                  onClick={handleNewQuery}
                >
                  Yeni Sorgu
                </Button>
              </div>
            </div>

            <div className="mt-6 grid gap-4 border-t border-[#2A2A2A] pt-5 sm:grid-cols-2 lg:grid-cols-5">
              <MiniStat label="Toplam Kayıt" value={String(result.total_records)} />
              <MiniStat
                label="Olumsuz Kayıt"
                value={String(result.negative_records)}
                icon={<AlertTriangle className="size-4 text-amber-400" />}
              />
              <MiniStat
                label="Toplam Borç"
                value={formatCurrency(result.total_debt)}
                valueClass="text-[#E02424]"
              />
              <MiniStat
                label="Son Kiralama"
                value={
                  result.last_rental_at
                    ? format(parseISO(result.last_rental_at), "d MMM yyyy", {
                        locale: tr,
                      })
                    : "—"
                }
              />
              <MiniStat
                label="En Son Firma"
                value={result.last_company_name ?? "—"}
              />
            </div>
          </div>

          <div className="rounded-xl border border-[#2A2A2A] bg-[#141414]">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#2A2A2A] px-5 py-3">
              <div className="flex flex-wrap gap-1">
                {(Object.keys(TAB_LABELS) as TabKey[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setTab(key);
                      setVisibleCount(5);
                    }}
                    className={cn(
                      "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      tab === key
                        ? "bg-[#E02424] text-white"
                        : "text-[#737373] hover:text-[#F5F5F5]"
                    )}
                  >
                    {TAB_LABELS[key]}
                    {key !== "all" && tabCounts[key] > 0 ? (
                      <span className="ml-1.5 rounded-full bg-black/20 px-1.5 text-xs">
                        {tabCounts[key]}
                      </span>
                    ) : null}
                  </button>
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-[#2A2A2A] text-[#737373]"
              >
                Filtrele
                <ChevronDown className="ml-1 size-3" />
              </Button>
            </div>

            <ul className="divide-y divide-[#2A2A2A]">
              {visibleItems.length === 0 ? (
                <li className="px-5 py-10 text-center text-sm text-[#737373]">
                  Bu sekmede kayıt yok.
                </li>
              ) : (
                visibleItems.map((item) => {
                  const { Icon, className } = recordIcon(item.record_type);
                  const pay = paymentStatusLabel(item.payment_status);
                  return (
                    <li
                      key={item.id}
                      className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center"
                    >
                      <div className="flex min-w-[120px] items-center gap-3 text-xs text-[#737373]">
                        <span>
                          {format(parseISO(item.occurred_at), "d MMM yyyy", {
                            locale: tr,
                          })}
                        </span>
                        <span>
                          {format(parseISO(item.occurred_at), "HH:mm")}
                        </span>
                      </div>
                      <div
                        className={cn(
                          "flex size-9 shrink-0 items-center justify-center rounded-full",
                          className
                        )}
                      >
                        <Icon className="size-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-[#F5F5F5]">{item.title}</p>
                        {item.description ? (
                          <p className="text-sm text-[#737373]">{item.description}</p>
                        ) : null}
                        {item.category_label ? (
                          <span className="mt-1 inline-block rounded bg-[#2A2A2A] px-2 py-0.5 text-xs text-[#a3a3a3]">
                            {item.category_label}
                          </span>
                        ) : null}
                      </div>
                      <div className="text-sm text-[#737373]">{item.company_name}</div>
                      <div className="text-sm font-medium text-[#F5F5F5]">
                        {item.vehicle_plate ??
                          (item.amount > 0 ? formatCurrency(item.amount) : "—")}
                      </div>
                      <div className={cn("text-sm font-medium", pay.className)}>
                        {pay.text}
                      </div>
                    </li>
                  );
                })
              )}
            </ul>

            {visibleCount < filteredItems.length ? (
              <div className="border-t border-[#2A2A2A] p-4 text-center">
                <Button
                  type="button"
                  variant="ghost"
                  className="text-[#E02424] hover:text-[#E02424]"
                  onClick={() => setVisibleCount((c) => c + 5)}
                >
                  Daha Fazla Göster
                  <ChevronDown className="ml-1 size-4" />
                </Button>
              </div>
            ) : null}
          </div>
        </>
      ) : null}

      <Dialog
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        title="Sorgu Geçmişi"
        description="Son yaptığınız sorgular"
      >
        {history.length === 0 ? (
          <p className="text-sm text-[#737373]">Henüz sorgu geçmişi yok.</p>
        ) : (
          <ul className="max-h-80 space-y-2 overflow-y-auto">
            {history.map((h) => (
              <li
                key={h.id}
                className="flex items-center justify-between rounded-lg border border-[#2A2A2A] px-3 py-2 text-sm"
              >
                <span className="text-[#F5F5F5]">
                  {h.customer_name ?? "Kayıt bulunamadı"}
                </span>
                <span className="text-xs text-[#737373]">
                  {format(parseISO(h.created_at), "d MMM yyyy HH:mm", {
                    locale: tr,
                  })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Dialog>
    </div>
  );
}

function StatRow({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: number;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center justify-between border-b border-[#2A2A2A] pb-3 last:border-0 last:pb-0">
      <span className="text-sm text-[#737373]">{label}</span>
      <span className={cn("text-lg font-bold text-[#F5F5F5]", valueClass)}>
        {value.toLocaleString("tr-TR")}
      </span>
    </div>
  );
}

function Info({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="text-xs text-[#737373]">{label}</p>
      <p className="text-[#F5F5F5]">{value}</p>
    </div>
  );
}

function MiniStat({
  label,
  value,
  valueClass,
  icon,
}: {
  label: string;
  value: string;
  valueClass?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div>
      <p className="flex items-center gap-1 text-xs text-[#737373]">
        {icon}
        {label}
      </p>
      <p className={cn("mt-1 font-semibold text-[#F5F5F5]", valueClass)}>
        {value}
      </p>
    </div>
  );
}

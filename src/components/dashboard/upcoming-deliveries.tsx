import type { UpcomingDelivery } from "@/lib/dashboard/queries";

export function UpcomingDeliveries({
  deliveries,
}: {
  deliveries: UpcomingDelivery[];
}) {
  return (
    <div className="rounded-xl border border-[#2A2A2A] bg-[#141414]">
      <div className="border-b border-[#2A2A2A] px-5 py-4">
        <h2 className="font-semibold text-[#F5F5F5]">Yaklaşan Teslimatlar</h2>
      </div>
      {deliveries.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-[#737373]">
          Yaklaşan teslimat yok.
        </p>
      ) : (
        <ul className="divide-y divide-[#2A2A2A]">
          {deliveries.map((d, i) => (
            <li key={i} className="flex items-center gap-4 px-5 py-4">
              <div className="flex w-12 shrink-0 flex-col items-center rounded-lg bg-[#0A0A0A] py-2">
                <span className="text-lg font-bold leading-none text-[#F5F5F5]">
                  {d.date}
                </span>
                <span className="text-[10px] font-medium text-[#737373]">
                  {d.month}
                </span>
              </div>
              <span
                className={`size-2 shrink-0 rounded-full ${d.urgent ? "bg-[#E02424]" : "bg-emerald-400"}`}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-[#F5F5F5]">{d.plate}</p>
                <p className="text-xs text-[#737373]">{d.customer}</p>
              </div>
              <span className="text-xs text-[#737373]">{d.time}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

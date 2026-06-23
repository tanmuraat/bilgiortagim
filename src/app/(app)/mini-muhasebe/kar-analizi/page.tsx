'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns'
import { tr } from 'date-fns/locale'
import { TrendingUp, TrendingDown, Award, AlertTriangle } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

export default function KarAnaliziPage() {
  const supabase = createClient()
  const [monthlyData, setMonthlyData] = useState<any[]>([])
  const [summary, setSummary] = useState({ totalIncome: 0, totalExpense: 0, totalProfit: 0, bestMonth: '', worstMonth: '' })
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const months = Array.from({ length: 12 }, (_, i) => {
      const d = subMonths(new Date(), 11 - i)
      return { date: d, start: format(startOfMonth(d), 'yyyy-MM-dd'), end: format(endOfMonth(d), 'yyyy-MM-dd'), label: format(d, 'MMM yy', { locale: tr }) }
    })

    const { data: txData } = await supabase.from('transactions').select('*')
      .gte('transaction_date', months[0].start).lte('transaction_date', months[11].end)

    const rows = months.map(m => {
      const monthTx = (txData || []).filter(t => t.transaction_date >= m.start && t.transaction_date <= m.end)
      const income = monthTx.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
      const expense = monthTx.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
      const profit = income - expense
      return { ay: m.label, Gelir: income, Gider: expense, Kâr: profit }
    })

    setMonthlyData(rows)

    const totalIncome = rows.reduce((s, r) => s + r.Gelir, 0)
    const totalExpense = rows.reduce((s, r) => s + r.Gider, 0)
    const totalProfit = totalIncome - totalExpense
    const bestMonth = rows.reduce((best, r) => r.Kâr > best.Kâr ? r : best, rows[0])?.ay || '—'
    const worstMonth = rows.reduce((worst, r) => r.Kâr < worst.Kâr ? r : worst, rows[0])?.ay || '—'
    setSummary({ totalIncome, totalExpense, totalProfit, bestMonth, worstMonth })
    setLoading(false)
  }, [supabase])

  useEffect(() => { fetchData() }, [fetchData])

  if (loading) return (
    <div className="flex items-center justify-center h-96">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
    </div>
  )

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Kâr Analizi</h1>
        <p className="text-gray-400 text-sm mt-1">Son 12 aylık gelir, gider ve kâr analizi</p>
      </div>

      {/* Yıllık Özet */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Yıllık Toplam Gelir', value: `₺${summary.totalIncome.toLocaleString('tr-TR')}`, icon: TrendingUp, color: 'text-green-400', bg: 'bg-green-400/10' },
          { label: 'Yıllık Toplam Gider', value: `₺${summary.totalExpense.toLocaleString('tr-TR')}`, icon: TrendingDown, color: 'text-red-400', bg: 'bg-red-400/10' },
          { label: 'En Kârlı Ay', value: summary.bestMonth, icon: Award, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
          { label: 'En Zayıf Ay', value: summary.worstMonth, icon: AlertTriangle, color: 'text-orange-400', bg: 'bg-orange-400/10' },
        ].map((s, i) => (
          <div key={i} className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-gray-400 text-sm">{s.label}</span>
              <div className={`${s.bg} p-2 rounded-lg`}><s.icon size={16} className={s.color} /></div>
            </div>
            <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Net Kâr Kartı */}
      <div className={`rounded-xl p-5 border ${summary.totalProfit >= 0 ? 'bg-green-500/5 border-green-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
        <div className="text-gray-400 text-sm mb-1">Yıllık Net Kâr / Zarar</div>
        <div className={`text-4xl font-bold ${summary.totalProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          {summary.totalProfit >= 0 ? '+' : ''}₺{summary.totalProfit.toLocaleString('tr-TR')}
        </div>
        <div className="text-gray-500 text-sm mt-1">
          Kâr Marjı: %{summary.totalIncome > 0 ? Math.round((summary.totalProfit / summary.totalIncome) * 100) : 0}
        </div>
      </div>

      {/* Bar Chart */}
      <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-5">
        <h3 className="text-white font-semibold mb-4">Aylık Karşılaştırma</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={monthlyData} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
            <XAxis dataKey="ay" tick={{ fill: '#6B7280', fontSize: 11 }} />
            <YAxis tick={{ fill: '#6B7280', fontSize: 11 }} tickFormatter={v => `₺${(v / 1000).toFixed(0)}K`} />
            <Tooltip contentStyle={{ backgroundColor: '#1E1E1E', border: '1px solid #2A2A2A', borderRadius: 8 }} formatter={(v: any) => [`₺${Number(v).toLocaleString('tr-TR')}`, '']} />
            <Legend formatter={value => <span style={{ color: '#9CA3AF', fontSize: 12 }}>{value}</span>} />
            <Bar dataKey="Gelir" fill="#22C55E" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Gider" fill="#EF4444" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Kâr" fill="#3B82F6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Aylık Tablo */}
      <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl overflow-hidden">
        <div className="p-5 border-b border-[#2A2A2A]">
          <h3 className="text-white font-semibold">Aylık Detay Tablosu</h3>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#2A2A2A]">
              {['Ay', 'Gelir', 'Gider', 'Net Kâr', 'Kâr Marjı'].map(h => (
                <th key={h} className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...monthlyData].reverse().map((row, i) => {
              const margin = row.Gelir > 0 ? Math.round((row.Kâr / row.Gelir) * 100) : 0
              return (
                <tr key={i} className="border-b border-[#1A1A1A] hover:bg-[#1E1E1E] transition-colors">
                  <td className="px-5 py-3 text-white font-medium">{row.ay}</td>
                  <td className="px-5 py-3 text-green-400">₺{row.Gelir.toLocaleString('tr-TR')}</td>
                  <td className="px-5 py-3 text-red-400">₺{row.Gider.toLocaleString('tr-TR')}</td>
                  <td className={`px-5 py-3 font-semibold ${row.Kâr >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {row.Kâr >= 0 ? '+' : ''}₺{row.Kâr.toLocaleString('tr-TR')}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`text-sm font-medium ${margin >= 30 ? 'text-green-400' : margin >= 0 ? 'text-yellow-400' : 'text-red-400'}`}>
                      %{margin}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
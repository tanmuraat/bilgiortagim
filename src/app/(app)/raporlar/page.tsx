// ============================================================
// RAPORLAR — src/app/(app)/raporlar/page.tsx
// ============================================================
'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns'
import { tr } from 'date-fns/locale'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { Download, TrendingUp, Car, Users, DollarSign } from 'lucide-react'

export default function RaporlarPage() {
  const supabase = createClient()
  const [monthlyData, setMonthlyData] = useState<any[]>([])
  const [vehicleStats, setVehicleStats] = useState<any[]>([])
  const [summary, setSummary] = useState({ totalIncome: 0, totalExpense: 0, totalRentals: 0, totalCustomers: 0 })
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const months = Array.from({ length: 6 }, (_, i) => {
      const d = subMonths(new Date(), 5 - i)
      return { date: d, start: format(startOfMonth(d), 'yyyy-MM-dd'), end: format(endOfMonth(d), 'yyyy-MM-dd'), label: format(d, 'MMM yy', { locale: tr }) }
    })

    const [txRes, rentalsRes, vehiclesRes] = await Promise.all([
      supabase.from('transactions').select('*').eq('user_id', user.id).gte('transaction_date', months[0].start),
      supabase.from('rentals').select('*, vehicles(plate, brand, model)').eq('user_id', user.id),
      supabase.from('vehicles').select('*').eq('user_id', user.id),
    ])

    const txData = txRes.data || []
    const rentalsData = rentalsRes.data || []
    const vehiclesData = vehiclesRes.data || []

    const rows = months.map(m => {
      const monthTx = txData.filter(t => t.transaction_date >= m.start && t.transaction_date <= m.end)
      const income = monthTx.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
      const expense = monthTx.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
      const rentals = rentalsData.filter(r => r.start_date >= m.start && r.start_date <= m.end).length
      return { ay: m.label, Gelir: income, Gider: expense, Kâr: income - expense, Kiralama: rentals }
    })
    setMonthlyData(rows)

    // Araç bazlı kiralama sayısı
    const vStats = vehiclesData.map(v => ({
      plate: v.plate,
      brand: v.brand,
      rentals: rentalsData.filter(r => r.vehicle_id === v.id).length,
      income: rentalsData.filter(r => r.vehicle_id === v.id).reduce((s, r) => s + Number(r.paid_amount || 0), 0),
    })).sort((a, b) => b.rentals - a.rentals)
    setVehicleStats(vStats)

    const totalIncome = txData.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
    const totalExpense = txData.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
    setSummary({ totalIncome, totalExpense, totalRentals: rentalsData.length, totalCustomers: new Set(rentalsData.map(r => r.customer_tc_hash).filter(Boolean)).size })
    setLoading(false)
  }, [supabase])

  useEffect(() => { fetchData() }, [fetchData])

  if (loading) return <div className="flex items-center justify-center h-96"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500" /></div>

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Raporlar</h1>
          <p className="text-gray-400 text-sm mt-1">Son 6 aylık performans özeti</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Toplam Gelir (6 Ay)', value: `₺${summary.totalIncome.toLocaleString('tr-TR')}`, icon: TrendingUp, color: 'text-green-400', bg: 'bg-green-400/10' },
          { label: 'Toplam Gider (6 Ay)', value: `₺${summary.totalExpense.toLocaleString('tr-TR')}`, icon: DollarSign, color: 'text-red-400', bg: 'bg-red-400/10' },
          { label: 'Toplam Kiralama', value: summary.totalRentals, icon: Car, color: 'text-blue-400', bg: 'bg-blue-400/10' },
          { label: 'Benzersiz Müşteri', value: summary.totalCustomers, icon: Users, color: 'text-purple-400', bg: 'bg-purple-400/10' },
        ].map((s, i) => (
          <div key={i} className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-gray-400 text-sm">{s.label}</span>
              <div className={`${s.bg} p-2 rounded-lg`}><s.icon size={14} className={s.color} /></div>
            </div>
            <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-5">
          <h3 className="text-white font-semibold mb-4">Aylık Gelir / Gider</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
              <XAxis dataKey="ay" tick={{ fill: '#6B7280', fontSize: 11 }} />
              <YAxis tick={{ fill: '#6B7280', fontSize: 11 }} tickFormatter={v => `₺${(v/1000).toFixed(0)}K`} />
              <Tooltip contentStyle={{ backgroundColor: '#1E1E1E', border: '1px solid #2A2A2A', borderRadius: 8 }} formatter={(v: any) => [`₺${Number(v).toLocaleString('tr-TR')}`, '']} />
              <Legend formatter={v => <span style={{ color: '#9CA3AF', fontSize: 12 }}>{v}</span>} />
              <Bar dataKey="Gelir" fill="#22C55E" radius={[4,4,0,0]} />
              <Bar dataKey="Gider" fill="#EF4444" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-5">
          <h3 className="text-white font-semibold mb-4">Aylık Kiralama Sayısı</h3>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
              <XAxis dataKey="ay" tick={{ fill: '#6B7280', fontSize: 11 }} />
              <YAxis tick={{ fill: '#6B7280', fontSize: 11 }} />
              <Tooltip contentStyle={{ backgroundColor: '#1E1E1E', border: '1px solid #2A2A2A', borderRadius: 8 }} />
              <Line type="monotone" dataKey="Kiralama" stroke="#3B82F6" strokeWidth={2} dot={{ fill: '#3B82F6', r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl overflow-hidden">
        <div className="p-5 border-b border-[#2A2A2A]">
          <h3 className="text-white font-semibold">Araç Bazlı Performans</h3>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#2A2A2A]">
              {['Plaka', 'Marka', 'Toplam Kiralama', 'Toplam Gelir'].map(h => (
                <th key={h} className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {vehicleStats.map((v, i) => (
              <tr key={i} className="border-b border-[#1A1A1A] hover:bg-[#1E1E1E] transition-colors">
                <td className="px-5 py-3 text-white font-bold">{v.plate}</td>
                <td className="px-5 py-3 text-gray-400">{v.brand}</td>
                <td className="px-5 py-3"><span className="text-blue-400 font-semibold">{v.rentals}</span> <span className="text-gray-500 text-xs">kez</span></td>
                <td className="px-5 py-3 text-green-400 font-semibold">₺{v.income.toLocaleString('tr-TR')}</td>
              </tr>
            ))}
            {vehicleStats.length === 0 && <tr><td colSpan={4} className="text-center text-gray-500 py-8 text-sm">Henüz veri yok</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
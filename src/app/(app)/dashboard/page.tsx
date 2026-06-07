'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { tr } from 'date-fns/locale'
import { Car, Calendar, TrendingUp, TrendingDown, DollarSign, Clock } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'

export default function DashboardPage() {
  const supabase = createClient()
  const [profile, setProfile] = useState<any>(null)
  const [vehicles, setVehicles] = useState<any[]>([])
  const [rentals, setRentals] = useState<any[]>([])
  const [upcomingReturns, setUpcomingReturns] = useState<any[]>([])
  const [recentActivity, setRecentActivity] = useState<any[]>([])
  const [stats, setStats] = useState({ rentedDays: 0, activeRentals: 0, totalVehicles: 0, monthlyIncome: 0, monthlyProfit: 0, monthlyExpense: 0 })
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const now = new Date()
    const monthStart = format(startOfMonth(now), 'yyyy-MM-dd')
    const monthEnd = format(endOfMonth(now), 'yyyy-MM-dd')

    const [profileRes, vehiclesRes, rentalsRes, txRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('vehicles').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('rentals').select('*, vehicles(plate, brand, model)').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('transactions').select('*').eq('user_id', user.id).gte('transaction_date', monthStart).lte('transaction_date', monthEnd),
    ])

    const vehiclesData = vehiclesRes.data || []
    const rentalsData = rentalsRes.data || []
    const txData = txRes.data || []

    setProfile(profileRes.data)
    setVehicles(vehiclesData.slice(0, 6))

    const activeRentals = rentalsData.filter(r => r.status === 'active')
    const monthRentals = rentalsData.filter(r => r.start_date >= monthStart && r.start_date <= monthEnd)
    const monthlyIncome = txData.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
    const monthlyExpense = txData.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
    const rentedDays = monthRentals.reduce((s, r) => {
      const start = new Date(r.start_date)
      const end = new Date(r.end_date)
      return s + Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    }, 0)

    setStats({
      rentedDays,
      activeRentals: activeRentals.length,
      totalVehicles: vehiclesData.length,
      monthlyIncome,
      monthlyExpense,
      monthlyProfit: monthlyIncome - monthlyExpense,
    })

    setUpcomingReturns(
      rentalsData.filter(r => r.status === 'active' && new Date(r.end_date) >= now)
        .sort((a, b) => new Date(a.end_date).getTime() - new Date(b.end_date).getTime())
        .slice(0, 5)
    )

    setRecentActivity(rentalsData.slice(0, 4))
    setRentals(rentalsData)
    setLoading(false)
  }, [supabase])

  useEffect(() => { fetchData() }, [fetchData])

  const pieData = [
    { name: 'Gelir', value: stats.monthlyIncome, color: '#22C55E' },
    { name: 'Gider', value: stats.monthlyExpense, color: '#EF4444' },
  ]

  const vehicleStatusColor: Record<string, string> = {
    available: 'text-green-400',
    rented: 'text-blue-400',
    maintenance: 'text-yellow-400',
  }
  const vehicleStatusLabel: Record<string, string> = {
    available: 'Boşta',
    rented: 'Kirada',
    maintenance: 'Bakımda',
  }

  if (loading) return (
    <div className="flex items-center justify-center h-96">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500" />
    </div>
  )

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Hoş geldiniz, {profile?.company_name} 👋
          </h1>
          <p className="text-gray-400 text-sm mt-1">İşletmenizin genel durumunu aşağıdan takip edebilirsiniz.</p>
        </div>
        <div className="text-gray-400 text-sm">{format(new Date(), 'MMMM yyyy', { locale: tr })}</div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-5 gap-4">
        {[
          { label: 'Bu Ay Kiralanan Gün', value: stats.rentedDays, icon: Calendar, color: 'text-blue-400', bg: 'bg-blue-400/10', suffix: 'gün' },
          { label: 'Aktif Kiralamalar', value: stats.activeRentals, icon: Car, color: 'text-purple-400', bg: 'bg-purple-400/10', suffix: '' },
          { label: 'Toplam Araç', value: stats.totalVehicles, icon: Car, color: 'text-gray-400', bg: 'bg-gray-400/10', suffix: '' },
          { label: 'Bu Ay Gelir', value: `₺${stats.monthlyIncome.toLocaleString('tr-TR')}`, icon: TrendingUp, color: 'text-green-400', bg: 'bg-green-400/10', suffix: '' },
          { label: 'Bu Ay Kâr', value: `₺${stats.monthlyProfit.toLocaleString('tr-TR')}`, icon: DollarSign, color: stats.monthlyProfit >= 0 ? 'text-green-400' : 'text-red-400', bg: stats.monthlyProfit >= 0 ? 'bg-green-400/10' : 'bg-red-400/10', suffix: '' },
        ].map((s, i) => (
          <div key={i} className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-gray-400 text-xs leading-tight">{s.label}</span>
              <div className={`${s.bg} p-2 rounded-lg flex-shrink-0`}><s.icon size={14} className={s.color} /></div>
            </div>
            <div className={`text-xl font-bold ${s.color}`}>{s.value}{s.suffix && <span className="text-sm font-normal ml-1">{s.suffix}</span>}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Vehicles Table */}
        <div className="col-span-2 bg-[#141414] border border-[#2A2A2A] rounded-xl overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-[#2A2A2A]">
            <h3 className="text-white font-semibold">Araçlarım</h3>
            <a href="/araclarim" className="text-red-400 text-xs hover:text-red-300">Tüm Araçları Gör →</a>
          </div>
          {vehicles.length === 0 ? (
            <div className="p-8 text-center text-gray-500 text-sm">Henüz araç eklenmemiş</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#1A1A1A]">
                  {['Plaka', 'Marka', 'Model', 'Yıl', 'Durum'].map(h => (
                    <th key={h} className="text-left text-xs text-gray-500 px-5 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {vehicles.map(v => (
                  <tr key={v.id} className="border-b border-[#1A1A1A] hover:bg-[#1E1E1E] transition-colors">
                    <td className="px-5 py-3 text-white text-sm font-medium">{v.plate}</td>
                    <td className="px-5 py-3 text-gray-400 text-sm">{v.brand}</td>
                    <td className="px-5 py-3 text-gray-400 text-sm">{v.model}</td>
                    <td className="px-5 py-3 text-gray-400 text-sm">{v.year}</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-medium ${vehicleStatusColor[v.status] || 'text-gray-400'}`}>
                        ● {vehicleStatusLabel[v.status] || v.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Right Panel */}
        <div className="space-y-4">
          {/* Upcoming Returns */}
          <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl">
            <div className="flex items-center justify-between p-4 border-b border-[#2A2A2A]">
              <h3 className="text-white font-semibold text-sm">Yaklaşan Teslimler</h3>
              <a href="/kiralama-takvimi" className="text-red-400 text-xs">Tümünü Gör →</a>
            </div>
            <div className="divide-y divide-[#1A1A1A]">
              {upcomingReturns.length === 0 ? (
                <div className="p-4 text-center text-gray-500 text-xs">Yaklaşan teslimat yok</div>
              ) : upcomingReturns.map(r => (
                <div key={r.id} className="flex items-center gap-3 p-3">
                  <div className="text-center bg-[#1E1E1E] rounded-lg px-2 py-1 min-w-[36px]">
                    <div className="text-white text-sm font-bold">{format(new Date(r.end_date), 'd')}</div>
                    <div className="text-gray-500 text-[9px]">{format(new Date(r.end_date), 'MMM', { locale: tr })}</div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-xs font-medium">{r.vehicles?.plate}</div>
                    <div className="text-gray-500 text-[10px] truncate">{r.customer_name}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Income/Expense Donut */}
          <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-semibold text-sm">Gelir – Gider</h3>
              <span className="text-gray-500 text-xs">Bu Ay</span>
            </div>
            {stats.monthlyIncome === 0 && stats.monthlyExpense === 0 ? (
              <div className="text-center text-gray-500 text-xs py-4">Henüz veri yok</div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={120}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={35} outerRadius={55} dataKey="value" paddingAngle={3}>
                      {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#1E1E1E', border: '1px solid #2A2A2A', borderRadius: 8 }} formatter={(v: any) => [`₺${Number(v).toLocaleString('tr-TR')}`, '']} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex justify-between mt-2">
                  <div className="text-center">
                    <div className="text-green-400 text-xs font-bold">₺{stats.monthlyIncome.toLocaleString('tr-TR')}</div>
                    <div className="text-gray-500 text-[10px]">Gelir</div>
                  </div>
                  <div className="text-center">
                    <div className="text-white text-xs font-bold">₺{stats.monthlyProfit.toLocaleString('tr-TR')}</div>
                    <div className="text-gray-500 text-[10px]">Kâr</div>
                  </div>
                  <div className="text-center">
                    <div className="text-red-400 text-xs font-bold">₺{stats.monthlyExpense.toLocaleString('tr-TR')}</div>
                    <div className="text-gray-500 text-[10px]">Gider</div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl">
        <div className="flex items-center justify-between p-5 border-b border-[#2A2A2A]">
          <h3 className="text-white font-semibold">Son İşlemler</h3>
          <a href="/kiralama-takvimi" className="text-red-400 text-xs">Tümünü Gör →</a>
        </div>
        <div className="divide-y divide-[#1A1A1A]">
          {recentActivity.length === 0 ? (
            <div className="p-8 text-center text-gray-500 text-sm">Henüz işlem yok</div>
          ) : recentActivity.map(r => (
            <div key={r.id} className="flex items-center gap-4 px-5 py-3">
              <div className="w-8 h-8 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <Car size={14} className="text-green-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-white text-sm">{r.customer_name} adlı müşteriye <span className="font-medium">{r.vehicles?.plate}</span> plakalı araç kiralandı.</div>
                <div className="text-gray-500 text-xs mt-0.5">{r.vehicles?.brand} {r.vehicles?.model}</div>
              </div>
              <div className="text-gray-500 text-xs flex-shrink-0">
                {format(new Date(r.created_at), 'dd.MM.yyyy HH:mm')}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
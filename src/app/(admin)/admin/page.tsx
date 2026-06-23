'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { tr } from 'date-fns/locale'
import { Users, Clock, CreditCard, Search, TrendingUp, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import Link from 'next/link'

export default function AdminDashboard() {
  const supabase = createClient()
  const [stats, setStats] = useState({ totalUsers: 0, pendingApprovals: 0, proSubs: 0, premiumSubs: 0, queriesToday: 0, queriesMonth: 0, revenueMonth: 0 })
  const [recentUsers, setRecentUsers] = useState<any[]>([])
  const [recentQueries, setRecentQueries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const now = new Date()
    const monthStart = format(startOfMonth(now), 'yyyy-MM-dd')
    const monthEnd = format(endOfMonth(now), 'yyyy-MM-dd')
    const todayStart = format(now, 'yyyy-MM-dd') + 'T00:00:00'
    const todayEnd = format(now, 'yyyy-MM-dd') + 'T23:59:59'

    const [
      usersRes, pendingRes, proRes, premiumRes,
      todayQRes, monthQRes, revenueRes,
      recentUsersRes, recentQueriesRes
    ] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'user'),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('subscription_plan', 'pro'),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('subscription_plan', 'premium'),
      supabase.from('query_logs').select('*', { count: 'exact', head: true }).gte('queried_at', todayStart).lte('queried_at', todayEnd),
      supabase.from('query_logs').select('*', { count: 'exact', head: true }).gte('queried_at', monthStart).lte('queried_at', monthEnd),
      supabase.from('subscriptions').select('price').gte('created_at', monthStart).lte('created_at', monthEnd).eq('payment_status', 'completed'),
      supabase.from('profiles').select('id, full_name, company_name, status, subscription_plan, created_at').eq('role', 'user').order('created_at', { ascending: false }).limit(5),
      supabase.from('query_logs').select('*, profiles!query_logs_user_id_fkey(company_name)').order('queried_at', { ascending: false }).limit(8),
    ])

    const revenueMonth = (revenueRes.data || []).reduce((s: number, r: any) => s + Number(r.price), 0)
    setStats({
      totalUsers: usersRes.count || 0,
      pendingApprovals: pendingRes.count || 0,
      proSubs: proRes.count || 0,
      premiumSubs: premiumRes.count || 0,
      queriesToday: todayQRes.count || 0,
      queriesMonth: monthQRes.count || 0,
      revenueMonth,
    })
    setRecentUsers(recentUsersRes.data || [])
    setRecentQueries(recentQueriesRes.data || [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { fetchData() }, [fetchData])

  if (loading) return (
    <div className="flex items-center justify-center h-96">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
    </div>
  )

  const statCards = [
    { label: 'Toplam Kullanıcı', value: stats.totalUsers, icon: Users, color: 'text-blue-400', bg: 'bg-blue-400/10', href: '/admin/kullanicilar' },
    { label: 'Onay Bekleyen', value: stats.pendingApprovals, icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-400/10', href: '/admin/onay-bekleyenler' },
    { label: 'Pro Aboneler', value: stats.proSubs, icon: CreditCard, color: 'text-purple-400', bg: 'bg-purple-400/10', href: '/admin/abonelikler' },
    { label: 'Premium Aboneler', value: stats.premiumSubs, icon: CreditCard, color: 'text-green-400', bg: 'bg-green-400/10', href: '/admin/abonelikler' },
    { label: 'Bugün Sorgu', value: stats.queriesToday, icon: Search, color: 'text-orange-400', bg: 'bg-orange-400/10', href: '/admin/sorgu-loglari' },
    { label: 'Bu Ay Sorgu', value: stats.queriesMonth, icon: Search, color: 'text-cyan-400', bg: 'bg-cyan-400/10', href: '/admin/sorgu-loglari' },
    { label: 'Bu Ay Gelir', value: `₺${stats.revenueMonth.toLocaleString('tr-TR')}`, icon: TrendingUp, color: 'text-green-400', bg: 'bg-green-400/10', href: '/admin/abonelikler' },
  ]

  const statusBadge = (status: string) => {
    if (status === 'approved') return <span className="text-[10px] bg-green-500/20 text-green-400 border border-green-500/30 px-2 py-0.5 rounded-full">Onaylı</span>
    if (status === 'pending') return <span className="text-[10px] bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 px-2 py-0.5 rounded-full">Bekliyor</span>
    return <span className="text-[10px] bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded-full">Reddedildi</span>
  }

  const planBadge = (plan: string) => {
    if (plan === 'premium') return <span className="text-[10px] bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full">Premium</span>
    if (plan === 'pro') return <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">Pro</span>
    return <span className="text-[10px] bg-gray-500/20 text-gray-400 px-2 py-0.5 rounded-full">Ücretsiz</span>
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
        <p className="text-gray-400 text-sm mt-1">{format(new Date(), 'dd MMMM yyyy, EEEE', { locale: tr })}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-4">
        {statCards.map((s, i) => (
          <Link key={i} href={s.href} className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-4 hover:border-[#3A3A3A] transition-colors block">
            <div className="flex items-center justify-between mb-3">
              <span className="text-gray-400 text-xs">{s.label}</span>
              <div className={`${s.bg} p-2 rounded-lg`}><s.icon size={14} className={s.color} /></div>
            </div>
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
          </Link>
        ))}
      </div>

      {/* Pending Alert */}
      {stats.pendingApprovals > 0 && (
        <Link href="/admin/onay-bekleyenler" className="flex items-center gap-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 hover:bg-yellow-500/15 transition-colors">
          <AlertCircle size={20} className="text-yellow-400 flex-shrink-0" />
          <div className="flex-1">
            <div className="text-yellow-400 font-semibold text-sm">{stats.pendingApprovals} kullanıcı onay bekliyor</div>
            <div className="text-yellow-400/60 text-xs">Vergi levhalarını inceleyip onaylayın veya reddedin</div>
          </div>
          <span className="text-yellow-400 text-sm">İncele →</span>
        </Link>
      )}

      <div className="grid grid-cols-2 gap-6">
        {/* Son Kayıt Olan Kullanıcılar */}
        <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl">
          <div className="flex items-center justify-between p-5 border-b border-[#2A2A2A]">
            <h3 className="text-white font-semibold">Son Kayıt Olan Kullanıcılar</h3>
            <Link href="/admin/kullanicilar" className="text-red-400 text-xs hover:text-red-300">Tümünü Gör →</Link>
          </div>
          <div className="divide-y divide-[#1A1A1A]">
            {recentUsers.map(u => (
              <div key={u.id} className="flex items-center gap-3 px-5 py-3">
                <div className="w-8 h-8 bg-[#2A2A2A] rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {(u.full_name || u.company_name || '?')[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-white text-sm font-medium truncate">{u.company_name || u.full_name}</div>
                  <div className="text-gray-500 text-xs">{format(new Date(u.created_at), 'dd MMM yyyy', { locale: tr })}</div>
                </div>
                <div className="flex items-center gap-2">
                  {planBadge(u.subscription_plan)}
                  {statusBadge(u.status)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Son Sorgular */}
        <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl">
          <div className="flex items-center justify-between p-5 border-b border-[#2A2A2A]">
            <h3 className="text-white font-semibold">Son Müşteri Sorguları</h3>
            <Link href="/admin/sorgu-loglari" className="text-red-400 text-xs hover:text-red-300">Tümünü Gör →</Link>
          </div>
          <div className="divide-y divide-[#1A1A1A]">
            {recentQueries.map(q => (
              <div key={q.id} className="flex items-center gap-3 px-5 py-3">
                <Search size={14} className="text-gray-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-white text-sm truncate">{q.profiles?.company_name || 'Bilinmiyor'}</div>
                  <div className="text-gray-500 text-xs">{q.customer_name || '—'}</div>
                </div>
                <div className="text-gray-500 text-xs flex-shrink-0">
                  {format(new Date(q.queried_at), 'dd MMM HH:mm', { locale: tr })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
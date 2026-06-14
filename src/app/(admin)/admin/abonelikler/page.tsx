'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'
import { CreditCard, TrendingUp, Users, Calendar } from 'lucide-react'

export default function AboneliklerPage() {
  const supabase = createClient()
  const [subscriptions, setSubscriptions] = useState<any[]>([])
  const [stats, setStats] = useState({ total: 0, pro: 0, premium: 0, revenue: 0 })
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const { data: subs } = await supabase
      .from('subscriptions')
      .select('*, profiles(company_name, full_name, email, auto_renew)')
      .order('created_at', { ascending: false })

    const subsData = subs || []
    setSubscriptions(subsData)

    const pro = subsData.filter(s => s.plan === 'pro' && s.payment_status === 'completed').length
    const premium = subsData.filter(s => s.plan === 'premium' && s.payment_status === 'completed').length
    const revenue = subsData.filter(s => s.payment_status === 'completed').reduce((sum, s) => sum + Number(s.price || 0), 0)
    setStats({ total: subsData.length, pro, premium, revenue })
    setLoading(false)
  }, [supabase])

  useEffect(() => { fetchData() }, [fetchData])

  if (loading) return <div className="flex items-center justify-center h-96"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500" /></div>

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Abonelikler</h1>
        <p className="text-gray-400 text-sm mt-1">Tüm abonelik geçmişi</p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Toplam Abonelik', value: stats.total, icon: CreditCard, color: 'text-blue-400', bg: 'bg-blue-400/10' },
          { label: 'Pro Aboneler', value: stats.pro, icon: Users, color: 'text-purple-400', bg: 'bg-purple-400/10' },
          { label: 'Premium Aboneler', value: stats.premium, icon: Users, color: 'text-green-400', bg: 'bg-green-400/10' },
          { label: 'Toplam Gelir', value: `₺${stats.revenue.toLocaleString('tr-TR')}`, icon: TrendingUp, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
        ].map((s, i) => (
          <div key={i} className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-gray-400 text-sm">{s.label}</span>
              <div className={`${s.bg} p-2 rounded-lg`}><s.icon size={14} className={s.color} /></div>
            </div>
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#2A2A2A]">
              {['Firma', 'Plan', 'Süre', 'Fiyat', 'Başlangıç', 'Bitiş', 'Oto. Yenileme', 'Durum'].map(h => (
                <th key={h} className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {subscriptions.length === 0 ? (
              <tr><td colSpan={8} className="text-center text-gray-500 py-12 text-sm">Henüz abonelik kaydı yok</td></tr>
            ) : subscriptions.map(s => (
              <tr key={s.id} className="border-b border-[#1A1A1A] hover:bg-[#1E1E1E] transition-colors">
                <td className="px-4 py-3">
                  <div className="text-white text-sm font-medium">{s.profiles?.company_name || s.profiles?.full_name}</div>
                  <div className="text-gray-500 text-xs">{s.profiles?.email}</div>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full ${s.plan === 'premium' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'}`}>
                    {s.plan === 'premium' ? 'Premium' : 'Pro'}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-400 text-sm">{s.months} ay</td>
                <td className="px-4 py-3 text-green-400 font-semibold text-sm">₺{Number(s.price || 0).toLocaleString('tr-TR')}</td>
                <td className="px-4 py-3 text-gray-400 text-sm">{format(new Date(s.starts_at), 'dd MMM yyyy', { locale: tr })}</td>
                <td className="px-4 py-3 text-gray-400 text-sm">{format(new Date(s.ends_at), 'dd MMM yyyy', { locale: tr })}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs ${s.profiles?.auto_renew ? 'text-green-400' : 'text-gray-500'}`}>
                    {s.profiles?.auto_renew ? '✓ Aktif' : '✗ Kapalı'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-1 rounded-full ${s.payment_status === 'completed' ? 'bg-green-500/20 text-green-400' : s.payment_status === 'manual' ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-500/20 text-gray-400'}`}>
                    {s.payment_status === 'completed' ? 'Tamamlandı' : s.payment_status === 'manual' ? 'Manuel' : s.payment_status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
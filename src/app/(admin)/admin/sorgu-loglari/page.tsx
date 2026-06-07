'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'
import { Search } from 'lucide-react'

export default function SorguLoglariPage() {
  const supabase = createClient()
  const [logs, setLogs] = useState<any[]>([])
  const [userStats, setUserStats] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [logsRes, profilesRes] = await Promise.all([
      supabase.from('query_logs').select('*, profiles(company_name, full_name)').order('queried_at', { ascending: false }).limit(100),
      supabase.from('profiles').select('id, company_name, full_name, subscription_plan').eq('role', 'user').eq('status', 'approved'),
    ])

    const logsData = logsRes.data || []
    setLogs(logsData)

    // Kullanıcı bazlı istatistik
    const statsMap: Record<string, any> = {}
    logsData.forEach((l: any) => {
      const uid = l.user_id
      if (!statsMap[uid]) {
        statsMap[uid] = {
          company_name: l.profiles?.company_name || l.profiles?.full_name || '—',
          total: 0, today: 0,
        }
      }
      statsMap[uid].total++
      if (new Date(l.queried_at).toDateString() === new Date().toDateString()) statsMap[uid].today++
    })
    const statsArr = Object.entries(statsMap).map(([id, v]: any) => ({ id, ...v })).sort((a, b) => b.total - a.total)
    setUserStats(statsArr)
    setLoading(false)
  }, [supabase])

  useEffect(() => { fetchData() }, [fetchData])

  const filteredLogs = search
    ? logs.filter(l => (l.profiles?.company_name + l.customer_name).toLowerCase().includes(search.toLowerCase()))
    : logs

  if (loading) return <div className="flex items-center justify-center h-96"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500" /></div>

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Sorgu Logları</h1>
        <p className="text-gray-400 text-sm">Toplam {logs.length} sorgu kaydı</p>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Kullanıcı Bazlı İstatistik */}
        <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl">
          <div className="p-4 border-b border-[#2A2A2A]">
            <h3 className="text-white font-semibold text-sm">Kullanıcı Bazlı Sorgu</h3>
          </div>
          <div className="divide-y divide-[#1A1A1A]">
            {userStats.map((u, i) => (
              <div key={u.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <div className="text-white text-sm">{u.company_name}</div>
                  <div className="text-gray-500 text-xs">Bugün: {u.today}</div>
                </div>
                <div className="text-right">
                  <div className="text-white font-bold">{u.total}</div>
                  <div className="text-gray-500 text-[10px]">toplam</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Log Listesi */}
        <div className="col-span-2 bg-[#141414] border border-[#2A2A2A] rounded-xl">
          <div className="p-4 border-b border-[#2A2A2A]">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Firma veya müşteri ara..."
                className="w-full bg-[#1E1E1E] border border-[#2A2A2A] text-white rounded-lg pl-8 pr-3 py-2 text-sm focus:border-red-500 outline-none" />
            </div>
          </div>
          <div className="divide-y divide-[#1A1A1A] max-h-[500px] overflow-y-auto">
            {filteredLogs.map(l => (
              <div key={l.id} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <Search size={13} className="text-gray-600 flex-shrink-0" />
                  <div>
                    <div className="text-white text-sm">{l.profiles?.company_name || '—'}</div>
                    <div className="text-gray-500 text-xs">{l.customer_name || 'Anonim sorgu'}</div>
                  </div>
                </div>
                <div className="text-gray-500 text-xs">{format(new Date(l.queried_at), 'dd MMM HH:mm', { locale: tr })}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
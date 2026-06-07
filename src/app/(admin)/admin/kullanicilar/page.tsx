'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'
import { Search, Users, RefreshCw, X, Eye } from 'lucide-react'

export default function KullanicilarPage() {
  const supabase = createClient()
  const [users, setUsers] = useState<any[]>([])
  const [filtered, setFiltered] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterPlan, setFilterPlan] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterRenew, setFilterRenew] = useState('all')
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [userQueryCount, setUserQueryCount] = useState(0)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('profiles').select('*').eq('role', 'user').order('created_at', { ascending: false })
    setUsers(data || [])
    setFiltered(data || [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { fetchData() }, [fetchData])

  useEffect(() => {
    let result = users
    if (search) result = result.filter(u => (u.company_name + u.full_name + u.email).toLowerCase().includes(search.toLowerCase()))
    if (filterPlan !== 'all') result = result.filter(u => u.subscription_plan === filterPlan)
    if (filterStatus !== 'all') result = result.filter(u => u.status === filterStatus)
    if (filterRenew === 'auto') result = result.filter(u => u.auto_renew === true)
    if (filterRenew === 'manual') result = result.filter(u => !u.auto_renew)
    setFiltered(result)
  }, [search, filterPlan, filterStatus, filterRenew, users])

  const openDetail = async (user: any) => {
    setSelectedUser(user)
    const { count } = await supabase.from('query_logs').select('*', { count: 'exact', head: true }).eq('user_id', user.id)
    setUserQueryCount(count || 0)
  }

  const handleManualSub = async (userId: string, plan: string, months: number) => {
    const now = new Date()
    const end = new Date(now)
    end.setMonth(end.getMonth() + months)
    await supabase.from('profiles').update({
      subscription_plan: plan,
      subscription_start: format(now, 'yyyy-MM-dd'),
      subscription_end: format(end, 'yyyy-MM-dd'),
      sub_warning_sent: false,
    }).eq('id', userId)
    await supabase.from('subscriptions').insert({
      user_id: userId, plan, months, price: 0,
      payment_method: 'manual', payment_status: 'completed',
      starts_at: format(now, 'yyyy-MM-dd'), ends_at: format(end, 'yyyy-MM-dd'),
    })
    fetchData()
    setSelectedUser(null)
    alert('Abonelik başarıyla eklendi.')
  }

  const statusBadge = (s: string) => ({
    approved: <span className="text-[10px] bg-green-500/20 text-green-400 border border-green-500/30 px-2 py-0.5 rounded-full">Onaylı</span>,
    pending: <span className="text-[10px] bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 px-2 py-0.5 rounded-full">Bekliyor</span>,
    rejected: <span className="text-[10px] bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded-full">Reddedildi</span>,
  }[s] || null)

  const planBadge = (p: string) => ({
    premium: <span className="text-[10px] bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full border border-purple-500/30">Premium</span>,
    pro: <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full border border-blue-500/30">Pro</span>,
    none: <span className="text-[10px] bg-gray-500/20 text-gray-400 px-2 py-0.5 rounded-full border border-gray-500/30">Ücretsiz</span>,
  }[p] || null)

  const renewBadge = (autoRenew: boolean) => autoRenew
    ? <span className="text-[10px] bg-green-500/20 text-green-400 border border-green-500/30 px-2 py-0.5 rounded-full flex items-center gap-1 w-fit"><RefreshCw size={8} /> Otomatik</span>
    : <span className="text-[10px] bg-gray-500/20 text-gray-400 border border-gray-500/30 px-2 py-0.5 rounded-full w-fit">Manuel</span>

  // İstatistikler
  const autoRenewCount = users.filter(u => u.auto_renew).length
  const manualCount = users.filter(u => !u.auto_renew && u.subscription_plan !== 'none').length

  if (loading) return <div className="flex items-center justify-center h-96"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500" /></div>

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Kullanıcılar</h1>
          <p className="text-gray-400 text-sm">{filtered.length} kullanıcı</p>
        </div>
      </div>

      {/* Özet kartlar */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Toplam Kullanıcı', value: users.length, color: 'text-white' },
          { label: 'Otomatik Yenileme', value: autoRenewCount, color: 'text-green-400', desc: 'Devamlı abone' },
          { label: 'Manuel Yenileme', value: manualCount, color: 'text-yellow-400', desc: 'Takip gerekli' },
          { label: 'Abonesiз', value: users.filter(u => u.subscription_plan === 'none').length, color: 'text-gray-400' },
        ].map((s, i) => (
          <div key={i} className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-4">
            <div className="text-gray-400 text-sm mb-1">{s.label}</div>
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            {s.desc && <div className="text-gray-500 text-xs mt-0.5">{s.desc}</div>}
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Firma adı, isim veya email ara..."
            className="w-full bg-[#141414] border border-[#2A2A2A] text-white rounded-lg pl-9 pr-3 py-2.5 text-sm focus:border-red-500 outline-none" />
        </div>
        <select value={filterPlan} onChange={e => setFilterPlan(e.target.value)}
          className="bg-[#141414] border border-[#2A2A2A] text-white rounded-lg px-3 py-2.5 text-sm focus:border-red-500 outline-none">
          <option value="all">Tüm Planlar</option>
          <option value="none">Ücretsiz</option>
          <option value="pro">Pro</option>
          <option value="premium">Premium</option>
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="bg-[#141414] border border-[#2A2A2A] text-white rounded-lg px-3 py-2.5 text-sm focus:border-red-500 outline-none">
          <option value="all">Tüm Durumlar</option>
          <option value="approved">Onaylı</option>
          <option value="pending">Bekliyor</option>
          <option value="rejected">Reddedildi</option>
        </select>
        <select value={filterRenew} onChange={e => setFilterRenew(e.target.value)}
          className="bg-[#141414] border border-[#2A2A2A] text-white rounded-lg px-3 py-2.5 text-sm focus:border-red-500 outline-none">
          <option value="all">Tüm Yenileme</option>
          <option value="auto">Otomatik</option>
          <option value="manual">Manuel</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#2A2A2A]">
              {['Firma / Kullanıcı', 'Email', 'Plan', 'Yenileme', 'Durum', 'Abonelik Bitiş', 'Kayıt Tarihi', ''].map(h => (
                <th key={h} className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(u => (
              <tr key={u.id} className="border-b border-[#1A1A1A] hover:bg-[#1E1E1E] transition-colors">
                <td className="px-4 py-3">
                  <div className="text-white text-sm font-medium">{u.company_name}</div>
                  <div className="text-gray-500 text-xs">{u.full_name}</div>
                </td>
                <td className="px-4 py-3 text-gray-400 text-sm">{u.email}</td>
                <td className="px-4 py-3">{planBadge(u.subscription_plan)}</td>
                <td className="px-4 py-3">{renewBadge(u.auto_renew)}</td>
                <td className="px-4 py-3">{statusBadge(u.status)}</td>
                <td className="px-4 py-3">
                  {u.subscription_end ? (
                    <div>
                      <div className="text-gray-400 text-sm">{format(new Date(u.subscription_end), 'dd MMM yyyy', { locale: tr })}</div>
                      {u.auto_renew && <div className="text-green-400 text-[10px] flex items-center gap-1"><RefreshCw size={8} /> Otomatik yenilenir</div>}
                    </div>
                  ) : '—'}
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">{format(new Date(u.created_at), 'dd MMM yyyy', { locale: tr })}</td>
                <td className="px-4 py-3">
                  <button onClick={() => openDetail(u)} className="flex items-center gap-1.5 text-gray-400 hover:text-white text-xs border border-[#2A2A2A] hover:border-[#3A3A3A] px-2 py-1 rounded-lg transition-colors">
                    <Eye size={12} /> Detay
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detail Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-5 border-b border-[#2A2A2A]">
              <h2 className="text-white font-semibold">{selectedUser.company_name}</h2>
              <button onClick={() => setSelectedUser(null)} className="text-gray-400 hover:text-white"><X size={20} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Ad Soyad', value: selectedUser.full_name || '—' },
                  { label: 'Email', value: selectedUser.email },
                  { label: 'Toplam Sorgu', value: `${userQueryCount} sorgu` },
                  { label: 'Plan', value: selectedUser.subscription_plan },
                  { label: 'Otomatik Yenileme', value: selectedUser.auto_renew ? '✓ Aktif — Devamlı Abone' : '✗ Kapalı — Takip Gerekli' },
                  { label: 'Abonelik Bitiş', value: selectedUser.subscription_end ? format(new Date(selectedUser.subscription_end), 'dd MMM yyyy', { locale: tr }) : '—' },
                  { label: 'Hesap Durumu', value: selectedUser.status },
                  { label: 'Kayıt Tarihi', value: format(new Date(selectedUser.created_at), 'dd MMM yyyy', { locale: tr }) },
                ].map((item, i) => (
                  <div key={i} className="bg-[#1E1E1E] rounded-lg p-3">
                    <div className="text-gray-500 text-xs mb-1">{item.label}</div>
                    <div className={`text-sm font-medium ${item.label === 'Otomatik Yenileme' ? (selectedUser.auto_renew ? 'text-green-400' : 'text-yellow-400') : 'text-white'}`}>{item.value}</div>
                  </div>
                ))}
              </div>

              {/* Manuel Abonelik */}
              <div className="border-t border-[#2A2A2A] pt-4">
                <div className="text-gray-400 text-sm mb-3 font-medium">Manuel Abonelik Ekle</div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Pro — 1 Ay', plan: 'pro', months: 1 },
                    { label: 'Pro — 3 Ay', plan: 'pro', months: 3 },
                    { label: 'Pro — 12 Ay', plan: 'pro', months: 12 },
                    { label: 'Premium — 1 Ay', plan: 'premium', months: 1 },
                    { label: 'Premium — 3 Ay', plan: 'premium', months: 3 },
                    { label: 'Premium — 12 Ay', plan: 'premium', months: 12 },
                  ].map((opt, i) => (
                    <button key={i} onClick={() => handleManualSub(selectedUser.id, opt.plan, opt.months)}
                      className="bg-[#1E1E1E] border border-[#2A2A2A] text-gray-300 py-2 rounded-lg text-xs hover:border-red-500/50 hover:text-white transition-colors">
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
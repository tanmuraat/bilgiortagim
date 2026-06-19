'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'
import { CreditCard, TrendingUp, Users, Settings, Save, Check, Info } from 'lucide-react'

type Tab = 'gecmis' | 'limitler'

export default function AboneliklerPage() {
  const supabase = createClient()
  const [activeTab, setActiveTab] = useState<Tab>('gecmis')
  const [subscriptions, setSubscriptions] = useState<any[]>([])
  const [stats, setStats] = useState({ total: 0, pro: 0, premium: 0, revenue: 0 })
  const [loading, setLoading] = useState(true)

  // Limit ayarları
  const [limits, setLimits] = useState({
    pro: { per_vehicle: 1, min_limit: 5 },
    premium: { per_vehicle: 3, min_limit: 15 },
  })
  const [savingLimits, setSavingLimits] = useState(false)
  const [savedMsg, setSavedMsg] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [subsRes, settingsRes] = await Promise.all([
      supabase.from('subscriptions').select('*, profiles(company_name, full_name, email, auto_renew)').order('created_at', { ascending: false }),
      supabase.from('system_settings').select('*').eq('key', 'query_limits').maybeSingle(),
    ])

    const subsData = subsRes.data || []
    setSubscriptions(subsData)

    if (settingsRes.data?.value) {
      setLimits(settingsRes.data.value)
    }

    const pro = subsData.filter(s => s.plan === 'pro' && s.payment_status === 'completed').length
    const premium = subsData.filter(s => s.plan === 'premium' && s.payment_status === 'completed').length
    const revenue = subsData.filter(s => s.payment_status === 'completed').reduce((sum, s) => sum + Number(s.price || 0), 0)
    setStats({ total: subsData.length, pro, premium, revenue })
    setLoading(false)
  }, [supabase])

  useEffect(() => { fetchData() }, [fetchData])

  const handleSaveLimits = async () => {
    setSavingLimits(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('system_settings').upsert({
      key: 'query_limits',
      value: limits,
      description: 'Plan bazlı günlük müşteri sorgu limiti. per_vehicle: araç başına sorgu hakkı, min_limit: araç sayısı az olsa bile garanti edilen minimum hak.',
      updated_at: new Date().toISOString(),
      updated_by: user?.id,
    })
    setSavingLimits(false)
    setSavedMsg(true)
    setTimeout(() => setSavedMsg(false), 2500)
  }

  if (loading) return <div className="flex items-center justify-center h-96"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500" /></div>

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Abonelikler & Limitler</h1>
        <p className="text-gray-400 text-sm mt-1">Abonelik geçmişi ve sistem kullanım limitleri</p>
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

      <div className="flex bg-[#1E1E1E] border border-[#2A2A2A] rounded-lg p-1 w-fit gap-1">
        {([{ key: 'gecmis', label: 'Abonelik Geçmişi', icon: CreditCard }, { key: 'limitler', label: 'Kullanım Limitleri', icon: Settings }] as const).map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm transition-colors ${activeTab === key ? 'bg-red-600 text-white' : 'text-gray-400 hover:text-white'}`}>
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {/* ===== ABONELİK GEÇMİŞİ ===== */}
      {activeTab === 'gecmis' && (
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
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${s.plan === 'premium' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'}`}>{s.plan === 'premium' ? 'Premium' : 'Pro'}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-sm">{s.months} ay</td>
                  <td className="px-4 py-3 text-green-400 font-semibold text-sm">₺{Number(s.price || 0).toLocaleString('tr-TR')}</td>
                  <td className="px-4 py-3 text-gray-400 text-sm">{format(new Date(s.starts_at), 'dd MMM yyyy', { locale: tr })}</td>
                  <td className="px-4 py-3 text-gray-400 text-sm">{format(new Date(s.ends_at), 'dd MMM yyyy', { locale: tr })}</td>
                  <td className="px-4 py-3"><span className={`text-xs ${s.profiles?.auto_renew ? 'text-green-400' : 'text-gray-500'}`}>{s.profiles?.auto_renew ? '✓ Aktif' : '✗ Kapalı'}</span></td>
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
      )}

      {/* ===== KULLANIM LİMİTLERİ ===== */}
      {activeTab === 'limitler' && (
        <div className="space-y-5">
          <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4 flex items-start gap-3">
            <Info size={16} className="text-blue-400 flex-shrink-0 mt-0.5" />
            <p className="text-blue-300/80 text-sm leading-relaxed">
              Müşteri sorgulama günlük limiti, firmanın sahip olduğu <strong className="text-blue-300">araç sayısına göre otomatik hesaplanır.</strong>
              {' '}Örneğin Pro planda araç başına 1 hak verirseniz, 3 araçlı bir firma günde 3 sorgu yapabilir.
              {' '}"Minimum Garanti Hak", aracı az olan firmaların da en az bu kadar sorgu yapabilmesini sağlar.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-6">
            {/* PRO PLAN */}
            <div className="bg-[#141414] border border-blue-500/20 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-5">
                <span className="bg-blue-500/20 text-blue-400 text-xs font-bold px-2.5 py-1 rounded-full">PRO PLAN</span>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-gray-400 text-sm mb-2 block">Araç Başına Günlük Sorgu Hakkı</label>
                  <div className="flex items-center gap-3">
                    <input type="number" min={1} value={limits.pro.per_vehicle}
                      onChange={e => setLimits(l => ({ ...l, pro: { ...l.pro, per_vehicle: Number(e.target.value) } }))}
                      className="w-24 bg-[#1E1E1E] border border-[#2A2A2A] text-white rounded-lg px-3 py-2.5 text-sm focus:border-red-500 outline-none" />
                    <span className="text-gray-500 text-sm">sorgu / araç / gün</span>
                  </div>
                </div>
                <div>
                  <label className="text-gray-400 text-sm mb-2 block">Minimum Garanti Hak</label>
                  <div className="flex items-center gap-3">
                    <input type="number" min={0} value={limits.pro.min_limit}
                      onChange={e => setLimits(l => ({ ...l, pro: { ...l.pro, min_limit: Number(e.target.value) } }))}
                      className="w-24 bg-[#1E1E1E] border border-[#2A2A2A] text-white rounded-lg px-3 py-2.5 text-sm focus:border-red-500 outline-none" />
                    <span className="text-gray-500 text-sm">sorgu / gün (en az)</span>
                  </div>
                </div>
                <div className="bg-[#1E1E1E] rounded-lg p-3 text-xs text-gray-500">
                  Örnek: 3 araçlı firma → max({limits.pro.per_vehicle} × 3, {limits.pro.min_limit}) = <span className="text-blue-400 font-semibold">{Math.max(limits.pro.per_vehicle * 3, limits.pro.min_limit)} sorgu/gün</span>
                </div>
              </div>
            </div>

            {/* PREMIUM PLAN */}
            <div className="bg-[#141414] border border-purple-500/20 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-5">
                <span className="bg-purple-500/20 text-purple-400 text-xs font-bold px-2.5 py-1 rounded-full">PREMIUM PLAN</span>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-gray-400 text-sm mb-2 block">Araç Başına Günlük Sorgu Hakkı</label>
                  <div className="flex items-center gap-3">
                    <input type="number" min={1} value={limits.premium.per_vehicle}
                      onChange={e => setLimits(l => ({ ...l, premium: { ...l.premium, per_vehicle: Number(e.target.value) } }))}
                      className="w-24 bg-[#1E1E1E] border border-[#2A2A2A] text-white rounded-lg px-3 py-2.5 text-sm focus:border-red-500 outline-none" />
                    <span className="text-gray-500 text-sm">sorgu / araç / gün</span>
                  </div>
                </div>
                <div>
                  <label className="text-gray-400 text-sm mb-2 block">Minimum Garanti Hak</label>
                  <div className="flex items-center gap-3">
                    <input type="number" min={0} value={limits.premium.min_limit}
                      onChange={e => setLimits(l => ({ ...l, premium: { ...l.premium, min_limit: Number(e.target.value) } }))}
                      className="w-24 bg-[#1E1E1E] border border-[#2A2A2A] text-white rounded-lg px-3 py-2.5 text-sm focus:border-red-500 outline-none" />
                    <span className="text-gray-500 text-sm">sorgu / gün (en az)</span>
                  </div>
                </div>
                <div className="bg-[#1E1E1E] rounded-lg p-3 text-xs text-gray-500">
                  Örnek: 3 araçlı firma → max({limits.premium.per_vehicle} × 3, {limits.premium.min_limit}) = <span className="text-purple-400 font-semibold">{Math.max(limits.premium.per_vehicle * 3, limits.premium.min_limit)} sorgu/gün</span>
                </div>
              </div>
            </div>
          </div>

          <button onClick={handleSaveLimits} disabled={savingLimits}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
            {savedMsg ? <><Check size={15} /> Kaydedildi</> : <><Save size={15} /> {savingLimits ? 'Kaydediliyor...' : 'Limitleri Kaydet'}</>}
          </button>
        </div>
      )}
    </div>
  )
}
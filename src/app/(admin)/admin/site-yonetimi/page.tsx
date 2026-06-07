'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Globe, Plus, Trash2, Save, ChevronDown, ChevronUp } from 'lucide-react'

export default function SiteYonetimiPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [openSection, setOpenSection] = useState<string | null>('hero')

  const [hero, setHero] = useState<any>({})
  const [stats, setStats] = useState<any[]>([])
  const [features, setFeatures] = useState<any[]>([])
  const [pricing, setPricing] = useState<any>({ pro: {}, premium: {} })
  const [upcoming, setUpcoming] = useState<any[]>([])

  const fetchData = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('landing_content').select('*').order('display_order')
    if (!data) { setLoading(false); return }

    const heroRow = data.find(r => r.section === 'hero' && r.key === 'main')
    if (heroRow) setHero(heroRow.value)

    setStats(data.filter(r => r.section === 'stats').map(r => ({ key: r.key, ...r.value })))
    setFeatures(data.filter(r => r.section === 'features').map(r => ({ key: r.key, ...r.value })))
    setUpcoming(data.filter(r => r.section === 'upcoming').map(r => ({ key: r.key, ...r.value })))

    const proRow = data.find(r => r.section === 'pricing' && r.key === 'pro')
    const premiumRow = data.find(r => r.section === 'pricing' && r.key === 'premium')
    setPricing({ pro: proRow?.value || {}, premium: premiumRow?.value || {} })

    setLoading(false)
  }, [supabase])

  useEffect(() => { fetchData() }, [fetchData])

  const saveSection = async (section: string, key: string, value: any) => {
    setSaving(section)
    await supabase.from('landing_content').upsert({ section, key, value, updated_at: new Date().toISOString() }, { onConflict: 'section,key' })
    setSaving(null)
  }

  const saveHero = () => saveSection('hero', 'main', hero)
  const savePricing = (plan: string) => saveSection('pricing', plan, pricing[plan])

  const saveStats = async () => {
    setSaving('stats')
    for (const s of stats) {
      await supabase.from('landing_content').upsert({ section: 'stats', key: s.key, value: { value: s.value, label: s.label }, updated_at: new Date().toISOString() }, { onConflict: 'section,key' })
    }
    setSaving(null)
  }

  const saveFeatures = async () => {
    setSaving('features')
    for (const f of features) {
      await supabase.from('landing_content').upsert({ section: 'features', key: f.key, value: { icon: f.icon, title: f.title, description: f.description, available_in: f.available_in }, updated_at: new Date().toISOString() }, { onConflict: 'section,key' })
    }
    setSaving(null)
  }

  const saveUpcoming = async () => {
    setSaving('upcoming')
    for (const u of upcoming) {
      await supabase.from('landing_content').upsert({ section: 'upcoming', key: u.key, value: { title: u.title, description: u.description, estimated: u.estimated }, updated_at: new Date().toISOString() }, { onConflict: 'section,key' })
    }
    setSaving(null)
  }

  const addFeature = () => setFeatures(f => [...f, { key: `feature_${Date.now()}`, icon: 'Star', title: '', description: '', available_in: ['pro', 'premium'] }])
  const addUpcoming = () => setUpcoming(u => [...u, { key: `upcoming_${Date.now()}`, title: '', description: '', estimated: '' }])
  const removeFeature = (key: string) => setFeatures(f => f.filter(x => x.key !== key))
  const removeUpcoming = (key: string) => setUpcoming(u => u.filter(x => x.key !== key))

  const SectionHeader = ({ id, label }: { id: string, label: string }) => (
    <button onClick={() => setOpenSection(openSection === id ? null : id)}
      className="w-full flex items-center justify-between p-4 text-left hover:bg-[#1E1E1E] transition-colors rounded-t-xl">
      <span className="text-white font-semibold">{label}</span>
      {openSection === id ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
    </button>
  )

  const inputCls = "w-full bg-[#1E1E1E] border border-[#2A2A2A] text-white rounded-lg px-3 py-2 text-sm focus:border-red-500 outline-none"
  const labelCls = "text-gray-400 text-xs mb-1 block"
  const saveBtnCls = (sec: string) => `flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${saving === sec ? 'opacity-50' : ''}`

  if (loading) return <div className="flex items-center justify-center h-96"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500" /></div>

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <div className="bg-purple-500/10 p-2 rounded-lg"><Globe size={20} className="text-purple-400" /></div>
        <div>
          <h1 className="text-2xl font-bold text-white">Site Yönetimi</h1>
          <p className="text-gray-400 text-sm">bilgiortagim.com ana sayfa içeriklerini yönet</p>
        </div>
      </div>

      {/* HERO */}
      <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl overflow-hidden">
        <SectionHeader id="hero" label="🚀 Hero Bölümü (Ana Başlık)" />
        {openSection === 'hero' && (
          <div className="p-5 border-t border-[#2A2A2A] space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><label className={labelCls}>Rozet Metni</label><input className={inputCls} value={hero.badge || ''} onChange={e => setHero((h: any) => ({ ...h, badge: e.target.value }))} /></div>
              <div><label className={labelCls}>Başlık Satır 1</label><input className={inputCls} value={hero.title_line1 || ''} onChange={e => setHero((h: any) => ({ ...h, title_line1: e.target.value }))} /></div>
              <div><label className={labelCls}>Başlık Satır 2 (Renkli)</label><input className={inputCls} value={hero.title_line2_highlight || ''} onChange={e => setHero((h: any) => ({ ...h, title_line2_highlight: e.target.value }))} /></div>
              <div><label className={labelCls}>Ana CTA Butonu</label><input className={inputCls} value={hero.cta_primary || ''} onChange={e => setHero((h: any) => ({ ...h, cta_primary: e.target.value }))} /></div>
              <div><label className={labelCls}>İkinci CTA Butonu</label><input className={inputCls} value={hero.cta_secondary || ''} onChange={e => setHero((h: any) => ({ ...h, cta_secondary: e.target.value }))} /></div>
            </div>
            <div><label className={labelCls}>Açıklama</label><textarea className={inputCls + ' resize-none'} rows={2} value={hero.description || ''} onChange={e => setHero((h: any) => ({ ...h, description: e.target.value }))} /></div>
            <button onClick={saveHero} className={saveBtnCls('hero')}><Save size={14} />{saving === 'hero' ? 'Kaydediliyor...' : 'Kaydet'}</button>
          </div>
        )}
      </div>

      {/* STATS */}
      <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl overflow-hidden">
        <SectionHeader id="stats" label="📊 İstatistik Sayaçları" />
        {openSection === 'stats' && (
          <div className="p-5 border-t border-[#2A2A2A] space-y-3">
            {stats.map((s, i) => (
              <div key={s.key} className="grid grid-cols-2 gap-3">
                <div><label className={labelCls}>Değer (örn: 500+)</label><input className={inputCls} value={s.value || ''} onChange={e => setStats(arr => arr.map((x, j) => j === i ? { ...x, value: e.target.value } : x))} /></div>
                <div><label className={labelCls}>Etiket</label><input className={inputCls} value={s.label || ''} onChange={e => setStats(arr => arr.map((x, j) => j === i ? { ...x, label: e.target.value } : x))} /></div>
              </div>
            ))}
            <button onClick={saveStats} className={saveBtnCls('stats')}><Save size={14} />{saving === 'stats' ? 'Kaydediliyor...' : 'Kaydet'}</button>
          </div>
        )}
      </div>

      {/* FEATURES */}
      <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl overflow-hidden">
        <SectionHeader id="features" label="⚡ Özellik Kartları" />
        {openSection === 'features' && (
          <div className="p-5 border-t border-[#2A2A2A] space-y-4">
            {features.map((f, i) => (
              <div key={f.key} className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-xs font-medium">Özellik {i + 1}</span>
                  <button onClick={() => removeFeature(f.key)} className="text-red-400 hover:text-red-300"><Trash2 size={14} /></button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className={labelCls}>Başlık</label><input className={inputCls} value={f.title || ''} onChange={e => setFeatures(arr => arr.map((x, j) => j === i ? { ...x, title: e.target.value } : x))} /></div>
                  <div><label className={labelCls}>İkon (lucide adı, örn: Search)</label><input className={inputCls} value={f.icon || ''} onChange={e => setFeatures(arr => arr.map((x, j) => j === i ? { ...x, icon: e.target.value } : x))} /></div>
                </div>
                <div><label className={labelCls}>Açıklama</label><input className={inputCls} value={f.description || ''} onChange={e => setFeatures(arr => arr.map((x, j) => j === i ? { ...x, description: e.target.value } : x))} /></div>
              </div>
            ))}
            <div className="flex gap-3">
              <button onClick={addFeature} className="flex items-center gap-2 bg-[#1E1E1E] border border-[#2A2A2A] text-gray-400 px-3 py-2 rounded-lg text-sm hover:border-[#3A3A3A] transition-colors"><Plus size={14} /> Özellik Ekle</button>
              <button onClick={saveFeatures} className={saveBtnCls('features')}><Save size={14} />{saving === 'features' ? 'Kaydediliyor...' : 'Kaydet'}</button>
            </div>
          </div>
        )}
      </div>

      {/* PRICING */}
      <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl overflow-hidden">
        <SectionHeader id="pricing" label="💳 Fiyatlandırma" />
        {openSection === 'pricing' && (
          <div className="p-5 border-t border-[#2A2A2A] space-y-5">
            {['pro', 'premium'].map(plan => (
              <div key={plan} className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-lg p-4 space-y-3">
                <div className="text-white font-medium capitalize">{plan} Planı</div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className={labelCls}>Aylık Fiyat (₺)</label><input type="number" className={inputCls} value={pricing[plan]?.price_monthly || ''} onChange={e => setPricing((p: any) => ({ ...p, [plan]: { ...p[plan], price_monthly: Number(e.target.value) } }))} /></div>
                  <div><label className={labelCls}>Yıllık Fiyat (₺)</label><input type="number" className={inputCls} value={pricing[plan]?.price_yearly || ''} onChange={e => setPricing((p: any) => ({ ...p, [plan]: { ...p[plan], price_yearly: Number(e.target.value) } }))} /></div>
                </div>
                <div><label className={labelCls}>Özellikler (her satıra bir özellik)</label>
                  <textarea className={inputCls + ' resize-none'} rows={5}
                    value={(pricing[plan]?.features || []).join('\n')}
                    onChange={e => setPricing((p: any) => ({ ...p, [plan]: { ...p[plan], features: e.target.value.split('\n') } }))} />
                </div>
                <button onClick={() => savePricing(plan)} className={saveBtnCls(plan)}><Save size={14} />{saving === plan ? 'Kaydediliyor...' : `${plan} Planını Kaydet`}</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* UPCOMING */}
      <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl overflow-hidden">
        <SectionHeader id="upcoming" label="🔜 Yakında Gelecek Özellikler" />
        {openSection === 'upcoming' && (
          <div className="p-5 border-t border-[#2A2A2A] space-y-4">
            {upcoming.map((u, i) => (
              <div key={u.key} className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-xs font-medium">Özellik {i + 1}</span>
                  <button onClick={() => removeUpcoming(u.key)} className="text-red-400 hover:text-red-300"><Trash2 size={14} /></button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className={labelCls}>Başlık</label><input className={inputCls} value={u.title || ''} onChange={e => setUpcoming(arr => arr.map((x, j) => j === i ? { ...x, title: e.target.value } : x))} /></div>
                  <div><label className={labelCls}>Tahmini Tarih (örn: Q2 2025)</label><input className={inputCls} value={u.estimated || ''} onChange={e => setUpcoming(arr => arr.map((x, j) => j === i ? { ...x, estimated: e.target.value } : x))} /></div>
                </div>
                <div><label className={labelCls}>Açıklama</label><input className={inputCls} value={u.description || ''} onChange={e => setUpcoming(arr => arr.map((x, j) => j === i ? { ...x, description: e.target.value } : x))} /></div>
              </div>
            ))}
            <div className="flex gap-3">
              <button onClick={addUpcoming} className="flex items-center gap-2 bg-[#1E1E1E] border border-[#2A2A2A] text-gray-400 px-3 py-2 rounded-lg text-sm hover:border-[#3A3A3A] transition-colors"><Plus size={14} /> Özellik Ekle</button>
              <button onClick={saveUpcoming} className={saveBtnCls('upcoming')}><Save size={14} />{saving === 'upcoming' ? 'Kaydediliyor...' : 'Kaydet'}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
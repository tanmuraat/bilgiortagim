'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'
import { Search, Shield, AlertTriangle, CheckCircle, Plus, X, Upload, FileText, Eye } from 'lucide-react'

function maskTC(tc: string) {
  if (!tc || tc.length < 11) return '***'
  return tc.slice(0, 3) + '****' + tc.slice(7)
}
function maskPhone(phone: string) {
  if (!phone) return '***'
  const clean = phone.replace(/\D/g, '')
  return clean.length >= 10 ? clean.slice(0, 3) + ' *** ** ' + clean.slice(-2) : '***'
}
async function sha256(text: string) {
  const encoder = new TextEncoder()
  const data = encoder.encode(text.trim())
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('')
}

export default function MusteriSorgulamaPage() {
  const supabase = createClient()
  const [tc, setTc] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [incidents, setIncidents] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState('all')
  const [stats, setStats] = useState({ total: 0, risky: 0, clear: 0 })
  const [profile, setProfile] = useState<any>(null)
  const [todayQueries, setTodayQueries] = useState(0)
  const [viewingDocId, setViewingDocId] = useState<string | null>(null)
  const [docUrls, setDocUrls] = useState<Record<string, string>>({})

  const [showConsentModal, setShowConsentModal] = useState(false)
  const [consent, setConsent] = useState(false)
  const [pendingTC, setPendingTC] = useState('')
  const [newCustomerForm, setNewCustomerForm] = useState({ full_name: '', phone: '' })

  const [showIncidentModal, setShowIncidentModal] = useState(false)
  const [incidentForm, setIncidentForm] = useState({
    incident_type: 'payment_delay', amount: '',
    incident_date: format(new Date(), 'yyyy-MM-dd'), description: ''
  })
  const [incidentFile, setIncidentFile] = useState<File | null>(null)
  const [savingIncident, setSavingIncident] = useState(false)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(p)
      const today = format(new Date(), 'yyyy-MM-dd')
      const { count } = await supabase.from('query_logs').select('*', { count: 'exact', head: true })
        .eq('user_id', user.id).gte('queried_at', today + 'T00:00:00').lte('queried_at', today + 'T23:59:59')
      setTodayQueries(count || 0)
      const { count: total } = await supabase.from('query_logs').select('*', { count: 'exact', head: true }).eq('user_id', user.id)
      const { count: risky } = await supabase.from('customer_records').select('*', { count: 'exact', head: true }).neq('risk_level', 'clear')
      setStats({ total: total || 0, risky: risky || 0, clear: (total || 0) - (risky || 0) })
    }
    init()
  }, [supabase])

  const handleQuery = async () => {
    if (tc.length !== 11) { alert('TC kimlik numarası 11 haneli olmalıdır.'); return }
    if (profile?.subscription_plan === 'pro' && todayQueries >= 10) {
      alert('Günlük 10 sorgu limitinize ulaştınız.'); return
    }
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const hash = await sha256(tc)
    const { data: existing } = await supabase.from('customer_records').select('*').eq('tc_hash', hash).single()

    if (existing) {
      setResult(existing)
      setViewingDocId(null)
      setDocUrls({})
      // Tüm firmaların eklediği yorumları getir
      const { data: inc } = await supabase.from('customer_incidents')
        .select('*').eq('customer_id', existing.id).order('incident_date', { ascending: false })
      setIncidents(inc || [])
      await supabase.from('query_logs').insert({ user_id: user.id, tc_hash: hash, customer_name: existing.full_name, queried_at: new Date().toISOString() })
      setTodayQueries(q => q + 1)
    } else {
      setPendingTC(tc)
      setNewCustomerForm({ full_name: '', phone: '' })
      setConsent(false)
      setShowConsentModal(true)
    }
    setLoading(false)
  }

  const handleNewCustomer = async () => {
    if (!consent) { alert('Onay kutusunu işaretleyin.'); return }
    if (!newCustomerForm.full_name.trim()) { alert('Ad soyad zorunludur.'); return }
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const hash = await sha256(pendingTC)
    const { data: newCustomer, error } = await supabase.from('customer_records').insert({
      tc_hash: hash, tc_encrypted: pendingTC,
      full_name: newCustomerForm.full_name,
      phone_encrypted: newCustomerForm.phone,
      risk_level: 'clear', rental_count: 0, query_count: 1,
      last_queried_at: new Date().toISOString(),
    }).select().single()

    if (!error && newCustomer) {
      setResult(newCustomer)
      setIncidents([])
      setViewingDocId(null)
      setDocUrls({})
      await supabase.from('query_logs').insert({ user_id: user.id, tc_hash: hash, customer_name: newCustomerForm.full_name, queried_at: new Date().toISOString() })
      setTodayQueries(q => q + 1)
    }
    setShowConsentModal(false)
  }

  // Belge URL'ini al — public URL veya storage path
  const getDocUrl = useCallback(async (incidentId: string, docUrl: string) => {
    if (docUrls[incidentId]) return // Zaten yüklendi

    let url = docUrl
    // Eğer tam URL değilse storage'dan al
    if (!docUrl.startsWith('http')) {
      const { data } = await supabase.storage.from('receipts').createSignedUrl(docUrl, 3600)
      if (data?.signedUrl) url = data.signedUrl
    }
    setDocUrls(prev => ({ ...prev, [incidentId]: url }))
  }, [supabase, docUrls])

  const toggleDoc = async (inc: any) => {
    if (viewingDocId === inc.id) {
      setViewingDocId(null)
      return
    }
    setViewingDocId(inc.id)
    if (inc.document_url && !docUrls[inc.id]) {
      await getDocUrl(inc.id, inc.document_url)
    }
  }

  const handleAddIncident = async () => {
    if (!incidentForm.description || !result) return
    setSavingIncident(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    let document_url = null
    if (incidentFile) {
      const ext = incidentFile.name.split('.').pop()
      const path = `incidents/${user.id}/${Date.now()}.${ext}`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('receipts').upload(path, incidentFile, { upsert: false })
      if (!uploadError && uploadData) {
        // Public URL al
        const { data: urlData } = supabase.storage.from('receipts').getPublicUrl(path)
        document_url = urlData?.publicUrl
      }
    }

    await supabase.from('customer_incidents').insert({
      customer_id: result.id, reported_by: user.id,
      company_name: profile?.company_name,
      incident_type: incidentForm.incident_type,
      amount: incidentForm.amount ? Number(incidentForm.amount) : null,
      description: incidentForm.description,
      incident_date: incidentForm.incident_date,
      document_url, status: 'open',
    })

    if (incidentForm.incident_type !== 'positive') {
      await supabase.from('customer_records').update({ risk_level: 'risky' }).eq('id', result.id)
      setResult((r: any) => ({ ...r, risk_level: 'risky' }))
    }

    const { data: inc } = await supabase.from('customer_incidents')
      .select('*').eq('customer_id', result.id).order('incident_date', { ascending: false })
    setIncidents(inc || [])
    setShowIncidentModal(false)
    setIncidentForm({ incident_type: 'payment_delay', amount: '', incident_date: format(new Date(), 'yyyy-MM-dd'), description: '' })
    setIncidentFile(null)
    setSavingIncident(false)
  }

  const riskConfig: Record<string, any> = {
    clear: { label: 'Sorunsuz', color: 'text-green-400', bg: 'bg-green-400/10', border: 'border-green-400/20', icon: CheckCircle },
    moderate: { label: 'Dikkatli Ol', color: 'text-yellow-400', bg: 'bg-yellow-400/10', border: 'border-yellow-400/20', icon: AlertTriangle },
    risky: { label: 'Riskli', color: 'text-red-400', bg: 'bg-red-400/10', border: 'border-red-400/20', icon: AlertTriangle },
    blacklisted: { label: 'Kara Liste', color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/20', icon: Shield },
  }

  const incidentTypeLabel: Record<string, string> = {
    payment_delay: 'Ödeme Gecikmesi', damage: 'Araç Hasarı',
    contract_breach: 'Sözleşme İhlali', positive: 'Olumlu Deneyim', other: 'Diğer',
  }

  const filteredIncidents = activeTab === 'all' ? incidents
    : activeTab === 'negative' ? incidents.filter(i => i.incident_type !== 'positive')
    : incidents.filter(i => i.incident_type === 'positive')

  const inputCls = "w-full bg-[#1E1E1E] border border-[#2A2A2A] text-white rounded-lg px-3 py-2.5 text-sm focus:border-red-500 outline-none"

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Müşteri Sorgulama</h1>
        <p className="text-gray-400 text-sm mt-1">TC Kimlik No ile müşteri sorgulayın, risk durumunu ve geçmiş kayıtları görüntüleyin.</p>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 bg-[#141414] border border-[#2A2A2A] rounded-xl p-5">
          <h3 className="text-white font-semibold mb-4">TC Kimlik No ile Sorgula</h3>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input value={tc} onChange={e => setTc(e.target.value.replace(/\D/g, '').slice(0, 11))}
                onKeyDown={e => e.key === 'Enter' && handleQuery()}
                placeholder="11 haneli TC kimlik numarasını giriniz"
                className="w-full bg-[#1E1E1E] border border-[#2A2A2A] text-white rounded-lg pl-10 pr-3 py-3 focus:border-red-500 outline-none" />
            </div>
            <button onClick={handleQuery} disabled={loading || tc.length !== 11}
              className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2">
              {loading ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> : <Search size={16} />}
              Sorgula
            </button>
          </div>
          {profile?.subscription_plan === 'pro' && <p className="text-gray-500 text-xs mt-2">Bugün {todayQueries}/10 sorgu kullandınız.</p>}
          <p className="text-gray-600 text-xs mt-2 flex items-center gap-1.5"><Shield size={11} /> Sorguladığınız bilgiler yalnızca yasal amaçlarla kullanılmaktadır.</p>
        </div>
        <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-5">
          <h3 className="text-white font-semibold mb-4">Hızlı İstatistikler</h3>
          <div className="space-y-3">
            {[
              { label: 'Toplam Sorgu', value: stats.total, color: 'text-blue-400' },
              { label: 'Riskli Müşteriler', value: stats.risky, color: 'text-red-400' },
              { label: 'Sorunsuz Müşteriler', value: stats.clear, color: 'text-green-400' },
            ].map((s, i) => (
              <div key={i} className="flex items-center justify-between bg-[#1E1E1E] rounded-lg p-3">
                <span className="text-gray-400 text-sm">{s.label}</span>
                <span className={`font-bold text-lg ${s.color}`}>{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {result && (
        <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-5 space-y-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-[#2A2A2A] rounded-xl flex items-center justify-center text-white font-bold text-xl">
                {result.full_name ? result.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() : 'MÜ'}
              </div>
              <div>
                <div className="text-white font-bold text-xl">{result.full_name || 'İsim Bilgisi Yok'}</div>
                {(() => {
                  const rc = riskConfig[result.risk_level] || riskConfig.clear
                  return (
                    <div className={`inline-flex items-center gap-1.5 mt-1 px-3 py-1 rounded-full text-xs font-semibold ${rc.bg} ${rc.border} border ${rc.color}`}>
                      <rc.icon size={12} /> {rc.label}
                    </div>
                  )
                })()}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowIncidentModal(true)}
                className="flex items-center gap-2 bg-[#1E1E1E] border border-[#2A2A2A] text-gray-300 px-3 py-2 rounded-lg text-sm hover:border-red-500/50 transition-colors">
                <Plus size={14} /> Yorum Ekle
              </button>
              <button onClick={() => { setResult(null); setTc(''); setIncidents([]); setViewingDocId(null); setDocUrls({}) }}
                className="flex items-center gap-2 bg-red-600/10 border border-red-600/20 text-red-400 px-3 py-2 rounded-lg text-sm hover:bg-red-600/20 transition-colors">
                Yeni Sorgu
              </button>
            </div>
          </div>

          <div className="grid grid-cols-5 gap-3">
            {[
              { label: 'TC Kimlik No', value: maskTC(result.tc_encrypted || '') },
              { label: 'Ad Soyad', value: result.full_name || '—' },
              { label: 'Telefon', value: maskPhone(result.phone_encrypted || '') },
              { label: 'Toplam Kiralama', value: `${result.rental_count || 0} kez` },
              { label: 'Son Sorgu', value: result.last_queried_at ? format(new Date(result.last_queried_at), 'dd.MM.yyyy HH:mm') : '—' },
            ].map((item, i) => (
              <div key={i} className="bg-[#1E1E1E] rounded-lg p-3">
                <div className="text-gray-500 text-xs mb-1">{item.label}</div>
                <div className="text-white text-sm font-medium truncate">{item.value}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Toplam Kayıt', value: incidents.length, color: 'text-white' },
              { label: 'Olumsuz Kayıt', value: incidents.filter(i => i.incident_type !== 'positive').length, color: 'text-red-400' },
              { label: 'Olumlu Kayıt', value: incidents.filter(i => i.incident_type === 'positive').length, color: 'text-green-400' },
            ].map((item, i) => (
              <div key={i} className="bg-[#1E1E1E] rounded-lg p-3 flex items-center justify-between">
                <span className="text-gray-400 text-sm">{item.label}</span>
                <span className={`font-bold text-lg ${item.color}`}>{item.value}</span>
              </div>
            ))}
          </div>

          <div>
            <div className="flex gap-2 mb-4">
              {[
                { key: 'all', label: 'Tüm Kayıtlar' },
                { key: 'negative', label: `Olumsuz (${incidents.filter(i => i.incident_type !== 'positive').length})` },
                { key: 'positive', label: `Olumlu (${incidents.filter(i => i.incident_type === 'positive').length})` },
              ].map(tab => (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === tab.key ? 'bg-red-600 text-white' : 'bg-[#1E1E1E] text-gray-400 hover:text-white'}`}>
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="space-y-3">
              {filteredIncidents.length === 0 ? (
                <div className="text-center text-gray-500 text-sm py-8">Bu kategoride kayıt bulunmuyor</div>
              ) : filteredIncidents.map(inc => (
                <div key={inc.id} className={`bg-[#1E1E1E] rounded-lg p-4 border ${inc.incident_type === 'positive' ? 'border-green-500/10' : 'border-red-500/10'}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${inc.incident_type === 'positive' ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                        {inc.incident_type === 'positive' ? <CheckCircle size={14} className="text-green-400" /> : <AlertTriangle size={14} className="text-red-400" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-white text-sm font-medium">{incidentTypeLabel[inc.incident_type] || inc.incident_type}</div>
                        <div className="text-gray-400 text-xs mt-0.5">{inc.description}</div>
                        <div className="text-gray-600 text-xs mt-0.5">
                          {inc.company_name} · {inc.incident_date ? format(new Date(inc.incident_date), 'dd MMM yyyy', { locale: tr }) : ''}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                      {inc.amount && <div className="text-red-400 font-semibold text-sm">₺{Number(inc.amount).toLocaleString('tr-TR')}</div>}
                      {inc.document_url && (
                        <button onClick={() => toggleDoc(inc)}
                          className="flex items-center gap-1 text-blue-400 hover:text-blue-300 text-xs border border-blue-400/30 px-2 py-1 rounded-lg transition-colors">
                          <FileText size={11} /> {viewingDocId === inc.id ? 'Gizle' : 'Belge'}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* BELGE GÖRÜNTÜLEME */}
                  {viewingDocId === inc.id && inc.document_url && (
                    <div className="mt-3 rounded-xl overflow-hidden border border-[#2A2A2A]">
                      {!docUrls[inc.id] ? (
                        <div className="bg-[#1A1A1A] p-6 text-center">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-400 mx-auto mb-2" />
                          <p className="text-gray-500 text-xs">Belge yükleniyor...</p>
                        </div>
                      ) : docUrls[inc.id].toLowerCase().includes('.pdf') ? (
                        <div className="bg-[#1A1A1A] p-6 text-center">
                          <FileText size={32} className="text-blue-400 mx-auto mb-3" />
                          <p className="text-gray-400 text-sm mb-3">PDF Belgesi</p>
                          <a href={docUrls[inc.id]} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition-colors">
                            <Eye size={14} /> PDF'i Görüntüle
                          </a>
                        </div>
                      ) : (
                        <div className="relative select-none" onContextMenu={e => e.preventDefault()}>
                          <img
                            src={docUrls[inc.id]}
                            alt="Belge"
                            className="w-full max-h-72 object-contain bg-[#0A0A0A]"
                            onContextMenu={e => e.preventDefault()}
                            draggable={false}
                          />
                          {/* Watermark */}
                          <div className="absolute inset-0 pointer-events-none overflow-hidden flex flex-col justify-around">
                            {[0, 1, 2, 3].map(i => (
                              <div key={i} className="text-white/8 font-bold text-lg rotate-45 whitespace-nowrap select-none text-center">
                                BİLGİORTAĞIM · SADECE GÖRÜNTÜLEME · BİLGİORTAĞIM · SADECE GÖRÜNTÜLEME
                              </div>
                            ))}
                          </div>
                          <div className="absolute inset-0 bg-transparent" onContextMenu={e => e.preventDefault()} />
                        </div>
                      )}
                      <div className="bg-[#1A1A1A] border-t border-[#2A2A2A] px-3 py-2 flex items-center gap-2">
                        <Shield size={11} className="text-gray-600" />
                        <span className="text-gray-600 text-xs">Yalnızca görüntüleme amaçlıdır. İndirme yasaktır.</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Consent Modal */}
      {showConsentModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl w-full max-w-md p-6">
            <h3 className="text-white font-semibold text-lg mb-2">Yeni Müşteri Kaydı</h3>
            <p className="text-gray-400 text-sm mb-5">Bu TC numarasına ait kayıt bulunamadı. Bilgileri girin ve onayı alın.</p>
            <div className="space-y-3 mb-4">
              <div>
                <label className="text-gray-400 text-xs mb-1.5 block">Ad Soyad *</label>
                <input value={newCustomerForm.full_name} onChange={e => setNewCustomerForm(f => ({ ...f, full_name: e.target.value }))} placeholder="Müşterinin adı soyadı" className={inputCls} />
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1.5 block">Telefon</label>
                <input value={newCustomerForm.phone} onChange={e => setNewCustomerForm(f => ({ ...f, phone: e.target.value }))} placeholder="+90 5XX XXX XX XX" className={inputCls} />
              </div>
            </div>
            <div className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-lg p-4 mb-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} className="mt-1 accent-red-500 flex-shrink-0" />
                <div>
                  <span className="text-white text-sm leading-relaxed block">
                    Müşteri olarak kimlik bilgilerimin araç kiralama hizmet sürecinde BilgiOrtağım güvenli platformu aracılığıyla yetkili kiralama firmalarıyla paylaşılmasına onay verdiğimi beyan ediyor ve bu onayı müşteri adına teyit ediyorum.
                  </span>
                  <span className="text-gray-500 text-xs mt-2 block">Firma yetkilisi olarak müşterinin bu onayı verdiğini teyit ediyorsunuz.</span>
                </div>
              </label>
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setShowConsentModal(false); setConsent(false) }} className="flex-1 bg-[#1E1E1E] border border-[#2A2A2A] text-gray-400 py-2.5 rounded-lg hover:bg-[#252525] transition-colors">İptal</button>
              <button onClick={handleNewCustomer} disabled={!consent || !newCustomerForm.full_name} className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50">Kaydet</button>
            </div>
          </div>
        </div>
      )}

      {/* Incident Modal */}
      {showIncidentModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-[#2A2A2A]">
              <h3 className="text-white font-semibold">Yorum / Kayıt Ekle</h3>
              <button onClick={() => setShowIncidentModal(false)} className="text-gray-400 hover:text-white"><X size={20} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-gray-400 text-xs mb-1.5 block">Olay Tipi</label>
                <select value={incidentForm.incident_type} onChange={e => setIncidentForm(f => ({ ...f, incident_type: e.target.value }))} className={inputCls}>
                  <option value="payment_delay">Ödeme Gecikmesi</option>
                  <option value="damage">Araç Hasarı</option>
                  <option value="contract_breach">Sözleşme İhlali</option>
                  <option value="positive">Olumlu Deneyim</option>
                  <option value="other">Diğer</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-400 text-xs mb-1.5 block">Tutar (₺, opsiyonel)</label>
                  <input type="number" value={incidentForm.amount} onChange={e => setIncidentForm(f => ({ ...f, amount: e.target.value }))} placeholder="0" className={inputCls} />
                </div>
                <div>
                  <label className="text-gray-400 text-xs mb-1.5 block">Olay Tarihi</label>
                  <input type="date" value={incidentForm.incident_date} onChange={e => setIncidentForm(f => ({ ...f, incident_date: e.target.value }))} className={inputCls} />
                </div>
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1.5 block">Açıklama *</label>
                <textarea value={incidentForm.description} onChange={e => setIncidentForm(f => ({ ...f, description: e.target.value }))}
                  rows={3} placeholder="Yaşanan olayı kısaca açıklayın..." className={inputCls + ' resize-none'} />
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1.5 block">Belge Ekle (opsiyonel)</label>
                <label className={`flex items-center gap-3 w-full bg-[#1E1E1E] border border-dashed rounded-lg px-4 py-3 cursor-pointer transition-colors ${incidentFile ? 'border-green-500/50 bg-green-500/5' : 'border-[#3A3A3A] hover:border-red-500/50'}`}>
                  <Upload size={15} className={incidentFile ? 'text-green-400' : 'text-gray-500'} />
                  <span className={`text-sm ${incidentFile ? 'text-green-400' : 'text-gray-400'}`}>{incidentFile ? incidentFile.name : 'Dosya seç (PDF, JPG, PNG)'}</span>
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={e => { if (e.target.files?.[0]) setIncidentFile(e.target.files[0]) }} />
                </label>
                {incidentFile && (
                  <button onClick={() => setIncidentFile(null)} className="text-xs text-gray-500 hover:text-red-400 mt-1 transition-colors">Dosyayı kaldır</button>
                )}
              </div>
              <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-lg p-3">
                <p className="text-yellow-400/80 text-xs">Eklediğiniz yorum tüm yetkili kiralama firmaları tarafından görülebilir. Gerçek ve belgelenebilir bilgi paylaşın.</p>
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-[#2A2A2A]">
              <button onClick={() => setShowIncidentModal(false)} className="flex-1 bg-[#1E1E1E] border border-[#2A2A2A] text-gray-400 py-2.5 rounded-lg hover:bg-[#252525] transition-colors">İptal</button>
              <button onClick={handleAddIncident} disabled={savingIncident || !incidentForm.description}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50">
                {savingIncident ? 'Kaydediliyor...' : 'Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'
import { Search, Users, AlertTriangle, CheckCircle, Shield, X, Eye, FileText } from 'lucide-react'

function maskTC(encrypted: string) {
  if (!encrypted || encrypted.length < 11) return '***'
  // Admin tam TC görebilir ama yine de kısmen maskeli göster
  return encrypted.slice(0, 3) + '****' + encrypted.slice(7)
}

export default function AdminMusteriListesiPage() {
  const supabase = createClient()
  const [customers, setCustomers] = useState<any[]>([])
  const [filtered, setFiltered] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterRisk, setFilterRisk] = useState('all')
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null)
  const [incidents, setIncidents] = useState<any[]>([])
  const [showModal, setShowModal] = useState(false)
  const [stats, setStats] = useState({ total: 0, risky: 0, clear: 0, totalQueries: 0 })
  const [viewingDoc, setViewingDoc] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [customersRes, queriesRes] = await Promise.all([
      supabase.from('customer_records').select('*').order('last_queried_at', { ascending: false }),
      supabase.from('query_logs').select('*', { count: 'exact', head: true }),
    ])
    const data = customersRes.data || []
    setCustomers(data)
    setFiltered(data)
    setStats({
      total: data.length,
      risky: data.filter(c => c.risk_level !== 'clear').length,
      clear: data.filter(c => c.risk_level === 'clear').length,
      totalQueries: queriesRes.count || 0,
    })
    setLoading(false)
  }, [supabase])

  useEffect(() => { fetchData() }, [fetchData])

  useEffect(() => {
    let result = customers
    if (search) result = result.filter(c =>
      (c.full_name || '').toLowerCase().includes(search.toLowerCase())
    )
    if (filterRisk !== 'all') result = result.filter(c => c.risk_level === filterRisk)
    setFiltered(result)
  }, [search, filterRisk, customers])

  const openDetail = async (customer: any) => {
    setSelectedCustomer(customer)
    setShowModal(true)
    const { data } = await supabase.from('customer_incidents')
      .select('*').eq('customer_id', customer.id).order('incident_date', { ascending: false })
    setIncidents(data || [])
  }

  const riskConfig: Record<string, any> = {
    clear: { label: 'Sorunsuz', color: 'text-green-400', bg: 'bg-green-400/10', border: 'border-green-400/20' },
    moderate: { label: 'Dikkatli', color: 'text-yellow-400', bg: 'bg-yellow-400/10', border: 'border-yellow-400/20' },
    risky: { label: 'Riskli', color: 'text-red-400', bg: 'bg-red-400/10', border: 'border-red-400/20' },
    blacklisted: { label: 'Kara Liste', color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/20' },
  }

  const incidentTypeLabel: Record<string, string> = {
    payment_delay: 'Ödeme Gecikmesi',
    damage: 'Araç Hasarı',
    contract_breach: 'Sözleşme İhlali',
    positive: 'Olumlu Deneyim',
    other: 'Diğer',
  }

  if (loading) return <div className="flex items-center justify-center h-96"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500" /></div>

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Müşteri Kayıtları</h1>
        <p className="text-gray-400 text-sm mt-1">Platformdaki tüm müşteri kayıtları ve yorumlar</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Toplam Müşteri', value: stats.total, color: 'text-white', bg: 'bg-[#2A2A2A]' },
          { label: 'Sorunsuz', value: stats.clear, color: 'text-green-400', bg: 'bg-green-400/10' },
          { label: 'Riskli', value: stats.risky, color: 'text-red-400', bg: 'bg-red-400/10' },
          { label: 'Toplam Sorgu', value: stats.totalQueries, color: 'text-blue-400', bg: 'bg-blue-400/10' },
        ].map((s, i) => (
          <div key={i} className={`${s.bg} border border-[#2A2A2A] rounded-xl p-4`}>
            <div className="text-gray-400 text-sm mb-2">{s.label}</div>
            <div className={`text-3xl font-bold ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="İsim ile ara..."
            className="w-full bg-[#141414] border border-[#2A2A2A] text-white rounded-lg pl-9 pr-3 py-2.5 text-sm focus:border-red-500 outline-none" />
        </div>
        <select value={filterRisk} onChange={e => setFilterRisk(e.target.value)}
          className="bg-[#141414] border border-[#2A2A2A] text-white rounded-lg px-3 py-2.5 text-sm focus:border-red-500 outline-none">
          <option value="all">Tüm Riskler</option>
          <option value="clear">Sorunsuz</option>
          <option value="moderate">Dikkatli</option>
          <option value="risky">Riskli</option>
          <option value="blacklisted">Kara Liste</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#2A2A2A]">
              {['Ad Soyad', 'TC (Maskeli)', 'Risk', 'Toplam Kiralama', 'Olumsuz Kayıt', 'Son Kiralama', 'Son Sorgu', ''].map(h => (
                <th key={h} className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={8} className="text-center text-gray-500 py-12 text-sm">Kayıt bulunamadı</td></tr>
            ) : filtered.map(c => {
              const rc = riskConfig[c.risk_level] || riskConfig.clear
              return (
                <tr key={c.id} className="border-b border-[#1A1A1A] hover:bg-[#1E1E1E] transition-colors">
                  <td className="px-4 py-3 text-white font-medium text-sm">{c.full_name || '—'}</td>
                  <td className="px-4 py-3 text-gray-400 text-sm font-mono">{maskTC(c.tc_encrypted || '')}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-semibold px-2 py-1 rounded-full ${rc.bg} ${rc.border} border ${rc.color}`}>{rc.label}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-sm">{c.rental_count || 0}</td>
                  <td className="px-4 py-3">
                    <span className={`text-sm font-bold ${(c.incident_count || 0) > 0 ? 'text-red-400' : 'text-gray-500'}`}>
                      {c.incident_count || 0}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-sm">
                    {c.last_rental_date ? format(new Date(c.last_rental_date), 'dd MMM yyyy', { locale: tr }) : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {c.last_queried_at ? format(new Date(c.last_queried_at), 'dd MMM HH:mm', { locale: tr }) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => openDetail(c)}
                      className="flex items-center gap-1.5 text-gray-400 hover:text-white text-xs border border-[#2A2A2A] hover:border-[#3A3A3A] px-2 py-1 rounded-lg transition-colors">
                      <Eye size={12} /> Detay
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Detail Modal */}
      {showModal && selectedCustomer && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-[#2A2A2A]">
              <h2 className="text-white font-semibold text-lg">{selectedCustomer.full_name || 'Müşteri Detayı'}</h2>
              <button onClick={() => { setShowModal(false); setViewingDoc(null) }} className="text-gray-400 hover:text-white"><X size={20} /></button>
            </div>
            <div className="p-5 space-y-5">
              {/* Müşteri Bilgileri */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'TC (Maskeli)', value: maskTC(selectedCustomer.tc_encrypted || '') },
                  { label: 'Telefon', value: selectedCustomer.phone_encrypted ? '***' : '—' },
                  { label: 'Risk Seviyesi', value: riskConfig[selectedCustomer.risk_level]?.label || 'Sorunsuz' },
                  { label: 'Toplam Kiralama', value: `${selectedCustomer.rental_count || 0} kez` },
                  { label: 'Son Kiralama Firması', value: selectedCustomer.last_rental_company || '—' },
                  { label: 'Son Sorgu', value: selectedCustomer.last_queried_at ? format(new Date(selectedCustomer.last_queried_at), 'dd MMM yyyy HH:mm', { locale: tr }) : '—' },
                ].map((item, i) => (
                  <div key={i} className="bg-[#1E1E1E] rounded-lg p-3">
                    <div className="text-gray-500 text-xs mb-1">{item.label}</div>
                    <div className="text-white text-sm font-medium">{item.value}</div>
                  </div>
                ))}
              </div>

              {/* Yorumlar / İncidentlar */}
              <div>
                <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                  Kayıtlar & Yorumlar
                  <span className="text-xs bg-[#2A2A2A] text-gray-400 px-2 py-0.5 rounded-full">{incidents.length}</span>
                </h3>
                {incidents.length === 0 ? (
                  <div className="bg-[#1E1E1E] rounded-xl p-6 text-center">
                    <CheckCircle size={24} className="text-green-400 mx-auto mb-2" />
                    <p className="text-gray-400 text-sm">Bu müşteri için kayıt bulunmuyor</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {incidents.map(inc => (
                      <div key={inc.id} className={`bg-[#1E1E1E] rounded-xl p-4 border ${inc.incident_type === 'positive' ? 'border-green-500/20' : 'border-red-500/20'}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${inc.incident_type === 'positive' ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                              {inc.incident_type === 'positive'
                                ? <CheckCircle size={13} className="text-green-400" />
                                : <AlertTriangle size={13} className="text-red-400" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-white text-sm font-medium">{incidentTypeLabel[inc.incident_type] || inc.incident_type}</div>
                              <div className="text-gray-400 text-xs mt-0.5">{inc.description}</div>
                              <div className="text-gray-600 text-xs mt-0.5">
                                {inc.company_name} · {inc.incident_date ? format(new Date(inc.incident_date), 'dd MMM yyyy', { locale: tr }) : ''}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {inc.amount && <div className="text-red-400 font-semibold text-sm">₺{Number(inc.amount).toLocaleString('tr-TR')}</div>}
                            {inc.document_url && (
                              <button
                                onClick={() => setViewingDoc(viewingDoc === inc.id ? null : inc.id)}
                                className="flex items-center gap-1 text-blue-400 hover:text-blue-300 text-xs border border-blue-400/30 px-2 py-1 rounded-lg transition-colors">
                                <FileText size={11} /> Belge
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Belge görüntüleme — watermark ile, indirme yasak */}
                        {viewingDoc === inc.id && inc.document_url && (
                          <div className="mt-3 rounded-lg overflow-hidden border border-[#2A2A2A]">
                            <div className="relative select-none">
                              <img
                                src={inc.document_url}
                                alt="Belge"
                                className="w-full max-h-80 object-contain bg-[#0A0A0A]"
                                onContextMenu={e => e.preventDefault()}
                                draggable={false}
                              />
                              {/* Watermark katmanı */}
                              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                                <div className="text-white/15 text-3xl font-bold rotate-45 text-center select-none whitespace-nowrap">
                                  BİLGİORTAĞIM · SADECE GÖRÜNTÜLEME
                                </div>
                              </div>
                              {/* Tıklama engeli */}
                              <div className="absolute inset-0 bg-transparent" onContextMenu={e => e.preventDefault()} />
                            </div>
                            <div className="bg-[#1A1A1A] px-3 py-2 flex items-center gap-2">
                              <Shield size={12} className="text-gray-500" />
                              <span className="text-gray-500 text-xs">Bu belge yalnızca görüntüleme amaçlıdır. İndirme ve kopyalama yasaktır.</span>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
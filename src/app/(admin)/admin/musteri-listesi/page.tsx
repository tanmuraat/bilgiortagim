'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'
import { Search, Users, AlertTriangle, CheckCircle, Shield, X, Eye, FileText, Car, Phone, User, Building } from 'lucide-react'
import { toProxyUrl } from '@/lib/file-url'

export default function AdminMusteriListesiPage() {
  const supabase = createClient()
  const [customers, setCustomers] = useState<any[]>([])
  const [filtered, setFiltered] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterRisk, setFilterRisk] = useState('all')
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null)
  const [incidents, setIncidents] = useState<any[]>([])
  const [rentals, setRentals] = useState<any[]>([])
  const [showModal, setShowModal] = useState(false)
  const [stats, setStats] = useState({ total: 0, risky: 0, clear: 0, totalQueries: 0 })
  const [viewingDoc, setViewingDoc] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [customersRes, queriesRes] = await Promise.all([
      supabase.from('customer_records').select('*').order('created_at', { ascending: false }),
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
      (c.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.tc_encrypted || '').includes(search) ||
      (c.phone_encrypted || '').includes(search)
    )
    if (filterRisk !== 'all') result = result.filter(c => c.risk_level === filterRisk)
    setFiltered(result)
  }, [search, filterRisk, customers])

  const openDetail = async (customer: any) => {
    setSelectedCustomer(customer)
    setShowModal(true)
    setViewingDoc(null)
    const [incRes, rentalRes] = await Promise.all([
      supabase.from('customer_incidents').select('*').eq('customer_id', customer.id).order('incident_date', { ascending: false }),
      supabase.from('rentals').select('*, vehicles(plate, brand, model), profiles(company_name)')
        .eq('customer_tc_hash', customer.tc_hash).order('start_date', { ascending: false }),
    ])
    setIncidents(incRes.data || [])
    setRentals(rentalRes.data || [])
  }

  const handleRiskChange = async (customerId: string, newRisk: string) => {
    await supabase.from('customer_records').update({ risk_level: newRisk }).eq('id', customerId)
    fetchData()
    setSelectedCustomer((prev: any) => prev ? { ...prev, risk_level: newRisk } : prev)
  }

  const riskConfig: Record<string, any> = {
    clear: { label: 'Sorunsuz', color: 'text-green-400', bg: 'bg-green-400/10', border: 'border-green-400/20' },
    moderate: { label: 'Dikkatli', color: 'text-yellow-400', bg: 'bg-yellow-400/10', border: 'border-yellow-400/20' },
    risky: { label: 'Riskli', color: 'text-red-400', bg: 'bg-red-400/10', border: 'border-red-400/20' },
    blacklisted: { label: 'Kara Liste', color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/20' },
  }

  const incidentTypeLabel: Record<string, string> = {
    payment_delay: 'Ödeme Gecikmesi', damage: 'Araç Hasarı',
    contract_breach: 'Sözleşme İhlali', positive: 'Olumlu Deneyim', other: 'Diğer',
  }

  if (loading) return <div className="flex items-center justify-center h-96"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500" /></div>

  const InfoRow = ({ icon: Icon, label, value, highlight }: any) => (
    <div className="bg-[#1E1E1E] rounded-lg p-3">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon size={11} className="text-gray-600" />
        <span className="text-gray-500 text-xs">{label}</span>
      </div>
      <div className={`text-sm font-medium break-all ${highlight || 'text-white'}`}>{value || '—'}</div>
    </div>
  )

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Müşteri Kayıtları</h1>
        <p className="text-gray-400 text-sm mt-1">Platformdaki tüm müşteri kayıtları</p>
      </div>

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

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="İsim, TC veya telefon ile ara..."
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

      <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#2A2A2A]">
              {['Ad Soyad', 'TC Kimlik No', 'Telefon', 'Risk', 'Kiralama', 'Olumsuz', 'Son Kiralama Firma', 'Kayıt', ''].map(h => (
                <th key={h} className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={9} className="text-center text-gray-500 py-12 text-sm">Kayıt bulunamadı</td></tr>
            ) : filtered.map(c => {
              const rc = riskConfig[c.risk_level] || riskConfig.clear
              return (
                <tr key={c.id} className="border-b border-[#1A1A1A] hover:bg-[#1E1E1E] transition-colors">
                  <td className="px-4 py-3 text-white font-medium text-sm">{c.full_name || '—'}</td>
                  {/* TC açık göster */}
                  <td className="px-4 py-3 text-yellow-300 text-sm font-mono">{c.tc_encrypted || '—'}</td>
                  {/* Telefon açık göster */}
                  <td className="px-4 py-3 text-blue-300 text-sm">{c.phone_encrypted || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-semibold px-2 py-1 rounded-full ${rc.bg} ${rc.border} border ${rc.color}`}>{rc.label}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-sm">{c.rental_count || 0}</td>
                  <td className="px-4 py-3">
                    <span className={`text-sm font-bold ${(c.negative_records || 0) > 0 ? 'text-red-400' : 'text-gray-500'}`}>{c.negative_records || 0}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-sm truncate max-w-[120px]">{c.last_company_name || '—'}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{format(new Date(c.created_at), 'dd MMM yy', { locale: tr })}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => openDetail(c)} className="flex items-center gap-1.5 text-gray-400 hover:text-white text-xs border border-[#2A2A2A] hover:border-[#3A3A3A] px-2 py-1 rounded-lg transition-colors">
                      <Eye size={12} /> Detay
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* DETAY MODAL */}
      {showModal && selectedCustomer && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl w-full max-w-3xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-[#2A2A2A] sticky top-0 bg-[#141414] z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#2A2A2A] rounded-xl flex items-center justify-center text-white font-bold">
                  {selectedCustomer.full_name ? selectedCustomer.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() : 'MÜ'}
                </div>
                <div>
                  <h2 className="text-white font-semibold">{selectedCustomer.full_name || 'Müşteri Detayı'}</h2>
                  {(() => {
                    const rc = riskConfig[selectedCustomer.risk_level] || riskConfig.clear
                    return <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${rc.bg} ${rc.border} border ${rc.color}`}>{rc.label}</span>
                  })()}
                </div>
              </div>
              <button onClick={() => { setShowModal(false); setViewingDoc(null) }} className="text-gray-400 hover:text-white"><X size={20} /></button>
            </div>
            <div className="p-5 space-y-6">
              {/* MÜŞTERİ BİLGİLERİ */}
              <div>
                <h3 className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2"><User size={12} /> Kişisel Bilgiler</h3>
                <div className="grid grid-cols-3 gap-3">
                  <InfoRow icon={User} label="Ad Soyad" value={selectedCustomer.full_name} />
                  <InfoRow icon={Shield} label="TC Kimlik No (Açık)" value={selectedCustomer.tc_encrypted} highlight="text-yellow-300 font-mono" />
                  <InfoRow icon={Phone} label="Telefon (Açık)" value={selectedCustomer.phone_encrypted} highlight="text-blue-300" />
                  <InfoRow icon={Car} label="Toplam Kiralama" value={`${selectedCustomer.rental_count || 0} kez`} />
                  <InfoRow icon={Building} label="Son Kiralama Firma" value={selectedCustomer.last_company_name} />
                  <InfoRow icon={AlertTriangle} label="Olumsuz Kayıt" value={selectedCustomer.negative_records || 0} highlight={(selectedCustomer.negative_records || 0) > 0 ? 'text-red-400 font-bold' : 'text-gray-400'} />
                </div>
              </div>

              {/* RİSK SEVİYESİ YÖNETİMİ */}
              <div>
                <h3 className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-3">Risk Seviyesi Değiştir</h3>
                <div className="flex gap-2 flex-wrap">
                  {Object.entries(riskConfig).map(([key, rc]: any) => (
                    <button key={key} onClick={() => handleRiskChange(selectedCustomer.id, key)}
                      disabled={selectedCustomer.risk_level === key}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${selectedCustomer.risk_level === key ? `${rc.bg} ${rc.border} ${rc.color} cursor-default` : 'bg-[#1E1E1E] border-[#2A2A2A] text-gray-400 hover:text-white hover:border-[#3A3A3A]'}`}>
                      {rc.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* KİRALAMA GEÇMİŞİ */}
              <div>
                <h3 className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Car size={12} /> Kiralama Geçmişi
                  <span className="text-gray-600 text-xs bg-[#2A2A2A] px-2 py-0.5 rounded-full">{rentals.length}</span>
                </h3>
                {rentals.length === 0 ? (
                  <div className="bg-[#1E1E1E] rounded-xl p-6 text-center text-gray-500 text-sm">Kiralama kaydı bulunmuyor</div>
                ) : (
                  <div className="divide-y divide-[#2A2A2A] bg-[#1E1E1E] rounded-xl overflow-hidden">
                    {rentals.map(r => (
                      <div key={r.id} className="flex items-center justify-between px-4 py-3 hover:bg-[#252525] transition-colors">
                        <div>
                          <div className="text-white text-sm font-medium">{r.profiles?.company_name || 'Bilinmeyen Firma'}</div>
                          <div className="text-gray-500 text-xs">{r.vehicles?.plate} · {r.vehicles?.brand} {r.vehicles?.model}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-gray-400 text-xs">{format(new Date(r.start_date), 'dd MMM yyyy', { locale: tr })} – {format(new Date(r.end_date), 'dd MMM yyyy', { locale: tr })}</div>
                          <div className="flex items-center justify-end gap-2 mt-0.5">
                            {r.total_price && <span className="text-white text-xs font-medium">₺{Number(r.total_price).toLocaleString('tr-TR')}</span>}
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${r.payment_status === 'paid' ? 'bg-green-500/20 text-green-400' : r.payment_status === 'partial' ? 'bg-orange-500/20 text-orange-400' : 'bg-red-500/20 text-red-400'}`}>
                              {r.payment_status === 'paid' ? 'Ödendi' : r.payment_status === 'partial' ? 'Kısmi' : 'Ödenmedi'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* YORUMLAR */}
              <div>
                <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                  Yorumlar & Kayıtlar
                  <span className="text-xs bg-[#2A2A2A] text-gray-400 px-2 py-0.5 rounded-full">{incidents.length}</span>
                </h3>
                {incidents.length === 0 ? (
                  <div className="bg-[#1E1E1E] rounded-xl p-6 text-center">
                    <CheckCircle size={24} className="text-green-400 mx-auto mb-2" />
                    <p className="text-gray-400 text-sm">Yorum bulunmuyor</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {incidents.map(inc => (
                      <div key={inc.id} className={`bg-[#1E1E1E] rounded-xl p-4 border ${inc.incident_type === 'positive' ? 'border-green-500/20' : 'border-red-500/20'}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${inc.incident_type === 'positive' ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                              {inc.incident_type === 'positive' ? <CheckCircle size={13} className="text-green-400" /> : <AlertTriangle size={13} className="text-red-400" />}
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
                              <button onClick={() => setViewingDoc(viewingDoc === inc.id ? null : inc.id)}
                                className="flex items-center gap-1 text-blue-400 hover:text-blue-300 text-xs border border-blue-400/30 px-2 py-1 rounded-lg transition-colors">
                                <FileText size={11} /> {viewingDoc === inc.id ? 'Gizle' : 'Belge'}
                              </button>
                            )}
                          </div>
                        </div>
                        {viewingDoc === inc.id && inc.document_url && (
                          <div className="mt-3 rounded-lg overflow-hidden border border-[#2A2A2A]">
                            {/\.(jpg|jpeg|png|gif|webp)/i.test(inc.document_url) ? (
                              <div className="relative select-none">
                                <img src={toProxyUrl(inc.document_url) || inc.document_url} alt="Belge"
                                  className="w-full max-h-80 object-contain bg-[#0A0A0A]"
                                  onContextMenu={e => e.preventDefault()} draggable={false} />
                                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                                  <div className="text-white/10 text-3xl font-bold rotate-45 select-none whitespace-nowrap">BİLGİORTAĞIM</div>
                                </div>
                              </div>
                            ) : (
                              <iframe src={toProxyUrl(inc.document_url) || inc.document_url} className="w-full h-64 bg-white" />
                            )}
                            <div className="bg-[#1A1A1A] px-3 py-2 flex items-center gap-2 border-t border-[#2A2A2A]">
                              <Shield size={12} className="text-gray-500" />
                              <span className="text-gray-500 text-xs">Yalnızca görüntüleme</span>
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
'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'
import { Search, X, Eye, RefreshCw, FileText, Image, Shield, Car, Globe, MapPin, CreditCard, Calendar, Phone, Mail, User, Building } from 'lucide-react'

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
  const [userVehicleCount, setUserVehicleCount] = useState(0)
  const [docUrl, setDocUrl] = useState<string | null>(null)
  const [docLoading, setDocLoading] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('profiles')
      .select('*')
      .eq('role', 'user')
      .order('created_at', { ascending: false })
    setUsers(data || [])
    setFiltered(data || [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { fetchData() }, [fetchData])

  useEffect(() => {
    let result = users
    if (search) result = result.filter(u =>
      (u.company_name + u.full_name + u.email + (u.phone || '') + (u.city || '') + (u.tax_number || '')).toLowerCase().includes(search.toLowerCase())
    )
    if (filterPlan !== 'all') result = result.filter(u => u.subscription_plan === filterPlan)
    if (filterStatus !== 'all') result = result.filter(u => u.status === filterStatus)
    if (filterRenew === 'auto') result = result.filter(u => u.auto_renew === true)
    if (filterRenew === 'manual') result = result.filter(u => !u.auto_renew)
    setFiltered(result)
  }, [search, filterPlan, filterStatus, filterRenew, users])

  const openDetail = async (user: any) => {
    setSelectedUser(user)
    setDocUrl(null)
    const [queryRes, vehicleRes] = await Promise.all([
      supabase.from('query_logs').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('vehicles').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
    ])
    setUserQueryCount(queryRes.count || 0)
    setUserVehicleCount(vehicleRes.count || 0)

    if (user.tax_document_url) {
      setDocLoading(true)
      try {
        if (user.tax_document_url.startsWith('http')) {
          setDocUrl(user.tax_document_url)
        } else {
          const { data } = await supabase.storage.from('tax-documents').createSignedUrl(user.tax_document_url, 3600)
          if (data?.signedUrl) setDocUrl(data.signedUrl)
        }
      } catch (e) { console.error(e) }
      setDocLoading(false)
    }
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

  const handleStatusChange = async (userId: string, newStatus: string) => {
    await supabase.from('profiles').update({ status: newStatus }).eq('id', userId)
    fetchData()
    setSelectedUser(null)
  }

  const statusBadge = (s: string) => ({
    approved: <span className="text-[10px] bg-green-500/20 text-green-400 border border-green-500/30 px-2 py-0.5 rounded-full">Onaylı</span>,
    pending: <span className="text-[10px] bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 px-2 py-0.5 rounded-full">Bekliyor</span>,
    rejected: <span className="text-[10px] bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded-full">Reddedildi</span>,
    blocked: <span className="text-[10px] bg-red-900/40 text-red-300 border border-red-900/50 px-2 py-0.5 rounded-full">Engellendi</span>,
  }[s] || <span className="text-[10px] text-gray-500">{s}</span>)

  const planBadge = (p: string) => ({
    premium: <span className="text-[10px] bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full border border-purple-500/30">Premium</span>,
    pro: <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full border border-blue-500/30">Pro</span>,
    none: <span className="text-[10px] bg-gray-500/20 text-gray-400 px-2 py-0.5 rounded-full border border-gray-500/30">Ücretsiz</span>,
  }[p] || null)

  const isPdf = docUrl?.toLowerCase().includes('.pdf') || false

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
        <h1 className="text-2xl font-bold text-white">Kullanıcılar</h1>
        <p className="text-gray-400 text-sm">{filtered.length} kullanıcı</p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Toplam Kullanıcı', value: users.length, color: 'text-white' },
          { label: 'Otomatik Yenileme', value: users.filter(u => u.auto_renew && u.subscription_plan !== 'none').length, color: 'text-green-400' },
          { label: 'Manuel Yenileme', value: users.filter(u => !u.auto_renew && u.subscription_plan !== 'none').length, color: 'text-yellow-400' },
          { label: 'Abonesiз', value: users.filter(u => u.subscription_plan === 'none').length, color: 'text-gray-400' },
        ].map((s, i) => (
          <div key={i} className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-4">
            <div className="text-gray-400 text-sm mb-1">{s.label}</div>
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Firma, isim, email, vergi no, şehir ara..."
            className="w-full bg-[#141414] border border-[#2A2A2A] text-white rounded-lg pl-9 pr-3 py-2.5 text-sm focus:border-red-500 outline-none" />
        </div>
        <select value={filterPlan} onChange={e => setFilterPlan(e.target.value)} className="bg-[#141414] border border-[#2A2A2A] text-white rounded-lg px-3 py-2.5 text-sm focus:border-red-500 outline-none">
          <option value="all">Tüm Planlar</option>
          <option value="none">Ücretsiz</option>
          <option value="pro">Pro</option>
          <option value="premium">Premium</option>
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="bg-[#141414] border border-[#2A2A2A] text-white rounded-lg px-3 py-2.5 text-sm focus:border-red-500 outline-none">
          <option value="all">Tüm Durumlar</option>
          <option value="approved">Onaylı</option>
          <option value="pending">Bekliyor</option>
          <option value="rejected">Reddedildi</option>
          <option value="blocked">Engellendi</option>
        </select>
        <select value={filterRenew} onChange={e => setFilterRenew(e.target.value)} className="bg-[#141414] border border-[#2A2A2A] text-white rounded-lg px-3 py-2.5 text-sm focus:border-red-500 outline-none">
          <option value="all">Tüm Yenileme</option>
          <option value="auto">Otomatik</option>
          <option value="manual">Manuel</option>
        </select>
      </div>

      <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#2A2A2A]">
              {['Firma / Yetkili', 'İletişim', 'Vergi No', 'Şehir', 'Plan', 'Durum', 'Sub. Bitiş', 'Kayıt', ''].map(h => (
                <th key={h} className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(u => (
              <tr key={u.id} className={`border-b border-[#1A1A1A] hover:bg-[#1E1E1E] transition-colors ${u.status === 'blocked' ? 'bg-red-500/5' : ''}`}>
                <td className="px-4 py-3">
                  <div className="text-white text-sm font-medium">{u.company_name || '—'}</div>
                  <div className="text-gray-500 text-xs">{u.full_name}</div>
                </td>
                <td className="px-4 py-3">
                  <div className="text-gray-400 text-xs">{u.email}</div>
                  <div className="text-gray-500 text-xs">{u.phone || '—'}</div>
                </td>
                <td className="px-4 py-3 text-gray-400 text-sm font-mono">{u.tax_number || '—'}</td>
                <td className="px-4 py-3 text-gray-400 text-sm">{u.city ? `${u.city}${u.district ? ' / ' + u.district : ''}` : '—'}</td>
                <td className="px-4 py-3">{planBadge(u.subscription_plan)}</td>
                <td className="px-4 py-3">{statusBadge(u.status)}</td>
                <td className="px-4 py-3 text-gray-400 text-sm">
                  {u.subscription_end ? format(new Date(u.subscription_end), 'dd MMM yyyy', { locale: tr }) : '—'}
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">{format(new Date(u.created_at), 'dd MMM yy', { locale: tr })}</td>
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

      {/* DETAY MODAL */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl w-full max-w-3xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-[#2A2A2A] sticky top-0 bg-[#141414] z-10">
              <div>
                <h2 className="text-white font-semibold text-lg">{selectedUser.company_name || selectedUser.full_name}</h2>
                <div className="flex items-center gap-2 mt-1">{statusBadge(selectedUser.status)} {planBadge(selectedUser.subscription_plan)}</div>
              </div>
              <button onClick={() => setSelectedUser(null)} className="text-gray-400 hover:text-white"><X size={20} /></button>
            </div>

            <div className="p-5 space-y-6">
              {/* YETKİLİ BİLGİLERİ */}
              <div>
                <h3 className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2">
                  <User size={12} /> Yetkili Bilgileri
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  <InfoRow icon={User} label="Ad Soyad" value={selectedUser.full_name} />
                  <InfoRow icon={Shield} label="TC Kimlik No" value={selectedUser.tc_number_encrypted} highlight="text-yellow-300 font-mono" />
                  <InfoRow icon={Calendar} label="Doğum Tarihi" value={selectedUser.birth_date ? format(new Date(selectedUser.birth_date), 'dd MMMM yyyy', { locale: tr }) : null} />
                  <InfoRow icon={Mail} label="Email" value={selectedUser.email} />
                  <InfoRow icon={Phone} label="Telefon" value={selectedUser.phone} highlight="text-blue-300" />
                  <InfoRow icon={Calendar} label="Kayıt Tarihi" value={format(new Date(selectedUser.created_at), 'dd MMM yyyy HH:mm', { locale: tr })} />
                </div>
              </div>

              {/* FİRMA BİLGİLERİ */}
              <div>
                <h3 className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Building size={12} /> Firma Bilgileri
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  <InfoRow icon={Building} label="Firma Adı" value={selectedUser.company_name} />
                  <InfoRow icon={CreditCard} label="Vergi Numarası" value={selectedUser.tax_number} highlight="text-white font-mono" />
                  <InfoRow icon={Building} label="Vergi Dairesi" value={selectedUser.tax_office} />
                  <InfoRow icon={MapPin} label="İl / İlçe" value={selectedUser.city ? `${selectedUser.city}${selectedUser.district ? ' / ' + selectedUser.district : ''}` : null} />
                  <InfoRow icon={Car} label="Filo Büyüklüğü" value={selectedUser.fleet_size} />
                  <InfoRow icon={Globe} label="Web / Sosyal Medya" value={selectedUser.website} />
                </div>
              </div>

              {/* ABONELİK & KULLANIM */}
              <div>
                <h3 className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2">
                  <CreditCard size={12} /> Abonelik & Kullanım
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  <InfoRow icon={CreditCard} label="Plan" value={selectedUser.subscription_plan === 'premium' ? 'Premium' : selectedUser.subscription_plan === 'pro' ? 'Pro' : 'Ücretsiz'} />
                  <InfoRow icon={Calendar} label="Sub. Başlangıç" value={selectedUser.subscription_start ? format(new Date(selectedUser.subscription_start), 'dd MMM yyyy', { locale: tr }) : null} />
                  <InfoRow icon={Calendar} label="Sub. Bitiş" value={selectedUser.subscription_end ? format(new Date(selectedUser.subscription_end), 'dd MMM yyyy', { locale: tr }) : null} />
                  <InfoRow icon={RefreshCw} label="Oto. Yenileme" value={selectedUser.auto_renew ? '✓ Aktif' : '✗ Kapalı'} highlight={selectedUser.auto_renew ? 'text-green-400' : 'text-yellow-400'} />
                  <InfoRow icon={Search} label="Toplam Sorgu" value={`${userQueryCount} sorgu`} />
                  <InfoRow icon={Car} label="Kayıtlı Araç" value={`${userVehicleCount} araç`} />
                </div>
              </div>

              {/* KVKK & SÖZLEŞME ONAYLARI */}
              <div>
                <h3 className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Shield size={12} /> Yasal Onaylar
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <InfoRow icon={Shield} label="KVKK Onayı"
                    value={selectedUser.kvkk_accepted ? `✓ Onaylandı${selectedUser.kvkk_accepted_at ? ' — ' + format(new Date(selectedUser.kvkk_accepted_at), 'dd MMM yyyy HH:mm', { locale: tr }) : ''}` : '✗ Onaylanmadı'}
                    highlight={selectedUser.kvkk_accepted ? 'text-green-400' : 'text-red-400'} />
                  <InfoRow icon={Shield} label="Üyelik Sözleşmesi"
                    value={selectedUser.contract_accepted ? `✓ Onaylandı${selectedUser.contract_accepted_at ? ' — ' + format(new Date(selectedUser.contract_accepted_at), 'dd MMM yyyy HH:mm', { locale: tr }) : ''}` : '✗ Onaylanmadı'}
                    highlight={selectedUser.contract_accepted ? 'text-green-400' : 'text-red-400'} />
                </div>
              </div>

              {/* VERGİ LEVHASI */}
              <div>
                <h3 className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2">
                  <FileText size={12} /> Vergi Levhası
                </h3>
                {!selectedUser.tax_document_url ? (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-center text-red-400 text-sm">Vergi levhası yüklenmemiş</div>
                ) : docLoading ? (
                  <div className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-xl p-8 text-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-500 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm">Belge yükleniyor...</p>
                  </div>
                ) : docUrl ? (
                  <div className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-xl overflow-hidden">
                    {isPdf ? (
                      <div className="p-5 text-center">
                        <FileText size={36} className="text-blue-400 mx-auto mb-3" />
                        <p className="text-white text-sm font-medium mb-3">PDF Vergi Levhası</p>
                        <a href={docUrl} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition-colors">
                          <Eye size={14} /> PDF'i Görüntüle
                        </a>
                      </div>
                    ) : (
                      <div className="relative select-none">
                        <img src={docUrl} alt="Vergi Levhası" className="w-full max-h-96 object-contain bg-white"
                          onContextMenu={e => e.preventDefault()} draggable={false} />
                        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                          <div className="text-black/10 text-3xl font-bold rotate-45 select-none whitespace-nowrap">BİLGİORTAĞIM · ADMİN GÖRÜNTÜLEMESİ</div>
                        </div>
                      </div>
                    )}
                    <div className="bg-[#1A1A1A] px-3 py-2 flex items-center gap-2 border-t border-[#2A2A2A]">
                      <Shield size={12} className="text-gray-500" />
                      <span className="text-gray-500 text-xs">Vergi levhası — admin görüntülemesi</span>
                    </div>
                  </div>
                ) : (
                  <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 text-center">
                    <p className="text-yellow-400 text-sm">Belge yüklenemedi.</p>
                  </div>
                )}
              </div>

              {/* HESAP YÖNETİMİ */}
              <div className="border-t border-[#2A2A2A] pt-5 space-y-4">
                <div>
                  <div className="text-gray-400 text-sm mb-3 font-medium">Manuel Abonelik Ekle</div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: 'Pro 1 Ay', plan: 'pro', months: 1 },
                      { label: 'Pro 3 Ay', plan: 'pro', months: 3 },
                      { label: 'Pro 12 Ay', plan: 'pro', months: 12 },
                      { label: 'Premium 1 Ay', plan: 'premium', months: 1 },
                      { label: 'Premium 3 Ay', plan: 'premium', months: 3 },
                      { label: 'Premium 12 Ay', plan: 'premium', months: 12 },
                    ].map((opt, i) => (
                      <button key={i} onClick={() => handleManualSub(selectedUser.id, opt.plan, opt.months)}
                        className="bg-[#1E1E1E] border border-[#2A2A2A] text-gray-300 py-2 rounded-lg text-xs hover:border-red-500/50 hover:text-white transition-colors">
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-gray-400 text-sm mb-3 font-medium">Hesap Durumu</div>
                  <div className="flex gap-2 flex-wrap">
                    {['approved', 'pending', 'rejected', 'blocked'].map(s => (
                      <button key={s} onClick={() => handleStatusChange(selectedUser.id, s)}
                        disabled={selectedUser.status === s}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${selectedUser.status === s ? 'bg-red-600 text-white cursor-default' : 'bg-[#1E1E1E] border border-[#2A2A2A] text-gray-400 hover:text-white hover:border-[#3A3A3A]'}`}>
                        {s === 'approved' ? 'Onayla' : s === 'pending' ? 'Beklemeye Al' : s === 'rejected' ? 'Reddet' : 'Engelle'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
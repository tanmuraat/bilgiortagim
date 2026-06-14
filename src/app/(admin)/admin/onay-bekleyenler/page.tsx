'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'
import { CheckCircle, XCircle, Eye, FileText, X, Clock, Building, Phone, Mail, Hash } from 'lucide-react'

export default function OnayBekleyenlerPage() {
  const supabase = createClient()
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [showModal, setShowModal] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [showRejectInput, setShowRejectInput] = useState(false)
  const [saving, setSaving] = useState(false)
  const [docUrl, setDocUrl] = useState<string | null>(null)
  const [docLoading, setDocLoading] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('profiles')
      .select('*').eq('status', 'pending').order('created_at', { ascending: false })
    setUsers(data || [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { fetchData() }, [fetchData])

  const getSignedUrl = async (path: string) => {
    setDocLoading(true)
    setDocUrl(null)
    try {
      // Path tam URL ise direkt kullan
      if (path.startsWith('http')) {
        // Eski format — public URL
        setDocUrl(path)
      } else {
        // Yeni format — storage path, signed URL al
        const { data, error } = await supabase.storage
          .from('tax-documents')
          .createSignedUrl(path, 3600) // 1 saat geçerli
        if (data?.signedUrl) setDocUrl(data.signedUrl)
        else console.error('Signed URL hatası:', error)
      }
    } catch (e) {
      console.error('Döküman URL hatası:', e)
    }
    setDocLoading(false)
  }

  const openDetail = async (user: any) => {
    setSelectedUser(user)
    setShowModal(true)
    setShowRejectInput(false)
    setRejectReason('')
    setDocUrl(null)
    if (user.tax_document_url) {
      await getSignedUrl(user.tax_document_url)
    }
  }

  const handleApprove = async (userId: string) => {
    setSaving(true)
    await supabase.from('profiles').update({ status: 'approved' }).eq('id', userId)
    await supabase.from('notifications').insert({
      user_id: userId,
      title: 'Başvurunuz Onaylandı! 🎉',
      message: 'Hesabınız incelendi ve onaylandı. Abonelik planı seçerek tüm özelliklere erişebilirsiniz.',
      type: 'success',
    })
    setShowModal(false)
    setSelectedUser(null)
    fetchData()
    setSaving(false)
  }

  const handleReject = async (userId: string) => {
    if (!rejectReason.trim()) { alert('Lütfen red gerekçesi yazın.'); return }
    setSaving(true)
    await supabase.from('profiles').update({ status: 'rejected', rejection_reason: rejectReason }).eq('id', userId)
    await supabase.from('notifications').insert({
      user_id: userId,
      title: 'Başvurunuz İncelendi',
      message: `Başvurunuz incelendi ancak onaylanamadı. Gerekçe: ${rejectReason}`,
      type: 'error',
    })
    setShowModal(false)
    setSelectedUser(null)
    setRejectReason('')
    setShowRejectInput(false)
    fetchData()
    setSaving(false)
  }

  if (loading) return <div className="flex items-center justify-center h-96"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500" /></div>

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="bg-yellow-500/10 p-2 rounded-lg"><Clock size={20} className="text-yellow-400" /></div>
        <div>
          <h1 className="text-2xl font-bold text-white">Onay Bekleyenler</h1>
          <p className="text-gray-400 text-sm">{users.length} kullanıcı onay bekliyor</p>
        </div>
      </div>

      {users.length === 0 ? (
        <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-16 text-center">
          <CheckCircle size={48} className="text-green-400 mx-auto mb-4" />
          <div className="text-white font-semibold text-lg">Bekleyen başvuru yok</div>
        </div>
      ) : (
        <div className="grid gap-4">
          {users.map(user => (
            <div key={user.id} className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-[#2A2A2A] rounded-xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                    {(user.full_name || user.company_name || '?')[0].toUpperCase()}
                  </div>
                  <div>
                    <div className="text-white font-semibold text-lg">{user.company_name}</div>
                    <div className="text-gray-400 text-sm">{user.full_name}</div>
                    <div className="text-gray-500 text-xs mt-1">{user.email}</div>
                    <div className="text-gray-500 text-xs">{format(new Date(user.created_at), 'dd MMMM yyyy HH:mm', { locale: tr })}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap justify-end">
                  <button onClick={() => openDetail(user)}
                    className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 px-3 py-2 rounded-lg text-sm hover:bg-blue-500/20 transition-colors">
                    <Eye size={14} /> İncele
                  </button>
                  <button onClick={() => handleApprove(user.id)} disabled={saving}
                    className="flex items-center gap-2 bg-green-500/10 border border-green-500/30 text-green-400 px-3 py-2 rounded-lg text-sm hover:bg-green-500/20 transition-colors disabled:opacity-50">
                    <CheckCircle size={14} /> Hızlı Onayla
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-3 mt-4 pt-4 border-t border-[#2A2A2A]">
                {[
                  { icon: Phone, label: 'Telefon', value: user.phone || '—' },
                  { icon: Hash, label: 'Vergi No', value: user.tax_number || '—' },
                  { icon: FileText, label: 'Vergi Levhası', value: user.tax_document_url ? '✅ Yüklendi' : '❌ Yüklenmedi' },
                  { icon: Mail, label: 'Email', value: user.email },
                ].map((item, i) => (
                  <div key={i} className="bg-[#1E1E1E] rounded-lg p-3">
                    <div className="text-gray-500 text-xs mb-1 flex items-center gap-1"><item.icon size={10} /> {item.label}</div>
                    <div className="text-white text-sm truncate">{item.value}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {showModal && selectedUser && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-[#2A2A2A]">
              <h2 className="text-white font-semibold text-lg">Başvuru İnceleme</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white"><X size={20} /></button>
            </div>

            {!showRejectInput ? (
              <div className="p-5 space-y-5">
                {/* Kullanıcı Bilgileri */}
                <div>
                  <h3 className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-3">Firma & Kişi Bilgileri</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'Firma Adı', value: selectedUser.company_name },
                      { label: 'Ad Soyad', value: selectedUser.full_name },
                      { label: 'Email', value: selectedUser.email },
                      { label: 'Telefon', value: selectedUser.phone || '—' },
                      { label: 'Vergi No', value: selectedUser.tax_number || '—' },
                      { label: 'Başvuru Tarihi', value: format(new Date(selectedUser.created_at), 'dd MMMM yyyy HH:mm', { locale: tr }) },
                    ].map((item, i) => (
                      <div key={i} className="bg-[#1E1E1E] rounded-lg p-3">
                        <div className="text-gray-500 text-xs mb-1">{item.label}</div>
                        <div className="text-white text-sm font-medium break-all">{item.value}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Vergi Levhası */}
                <div>
                  <h3 className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-3">Vergi Levhası</h3>
                  {!selectedUser.tax_document_url ? (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-center">
                      <XCircle size={24} className="text-red-400 mx-auto mb-2" />
                      <p className="text-red-400 text-sm font-medium">Vergi levhası yüklenmemiş</p>
                      <p className="text-gray-500 text-xs mt-1">Kullanıcı vergi levhası yüklemeden başvurmuş</p>
                    </div>
                  ) : docLoading ? (
                    <div className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-xl p-8 text-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-500 mx-auto mb-2" />
                      <p className="text-gray-500 text-sm">Belge yükleniyor...</p>
                    </div>
                  ) : docUrl ? (
                    <div className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-xl overflow-hidden">
                      {docUrl.toLowerCase().includes('.pdf') ? (
                        <div className="p-4 text-center">
                          <FileText size={32} className="text-blue-400 mx-auto mb-2" />
                          <p className="text-white text-sm font-medium mb-3">PDF Döküman</p>
                          <a href={docUrl} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition-colors">
                            <Eye size={14} /> PDF'i Görüntüle
                          </a>
                        </div>
                      ) : (
                        <div className="relative">
                          <img src={docUrl} alt="Vergi Levhası" className="w-full max-h-96 object-contain bg-white" />
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="text-white/10 text-4xl font-bold rotate-45 select-none">ADMIN GÖRÜNÜMÜ</div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 text-center">
                      <p className="text-yellow-400 text-sm">Belge yüklenemedi. Tekrar deneyin.</p>
                      <button onClick={() => getSignedUrl(selectedUser.tax_document_url)} className="text-xs text-red-400 mt-2">Tekrar Dene</button>
                    </div>
                  )}
                </div>

                {/* Aksiyonlar */}
                <div className="flex gap-3 pt-2 border-t border-[#2A2A2A]">
                  <button onClick={() => handleApprove(selectedUser.id)} disabled={saving}
                    className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-medium transition-colors disabled:opacity-50">
                    <CheckCircle size={16} /> {saving ? 'İşleniyor...' : 'Onayla'}
                  </button>
                  <button onClick={() => setShowRejectInput(true)}
                    className="flex-1 flex items-center justify-center gap-2 bg-red-600/20 border border-red-600/30 text-red-400 py-3 rounded-xl font-medium hover:bg-red-600/30 transition-colors">
                    <XCircle size={16} /> Reddet
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-5 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <button onClick={() => setShowRejectInput(false)} className="text-gray-400 hover:text-white text-sm">← Geri</button>
                  <h3 className="text-white font-medium">Başvuruyu Reddet</h3>
                </div>
                <p className="text-gray-400 text-sm"><span className="text-white font-medium">{selectedUser.company_name}</span> adlı firmanın başvurusunu reddetmek üzeresiniz.</p>
                <div>
                  <label className="text-gray-400 text-sm mb-1.5 block">Red Gerekçesi *</label>
                  <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={4}
                    placeholder="Örn: Vergi levhası okunamıyor, lütfen net görsel yükleyin."
                    className="w-full bg-[#1E1E1E] border border-[#2A2A2A] text-white rounded-lg px-3 py-2.5 text-sm focus:border-red-500 outline-none resize-none" />
                  <p className="text-gray-500 text-xs mt-1">Bu gerekçe kullanıcıya bildirim olarak gönderilecek.</p>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setShowRejectInput(false)} className="flex-1 bg-[#1E1E1E] border border-[#2A2A2A] text-gray-400 py-2.5 rounded-lg hover:bg-[#252525] transition-colors">Geri</button>
                  <button onClick={() => handleReject(selectedUser.id)} disabled={saving}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50">
                    {saving ? 'Gönderiliyor...' : 'Reddet ve Bildir'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
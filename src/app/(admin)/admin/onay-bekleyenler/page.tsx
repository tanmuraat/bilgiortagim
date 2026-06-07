'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'
import { CheckCircle, XCircle, Eye, FileText, X, Clock } from 'lucide-react'

export default function OnayBekleyenlerPage() {
  const supabase = createClient()
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [showModal, setShowModal] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [showRejectInput, setShowRejectInput] = useState(false)
  const [saving, setSaving] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('profiles')
      .select('*').eq('status', 'pending').order('created_at', { ascending: false })
    setUsers(data || [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { fetchData() }, [fetchData])

  const handleApprove = async (userId: string) => {
    setSaving(true)
    await supabase.from('profiles').update({ status: 'approved' }).eq('id', userId)
    await supabase.from('notifications').insert({
      user_id: userId,
      title: 'Başvurunuz Onaylandı! 🎉',
      message: 'Hesabınız incelendi ve onaylandı. Artık sisteme giriş yapabilirsiniz. Abonelik planı seçerek tüm özelliklere erişebilirsiniz.',
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
      message: `Başvurunuz incelendi ancak onaylanamadı. Gerekçe: ${rejectReason}. Bilgilerinizi güncelleyerek tekrar başvurabilirsiniz.`,
      type: 'error',
    })
    setShowModal(false)
    setSelectedUser(null)
    setRejectReason('')
    setShowRejectInput(false)
    fetchData()
    setSaving(false)
  }

  const getDocumentUrl = async (path: string) => {
    const { data } = await supabase.storage.from('tax-documents').createSignedUrl(path, 3600)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  if (loading) return (
    <div className="flex items-center justify-center h-96">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
    </div>
  )

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
          <div className="text-white font-semibold text-lg">Harika! Bekleyen başvuru yok</div>
          <div className="text-gray-400 text-sm mt-1">Tüm başvurular işleme alındı</div>
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
                    <div className="text-gray-500 text-xs">Kayıt: {format(new Date(user.created_at), 'dd MMMM yyyy HH:mm', { locale: tr })}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {user.tax_document_url && (
                    <button
                      onClick={() => {
                        const path = user.tax_document_url.split('/tax-documents/')[1]
                        if (path) getDocumentUrl(path)
                        else window.open(user.tax_document_url, '_blank')
                      }}
                      className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/30 text-blue-400 px-3 py-2 rounded-lg text-sm hover:bg-blue-500/20 transition-colors"
                    >
                      <FileText size={14} /> Vergi Levhası
                    </button>
                  )}
                  <button
                    onClick={() => { setSelectedUser(user); setShowModal(true); setShowRejectInput(false); setRejectReason('') }}
                    className="flex items-center gap-2 bg-[#1E1E1E] border border-[#2A2A2A] text-gray-300 px-3 py-2 rounded-lg text-sm hover:bg-[#252525] transition-colors"
                  >
                    <Eye size={14} /> İncele
                  </button>
                  <button
                    onClick={() => handleApprove(user.id)}
                    disabled={saving}
                    className="flex items-center gap-2 bg-green-500/10 border border-green-500/30 text-green-400 px-3 py-2 rounded-lg text-sm hover:bg-green-500/20 transition-colors disabled:opacity-50"
                  >
                    <CheckCircle size={14} /> Onayla
                  </button>
                  <button
                    onClick={() => { setSelectedUser(user); setShowRejectInput(true); setShowModal(true) }}
                    disabled={saving}
                    className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-400 px-3 py-2 rounded-lg text-sm hover:bg-red-500/20 transition-colors disabled:opacity-50"
                  >
                    <XCircle size={14} /> Reddet
                  </button>
                </div>
              </div>

              {/* User Details */}
              <div className="grid grid-cols-4 gap-3 mt-4 pt-4 border-t border-[#2A2A2A]">
                {[
                  { label: 'Telefon', value: user.phone || '—' },
                  { label: 'Vergi No', value: user.tax_number || '—' },
                  { label: 'Vergi Levhası', value: user.tax_document_url ? '✅ Yüklendi' : '❌ Yüklenmedi' },
                  { label: 'Email', value: user.email },
                ].map((item, i) => (
                  <div key={i} className="bg-[#1E1E1E] rounded-lg p-3">
                    <div className="text-gray-500 text-xs mb-1">{item.label}</div>
                    <div className="text-white text-sm truncate">{item.value}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail / Reject Modal */}
      {showModal && selectedUser && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-[#2A2A2A]">
              <h2 className="text-white font-semibold">{showRejectInput ? 'Başvuruyu Reddet' : 'Kullanıcı Detayı'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white"><X size={20} /></button>
            </div>
            <div className="p-5">
              {!showRejectInput ? (
                <div className="space-y-3">
                  {[
                    { label: 'Firma Adı', value: selectedUser.company_name },
                    { label: 'Ad Soyad', value: selectedUser.full_name },
                    { label: 'Email', value: selectedUser.email },
                    { label: 'Telefon', value: selectedUser.phone || '—' },
                    { label: 'Vergi No', value: selectedUser.tax_number || '—' },
                    { label: 'Kayıt Tarihi', value: format(new Date(selectedUser.created_at), 'dd MMMM yyyy HH:mm', { locale: tr }) },
                  ].map((item, i) => (
                    <div key={i} className="flex justify-between items-center py-2 border-b border-[#2A2A2A] last:border-0">
                      <span className="text-gray-500 text-sm">{item.label}</span>
                      <span className="text-white text-sm font-medium">{item.value}</span>
                    </div>
                  ))}
                  <div className="flex gap-3 mt-4">
                    <button onClick={() => handleApprove(selectedUser.id)} disabled={saving}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-lg font-medium text-sm transition-colors disabled:opacity-50">
                      {saving ? 'İşleniyor...' : '✓ Onayla'}
                    </button>
                    <button onClick={() => setShowRejectInput(true)}
                      className="flex-1 bg-red-600/20 border border-red-600/30 text-red-400 py-2.5 rounded-lg font-medium text-sm hover:bg-red-600/30 transition-colors">
                      ✕ Reddet
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-gray-400 text-sm"><span className="text-white font-medium">{selectedUser.company_name}</span> adlı firmanın başvurusunu reddetmek üzeresiniz.</p>
                  <div>
                    <label className="text-gray-400 text-sm mb-1.5 block">Red Gerekçesi *</label>
                    <textarea
                      value={rejectReason}
                      onChange={e => setRejectReason(e.target.value)}
                      rows={4}
                      placeholder="Örn: Vergi levhası okunamıyor, lütfen net görsel yükleyin."
                      className="w-full bg-[#1E1E1E] border border-[#2A2A2A] text-white rounded-lg px-3 py-2.5 text-sm focus:border-red-500 outline-none resize-none"
                    />
                    <p className="text-gray-500 text-xs mt-1">Bu gerekçe kullanıcıya bildirim olarak gönderilecek.</p>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => setShowRejectInput(false)} className="flex-1 bg-[#1E1E1E] border border-[#2A2A2A] text-gray-400 py-2.5 rounded-lg hover:bg-[#252525] transition-colors text-sm">Geri</button>
                    <button onClick={() => handleReject(selectedUser.id)} disabled={saving}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-lg font-medium text-sm transition-colors disabled:opacity-50">
                      {saving ? 'Gönderiliyor...' : 'Reddet ve Bildir'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
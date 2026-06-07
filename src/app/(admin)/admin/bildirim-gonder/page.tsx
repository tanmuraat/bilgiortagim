'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Bell, Send, CheckCircle } from 'lucide-react'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'

const NOTIFICATION_TYPES = [
  { value: 'info', label: 'Bilgi', color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/20' },
  { value: 'success', label: 'Başarı', color: 'text-green-400', bg: 'bg-green-400/10', border: 'border-green-400/20' },
  { value: 'warning', label: 'Uyarı', color: 'text-yellow-400', bg: 'bg-yellow-400/10', border: 'border-yellow-400/20' },
  { value: 'error', label: 'Önemli', color: 'text-red-400', bg: 'bg-red-400/10', border: 'border-red-400/20' },
]

export default function BildirimGonderPage() {
  const supabase = createClient()
  const [users, setUsers] = useState<any[]>([])
  const [sentNotifs, setSentNotifs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [form, setForm] = useState({
    target: 'all', // all | specific
    user_id: '',
    title: '',
    message: '',
    type: 'info',
  })

  const fetchData = useCallback(async () => {
    const [usersRes, notifsRes] = await Promise.all([
      supabase.from('profiles').select('id, full_name, company_name, email').eq('role', 'user').eq('status', 'approved').order('company_name'),
      supabase.from('notifications').select('*, profiles!notifications_user_id_fkey(company_name)').order('created_at', { ascending: false }).limit(10),
    ])
    setUsers(usersRes.data || [])
    setSentNotifs(notifsRes.data || [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { fetchData() }, [fetchData])

  const handleSend = async () => {
    if (!form.title.trim() || !form.message.trim()) { alert('Başlık ve mesaj zorunludur.'); return }
    if (form.target === 'specific' && !form.user_id) { alert('Lütfen kullanıcı seçin.'); return }
    setSending(true)

    const { data: { user } } = await supabase.auth.getUser()

    const payload: any = {
      title: form.title,
      message: form.message,
      type: form.type,
      created_by: user?.id,
    }

    if (form.target === 'specific') {
      payload.user_id = form.user_id
      await supabase.from('notifications').insert(payload)
    } else {
      // Herkese gönder: null user_id (herkese görünsün) veya tüm kullanıcılara tek tek
      payload.user_id = null
      await supabase.from('notifications').insert(payload)
    }

    setSent(true)
    setForm({ target: 'all', user_id: '', title: '', message: '', type: 'info' })
    setTimeout(() => setSent(false), 3000)
    fetchData()
    setSending(false)
  }

  const typeConfig = (type: string) => NOTIFICATION_TYPES.find(t => t.value === type) || NOTIFICATION_TYPES[0]

  if (loading) return (
    <div className="flex items-center justify-center h-96">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
    </div>
  )

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="bg-blue-500/10 p-2 rounded-lg"><Bell size={20} className="text-blue-400" /></div>
        <div>
          <h1 className="text-2xl font-bold text-white">Bildirim Gönder</h1>
          <p className="text-gray-400 text-sm">Kullanıcılara sistem bildirimi gönderin</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Form */}
        <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-5 space-y-4">
          <h3 className="text-white font-semibold">Yeni Bildirim</h3>

          {/* Hedef */}
          <div>
            <label className="text-gray-400 text-sm mb-2 block">Hedef Kitle</label>
            <div className="grid grid-cols-2 gap-2">
              {[{ value: 'all', label: 'Tüm Kullanıcılar' }, { value: 'specific', label: 'Belirli Kullanıcı' }].map(opt => (
                <button key={opt.value} onClick={() => setForm(f => ({ ...f, target: opt.value, user_id: '' }))}
                  className={`py-2.5 rounded-lg text-sm font-medium border transition-colors ${form.target === opt.value ? 'bg-red-600 border-red-600 text-white' : 'bg-[#1E1E1E] border-[#2A2A2A] text-gray-400 hover:border-[#3A3A3A]'}`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Kullanıcı seç */}
          {form.target === 'specific' && (
            <div>
              <label className="text-gray-400 text-sm mb-1.5 block">Kullanıcı Seç *</label>
              <select value={form.user_id} onChange={e => setForm(f => ({ ...f, user_id: e.target.value }))}
                className="w-full bg-[#1E1E1E] border border-[#2A2A2A] text-white rounded-lg px-3 py-2.5 text-sm focus:border-red-500 outline-none">
                <option value="">Kullanıcı seçin</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.company_name || u.full_name} — {u.email}</option>)}
              </select>
            </div>
          )}

          {/* Tip */}
          <div>
            <label className="text-gray-400 text-sm mb-2 block">Bildirim Tipi</label>
            <div className="grid grid-cols-4 gap-2">
              {NOTIFICATION_TYPES.map(t => (
                <button key={t.value} onClick={() => setForm(f => ({ ...f, type: t.value }))}
                  className={`py-2 rounded-lg text-xs font-medium border transition-colors ${form.type === t.value ? `${t.bg} ${t.border} ${t.color}` : 'bg-[#1E1E1E] border-[#2A2A2A] text-gray-400 hover:border-[#3A3A3A]'}`}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Başlık */}
          <div>
            <label className="text-gray-400 text-sm mb-1.5 block">Başlık *</label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Bildirim başlığı"
              className="w-full bg-[#1E1E1E] border border-[#2A2A2A] text-white rounded-lg px-3 py-2.5 text-sm focus:border-red-500 outline-none" />
          </div>

          {/* Mesaj */}
          <div>
            <label className="text-gray-400 text-sm mb-1.5 block">Mesaj *</label>
            <textarea value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
              rows={4} placeholder="Bildirim mesajı..."
              className="w-full bg-[#1E1E1E] border border-[#2A2A2A] text-white rounded-lg px-3 py-2.5 text-sm focus:border-red-500 outline-none resize-none" />
          </div>

          {/* Preview */}
          {form.title && (
            <div className={`rounded-lg p-3 border ${typeConfig(form.type).bg} ${typeConfig(form.type).border}`}>
              <div className={`text-sm font-semibold mb-1 ${typeConfig(form.type).color}`}>{form.title}</div>
              <div className="text-gray-400 text-xs">{form.message || 'Mesaj önizlemesi...'}</div>
            </div>
          )}

          <button onClick={handleSend} disabled={sending}
            className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg font-medium transition-colors disabled:opacity-50">
            {sent ? <><CheckCircle size={16} /> Gönderildi!</> : sending ? 'Gönderiliyor...' : <><Send size={16} /> Bildirimi Gönder</>}
          </button>
        </div>

        {/* Son Gönderilen Bildirimler */}
        <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl">
          <div className="p-5 border-b border-[#2A2A2A]">
            <h3 className="text-white font-semibold">Son Gönderilen Bildirimler</h3>
          </div>
          <div className="divide-y divide-[#1A1A1A]">
            {sentNotifs.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-sm">Henüz bildirim gönderilmedi</div>
            ) : sentNotifs.map(n => {
              const tc = typeConfig(n.type)
              return (
                <div key={n.id} className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${tc.color.replace('text-', 'bg-')}`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-white text-sm font-medium truncate">{n.title}</div>
                      <div className="text-gray-400 text-xs mt-0.5 line-clamp-2">{n.message}</div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-gray-600 text-[10px]">{format(new Date(n.created_at), 'dd MMM HH:mm', { locale: tr })}</span>
                        <span className="text-gray-600 text-[10px]">·</span>
                        <span className="text-gray-500 text-[10px]">{n.user_id ? (n.profiles?.company_name || 'Belirli kullanıcı') : 'Tüm kullanıcılar'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
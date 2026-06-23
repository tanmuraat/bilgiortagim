'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'
import {
  LifeBuoy, Plus, X, Send, ChevronRight, Info, FileText,
  AlertTriangle, MessageSquare, Clock, CheckCircle2,
} from 'lucide-react'

const CATEGORIES = [
  { key: 'bilgi', label: 'Bilgi', icon: Info, color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/20' },
  { key: 'talep', label: 'Talep', icon: FileText, color: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-purple-400/20' },
  { key: 'sikayet', label: 'Şikâyet', icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-400/10', border: 'border-red-400/20' },
  { key: 'yorum', label: 'Yorum', icon: MessageSquare, color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/20' },
] as const

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  open: { label: 'Yanıt Bekliyor', color: 'text-amber-400', bg: 'bg-amber-400/10', icon: Clock },
  answered: { label: 'Yanıtlandı', color: 'text-emerald-400', bg: 'bg-emerald-400/10', icon: CheckCircle2 },
  closed: { label: 'Kapatıldı', color: 'text-gray-500', bg: 'bg-gray-500/10', icon: CheckCircle2 },
}

function categoryInfo(key: string) {
  return CATEGORIES.find(c => c.key === key) || CATEGORIES[0]
}

export default function DestekPage() {
  const supabase = createClient()
  const [userId, setUserId] = useState<string | null>(null)
  const [tickets, setTickets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [showNewModal, setShowNewModal] = useState(false)
  const [newCategory, setNewCategory] = useState<string>('bilgi')
  const [newSubject, setNewSubject] = useState('')
  const [newMessage, setNewMessage] = useState('')
  const [creating, setCreating] = useState(false)

  const [activeTicket, setActiveTicket] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [replyText, setReplyText] = useState('')
  const [sendingReply, setSendingReply] = useState(false)
  const [loadingThread, setLoadingThread] = useState(false)
  const threadEndRef = useRef<HTMLDivElement>(null)

  const fetchTickets = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUserId(user.id)
    const { data } = await supabase.from('support_tickets')
      .select('*')
      .eq('user_id', user.id)
      .order('last_message_at', { ascending: false })
    setTickets(data || [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { fetchTickets() }, [fetchTickets])

  const openThread = async (ticket: any) => {
    setActiveTicket(ticket)
    setLoadingThread(true)
    const { data } = await supabase.from('support_messages')
      .select('*')
      .eq('ticket_id', ticket.id)
      .order('created_at', { ascending: true })
    setMessages(data || [])
    setLoadingThread(false)

    if (ticket.has_unread_admin_reply) {
      await supabase.from('support_tickets').update({ has_unread_admin_reply: false }).eq('id', ticket.id)
      setTickets(prev => prev.map(t => t.id === ticket.id ? { ...t, has_unread_admin_reply: false } : t))
    }

    setTimeout(() => threadEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
  }

  const handleCreate = async () => {
    if (!newSubject.trim() || !newMessage.trim()) { alert('Lütfen konu ve mesaj alanlarını doldurun.'); return }
    if (!userId) return
    setCreating(true)

    const { data: ticket, error } = await supabase.from('support_tickets').insert({
      user_id: userId,
      category: newCategory,
      subject: newSubject.trim(),
    }).select().single()

    if (error || !ticket) {
      alert('Destek talebi oluşturulamadı: ' + error?.message)
      setCreating(false)
      return
    }

    await supabase.from('support_messages').insert({
      ticket_id: ticket.id,
      sender_id: userId,
      sender_role: 'user',
      message: newMessage.trim(),
    })

    setShowNewModal(false)
    setNewSubject('')
    setNewMessage('')
    setNewCategory('bilgi')
    setCreating(false)
    await fetchTickets()
  }

  const handleReply = async () => {
    if (!replyText.trim() || !activeTicket || !userId) return
    setSendingReply(true)

    await supabase.from('support_messages').insert({
      ticket_id: activeTicket.id,
      sender_id: userId,
      sender_role: 'user',
      message: replyText.trim(),
    })

    await supabase.from('support_tickets').update({
      last_message_at: new Date().toISOString(),
      status: 'open',
    }).eq('id', activeTicket.id)

    const { data } = await supabase.from('support_messages')
      .select('*').eq('ticket_id', activeTicket.id).order('created_at', { ascending: true })
    setMessages(data || [])
    setReplyText('')
    setSendingReply(false)
    fetchTickets()
    setTimeout(() => threadEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
  }

  if (loading) return (
    <div className="flex items-center justify-center h-96">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500" />
    </div>
  )

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Destek</h1>
          <p className="text-gray-400 text-sm mt-1">Bilgi, talep, şikâyet veya yorumlarınızı bize iletin</p>
        </div>
        <button onClick={() => setShowNewModal(true)}
          className="bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-4 py-2.5 rounded-xl flex items-center gap-2 transition-colors">
          <Plus size={16} /> Yeni Destek Talebi
        </button>
      </div>

      {/* Destek talebi satırları */}
      <div className="space-y-2.5">
        {tickets.map(ticket => {
          const cat = categoryInfo(ticket.category)
          const st = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.open
          return (
            <button key={ticket.id} onClick={() => openThread(ticket)}
              className="w-full bg-[#141414] border border-[#2A2A2A] hover:border-[#3A3A3A] rounded-xl p-4 flex items-center gap-4 text-left transition-colors group">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${cat.bg}`}>
                <cat.icon size={16} className={cat.color} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-white text-sm font-medium truncate">{ticket.subject}</span>
                  {ticket.has_unread_admin_reply && (
                    <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${cat.bg} ${cat.color}`}>{cat.label}</span>
                  <span className="text-gray-600 text-xs">{format(new Date(ticket.last_message_at), 'd MMM yyyy, HH:mm', { locale: tr })}</span>
                </div>
              </div>
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full flex-shrink-0 flex items-center gap-1.5 ${st.bg} ${st.color}`}>
                <st.icon size={11} /> {st.label}
              </span>
              <ChevronRight size={16} className="text-gray-600 group-hover:text-gray-400 flex-shrink-0 transition-colors" />
            </button>
          )
        })}

        {tickets.length === 0 && (
          <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-16 text-center">
            <LifeBuoy size={40} className="text-gray-600 mx-auto mb-4" />
            <div className="text-white font-semibold">Henüz destek talebiniz yok</div>
            <div className="text-gray-500 text-sm mt-1">Bir sorunuz mu var? Yeni destek talebi oluşturun.</div>
          </div>
        )}
      </div>

      {/* YENİ TALEP MODAL */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setShowNewModal(false)}>
          <div className="bg-[#141414] border border-[#2A2A2A] rounded-2xl w-full max-w-lg flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-[#2A2A2A] flex-shrink-0">
              <h3 className="text-white font-semibold">Yeni Destek Talebi</h3>
              <button onClick={() => setShowNewModal(false)} className="text-gray-500 hover:text-white transition-colors"><X size={18} /></button>
            </div>
            <div className="overflow-y-auto p-5 space-y-4 flex-1">
              <div>
                <label className="text-gray-400 text-xs mb-2 block">Kategori</label>
                <div className="grid grid-cols-4 gap-2">
                  {CATEGORIES.map(c => (
                    <button key={c.key} onClick={() => setNewCategory(c.key)}
                      className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border text-xs font-medium transition-colors ${newCategory === c.key ? `${c.bg} ${c.border} ${c.color}` : 'border-[#2A2A2A] text-gray-500 hover:border-[#3A3A3A]'}`}>
                      <c.icon size={16} />
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1.5 block">Konu</label>
                <input value={newSubject} onChange={e => setNewSubject(e.target.value)} placeholder="Konuyu kısaca özetleyin"
                  className="w-full bg-[#1E1E1E] border border-[#2A2A2A] text-white rounded-xl px-4 py-2.5 text-sm focus:border-red-500 outline-none placeholder-gray-600 transition-colors" />
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1.5 block">Mesajınız</label>
                <textarea value={newMessage} onChange={e => setNewMessage(e.target.value)} rows={5} placeholder="Detayları yazın..."
                  className="w-full bg-[#1E1E1E] border border-[#2A2A2A] text-white rounded-xl px-4 py-2.5 text-sm focus:border-red-500 outline-none placeholder-gray-600 transition-colors resize-none" />
              </div>
            </div>
            <div className="p-4 border-t border-[#2A2A2A] flex-shrink-0">
              <button onClick={handleCreate} disabled={creating}
                className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white py-3 rounded-xl font-medium transition-colors flex items-center justify-center gap-2">
                {creating ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> : <>Gönder <Send size={15} /></>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TICKET DETAY / SOHBET MODAL */}
      {activeTicket && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setActiveTicket(null)}>
          <div className="bg-[#141414] border border-[#2A2A2A] rounded-2xl w-full max-w-lg flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between p-5 border-b border-[#2A2A2A] flex-shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${categoryInfo(activeTicket.category).bg} ${categoryInfo(activeTicket.category).color}`}>
                    {categoryInfo(activeTicket.category).label}
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${(STATUS_CONFIG[activeTicket.status] || STATUS_CONFIG.open).bg} ${(STATUS_CONFIG[activeTicket.status] || STATUS_CONFIG.open).color}`}>
                    {(STATUS_CONFIG[activeTicket.status] || STATUS_CONFIG.open).label}
                  </span>
                </div>
                <h3 className="text-white font-semibold mt-1.5">{activeTicket.subject}</h3>
              </div>
              <button onClick={() => setActiveTicket(null)} className="text-gray-500 hover:text-white transition-colors flex-shrink-0"><X size={18} /></button>
            </div>

            <div className="overflow-y-auto p-5 space-y-3 flex-1 min-h-[200px]">
              {loadingThread ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-500" />
                </div>
              ) : (
                <>
                  {messages.map(m => (
                    <div key={m.id} className={`flex ${m.sender_role === 'admin' ? 'justify-start' : 'justify-end'}`}>
                      <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${m.sender_role === 'admin' ? 'bg-[#1E1E1E] border border-[#2A2A2A]' : 'bg-red-600'}`}>
                        <div className={`text-[10px] mb-1 font-medium ${m.sender_role === 'admin' ? 'text-gray-500' : 'text-red-200'}`}>
                          {m.sender_role === 'admin' ? 'Destek Ekibi' : 'Siz'}
                        </div>
                        <div className={`text-sm whitespace-pre-wrap ${m.sender_role === 'admin' ? 'text-gray-200' : 'text-white'}`}>{m.message}</div>
                        <div className={`text-[10px] mt-1 ${m.sender_role === 'admin' ? 'text-gray-600' : 'text-red-200/70'}`}>
                          {format(new Date(m.created_at), 'd MMM, HH:mm', { locale: tr })}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={threadEndRef} />
                </>
              )}
            </div>

            {activeTicket.status !== 'closed' && (
              <div className="p-4 border-t border-[#2A2A2A] flex-shrink-0 flex items-end gap-2">
                <textarea value={replyText} onChange={e => setReplyText(e.target.value)} rows={1} placeholder="Yanıt yazın..."
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleReply() } }}
                  className="flex-1 bg-[#1E1E1E] border border-[#2A2A2A] text-white rounded-xl px-4 py-2.5 text-sm focus:border-red-500 outline-none placeholder-gray-600 transition-colors resize-none" />
                <button onClick={handleReply} disabled={sendingReply || !replyText.trim()}
                  className="bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white p-2.5 rounded-xl transition-colors flex-shrink-0">
                  {sendingReply ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> : <Send size={16} />}
                </button>
              </div>
            )}
            {activeTicket.status === 'closed' && (
              <div className="p-4 border-t border-[#2A2A2A] flex-shrink-0 text-center text-gray-500 text-xs">
                Bu destek talebi kapatılmıştır.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

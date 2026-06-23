'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'
import {
  LifeBuoy, X, Send, Info, FileText, AlertTriangle, MessageSquare,
  Clock, CheckCircle2, Lock, Search,
} from 'lucide-react'

const CATEGORIES = [
  { key: 'bilgi', label: 'Bilgi', icon: Info, color: 'text-blue-400', bg: 'bg-blue-400/10' },
  { key: 'talep', label: 'Talep', icon: FileText, color: 'text-purple-400', bg: 'bg-purple-400/10' },
  { key: 'sikayet', label: 'Şikâyet', icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-400/10' },
  { key: 'yorum', label: 'Yorum', icon: MessageSquare, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
] as const

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  open: { label: 'Yanıt Bekliyor', color: 'text-amber-400', bg: 'bg-amber-400/10', icon: Clock },
  answered: { label: 'Yanıtlandı', color: 'text-emerald-400', bg: 'bg-emerald-400/10', icon: CheckCircle2 },
  closed: { label: 'Kapatıldı', color: 'text-gray-500', bg: 'bg-gray-500/10', icon: Lock },
}

function categoryInfo(key: string) {
  return CATEGORIES.find(c => c.key === key) || CATEGORIES[0]
}

export default function AdminDestekTalepleriPage() {
  const supabase = createClient()
  const [adminId, setAdminId] = useState<string | null>(null)
  const [tickets, setTickets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'answered' | 'closed'>('all')
  const [search, setSearch] = useState('')

  const [activeTicket, setActiveTicket] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [loadingThread, setLoadingThread] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [sendingReply, setSendingReply] = useState(false)
  const threadEndRef = useRef<HTMLDivElement>(null)

  const fetchTickets = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setAdminId(user?.id || null)
    const { data } = await supabase.from('support_tickets')
      .select('*, profiles!support_tickets_user_id_fkey(company_name, full_name, email)')
      .order('last_message_at', { ascending: false })
    setTickets(data || [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { fetchTickets() }, [fetchTickets])

  const openThread = async (ticket: any) => {
    setActiveTicket(ticket)
    setLoadingThread(true)
    const { data } = await supabase.from('support_messages')
      .select('*').eq('ticket_id', ticket.id).order('created_at', { ascending: true })
    setMessages(data || [])
    setLoadingThread(false)
    setTimeout(() => threadEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
  }

  const handleReply = async () => {
    if (!replyText.trim() || !activeTicket || !adminId) return
    setSendingReply(true)

    await supabase.from('support_messages').insert({
      ticket_id: activeTicket.id,
      sender_id: adminId,
      sender_role: 'admin',
      message: replyText.trim(),
    })

    await supabase.from('support_tickets').update({
      status: 'answered',
      last_message_at: new Date().toISOString(),
      has_unread_admin_reply: true,
    }).eq('id', activeTicket.id)

    // Kullanıcıya bildirim gönder
    await supabase.from('notifications').insert({
      user_id: activeTicket.user_id,
      title: 'Destek talebinize yanıt geldi',
      message: `"${activeTicket.subject}" başlıklı talebinize yeni bir yanıt verildi.`,
      type: 'info',
      created_by: adminId,
      source_type: 'support_ticket',
      source_id: activeTicket.id,
    })

    const { data } = await supabase.from('support_messages')
      .select('*').eq('ticket_id', activeTicket.id).order('created_at', { ascending: true })
    setMessages(data || [])
    setReplyText('')
    setSendingReply(false)
    setActiveTicket((t: any) => ({ ...t, status: 'answered' }))
    fetchTickets()
    setTimeout(() => threadEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
  }

  const handleClose = async () => {
    if (!activeTicket) return
    await supabase.from('support_tickets').update({ status: 'closed' }).eq('id', activeTicket.id)
    setActiveTicket((t: any) => ({ ...t, status: 'closed' }))
    fetchTickets()
  }

  const handleReopen = async () => {
    if (!activeTicket) return
    await supabase.from('support_tickets').update({ status: 'open' }).eq('id', activeTicket.id)
    setActiveTicket((t: any) => ({ ...t, status: 'open' }))
    fetchTickets()
  }

  const filtered = tickets.filter(t => {
    if (statusFilter !== 'all' && t.status !== statusFilter) return false
    if (search) {
      const s = search.toLowerCase()
      const company = (t.profiles?.company_name || t.profiles?.full_name || '').toLowerCase()
      return t.subject.toLowerCase().includes(s) || company.includes(s)
    }
    return true
  })

  const counts = {
    all: tickets.length,
    open: tickets.filter(t => t.status === 'open').length,
    answered: tickets.filter(t => t.status === 'answered').length,
    closed: tickets.filter(t => t.status === 'closed').length,
  }

  if (loading) return (
    <div className="flex items-center justify-center h-96">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500" />
    </div>
  )

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="bg-red-500/10 p-2 rounded-lg"><LifeBuoy size={20} className="text-red-400" /></div>
        <div>
          <h1 className="text-2xl font-bold text-white">Destek Talepleri</h1>
          <p className="text-gray-400 text-sm">Kullanıcılardan gelen destek taleplerini yönetin</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 bg-[#141414] border border-[#2A2A2A] rounded-xl p-1">
          {[
            { key: 'all', label: 'Tümü' },
            { key: 'open', label: 'Bekleyen' },
            { key: 'answered', label: 'Yanıtlanan' },
            { key: 'closed', label: 'Kapatılan' },
          ].map(f => (
            <button key={f.key} onClick={() => setStatusFilter(f.key as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${statusFilter === f.key ? 'bg-red-600 text-white' : 'text-gray-400 hover:text-white'}`}>
              {f.label}
              <span className={`text-[10px] px-1.5 rounded-full ${statusFilter === f.key ? 'bg-white/20' : 'bg-[#2A2A2A]'}`}>{counts[f.key as keyof typeof counts]}</span>
            </button>
          ))}
        </div>
        <div className="flex-1 relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Konu veya firma ara..."
            className="w-full bg-[#141414] border border-[#2A2A2A] text-white rounded-xl pl-9 pr-3 py-2 text-sm focus:border-red-500 outline-none placeholder-gray-600" />
        </div>
      </div>

      <div className="space-y-2.5">
        {filtered.map(ticket => {
          const cat = categoryInfo(ticket.category)
          const st = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.open
          return (
            <button key={ticket.id} onClick={() => openThread(ticket)}
              className="w-full bg-[#141414] border border-[#2A2A2A] hover:border-[#3A3A3A] rounded-xl p-4 flex items-center gap-4 text-left transition-colors">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${cat.bg}`}>
                <cat.icon size={16} className={cat.color} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-white text-sm font-medium truncate">{ticket.subject}</div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-gray-500 text-xs truncate">{ticket.profiles?.company_name || ticket.profiles?.full_name}</span>
                  <span className="text-gray-700 text-xs">·</span>
                  <span className="text-gray-600 text-xs">{format(new Date(ticket.last_message_at), 'd MMM, HH:mm', { locale: tr })}</span>
                </div>
              </div>
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full flex-shrink-0 flex items-center gap-1.5 ${st.bg} ${st.color}`}>
                <st.icon size={11} /> {st.label}
              </span>
            </button>
          )
        })}

        {filtered.length === 0 && (
          <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-16 text-center">
            <LifeBuoy size={40} className="text-gray-600 mx-auto mb-4" />
            <div className="text-white font-semibold">Destek talebi bulunamadı</div>
          </div>
        )}
      </div>

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
                <div className="text-gray-500 text-xs mt-0.5">{activeTicket.profiles?.company_name || activeTicket.profiles?.full_name} — {activeTicket.profiles?.email}</div>
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
                    <div key={m.id} className={`flex ${m.sender_role === 'user' ? 'justify-start' : 'justify-end'}`}>
                      <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${m.sender_role === 'user' ? 'bg-[#1E1E1E] border border-[#2A2A2A]' : 'bg-red-600'}`}>
                        <div className={`text-[10px] mb-1 font-medium ${m.sender_role === 'user' ? 'text-gray-500' : 'text-red-200'}`}>
                          {m.sender_role === 'user' ? (activeTicket.profiles?.company_name || 'Kullanıcı') : 'Siz (Destek Ekibi)'}
                        </div>
                        <div className={`text-sm whitespace-pre-wrap ${m.sender_role === 'user' ? 'text-gray-200' : 'text-white'}`}>{m.message}</div>
                        <div className={`text-[10px] mt-1 ${m.sender_role === 'user' ? 'text-gray-600' : 'text-red-200/70'}`}>
                          {format(new Date(m.created_at), 'd MMM, HH:mm', { locale: tr })}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={threadEndRef} />
                </>
              )}
            </div>

            <div className="p-4 border-t border-[#2A2A2A] flex-shrink-0 space-y-3">
              {activeTicket.status !== 'closed' ? (
                <div className="flex items-end gap-2">
                  <textarea value={replyText} onChange={e => setReplyText(e.target.value)} rows={1} placeholder="Yanıt yazın..."
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleReply() } }}
                    className="flex-1 bg-[#1E1E1E] border border-[#2A2A2A] text-white rounded-xl px-4 py-2.5 text-sm focus:border-red-500 outline-none placeholder-gray-600 resize-none" />
                  <button onClick={handleReply} disabled={sendingReply || !replyText.trim()}
                    className="bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white p-2.5 rounded-xl transition-colors flex-shrink-0">
                    {sendingReply ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> : <Send size={16} />}
                  </button>
                </div>
              ) : (
                <div className="text-center text-gray-500 text-xs">Bu destek talebi kapatılmış.</div>
              )}
              <button onClick={activeTicket.status === 'closed' ? handleReopen : handleClose}
                className="w-full text-xs text-gray-500 hover:text-gray-300 transition-colors py-1">
                {activeTicket.status === 'closed' ? 'Talebi Yeniden Aç' : 'Talebi Kapat'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

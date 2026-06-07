// ============================================================
// BİLDİRİMLER — src/app/(app)/bildirimler/page.tsx
// ============================================================
'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'
import { Bell, CheckCheck, Info, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'

export default function BildirimlerPage() {
  const supabase = createClient()
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('notifications')
      .select('*').or(`user_id.eq.${user.id},user_id.is.null`)
      .order('created_at', { ascending: false })
    setNotifications(data || [])
    setLoading(false)
    // Hepsini okundu işaretle
    await supabase.from('notifications').update({ is_read: true })
      .or(`user_id.eq.${user.id},user_id.is.null`).eq('is_read', false)
  }, [supabase])

  useEffect(() => { fetchData() }, [fetchData])

  const typeConfig: Record<string, any> = {
    info: { icon: Info, color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/20' },
    success: { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-400/10', border: 'border-green-400/20' },
    warning: { icon: AlertTriangle, color: 'text-yellow-400', bg: 'bg-yellow-400/10', border: 'border-yellow-400/20' },
    error: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-400/10', border: 'border-red-400/20' },
  }

  if (loading) return <div className="flex items-center justify-center h-96"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500" /></div>

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Bildirimler</h1>
          <p className="text-gray-400 text-sm mt-1">{notifications.length} bildirim</p>
        </div>
      </div>

      {notifications.length === 0 ? (
        <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-16 text-center">
          <Bell size={48} className="text-gray-600 mx-auto mb-4" />
          <div className="text-white font-semibold text-lg">Bildirim yok</div>
          <div className="text-gray-400 text-sm mt-1">Yeni bildirimler burada görünecek</div>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map(n => {
            const tc = typeConfig[n.type] || typeConfig.info
            return (
              <div key={n.id} className={`bg-[#141414] border rounded-xl p-5 flex items-start gap-4 ${n.is_read ? 'border-[#2A2A2A]' : `${tc.border} ${tc.bg}`}`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${tc.bg}`}>
                  <tc.icon size={18} className={tc.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className={`font-semibold ${n.is_read ? 'text-white' : tc.color}`}>{n.title}</div>
                    <div className="text-gray-500 text-xs flex-shrink-0">{format(new Date(n.created_at), 'dd MMM HH:mm', { locale: tr })}</div>
                  </div>
                  <div className="text-gray-400 text-sm mt-1">{n.message}</div>
                </div>
                {!n.is_read && <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0 mt-1" />}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format, formatDistanceToNow, differenceInCalendarDays, parseISO } from 'date-fns'
import { tr } from 'date-fns/locale'
import { Bell, Info, AlertTriangle, CheckCircle, XCircle, ShieldAlert, Wrench, Trash2, LifeBuoy, CheckCheck } from 'lucide-react'

export default function BildirimlerPage() {
  const supabase = createClient()
  const [userId, setUserId] = useState<string | null>(null)
  const [notifications, setNotifications] = useState<any[]>([])
  const [vehicleAlerts, setVehicleAlerts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [clearingAll, setClearingAll] = useState(false)

  const fetchData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUserId(user.id)

    const { data: notifs } = await supabase.from('notifications')
      .select('*')
      .or(`user_id.eq.${user.id},user_id.is.null`)
      .order('created_at', { ascending: false })

    setNotifications(notifs || [])

    const { data: vehicles } = await supabase.from('vehicles')
      .select('id, plate, brand, model, insurance_expiry, inspection_expiry')
      .eq('user_id', user.id)

    const alerts: any[] = []
    const today = new Date()

    for (const v of vehicles || []) {
      if (v.insurance_expiry) {
        const days = differenceInCalendarDays(parseISO(v.insurance_expiry), today)
        if (days >= 0 && days <= 15) {
          alerts.push({
            id: `insurance-${v.id}`, source_type: 'insurance', plate: v.plate, days, expired: false,
            title: `${v.plate} — Sigorta Bitiyor`,
            message: days === 0 ? 'Bugün sona eriyor.' : `${days} gün içinde sona eriyor (${format(parseISO(v.insurance_expiry), 'd MMM yyyy', { locale: tr })}).`,
          })
        }
        if (days < 0) {
          alerts.push({
            id: `expired-insurance-${v.id}`, source_type: 'insurance', plate: v.plate, days, expired: true,
            title: `${v.plate} — Sigorta Süresi Doldu`,
            message: `${Math.abs(days)} gün önce sona erdi.`,
          })
        }
      }
      if (v.inspection_expiry) {
        const days = differenceInCalendarDays(parseISO(v.inspection_expiry), today)
        if (days >= 0 && days <= 15) {
          alerts.push({
            id: `inspection-${v.id}`, source_type: 'inspection', plate: v.plate, days, expired: false,
            title: `${v.plate} — Muayene Bitiyor`,
            message: days === 0 ? 'Bugün sona eriyor.' : `${days} gün içinde sona eriyor (${format(parseISO(v.inspection_expiry), 'd MMM yyyy', { locale: tr })}).`,
          })
        }
        if (days < 0) {
          alerts.push({
            id: `expired-inspection-${v.id}`, source_type: 'inspection', plate: v.plate, days, expired: true,
            title: `${v.plate} — Muayene Süresi Doldu`,
            message: `${Math.abs(days)} gün önce sona erdi.`,
          })
        }
      }
    }

    setVehicleAlerts(alerts)

    await supabase.from('notifications')
      .update({ is_read: true })
      .or(`user_id.eq.${user.id},user_id.is.null`)
      .eq('is_read', false)

    setLoading(false)
  }, [supabase])

  useEffect(() => { fetchData() }, [fetchData])

  const typeConfig: Record<string, any> = {
    info: { icon: Info, color: 'text-blue-400', bg: 'bg-blue-400/10' },
    success: { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-400/10' },
    warning: { icon: AlertTriangle, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
    error: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-400/10' },
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    await supabase.from('notifications').delete().eq('id', id)
    setNotifications(prev => prev.filter(n => n.id !== id))
    setDeletingId(null)
  }

  const handleClearAll = async () => {
    if (!userId) return
    const deletable = notifications.filter(n => n.user_id === userId)
    if (deletable.length === 0) return
    if (!confirm(`${deletable.length} bildirimi temizlemek istediğinize emin misiniz?`)) return
    setClearingAll(true)
    await supabase.from('notifications').delete().eq('user_id', userId)
    setNotifications(prev => prev.filter(n => n.user_id !== userId))
    setClearingAll(false)
  }

  const totalCount = vehicleAlerts.length + notifications.length
  const ownDeletableCount = notifications.filter(n => n.user_id === userId).length

  if (loading) return (
    <div className="flex items-center justify-center h-96">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500" />
    </div>
  )

  return (
    <div className="p-6 space-y-5 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Bildirimler</h1>
          <p className="text-gray-400 text-sm mt-0.5">{totalCount} bildirim</p>
        </div>
        {ownDeletableCount > 0 && (
          <button onClick={handleClearAll} disabled={clearingAll}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-red-400 transition-colors disabled:opacity-50">
            <CheckCheck size={13} /> Tümünü Temizle
          </button>
        )}
      </div>

      {/* ARAÇ UYARILARI */}
      {vehicleAlerts.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-[11px] font-semibold text-amber-400/80 uppercase tracking-wider px-1 pb-1">
            Araç Belge Uyarıları · otomatik güncellenir
          </div>
          {vehicleAlerts.map(alert => (
            <div key={alert.id}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 border ${alert.expired ? 'border-red-500/30 bg-red-500/[0.04]' : 'border-amber-500/30 bg-amber-500/[0.04]'}`}>
              <div className={`w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 ${alert.expired ? 'bg-red-500/15' : 'bg-amber-500/15'}`}>
                {alert.source_type === 'insurance'
                  ? <ShieldAlert size={13} className={alert.expired ? 'text-red-400' : 'text-amber-400'} />
                  : <Wrench size={13} className={alert.expired ? 'text-red-400' : 'text-amber-400'} />}
              </div>
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-medium leading-tight ${alert.expired ? 'text-red-400' : 'text-amber-400'}`}>{alert.title}</div>
                <div className="text-gray-500 text-xs leading-tight mt-0.5">{alert.message}</div>
              </div>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0 font-semibold ${alert.expired ? 'bg-red-500/15 text-red-400' : 'bg-amber-500/15 text-amber-400'}`}>
                {alert.expired ? 'SÜRE DOLDU' : `${alert.days}G`}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* NORMAL BİLDİRİMLER */}
      {notifications.length > 0 && (
        <div className="space-y-1.5">
          {vehicleAlerts.length > 0 && (
            <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-1 pb-1">Sistem Bildirimleri</div>
          )}
          {notifications.map(n => {
            const tc = typeConfig[n.type] || typeConfig.info
            const isSupport = n.source_type === 'support_ticket'
            const canDelete = n.user_id === userId
            return (
              <div key={n.id}
                className="group flex items-center gap-3 rounded-lg px-3 py-2.5 border border-[#2A2A2A] hover:border-[#3A3A3A] transition-colors">
                <div className={`w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 ${tc.bg}`}>
                  {isSupport ? <LifeBuoy size={13} className={tc.color} /> : <tc.icon size={13} className={tc.color} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-white text-sm font-medium leading-tight truncate">{n.title}</div>
                  <div className="text-gray-500 text-xs leading-tight mt-0.5 truncate">{n.message}</div>
                </div>
                <span className="text-gray-600 text-[10px] flex-shrink-0 whitespace-nowrap" title={format(new Date(n.created_at), 'd MMM yyyy, HH:mm', { locale: tr })}>
                  {formatDistanceToNow(new Date(n.created_at), { locale: tr, addSuffix: true })}
                </span>
                {canDelete && (
                  <button onClick={() => handleDelete(n.id)} disabled={deletingId === n.id} title="Sil"
                    className="flex-shrink-0 opacity-0 group-hover:opacity-100 p-1 rounded text-gray-600 hover:text-red-400 hover:bg-red-400/10 transition-all disabled:opacity-50">
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {totalCount === 0 && (
        <div className="border border-[#2A2A2A] rounded-xl p-14 text-center">
          <Bell size={36} className="text-gray-600 mx-auto mb-3" />
          <div className="text-white font-medium text-sm">Bildirim yok</div>
          <div className="text-gray-500 text-xs mt-1">Yeni bildirimler burada görünecek</div>
        </div>
      )}
    </div>
  )
}

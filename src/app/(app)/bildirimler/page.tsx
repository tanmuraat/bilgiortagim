'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format, differenceInCalendarDays, parseISO } from 'date-fns'
import { tr } from 'date-fns/locale'
import { Bell, Info, AlertTriangle, CheckCircle, XCircle, Car, ShieldAlert, Wrench } from 'lucide-react'

export default function BildirimlerPage() {
  const supabase = createClient()
  const [notifications, setNotifications] = useState<any[]>([])
  const [vehicleAlerts, setVehicleAlerts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Normal bildirimler
    const { data: notifs } = await supabase.from('notifications')
      .select('*')
      .or(`user_id.eq.${user.id},user_id.is.null`)
      .order('created_at', { ascending: false })

    setNotifications(notifs || [])

    // Araç muayene/sigorta uyarıları — 15 gün içinde bitenler
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
            id: `insurance-${v.id}`,
            vehicle_id: v.id,
            source_type: 'insurance',
            plate: v.plate,
            brand: v.brand,
            model: v.model,
            days,
            expiry: v.insurance_expiry,
            title: `${v.plate} — Sigorta Bitiyor`,
            message: days === 0
              ? 'Bugün sona eriyor! Lütfen sigortayı yenileyin.'
              : `${days} gün içinde sona eriyor (${format(parseISO(v.insurance_expiry), 'd MMMM yyyy', { locale: tr })}).`,
          })
        }
        if (days < 0) {
          alerts.push({
            id: `expired-insurance-${v.id}`,
            vehicle_id: v.id,
            source_type: 'insurance',
            plate: v.plate,
            brand: v.brand,
            model: v.model,
            days,
            expiry: v.insurance_expiry,
            expired: true,
            title: `${v.plate} — Sigorta Süresi Doldu`,
            message: `${Math.abs(days)} gün önce sona erdi. Lütfen sigortayı yenileyin.`,
          })
        }
      }
      if (v.inspection_expiry) {
        const days = differenceInCalendarDays(parseISO(v.inspection_expiry), today)
        if (days >= 0 && days <= 15) {
          alerts.push({
            id: `inspection-${v.id}`,
            vehicle_id: v.id,
            source_type: 'inspection',
            plate: v.plate,
            brand: v.brand,
            model: v.model,
            days,
            expiry: v.inspection_expiry,
            title: `${v.plate} — Muayene Bitiyor`,
            message: days === 0
              ? 'Bugün sona eriyor! Lütfen muayeneye götürün.'
              : `${days} gün içinde sona eriyor (${format(parseISO(v.inspection_expiry), 'd MMMM yyyy', { locale: tr })}).`,
          })
        }
        if (days < 0) {
          alerts.push({
            id: `expired-inspection-${v.id}`,
            vehicle_id: v.id,
            source_type: 'inspection',
            plate: v.plate,
            brand: v.brand,
            model: v.model,
            days,
            expiry: v.inspection_expiry,
            expired: true,
            title: `${v.plate} — Muayene Süresi Doldu`,
            message: `${Math.abs(days)} gün önce sona erdi. Lütfen muayeneye götürün.`,
          })
        }
      }
    }

    setVehicleAlerts(alerts)

    // Normal bildirimleri okundu işaretle
    await supabase.from('notifications')
      .update({ is_read: true })
      .or(`user_id.eq.${user.id},user_id.is.null`)
      .eq('is_read', false)

    setLoading(false)
  }, [supabase])

  useEffect(() => { fetchData() }, [fetchData])

  const typeConfig: Record<string, any> = {
    info: { icon: Info, color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/20' },
    success: { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-400/10', border: 'border-green-400/20' },
    warning: { icon: AlertTriangle, color: 'text-yellow-400', bg: 'bg-yellow-400/10', border: 'border-yellow-400/20' },
    error: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-400/10', border: 'border-red-400/20' },
  }

  const totalCount = vehicleAlerts.length + notifications.length

  if (loading) return (
    <div className="flex items-center justify-center h-96">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500" />
    </div>
  )

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Bildirimler</h1>
        <p className="text-gray-400 text-sm mt-1">{totalCount} bildirim</p>
      </div>

      {/* ARAÇ UYARILARI — silinemez, tarih güncellenince kaybolur */}
      {vehicleAlerts.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-2">
            <Car size={14} /> Araç Belge Uyarıları
            <span className="bg-amber-400/20 text-amber-400 text-[10px] px-1.5 py-0.5 rounded-full font-bold">{vehicleAlerts.length}</span>
          </h2>
          <p className="text-gray-600 text-xs">Bu bildirimler yalnızca ilgili aracın muayene veya sigorta tarihi güncellendiğinde kaybolur.</p>
          {vehicleAlerts.map(alert => (
            <div key={alert.id}
              className={`bg-[#141414] border rounded-xl p-5 flex items-start gap-4 ${alert.expired ? 'border-red-500/40 bg-red-500/5' : 'border-amber-500/40 bg-amber-500/5'}`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${alert.expired ? 'bg-red-500/15' : 'bg-amber-500/15'}`}>
                {alert.source_type === 'insurance'
                  ? <ShieldAlert size={18} className={alert.expired ? 'text-red-400' : 'text-amber-400'} />
                  : <Wrench size={18} className={alert.expired ? 'text-red-400' : 'text-amber-400'} />
                }
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <div className={`font-semibold ${alert.expired ? 'text-red-400' : 'text-amber-400'}`}>
                    {alert.title}
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full flex-shrink-0 font-bold ${alert.expired ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'}`}>
                    {alert.expired ? 'SÜRESI DOLDU' : `${alert.days} GÜN KALDI`}
                  </span>
                </div>
                <div className="text-gray-400 text-sm mt-1">{alert.message}</div>
                <div className="mt-2 text-xs text-gray-600">
                  {alert.source_type === 'insurance' ? '🛡️ Sigorta' : '🔧 Muayene'} — {alert.brand} {alert.model}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* NORMAL BİLDİRİMLER */}
      {notifications.length > 0 && (
        <div className="space-y-3">
          {vehicleAlerts.length > 0 && (
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
              <Bell size={14} /> Sistem Bildirimleri
            </h2>
          )}
          {notifications.map(n => {
            const tc = typeConfig[n.type] || typeConfig.info
            return (
              <div key={n.id}
                className={`bg-[#141414] border rounded-xl p-5 flex items-start gap-4 ${!n.is_read ? `${tc.border} ${tc.bg}` : 'border-[#2A2A2A]'}`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${tc.bg}`}>
                  <tc.icon size={18} className={tc.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className={`font-semibold ${!n.is_read ? tc.color : 'text-white'}`}>{n.title}</div>
                    <div className="text-gray-500 text-xs flex-shrink-0">
                      {format(new Date(n.created_at), 'dd MMM HH:mm', { locale: tr })}
                    </div>
                  </div>
                  <div className="text-gray-400 text-sm mt-1">{n.message}</div>
                </div>
                {!n.is_read && <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0 mt-1.5" />}
              </div>
            )
          })}
        </div>
      )}

      {totalCount === 0 && (
        <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-16 text-center">
          <Bell size={48} className="text-gray-600 mx-auto mb-4" />
          <div className="text-white font-semibold text-lg">Bildirim yok</div>
          <div className="text-gray-400 text-sm mt-1">Yeni bildirimler burada görünecek</div>
        </div>
      )}
    </div>
  )
}
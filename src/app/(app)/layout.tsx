'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  LayoutDashboard, Search, Calendar, Car, Calculator,
  BarChart2, Bell, Settings, LogOut, Menu,
  Info, AlertTriangle, CheckCircle, XCircle, X
} from 'lucide-react'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, plan: 'pro' },
  { href: '/musteri-sorgulama', label: 'Müşteri Sorgulama', icon: Search, plan: 'pro' },
  { href: '/kiralama-takvimi', label: 'Kiralama Takvimi', icon: Calendar, plan: 'premium' },
  { href: '/araclarim', label: 'Araçlarım', icon: Car, plan: 'pro' },
  { href: '/mini-muhasebe', label: 'Mini Muhasebe', icon: Calculator, plan: 'premium' },
  { href: '/raporlar', label: 'Raporlar', icon: BarChart2, plan: 'premium' },
  { href: '/bildirimler', label: 'Bildirimler', icon: Bell, plan: 'pro' },
  { href: '/ayarlar', label: 'Ayarlar', icon: Settings, plan: 'pro' },
]

const typeConfig: Record<string, any> = {
  info: { icon: Info, color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/20' },
  success: { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-400/10', border: 'border-green-400/20' },
  warning: { icon: AlertTriangle, color: 'text-yellow-400', bg: 'bg-yellow-400/10', border: 'border-yellow-400/20' },
  error: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-400/10', border: 'border-red-400/20' },
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()
  const [profile, setProfile] = useState<any>(null)
  const [notifications, setNotifications] = useState<any[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [showNotifPopup, setShowNotifPopup] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [loading, setLoading] = useState(true)
  const notifRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/giris'); return }
      const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (!p) { router.push('/giris'); return }
      if (p.status === 'pending') { router.push('/onay-bekleniyor'); return }
      if (p.status === 'rejected') { router.push('/giris'); return }
      setProfile(p)

      const { data: notifs } = await supabase.from('notifications')
        .select('*')
        .or(`user_id.eq.${user.id},user_id.is.null`)
        .order('created_at', { ascending: false })
        .limit(20)
      setNotifications(notifs || [])
      setUnreadCount((notifs || []).filter(n => !n.is_read).length)
      setLoading(false)
    }
    init()
  }, [supabase, router])

  // Popup dışına tıklayınca kapat
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifPopup(false)
      }
    }
    if (showNotifPopup) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showNotifPopup])

  const handleOpenNotif = async () => {
    setShowNotifPopup(prev => !prev)
    if (!showNotifPopup && unreadCount > 0) {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      await supabase.from('notifications')
        .update({ is_read: true })
        .or(`user_id.eq.${user.id},user_id.is.null`)
        .eq('is_read', false)
      setUnreadCount(0)
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/giris')
  }

  const canAccess = (plan: string) => {
    if (!profile) return false
    if (profile.subscription_plan === 'premium') return true
    if (profile.subscription_plan === 'pro' && plan === 'pro') return true
    return false
  }

  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-[#0A0A0A]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500" />
    </div>
  )

  return (
    <div className="flex h-screen bg-[#0A0A0A] overflow-hidden">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-56' : 'w-0 overflow-hidden'} bg-[#141414] border-r border-[#2A2A2A] flex flex-col flex-shrink-0 transition-all duration-200`}>
        <div className="p-4 border-b border-[#2A2A2A]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center font-bold text-white text-sm flex-shrink-0">B</div>
            <div>
              <div className="text-white font-bold text-sm leading-none">BilgiOrtağım</div>
              <div className="text-gray-500 text-[10px]">Rent A Car</div>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {NAV.map(item => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/')
            const accessible = canAccess(item.plan)
            return (
              <Link key={item.href} href={accessible ? item.href : '/abonelik'}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${active ? 'bg-red-600 text-white' : accessible ? 'text-gray-400 hover:bg-[#1E1E1E] hover:text-white' : 'text-gray-600'}`}>
                <item.icon size={16} className="flex-shrink-0" />
                <span className="flex-1">{item.label}</span>
                {item.href === '/bildirimler' && unreadCount > 0 && (
                  <span className="bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">{unreadCount}</span>
                )}
                {!accessible && <span className="text-[9px] bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded-full">PRO</span>}
              </Link>
            )
          })}
        </nav>
        <div className="m-3 p-3 bg-[#1E1E1E] border border-[#2A2A2A] rounded-xl">
          <div className="text-gray-400 text-xs font-medium mb-1">Destek Hattı</div>
          <div className="text-gray-500 text-[10px] mb-1">7/24 bize ulaşabilirsiniz</div>
          <div className="text-red-400 text-xs font-bold">0850 123 45 67</div>
        </div>
        <div className="p-3 border-t border-[#2A2A2A]">
          <div className="flex items-center gap-2 px-2 py-1.5 mb-1">
            <div className="w-6 h-6 bg-red-600 rounded-full flex items-center justify-center text-white text-[10px] font-bold">
              {(profile?.company_name || 'U')[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white text-xs font-medium truncate">{profile?.company_name}</div>
              <div className="text-gray-500 text-[10px] capitalize">{profile?.subscription_plan === 'none' ? 'Ücretsiz' : profile?.subscription_plan}</div>
            </div>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-2 w-full px-2 py-2 text-gray-500 hover:text-red-400 text-xs rounded-lg hover:bg-[#1E1E1E] transition-colors">
            <LogOut size={13} /> Çıkış Yap
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-14 bg-[#141414] border-b border-[#2A2A2A] flex items-center px-4 gap-4 flex-shrink-0">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-gray-400 hover:text-white transition-colors">
            <Menu size={18} />
          </button>
          <div className="flex-1" />
          {profile?.subscription_plan === 'none' && (
            <Link href="/abonelik" className="text-xs bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 px-3 py-1.5 rounded-lg hover:bg-yellow-500/20 transition-colors">
              ⚡ Abonelik Al
            </Link>
          )}

          {/* Bildirim Butonu */}
          <div className="relative" ref={notifRef}>
            <button onClick={handleOpenNotif} className="relative p-2 text-gray-400 hover:text-white transition-colors">
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full text-white text-[9px] font-bold flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Popup */}
            {showNotifPopup && (
              <div className="absolute right-0 top-12 w-96 bg-[#141414] border border-[#2A2A2A] rounded-xl shadow-2xl z-50 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-[#2A2A2A]">
                  <div className="text-white font-semibold text-sm">Bildirimler</div>
                  <div className="flex items-center gap-2">
                    <Link href="/bildirimler" onClick={() => setShowNotifPopup(false)}
                      className="text-red-400 hover:text-red-300 text-xs transition-colors">
                      Tümünü Gör
                    </Link>
                    <button onClick={() => setShowNotifPopup(false)} className="text-gray-500 hover:text-white transition-colors">
                      <X size={14} />
                    </button>
                  </div>
                </div>
                <div className="max-h-96 overflow-y-auto divide-y divide-[#1A1A1A]">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-gray-500 text-sm">Bildirim yok</div>
                  ) : notifications.slice(0, 10).map(n => {
                    const tc = typeConfig[n.type] || typeConfig.info
                    const cleanMsg = n.message.replace(/\s*\[[^\]]*\]/g, '')
                    return (
                      <div key={n.id}
                        className={`px-4 py-3 hover:bg-[#1E1E1E] transition-colors cursor-pointer ${!n.is_read ? tc.bg : ''}`}
                        onClick={() => { setShowNotifPopup(false); router.push('/bildirimler') }}>
                        <div className="flex items-start gap-3">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${tc.bg}`}>
                            <tc.icon size={13} className={tc.color} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className={`text-sm font-medium truncate ${!n.is_read ? tc.color : 'text-white'}`}>{n.title}</div>
                            <div className="text-gray-500 text-xs mt-0.5 line-clamp-2">{cleanMsg}</div>
                            <div className="text-gray-600 text-[10px] mt-1">
                              {format(new Date(n.created_at), 'dd MMM HH:mm', { locale: tr })}
                            </div>
                          </div>
                          {!n.is_read && <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0 mt-1.5" />}
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div className="px-4 py-3 border-t border-[#2A2A2A]">
                  <Link href="/bildirimler" onClick={() => setShowNotifPopup(false)}
                    className="block text-center text-sm text-red-400 hover:text-red-300 transition-colors">
                    Tüm bildirimleri gör →
                  </Link>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 pl-2 border-l border-[#2A2A2A]">
            <div className="w-7 h-7 bg-red-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
              {(profile?.company_name || 'U')[0].toUpperCase()}
            </div>
            <div className="hidden sm:block">
              <div className="text-white text-xs font-medium">{profile?.company_name}</div>
              <div className="text-gray-500 text-[10px]">Firma Yetkilisi</div>
            </div>
          </div>
        </header>

        {profile?.subscription_plan === 'none' && (
          <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-b border-yellow-500/20 px-6 py-2.5 flex items-center justify-between">
            <span className="text-yellow-400 text-sm">Hesabınız onaylandı! Özellikleri kullanmak için abonelik satın alın.</span>
            <Link href="/abonelik" className="bg-yellow-500 hover:bg-yellow-400 text-black text-xs font-bold px-4 py-1.5 rounded-lg transition-colors">
              Abonelik Al
            </Link>
          </div>
        )}

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
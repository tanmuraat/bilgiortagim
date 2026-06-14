'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  LayoutDashboard, Search, Calendar, Car, Calculator,
  BarChart2, Bell, Settings, LogOut, Menu,
  Info, AlertTriangle, CheckCircle, XCircle, X,
  ChevronDown, Users, Plus, Edit2, Trash2, Shield, Eye, EyeOff
} from 'lucide-react'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, plan: 'pro', perm: 'dashboard' },
  { href: '/musteri-sorgulama', label: 'Müşteri Sorgulama', icon: Search, plan: 'pro', perm: 'musteri-sorgulama' },
  { href: '/kiralama-takvimi', label: 'Kiralama Takvimi', icon: Calendar, plan: 'premium', perm: 'kiralama-takvimi' },
  { href: '/araclarim', label: 'Araçlarım', icon: Car, plan: 'pro', perm: 'araclarim' },
  { href: '/mini-muhasebe', label: 'Mini Muhasebe', icon: Calculator, plan: 'premium', perm: 'mini-muhasebe' },
  { href: '/raporlar', label: 'Raporlar', icon: BarChart2, plan: 'premium', perm: 'raporlar' },
  { href: '/bildirimler', label: 'Bildirimler', icon: Bell, plan: 'pro', perm: 'bildirimler' },
  { href: '/ayarlar', label: 'Ayarlar', icon: Settings, plan: 'pro', perm: 'ayarlar' },
]

const ALL_PERMISSIONS = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'musteri-sorgulama', label: 'Müşteri Sorgulama' },
  { key: 'kiralama-takvimi', label: 'Kiralama Takvimi' },
  { key: 'araclarim', label: 'Araçlarım' },
  { key: 'mini-muhasebe', label: 'Mini Muhasebe' },
  { key: 'raporlar', label: 'Raporlar' },
  { key: 'bildirimler', label: 'Bildirimler' },
]

const typeConfig: Record<string, any> = {
  info: { icon: Info, color: 'text-blue-400', bg: 'bg-blue-400/10' },
  success: { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-400/10' },
  warning: { icon: AlertTriangle, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
  error: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-400/10' },
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()
  const [profile, setProfile] = useState<any>(null)
  const [notifications, setNotifications] = useState<any[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [showNotifPopup, setShowNotifPopup] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showStaffModal, setShowStaffModal] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [loading, setLoading] = useState(true)
  const [subUsers, setSubUsers] = useState<any[]>([])
  const [showAddStaff, setShowAddStaff] = useState(false)
  const [editingStaff, setEditingStaff] = useState<any>(null)
  const [savingStaff, setSavingStaff] = useState(false)
  const [staffForm, setStaffForm] = useState({
    full_name: '', email: '', phone: '', role: 'staff', permissions: [] as string[]
  })
  const notifRef = useRef<HTMLDivElement>(null)
  const userMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/giris'); return }
      const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (!p) { router.push('/giris'); return }
      if (p.status === 'pending') { router.push('/onay-bekleniyor'); return }
      if (p.status === 'rejected') { router.push('/giris'); return }
      setProfile(p)
      const { data: notifs } = await supabase.from('notifications').select('*')
        .or(`user_id.eq.${user.id},user_id.is.null`)
        .order('created_at', { ascending: false }).limit(20)
      setNotifications(notifs || [])
      setUnreadCount((notifs || []).filter((n: any) => !n.is_read).length)
      setLoading(false)
    }
    init()
  }, [supabase, router])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotifPopup(false)
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setShowUserMenu(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const fetchSubUsers = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('sub_users').select('*').eq('parent_user_id', user.id).order('created_at')
    setSubUsers(data || [])
  }

  const openStaffModal = async () => {
    setShowUserMenu(false)
    await fetchSubUsers()
    setShowStaffModal(true)
  }

  const handleSaveStaff = async () => {
    if (!staffForm.full_name || !staffForm.email) { alert('Ad ve email zorunludur.'); return }
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
   
    const maxSub = profile?.subscription_plan === 'premium' ? 3 : 1
    if (!editingStaff && subUsers.length >= maxSub) {
      alert(`${profile?.subscription_plan === 'premium' ? 'Premium' : 'Pro'} planda maksimum ${maxSub} personel hesabı oluşturabilirsiniz.`)
      return
    }
   
    setSavingStaff(true)
   
    if (editingStaff) {
      // Düzenleme — sadece sub_users güncelle
      await supabase.from('sub_users').update({
        full_name: staffForm.full_name,
        phone: staffForm.phone,
        role: staffForm.role,
        permissions: staffForm.permissions,
      }).eq('id', editingStaff.id)
   
      // Eğer auth_user_id varsa profiles tablosunu da güncelle
      if (editingStaff.auth_user_id) {
        await supabase.from('profiles').update({
          full_name: staffForm.full_name,
          phone: staffForm.phone,
          permissions: staffForm.permissions,
        }).eq('id', editingStaff.auth_user_id)
      }
    } else {
      // Yeni personel — önce sub_users'a ekle, sonra API ile Auth kaydı yap
      const { data: newSubUser, error: subError } = await supabase.from('sub_users').insert({
        parent_user_id: user.id,
        full_name: staffForm.full_name,
        email: staffForm.email,
        phone: staffForm.phone,
        role: staffForm.role,
        permissions: staffForm.permissions,
        status: 'active',
      }).select().single()
   
      if (subError || !newSubUser) {
        alert('Personel eklenirken hata oluştu: ' + subError?.message)
        setSavingStaff(false)
        return
      }
   
      // API'yi çağır — Supabase Auth'a kayıt yap
      const res = await fetch('/api/personel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: staffForm.full_name,
          email: staffForm.email,
          phone: staffForm.phone,
          role: staffForm.role,
          permissions: staffForm.permissions,
          parent_user_id: user.id,
          sub_user_id: newSubUser.id,
        })
      })
   
      const result = await res.json()
      if (result.error) {
        alert('Auth kaydı hatası: ' + result.error)
      } else {
        alert(`✅ Personel oluşturuldu!\n\nEmail: ${staffForm.email}\nGeçici Şifre: ${result.temp_password}\n\nBu bilgileri personele bildirin. İlk girişte şifresini değiştirebilir.`)
      }
    }
   
    setStaffForm({ full_name: '', email: '', phone: '', role: 'staff', permissions: [] })
    setEditingStaff(null)
    setShowAddStaff(false)
    await fetchSubUsers()
    setSavingStaff(false)
  }

  const handleDeleteStaff = async (id: string) => {
    if (!confirm('Bu personel hesabını silmek istediğinize emin misiniz?')) return
    await supabase.from('sub_users').delete().eq('id', id)
    await fetchSubUsers()
  }

  const openEdit = (staff: any) => {
    setStaffForm({
      full_name: staff.full_name,
      email: staff.email,
      phone: staff.phone || '',
      role: staff.role,
      permissions: staff.permissions || [],
    })
    setEditingStaff(staff)
    setShowAddStaff(true)
  }

  const togglePermission = (perm: string) => {
    setStaffForm(f => ({
      ...f,
      permissions: f.permissions.includes(perm)
        ? f.permissions.filter(p => p !== perm)
        : [...f.permissions, perm]
    }))
  }

  const handleOpenNotif = async () => {
    setShowNotifPopup(prev => !prev)
    if (!showNotifPopup && unreadCount > 0) {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      await supabase.from('notifications').update({ is_read: true })
        .or(`user_id.eq.${user.id},user_id.is.null`).eq('is_read', false)
      setUnreadCount(0)
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/giris')
  }

  const canAccess = (plan: string, perm: string) => {
    if (!profile) return false
    // Alt kullanıcı ise permission kontrolü
    if (profile.is_sub_user) {
      return (profile.permissions || []).includes(perm)
    }
    if (profile.subscription_plan === 'premium') return true
    if (profile.subscription_plan === 'pro' && plan === 'pro') return true
    return false
  }

  const maxSubUsers = profile?.subscription_plan === 'premium' ? 3 : 1

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
            const accessible = canAccess(item.plan, item.perm)
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

          {/* Bildirim */}
          <div className="relative" ref={notifRef}>
            <button onClick={handleOpenNotif} className="relative p-2 text-gray-400 hover:text-white transition-colors">
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full text-white text-[9px] font-bold flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            {showNotifPopup && (
              <div className="absolute right-0 top-12 w-96 bg-[#141414] border border-[#2A2A2A] rounded-xl shadow-2xl z-50 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-[#2A2A2A]">
                  <div className="text-white font-semibold text-sm">Bildirimler</div>
                  <div className="flex items-center gap-2">
                    <Link href="/bildirimler" onClick={() => setShowNotifPopup(false)} className="text-red-400 hover:text-red-300 text-xs transition-colors">Tümünü Gör</Link>
                    <button onClick={() => setShowNotifPopup(false)} className="text-gray-500 hover:text-white transition-colors"><X size={14} /></button>
                  </div>
                </div>
                <div className="max-h-96 overflow-y-auto divide-y divide-[#1A1A1A]">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-gray-500 text-sm">Bildirim yok</div>
                  ) : notifications.slice(0, 10).map(n => {
                    const tc = typeConfig[n.type] || typeConfig.info
                    const cleanMsg = n.message.replace(/\s*\[[^\]]*\]/g, '')
                    return (
                      <div key={n.id} className={`px-4 py-3 hover:bg-[#1E1E1E] transition-colors cursor-pointer ${!n.is_read ? tc.bg : ''}`}
                        onClick={() => { setShowNotifPopup(false); router.push('/bildirimler') }}>
                        <div className="flex items-start gap-3">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${tc.bg}`}>
                            <tc.icon size={13} className={tc.color} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className={`text-sm font-medium truncate ${!n.is_read ? tc.color : 'text-white'}`}>{n.title}</div>
                            <div className="text-gray-500 text-xs mt-0.5 line-clamp-2">{cleanMsg}</div>
                            <div className="text-gray-600 text-[10px] mt-1">{format(new Date(n.created_at), 'dd MMM HH:mm', { locale: tr })}</div>
                          </div>
                          {!n.is_read && <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0 mt-1.5" />}
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div className="px-4 py-3 border-t border-[#2A2A2A]">
                  <Link href="/bildirimler" onClick={() => setShowNotifPopup(false)} className="block text-center text-sm text-red-400 hover:text-red-300 transition-colors">
                    Tüm bildirimleri gör →
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* User Menu */}
          <div className="relative" ref={userMenuRef}>
            <button onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 pl-3 border-l border-[#2A2A2A] hover:bg-[#1E1E1E] px-3 py-1.5 rounded-lg transition-colors">
              <div className="w-7 h-7 bg-red-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                {(profile?.company_name || 'U')[0].toUpperCase()}
              </div>
              <div className="hidden sm:block text-left">
                <div className="text-white text-xs font-medium">{profile?.company_name}</div>
                <div className="text-gray-500 text-[10px]">Firma Yetkilisi</div>
              </div>
              <ChevronDown size={14} className={`text-gray-500 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
            </button>

            {showUserMenu && (
              <div className="absolute right-0 top-12 w-56 bg-[#141414] border border-[#2A2A2A] rounded-xl shadow-2xl z-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-[#2A2A2A]">
                  <div className="text-white text-sm font-medium">{profile?.company_name}</div>
                  <div className="text-gray-500 text-xs">{profile?.email}</div>
                  <div className="text-gray-600 text-[10px] mt-1 capitalize">{profile?.subscription_plan === 'none' ? 'Ücretsiz Plan' : `${profile?.subscription_plan} Plan`}</div>
                </div>
                <div className="p-2">
                  <Link href="/ayarlar" onClick={() => setShowUserMenu(false)}
                    className="flex items-center gap-3 px-3 py-2.5 text-gray-400 hover:text-white hover:bg-[#1E1E1E] rounded-lg text-sm transition-colors">
                    <Settings size={15} /> Ayarlar
                  </Link>
                  {!profile?.is_sub_user && (
                    <button onClick={openStaffModal}
                      className="flex items-center gap-3 w-full px-3 py-2.5 text-gray-400 hover:text-white hover:bg-[#1E1E1E] rounded-lg text-sm transition-colors">
                      <Users size={15} />
                      <span>Personel Hesapları</span>
                      <span className="ml-auto text-[10px] bg-[#2A2A2A] text-gray-500 px-1.5 py-0.5 rounded-full">{subUsers.length}/{maxSubUsers}</span>
                    </button>
                  )}
                  <Link href="/abonelik" onClick={() => setShowUserMenu(false)}
                    className="flex items-center gap-3 px-3 py-2.5 text-gray-400 hover:text-white hover:bg-[#1E1E1E] rounded-lg text-sm transition-colors">
                    <Shield size={15} /> Abonelik
                  </Link>
                  <div className="border-t border-[#2A2A2A] mt-2 pt-2">
                    <button onClick={handleLogout}
                      className="flex items-center gap-3 w-full px-3 py-2.5 text-red-400 hover:bg-red-500/10 rounded-lg text-sm transition-colors">
                      <LogOut size={15} /> Çıkış Yap
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </header>

        {profile?.subscription_plan === 'none' && (
          <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-b border-yellow-500/20 px-6 py-2.5 flex items-center justify-between">
            <span className="text-yellow-400 text-sm">Hesabınız onaylandı! Özellikleri kullanmak için abonelik satın alın.</span>
            <Link href="/abonelik" className="bg-yellow-500 hover:bg-yellow-400 text-black text-xs font-bold px-4 py-1.5 rounded-lg transition-colors">Abonelik Al</Link>
          </div>
        )}

        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>

      {/* STAFF MODAL */}
      {showStaffModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-[#2A2A2A]">
              <div>
                <h2 className="text-white font-semibold text-lg">Personel Hesapları</h2>
                <p className="text-gray-500 text-xs mt-0.5">{subUsers.length}/{maxSubUsers} hesap kullanılıyor ({profile?.subscription_plan === 'premium' ? 'Premium' : 'Pro'} Plan)</p>
              </div>
              <button onClick={() => { setShowStaffModal(false); setShowAddStaff(false); setEditingStaff(null) }} className="text-gray-400 hover:text-white"><X size={20} /></button>
            </div>

            {!showAddStaff ? (
              <div className="p-5 space-y-4">
                {subUsers.length === 0 ? (
                  <div className="text-center py-8">
                    <Users size={40} className="text-gray-600 mx-auto mb-3" />
                    <div className="text-gray-400 text-sm">Henüz personel hesabı yok</div>
                    <div className="text-gray-600 text-xs mt-1">Ekip üyeleriniz için erişim hesabı oluşturun</div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {subUsers.map(s => (
                      <div key={s.id} className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-xl p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-[#2A2A2A] rounded-full flex items-center justify-center text-white text-sm font-bold">
                              {s.full_name[0].toUpperCase()}
                            </div>
                            <div>
                              <div className="text-white text-sm font-medium">{s.full_name}</div>
                              <div className="text-gray-500 text-xs">{s.email}</div>
                              <div className="text-gray-600 text-xs capitalize">{s.role === 'manager' ? 'Yönetici' : 'Personel'}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full ${s.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
                              {s.status === 'active' ? 'Aktif' : 'Pasif'}
                            </span>
                            <button onClick={() => openEdit(s)} className="p-1.5 text-gray-500 hover:text-white hover:bg-[#2A2A2A] rounded-lg transition-colors"><Edit2 size={13} /></button>
                            <button onClick={() => handleDeleteStaff(s.id)} className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"><Trash2 size={13} /></button>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {(s.permissions || []).map((p: string) => (
                            <span key={p} className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full">
                              {ALL_PERMISSIONS.find(a => a.key === p)?.label || p}
                            </span>
                          ))}
                          {(!s.permissions || s.permissions.length === 0) && (
                            <span className="text-[10px] text-gray-600">Yetki tanımlanmamış</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {subUsers.length < maxSubUsers && (
                  <button onClick={() => { setStaffForm({ full_name: '', email: '', phone: '', role: 'staff', permissions: [] }); setEditingStaff(null); setShowAddStaff(true) }}
                    className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-medium transition-colors">
                    <Plus size={16} /> Personel Ekle
                  </button>
                )}
                {subUsers.length >= maxSubUsers && (
                  <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 text-center">
                    <p className="text-yellow-400 text-sm">Personel limitine ulaştınız.</p>
                    <Link href="/abonelik" onClick={() => setShowStaffModal(false)} className="text-xs text-red-400 hover:text-red-300 mt-1 block">
                      {profile?.subscription_plan === 'pro' ? 'Premium\'a geçerek 3 personel ekleyebilirsiniz →' : ''}
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-5 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <button onClick={() => { setShowAddStaff(false); setEditingStaff(null) }} className="text-gray-400 hover:text-white text-sm flex items-center gap-1">
                    ← Geri
                  </button>
                  <h3 className="text-white font-medium">{editingStaff ? 'Personel Düzenle' : 'Yeni Personel Ekle'}</h3>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-gray-400 text-xs mb-1.5 block">Ad Soyad *</label>
                    <input value={staffForm.full_name} onChange={e => setStaffForm(f => ({ ...f, full_name: e.target.value }))}
                      placeholder="Ad Soyad" className="w-full bg-[#1E1E1E] border border-[#2A2A2A] text-white rounded-lg px-3 py-2.5 text-sm focus:border-red-500 outline-none" />
                  </div>
                  <div>
                    <label className="text-gray-400 text-xs mb-1.5 block">Email *</label>
                    <input value={staffForm.email} onChange={e => setStaffForm(f => ({ ...f, email: e.target.value }))}
                      placeholder="email@firma.com" disabled={!!editingStaff}
                      className="w-full bg-[#1E1E1E] border border-[#2A2A2A] text-white rounded-lg px-3 py-2.5 text-sm focus:border-red-500 outline-none disabled:opacity-50" />
                  </div>
                  <div>
                    <label className="text-gray-400 text-xs mb-1.5 block">Telefon</label>
                    <input value={staffForm.phone} onChange={e => setStaffForm(f => ({ ...f, phone: e.target.value }))}
                      placeholder="+90 5XX XXX XX XX" className="w-full bg-[#1E1E1E] border border-[#2A2A2A] text-white rounded-lg px-3 py-2.5 text-sm focus:border-red-500 outline-none" />
                  </div>
                  <div>
                    <label className="text-gray-400 text-xs mb-1.5 block">Rol</label>
                    <select value={staffForm.role} onChange={e => setStaffForm(f => ({ ...f, role: e.target.value }))}
                      className="w-full bg-[#1E1E1E] border border-[#2A2A2A] text-white rounded-lg px-3 py-2.5 text-sm focus:border-red-500 outline-none">
                      <option value="staff">Personel</option>
                      <option value="manager">Yönetici</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-gray-400 text-xs mb-2 block">Sayfa Yetkileri</label>
                  <div className="grid grid-cols-2 gap-2">
                    {ALL_PERMISSIONS.map(perm => (
                      <label key={perm.key} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${staffForm.permissions.includes(perm.key) ? 'bg-red-500/10 border-red-500/30 text-white' : 'bg-[#1E1E1E] border-[#2A2A2A] text-gray-400 hover:border-[#3A3A3A]'}`}>
                        <input type="checkbox" checked={staffForm.permissions.includes(perm.key)} onChange={() => togglePermission(perm.key)} className="accent-red-500" />
                        <span className="text-sm">{perm.label}</span>
                        {staffForm.permissions.includes(perm.key) ? <Eye size={13} className="ml-auto text-green-400" /> : <EyeOff size={13} className="ml-auto text-gray-600" />}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                  <p className="text-blue-400 text-xs">
                    Personel hesabı oluşturulduktan sonra personele email ile erişim bilgileri gönderilecektir. Personel sisteme bu bilgilerle giriş yapabilir.
                  </p>
                </div>

                <div className="flex gap-3">
                  <button onClick={() => { setShowAddStaff(false); setEditingStaff(null) }} className="flex-1 bg-[#1E1E1E] border border-[#2A2A2A] text-gray-400 py-2.5 rounded-lg hover:bg-[#252525] transition-colors">İptal</button>
                  <button onClick={handleSaveStaff} disabled={savingStaff}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50">
                    {savingStaff ? 'Kaydediliyor...' : editingStaff ? 'Güncelle' : 'Personel Ekle'}
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
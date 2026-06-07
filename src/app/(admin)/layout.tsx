'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  LayoutDashboard, Users, Clock, CreditCard, Search,
  Bell, Globe, LogOut, Shield, ChevronRight
} from 'lucide-react'

const NAV = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/onay-bekleyenler', label: 'Onay Bekleyenler', icon: Clock, badge: 'pending' },
  { href: '/admin/kullanicilar', label: 'Kullanıcılar', icon: Users },
  { href: '/admin/abonelikler', label: 'Abonelikler', icon: CreditCard },
  { href: '/admin/sorgu-loglari', label: 'Sorgu Logları', icon: Search },
  { href: '/admin/bildirim-gonder', label: 'Bildirim Gönder', icon: Bell },
  { href: '/admin/site-yonetimi', label: 'Site Yönetimi', icon: Globe },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()
  const [pendingCount, setPendingCount] = useState(0)
  const [adminName, setAdminName] = useState('')

  useEffect(() => {
    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/giris'); return }
      const { data: profile } = await supabase.from('profiles').select('role, full_name, company_name').eq('id', user.id).single()
      if (profile?.role !== 'admin') { router.push('/dashboard'); return }
      setAdminName(profile.full_name || profile.company_name || 'Admin')
      const { count } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('status', 'pending')
      setPendingCount(count || 0)
    }
    check()
  }, [supabase, router])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/giris')
  }

  return (
    <div className="flex h-screen bg-[#0A0A0A] overflow-hidden">
      {/* Sidebar */}
      <aside className="w-60 bg-[#141414] border-r border-[#2A2A2A] flex flex-col flex-shrink-0">
        {/* Logo */}
        <div className="p-5 border-b border-[#2A2A2A]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center font-bold text-white text-sm">B</div>
            <div>
              <div className="text-white font-bold text-sm leading-none">BilgiOrtağım</div>
              <div className="text-red-400 text-[10px] mt-0.5 flex items-center gap-1"><Shield size={9} /> Admin Panel</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {NAV.map(item => {
            const active = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href))
            return (
              <Link key={item.href} href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${active ? 'bg-red-600 text-white' : 'text-gray-400 hover:bg-[#1E1E1E] hover:text-white'}`}>
                <item.icon size={16} className="flex-shrink-0" />
                <span className="flex-1">{item.label}</span>
                {item.badge === 'pending' && pendingCount > 0 && (
                  <span className="bg-yellow-500 text-black text-[10px] font-bold px-1.5 py-0.5 rounded-full">{pendingCount}</span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* User */}
        <div className="p-3 border-t border-[#2A2A2A]">
          <div className="flex items-center gap-3 px-3 py-2 mb-1">
            <div className="w-7 h-7 bg-red-600 rounded-full flex items-center justify-center text-white text-xs font-bold">{adminName[0]}</div>
            <div className="flex-1 min-w-0">
              <div className="text-white text-xs font-medium truncate">{adminName}</div>
              <div className="text-gray-500 text-[10px]">Sistem Admini</div>
            </div>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-2 w-full px-3 py-2 text-gray-400 hover:text-red-400 text-sm rounded-lg hover:bg-[#1E1E1E] transition-colors">
            <LogOut size={14} /> Çıkış Yap
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Eye, EyeOff, Shield } from 'lucide-react'

function GirisForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const rejected = searchParams.get('rejected')
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async () => {
    if (!email || !password) { setError('Email ve şifre zorunludur.'); return }
    setLoading(true)
    setError('')

    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })
    if (authError) {
      setError('Email veya şifre hatalı.')
      setLoading(false)
      return
    }

    if (data.user) {
      const { data: profile } = await supabase.from('profiles').select('status, role').eq('id', data.user.id).single()
      if (profile?.role === 'admin') {
        router.push('/admin')
      } else if (profile?.status === 'pending') {
        router.push('/onay-bekleniyor')
      } else if (profile?.status === 'rejected') {
        setError('Başvurunuz reddedildi. Destek hattını arayın: 0850 123 45 67')
        await supabase.auth.signOut()
      } else {
        router.push('/dashboard')
      }
    }
    setLoading(false)
  }

  const inputCls = "w-full bg-[#1E1E1E] border border-[#2A2A2A] text-white rounded-xl px-4 py-3 text-sm focus:border-red-500 outline-none placeholder-gray-600 transition-colors"

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-red-600 rounded-xl flex items-center justify-center font-bold text-white text-xl mx-auto mb-4">B</div>
          <h1 className="text-white font-bold text-2xl">BilgiOrtağım</h1>
          <p className="text-gray-500 text-sm mt-1">Rent A Car Yönetim Platformu</p>
        </div>

        <div className="bg-[#141414] border border-[#2A2A2A] rounded-2xl p-8 space-y-5">
          <div>
            <h2 className="text-white font-semibold text-xl">Giriş Yap</h2>
            <p className="text-gray-500 text-sm mt-1">Hesabınıza erişin</p>
          </div>

          {rejected && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-red-400 text-sm">
              Başvurunuz reddedildi. Detay için destek hattını arayın.
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-red-400 text-sm">{error}</div>
          )}

          <div className="space-y-4">
            <div>
              <label className="text-gray-400 text-xs mb-1.5 block">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                placeholder="ornek@firma.com" className={inputCls} />
            </div>
            <div>
              <label className="text-gray-400 text-xs mb-1.5 block">Şifre</label>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleLogin()}
                  placeholder="••••••••" className={inputCls + ' pr-11'} />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          </div>

          <button onClick={handleLogin} disabled={loading}
            className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            {loading ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> : 'Giriş Yap'}
          </button>

          <p className="text-center text-gray-500 text-sm">
            Hesabın yok mu?{' '}
            <Link href="/kayit" className="text-red-400 hover:text-red-300 font-medium transition-colors">Kayıt Ol</Link>
          </p>
        </div>

        <div className="flex items-center justify-center gap-2 mt-6 text-gray-600 text-xs">
          <Shield size={12} /> KVKK Uyumlu · Güvenli Bağlantı
        </div>

        <p className="text-center text-gray-600 text-xs mt-3">
          Destek: <span className="text-red-400">0850 123 45 67</span>
        </p>
      </div>
    </div>
  )
}

export default function GirisPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500" /></div>}>
      <GirisForm />
    </Suspense>
  )
}
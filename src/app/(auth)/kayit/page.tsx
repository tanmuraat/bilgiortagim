'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Upload, Shield, Eye, EyeOff } from 'lucide-react'

export default function KayitPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [taxFile, setTaxFile] = useState<File | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [form, setForm] = useState({
    full_name: '', company_name: '', tax_number: '',
    phone: '', email: '', password: '', password_confirm: ''
  })

  const handleRegister = async () => {
    setError('')
    if (!form.full_name || !form.company_name || !form.email || !form.password) {
      setError('Lütfen tüm zorunlu alanları doldurun.'); return
    }
    if (form.password !== form.password_confirm) {
      setError('Şifreler eşleşmiyor.'); return
    }
    if (form.password.length < 8) {
      setError('Şifre en az 8 karakter olmalıdır.'); return
    }
    if (!taxFile) {
      setError('Vergi levhası yüklemek zorunludur.'); return
    }

    setLoading(true)

    // Kullanıcı oluştur — email onayı kapalı (Supabase ayarından)
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          full_name: form.full_name,
          company_name: form.company_name,
        },
        // Email redirect URL — Vercel URL
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'https://bilgiortagim.vercel.app'}/giris`,
      }
    })

    if (authError) {
      if (authError.message.includes('already registered')) {
        setError('Bu email adresi zaten kayıtlı.')
      } else {
        setError('Kayıt sırasında hata oluştu: ' + authError.message)
      }
      setLoading(false)
      return
    }

    if (!authData.user) {
      setError('Kullanıcı oluşturulamadı.')
      setLoading(false)
      return
    }

    // Vergi levhası yükle
    let tax_document_url = null
    if (taxFile) {
      const ext = taxFile.name.split('.').pop()
      const path = `${authData.user.id}/vergi-levhasi-${Date.now()}.${ext}`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('tax-documents').upload(path, taxFile)
      if (!uploadError && uploadData) {
        // Private bucket — sadece path sakla
        tax_document_url = path
      }
    }

    // Profile güncelle
    await supabase.from('profiles').upsert({
      id: authData.user.id,
      email: form.email,
      full_name: form.full_name,
      company_name: form.company_name,
      tax_number: form.tax_number,
      phone: form.phone,
      tax_document_url,
      status: 'pending',
      subscription_plan: 'none',
      role: 'user',
    })

    router.push('/onay-bekleniyor')
    setLoading(false)
  }

  const inputCls = "w-full bg-[#1E1E1E] border border-[#2A2A2A] text-white rounded-xl px-4 py-3 text-sm focus:border-red-500 outline-none placeholder-gray-600 transition-colors"
  const labelCls = "text-gray-400 text-xs mb-1.5 block"

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-red-600 rounded-xl flex items-center justify-center font-bold text-white text-xl mx-auto mb-4">B</div>
          <h1 className="text-white font-bold text-2xl">BilgiOrtağım</h1>
          <p className="text-gray-500 text-sm mt-1">Ücretsiz hesap oluşturun</p>
        </div>

        <div className="bg-[#141414] border border-[#2A2A2A] rounded-2xl p-8 space-y-5">
          <div>
            <h2 className="text-white font-semibold text-xl">Kayıt Ol</h2>
            <p className="text-gray-500 text-sm mt-1">Başvurunuz admin onayına gönderilecektir.</p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-red-400 text-sm">{error}</div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Ad Soyad *</label>
              <input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} placeholder="Ad Soyad" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Firma Adı *</label>
              <input value={form.company_name} onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))} placeholder="Firma Adı" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Vergi Numarası</label>
              <input value={form.tax_number} onChange={e => setForm(f => ({ ...f, tax_number: e.target.value }))} placeholder="Vergi No" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Telefon</label>
              <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+90 5XX XXX XX XX" className={inputCls} />
            </div>
          </div>

          <div>
            <label className={labelCls}>Email *</label>
            <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="ornek@firma.com" className={inputCls} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Şifre *</label>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="En az 8 karakter" className={inputCls + ' pr-10'} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            <div>
              <label className={labelCls}>Şifre Tekrar *</label>
              <input type="password" value={form.password_confirm} onChange={e => setForm(f => ({ ...f, password_confirm: e.target.value }))} placeholder="Şifreyi tekrar girin" className={inputCls} />
            </div>
          </div>

          {/* Vergi Levhası */}
          <div>
            <label className={labelCls}>Vergi Levhası * (PDF, JPG veya PNG, max 10MB)</label>
            <label className={`flex items-center gap-3 w-full bg-[#1E1E1E] border-2 border-dashed rounded-xl px-4 py-4 cursor-pointer transition-colors ${taxFile ? 'border-green-500/50 bg-green-500/5' : 'border-[#3A3A3A] hover:border-red-500/50'}`}>
              <Upload size={18} className={taxFile ? 'text-green-400' : 'text-gray-500'} />
              <div>
                <div className={`text-sm font-medium ${taxFile ? 'text-green-400' : 'text-gray-400'}`}>
                  {taxFile ? taxFile.name : 'Vergi levhanızı yükleyin'}
                </div>
                <div className="text-gray-600 text-xs mt-0.5">PDF, JPG veya PNG formatında</div>
              </div>
              <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden"
                onChange={e => { if (e.target.files?.[0]) setTaxFile(e.target.files[0]) }} />
            </label>
          </div>

          <div className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-xl p-3 flex items-start gap-3">
            <Shield size={14} className="text-blue-400 flex-shrink-0 mt-0.5" />
            <p className="text-gray-500 text-xs leading-relaxed">
              Kayıt bilgileriniz admin tarafından incelenecek, vergi levhanız doğrulandıktan sonra hesabınız onaylanacaktır. Bu süreç genellikle 1 iş günü içinde tamamlanır.
            </p>
          </div>

          <button onClick={handleRegister} disabled={loading}
            className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            {loading ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> : 'Başvuru Gönder'}
          </button>

          <p className="text-center text-gray-500 text-sm">
            Zaten hesabın var mı?{' '}
            <Link href="/giris" className="text-red-400 hover:text-red-300 font-medium transition-colors">Giriş Yap</Link>
          </p>
        </div>

        <p className="text-center text-gray-600 text-xs mt-4">
          Destek: <span className="text-red-400">0850 123 45 67</span>
        </p>
      </div>
    </div>
  )
}
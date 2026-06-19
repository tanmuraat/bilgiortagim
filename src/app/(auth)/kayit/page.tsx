'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Upload, Shield, Eye, EyeOff, FileText, Check, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { KVKK_TEXT, CONTRACT_TEXT } from '@/lib/legal/texts'

const CITIES = [
  "Adana","Adıyaman","Afyonkarahisar","Ağrı","Amasya","Ankara","Antalya","Artvin","Aydın","Balıkesir",
  "Bilecik","Bingöl","Bitlis","Bolu","Burdur","Bursa","Çanakkale","Çankırı","Çorum","Denizli",
  "Diyarbakır","Edirne","Elazığ","Erzincan","Erzurum","Eskişehir","Gaziantep","Giresun","Gümüşhane",
  "Hakkari","Hatay","Isparta","Mersin","İstanbul","İzmir","Kars","Kastamonu","Kayseri","Kırklareli",
  "Kırşehir","Kocaeli","Konya","Kütahya","Malatya","Manisa","Kahramanmaraş","Mardin","Muğla","Muş",
  "Nevşehir","Niğde","Ordu","Rize","Sakarya","Samsun","Siirt","Sinop","Sivas","Tekirdağ","Tokat",
  "Trabzon","Tunceli","Şanlıurfa","Uşak","Van","Yozgat","Zonguldak","Aksaray","Bayburt","Karaman",
  "Kırıkkale","Batman","Şırnak","Bartın","Ardahan","Iğdır","Yalova","Karabük","Kilis","Osmaniye","Düzce"
].sort()

const FLEET_SIZES = ["1-5 araç","6-10 araç","11-20 araç","21-50 araç","51-100 araç","100+ araç"]



function DocumentModal({ title, content, onClose, linkHref }: { title: string; content: string; onClose: () => void; linkHref?: string }) {
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl w-full max-w-2xl flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between p-5 border-b border-[#2A2A2A] flex-shrink-0">
          <h3 className="text-white font-semibold">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors"><X size={20} /></button>
        </div>
        <div className="overflow-y-auto p-5 flex-1">
          <pre className="text-gray-300 text-xs leading-relaxed whitespace-pre-wrap font-sans">{content}</pre>
        </div>
        <div className="p-4 border-t border-[#2A2A2A] flex-shrink-0 flex gap-3">
          {linkHref && (
            <a href={linkHref} target="_blank" rel="noopener noreferrer"
              className="flex-1 text-center bg-[#1E1E1E] border border-[#2A2A2A] text-gray-400 py-2.5 rounded-lg text-sm font-medium hover:text-white transition-colors">
              Yeni Sekmede Aç
            </a>
          )}
          <button onClick={onClose} className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-lg text-sm font-medium transition-colors">
            Okudum, Kapat
          </button>
        </div>
      </div>
    </div>
  )
}

export default function KayitPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [taxFile, setTaxFile] = useState<File | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [kvkkOpen, setKvkkOpen] = useState(false)
  const [contractOpen, setContractOpen] = useState(false)
  const [kvkkChecked, setKvkkChecked] = useState(false)
  const [contractChecked, setContractChecked] = useState(false)

  const [form, setForm] = useState({
    full_name: '', tc_number: '', birth_date: '', phone: '',
    company_name: '', tax_number: '', tax_office: '', city: '', district: '',
    website: '', fleet_size: '',
    email: '', password: '', password_confirm: ''
  })

  const validateStep1 = () => {
    if (!form.full_name || !form.tc_number || !form.birth_date || !form.phone || !form.email || !form.password || !form.password_confirm) {
      setError('Lütfen tüm zorunlu alanları doldurun.'); return false
    }
    if (form.tc_number.length !== 11) { setError('TC kimlik numarası 11 haneli olmalıdır.'); return false }
    if (form.password.length < 8) { setError('Şifre en az 8 karakter olmalıdır.'); return false }
    if (form.password !== form.password_confirm) { setError('Şifreler eşleşmiyor.'); return false }
    setError('')
    return true
  }

  const validateStep2 = () => {
    if (!form.company_name || !form.tax_number || !form.tax_office || !form.city || !form.district) {
      setError('Lütfen tüm zorunlu alanları doldurun.'); return false
    }
    if (!taxFile) { setError('Vergi levhası yüklemek zorunludur.'); return false }
    setError('')
    return true
  }

  const handleNext = () => {
    if (step === 1 && validateStep1()) setStep(2)
    else if (step === 2 && validateStep2()) setStep(3)
  }

  const handleRegister = async () => {
    setError('')
    if (!kvkkChecked) { setError('KVKK Aydınlatma Metni\'ni onaylamanız zorunludur.'); return }
    if (!contractChecked) { setError('Üyelik Sözleşmesi\'ni onaylamanız zorunludur.'); return }

    setLoading(true)

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: { full_name: form.full_name, company_name: form.company_name },
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'https://bilgiortagim.vercel.app'}/giris`,
      }
    })

    if (authError) {
      setError(authError.message.includes('already registered') ? 'Bu email adresi zaten kayıtlı.' : 'Kayıt sırasında hata oluştu: ' + authError.message)
      setLoading(false)
      return
    }

    if (!authData.user) {
      setError('Kullanıcı oluşturulamadı.')
      setLoading(false)
      return
    }

    let tax_document_url = null
    if (taxFile) {
      const ext = taxFile.name.split('.').pop()
      const path = `${authData.user.id}/vergi-levhasi-${Date.now()}.${ext}`
      const { data: uploadData, error: uploadError } = await supabase.storage.from('tax-documents').upload(path, taxFile)
      if (!uploadError && uploadData) tax_document_url = path
    }

    const now = new Date().toISOString()

    await supabase.from('profiles').upsert({
      id: authData.user.id,
      email: form.email,
      full_name: form.full_name,
      tc_number_encrypted: form.tc_number,
      birth_date: form.birth_date,
      company_name: form.company_name,
      tax_number: form.tax_number,
      tax_office: form.tax_office,
      city: form.city,
      district: form.district,
      website: form.website || null,
      fleet_size: form.fleet_size || null,
      phone: form.phone,
      tax_document_url,
      status: 'pending',
      subscription_plan: 'none',
      role: 'user',
      kvkk_accepted: true,
      contract_accepted: true,
      kvkk_accepted_at: now,
      contract_accepted_at: now,
    })

    router.push('/onay-bekleniyor')
    setLoading(false)
  }

  const inputCls = "w-full bg-[#1E1E1E] border border-[#2A2A2A] text-white rounded-xl px-4 py-3 text-sm focus:border-red-500 outline-none placeholder-gray-600 transition-colors"
  const labelCls = "text-gray-400 text-xs mb-1.5 block"

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <img src="/logo.png" alt="BilgiOrtağım" className="h-16 w-auto object-contain mx-auto mb-4" />
          <h1 className="text-white font-bold text-2xl">BilgiOrtağım</h1>
          <p className="text-gray-500 text-sm mt-1">Ücretsiz hesap oluşturun</p>
        </div>

        {/* Adım göstergesi */}
        <div className="flex items-center gap-2 mb-6">
          {[{ n: 1, label: 'Yetkili' }, { n: 2, label: 'Firma' }, { n: 3, label: 'Onay' }].map((s, i) => (
            <div key={s.n} className="flex items-center flex-1">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-colors ${step >= s.n ? 'bg-red-600 text-white' : 'bg-[#2A2A2A] text-gray-500'}`}>
                {step > s.n ? <Check size={12} /> : s.n}
              </div>
              <span className={`text-xs ml-1.5 ${step === s.n ? 'text-white' : 'text-gray-500'}`}>{s.label}</span>
              {i < 2 && <div className="flex-1 h-px bg-[#2A2A2A] mx-2" />}
            </div>
          ))}
        </div>

        <div className="bg-[#141414] border border-[#2A2A2A] rounded-2xl p-8 space-y-5">
          <div>
            <h2 className="text-white font-semibold text-xl">
              {step === 1 ? 'Yetkili Bilgileri' : step === 2 ? 'Firma Bilgileri' : 'Sözleşme & Onay'}
            </h2>
            <p className="text-gray-500 text-sm mt-1">Başvurunuz admin onayına gönderilecektir.</p>
          </div>

          {error && <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-red-400 text-sm">{error}</div>}

          {/* ===== ADIM 1: YETKİLİ ===== */}
          {step === 1 && (
            <>
              <div>
                <label className={labelCls}>Ad Soyad *</label>
                <input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} placeholder="Ad Soyad" className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>TC Kimlik No *</label>
                  <input value={form.tc_number} maxLength={11} inputMode="numeric"
                    onChange={e => setForm(f => ({ ...f, tc_number: e.target.value.replace(/\D/g, '').slice(0, 11) }))}
                    placeholder="12345678901" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Doğum Tarihi *</label>
                  <input type="date" value={form.birth_date} onChange={e => setForm(f => ({ ...f, birth_date: e.target.value }))} className={inputCls} />
                </div>
              </div>
              <div>
                <label className={labelCls}>Telefon *</label>
                <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+90 5XX XXX XX XX" className={inputCls} />
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
              <button onClick={handleNext} className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2">
                Devam Et <ChevronRight size={16} />
              </button>
            </>
          )}

          {/* ===== ADIM 2: FİRMA ===== */}
          {step === 2 && (
            <>
              <div>
                <label className={labelCls}>Firma Adı *</label>
                <input value={form.company_name} onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))} placeholder="Firma Adı" className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Vergi Numarası *</label>
                  <input value={form.tax_number} onChange={e => setForm(f => ({ ...f, tax_number: e.target.value }))} placeholder="1234567890" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Vergi Dairesi *</label>
                  <input value={form.tax_office} onChange={e => setForm(f => ({ ...f, tax_office: e.target.value }))} placeholder="Vergi Dairesi" className={inputCls} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>İl *</label>
                  <select value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} className={inputCls}>
                    <option value="">İl seçin</option>
                    {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>İlçe *</label>
                  <input value={form.district} onChange={e => setForm(f => ({ ...f, district: e.target.value }))} placeholder="İlçe" className={inputCls} />
                </div>
              </div>
              <div>
                <label className={labelCls}>Web Sitesi / Sosyal Medya (opsiyonel)</label>
                <input value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} placeholder="https://firmaniz.com" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Filo Büyüklüğü (opsiyonel)</label>
                <select value={form.fleet_size} onChange={e => setForm(f => ({ ...f, fleet_size: e.target.value }))} className={inputCls}>
                  <option value="">Seçin</option>
                  {FLEET_SIZES.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Vergi Levhası * (PDF, JPG veya PNG, max 10MB)</label>
                <label className={`flex items-center gap-3 w-full bg-[#1E1E1E] border-2 border-dashed rounded-xl px-4 py-4 cursor-pointer transition-colors ${taxFile ? 'border-green-500/50 bg-green-500/5' : 'border-[#3A3A3A] hover:border-red-500/50'}`}>
                  <Upload size={18} className={taxFile ? 'text-green-400' : 'text-gray-500'} />
                  <div>
                    <div className={`text-sm font-medium ${taxFile ? 'text-green-400' : 'text-gray-400'}`}>{taxFile ? taxFile.name : 'Vergi levhanızı yükleyin'}</div>
                    <div className="text-gray-600 text-xs mt-0.5">PDF, JPG veya PNG formatında</div>
                  </div>
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={e => { if (e.target.files?.[0]) setTaxFile(e.target.files[0]) }} />
                </label>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className="flex-1 bg-[#1E1E1E] border border-[#2A2A2A] text-gray-400 py-3 rounded-xl font-medium hover:text-white transition-colors flex items-center justify-center gap-2">
                  <ChevronLeft size={16} /> Geri
                </button>
                <button onClick={handleNext} className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2">
                  Devam Et <ChevronRight size={16} />
                </button>
              </div>
            </>
          )}

          {/* ===== ADIM 3: ONAY ===== */}
          {step === 3 && (
            <>
              <div className={`rounded-xl border p-4 transition-colors ${kvkkChecked ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-[#2A2A2A] bg-[#1E1E1E]'}`}>
                <div className="flex items-start gap-3">
                  <div onClick={() => setKvkkChecked(!kvkkChecked)}
                    className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5 border-2 cursor-pointer transition-colors ${kvkkChecked ? 'bg-emerald-500 border-emerald-500' : 'border-[#3A3A3A]'}`}>
                    {kvkkChecked && <Check size={10} className="text-white" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Shield size={14} className="text-blue-400 flex-shrink-0" />
                      <span className="text-white text-sm font-medium">KVKK Aydınlatma Metni</span>
                      <button onClick={() => setKvkkOpen(true)} className="text-red-400 text-xs hover:underline ml-auto">Metni Oku →</button>
                    </div>
                    <p className="text-gray-500 text-xs mt-1">6698 sayılı KVKK kapsamında kişisel verilerimin işlenmesine ilişkin aydınlatma metnini okudum ve bilgilendirildim.</p>
                    <button onClick={() => setKvkkChecked(!kvkkChecked)} className={`text-xs mt-2 font-medium transition-colors ${kvkkChecked ? 'text-emerald-400' : 'text-gray-500 hover:text-white'}`}>
                      {kvkkChecked ? '✓ Onaylandı' : 'Onaylıyorum'}
                    </button>
                  </div>
                </div>
              </div>

              <div className={`rounded-xl border p-4 transition-colors ${contractChecked ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-[#2A2A2A] bg-[#1E1E1E]'}`}>
                <div className="flex items-start gap-3">
                  <div onClick={() => setContractChecked(!contractChecked)}
                    className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5 border-2 cursor-pointer transition-colors ${contractChecked ? 'bg-emerald-500 border-emerald-500' : 'border-[#3A3A3A]'}`}>
                    {contractChecked && <Check size={10} className="text-white" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <FileText size={14} className="text-purple-400 flex-shrink-0" />
                      <span className="text-white text-sm font-medium">Üyelik Sözleşmesi</span>
                      <button onClick={() => setContractOpen(true)} className="text-red-400 text-xs hover:underline ml-auto">Sözleşmeyi Oku →</button>
                    </div>
                    <p className="text-gray-500 text-xs mt-1">BilgiOrtağım Üyelik Sözleşmesi'ni, özellikle müşteri verilerinin kullanımına ilişkin 3. maddeyi okudum ve kabul ediyorum.</p>
                    <button onClick={() => setContractChecked(!contractChecked)} className={`text-xs mt-2 font-medium transition-colors ${contractChecked ? 'text-emerald-400' : 'text-gray-500 hover:text-white'}`}>
                      {contractChecked ? '✓ Onaylandı' : 'Onaylıyorum'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-xl p-3 flex items-start gap-3">
                <Shield size={14} className="text-blue-400 flex-shrink-0 mt-0.5" />
                <p className="text-gray-500 text-xs leading-relaxed">
                  Kayıt bilgileriniz admin tarafından incelenecek, vergi levhanız doğrulandıktan sonra hesabınız onaylanacaktır. Bu süreç genellikle 1 iş günü içinde tamamlanır.
                </p>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep(2)} className="flex-1 bg-[#1E1E1E] border border-[#2A2A2A] text-gray-400 py-3 rounded-xl font-medium hover:text-white transition-colors flex items-center justify-center gap-2">
                  <ChevronLeft size={16} /> Geri
                </button>
                <button onClick={handleRegister} disabled={loading || !kvkkChecked || !contractChecked}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-semibold transition-colors disabled:opacity-40 flex items-center justify-center gap-2">
                  {loading ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> : 'Başvuru Gönder'}
                </button>
              </div>
            </>
          )}

          <p className="text-center text-gray-500 text-sm">
            Zaten hesabın var mı?{' '}
            <Link href="/giris" className="text-red-400 hover:text-red-300 font-medium transition-colors">Giriş Yap</Link>
          </p>
        </div>

        <p className="text-center text-gray-600 text-xs mt-4">
          Destek: <span className="text-red-400">0850 123 45 67</span>
        </p>
      </div>

      {kvkkOpen && <DocumentModal title="KVKK Aydınlatma Metni" content={KVKK_TEXT} onClose={() => setKvkkOpen(false)} linkHref="/kvkk" />}
      {contractOpen && <DocumentModal title="Üyelik Sözleşmesi" content={CONTRACT_TEXT} onClose={() => setContractOpen(false)} linkHref="/sozlesme" />}
    </div>
  )
}
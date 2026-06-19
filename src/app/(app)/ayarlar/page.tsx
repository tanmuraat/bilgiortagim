'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'
import { User, Lock, Save, CheckCircle, RefreshCw, Shield, CreditCard } from 'lucide-react'

export default function AyarlarPage() {
  const supabase = createClient()
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [savingRenew, setSavingRenew] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  const [passwordForm, setPasswordForm] = useState({ new: '', confirm: '' })
  const [passwordMsg, setPasswordMsg] = useState('')
  const [form, setForm] = useState({
    full_name: '', company_name: '', phone: '',
    tc_number_encrypted: '', birth_date: '', tax_number: '', tax_office: '',
    city: '', district: '', website: '', fleet_size: '',
  })
  const [autoRenew, setAutoRenew] = useState(false)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (p) {
        setProfile(p)
        setForm({
          full_name: p.full_name || '', company_name: p.company_name || '', phone: p.phone || '',
          tc_number_encrypted: p.tc_number_encrypted || '', birth_date: p.birth_date || '',
          tax_number: p.tax_number || '', tax_office: p.tax_office || '',
          city: p.city || '', district: p.district || '', website: p.website || '', fleet_size: p.fleet_size || '',
        })
        setAutoRenew(p.auto_renew || false)
      }
      setLoading(false)
    }
    init()
  }, [supabase])

  const handleSave = async () => {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('profiles').update({
      full_name: form.full_name, company_name: form.company_name,
      phone: form.phone, tc_number_encrypted: form.tc_number_encrypted,
      birth_date: form.birth_date || null, tax_number: form.tax_number, tax_office: form.tax_office,
      city: form.city, district: form.district, website: form.website || null, fleet_size: form.fleet_size || null,
      updated_at: new Date().toISOString(),
    }).eq('id', user.id)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
    setSaving(false)
  }

  const handleAutoRenewChange = async (value: boolean) => {
    setSavingRenew(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('profiles').update({
      auto_renew: value,
      auto_renew_plan: value ? profile?.subscription_plan : null,
    }).eq('id', user.id)
    setAutoRenew(value)
    setProfile((p: any) => ({ ...p, auto_renew: value }))
    setSavingRenew(false)
  }

  const handlePasswordChange = async () => {
    if (passwordForm.new !== passwordForm.confirm) { setPasswordMsg('Şifreler eşleşmiyor.'); return }
    if (passwordForm.new.length < 8) { setPasswordMsg('Şifre en az 8 karakter olmalı.'); return }
    setChangingPassword(true)
    const { error } = await supabase.auth.updateUser({ password: passwordForm.new })
    if (error) setPasswordMsg('Hata: ' + error.message)
    else { setPasswordMsg('Şifre başarıyla güncellendi.'); setPasswordForm({ new: '', confirm: '' }) }
    setChangingPassword(false)
  }

  const planLabel: Record<string, string> = { none: 'Ücretsiz', pro: 'Pro', premium: 'Premium' }
  const planColor: Record<string, string> = { none: 'text-gray-400', pro: 'text-blue-400', premium: 'text-purple-400' }
  const inputCls = "w-full bg-[#1E1E1E] border border-[#2A2A2A] text-white rounded-lg px-3 py-2.5 text-sm focus:border-red-500 outline-none"

  if (loading) return <div className="flex items-center justify-center h-96"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500" /></div>

  const isActivePlan = profile?.subscription_plan !== 'none'

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Ayarlar</h1>
        <p className="text-gray-400 text-sm mt-1">Hesap ve firma bilgilerinizi yönetin</p>
      </div>

      {/* Abonelik + Otomatik Yenileme */}
      <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-5 space-y-4">
        <h3 className="text-white font-semibold flex items-center gap-2"><CreditCard size={16} /> Abonelik</h3>
        <div className="flex items-center justify-between">
          <div>
            <div className={`text-xl font-bold ${planColor[profile?.subscription_plan] || 'text-gray-400'}`}>
              {planLabel[profile?.subscription_plan] || 'Ücretsiz'} Plan
            </div>
            {profile?.subscription_end && (
              <div className="text-gray-400 text-sm mt-0.5">
                {format(new Date(profile.subscription_end), 'dd MMMM yyyy', { locale: tr })} tarihine kadar aktif
              </div>
            )}
          </div>
          <a href="/abonelik" className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            {profile?.subscription_plan === 'none' ? 'Abonelik Al' : 'Planı Değiştir'}
          </a>
        </div>

        {/* Otomatik Yenileme Toggle */}
        {isActivePlan && (
          <div className="border-t border-[#2A2A2A] pt-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <div className="text-white text-sm font-medium flex items-center gap-2">
                  <RefreshCw size={14} className={autoRenew ? 'text-green-400' : 'text-gray-500'} />
                  Otomatik Yenileme
                </div>
                <div className="text-gray-500 text-xs mt-1">
                  {autoRenew
                    ? `Aboneliğiniz ${format(new Date(profile?.subscription_end), 'dd MMM yyyy', { locale: tr })} tarihinde otomatik yenilenir.`
                    : 'Abonelik bitişinde otomatik yenilenmez, manuel yenileme gerekir.'}
                </div>
              </div>
              <div className="flex-shrink-0">
                <button
                  onClick={() => handleAutoRenewChange(!autoRenew)}
                  disabled={savingRenew}
                  className={`relative inline-flex h-7 w-13 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50 ${autoRenew ? 'bg-red-600' : 'bg-[#2A2A2A]'}`}
                  style={{ width: '52px' }}
                >
                  <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${autoRenew ? 'translate-x-7' : 'translate-x-1'}`} />
                </button>
              </div>
            </div>

            <div className={`mt-3 flex items-center gap-2 text-xs px-3 py-2.5 rounded-lg ${autoRenew ? 'bg-green-500/10 border border-green-500/20 text-green-400' : 'bg-yellow-500/10 border border-yellow-500/20 text-yellow-400'}`}>
              {autoRenew ? (
                <><CheckCircle size={13} /> Otomatik yenileme aktif — aboneliğiniz kesintisiz devam edecek</>
              ) : (
                <><RefreshCw size={13} /> Otomatik yenileme kapalı — abonelik bitiminde erişim durur</>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Profil Bilgileri */}
      <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-5">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2"><User size={16} /> Yetkili Bilgileri</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-gray-400 text-xs mb-1.5 block">Ad Soyad</label>
              <input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} placeholder="Ad Soyad" className={inputCls} />
            </div>
            <div>
              <label className="text-gray-400 text-xs mb-1.5 block">TC Kimlik No</label>
              <input value={form.tc_number_encrypted} maxLength={11} inputMode="numeric"
                onChange={e => setForm(f => ({ ...f, tc_number_encrypted: e.target.value.replace(/\D/g, '').slice(0, 11) }))}
                placeholder="12345678901" className={inputCls} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-gray-400 text-xs mb-1.5 block">Doğum Tarihi</label>
              <input type="date" value={form.birth_date} onChange={e => setForm(f => ({ ...f, birth_date: e.target.value }))} className={inputCls} />
            </div>
            <div>
              <label className="text-gray-400 text-xs mb-1.5 block">Telefon</label>
              <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+90 5XX XXX XX XX" className={inputCls} />
            </div>
          </div>
          <div>
            <label className="text-gray-400 text-xs mb-1.5 block">E-posta (değiştirilemez)</label>
            <input value={profile?.email || ''} disabled className={inputCls + ' opacity-50 cursor-not-allowed'} />
          </div>
        </div>
      </div>

      {/* Firma Bilgileri */}
      <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-5">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2"><CreditCard size={16} /> Firma Bilgileri</h3>
        <div className="space-y-4">
          <div>
            <label className="text-gray-400 text-xs mb-1.5 block">Firma Adı</label>
            <input value={form.company_name} onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))} placeholder="Firma Adı" className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-gray-400 text-xs mb-1.5 block">Vergi Numarası</label>
              <input value={form.tax_number} onChange={e => setForm(f => ({ ...f, tax_number: e.target.value }))} placeholder="1234567890" className={inputCls} />
            </div>
            <div>
              <label className="text-gray-400 text-xs mb-1.5 block">Vergi Dairesi</label>
              <input value={form.tax_office} onChange={e => setForm(f => ({ ...f, tax_office: e.target.value }))} placeholder="Vergi Dairesi" className={inputCls} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-gray-400 text-xs mb-1.5 block">İl</label>
              <input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="İl" className={inputCls} />
            </div>
            <div>
              <label className="text-gray-400 text-xs mb-1.5 block">İlçe</label>
              <input value={form.district} onChange={e => setForm(f => ({ ...f, district: e.target.value }))} placeholder="İlçe" className={inputCls} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-gray-400 text-xs mb-1.5 block">Web Sitesi / Sosyal Medya</label>
              <input value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} placeholder="https://firmaniz.com" className={inputCls} />
            </div>
            <div>
              <label className="text-gray-400 text-xs mb-1.5 block">Filo Büyüklüğü</label>
              <select value={form.fleet_size} onChange={e => setForm(f => ({ ...f, fleet_size: e.target.value }))} className={inputCls}>
                <option value="">Seçin</option>
                <option value="1-5 araç">1-5 araç</option>
                <option value="6-10 araç">6-10 araç</option>
                <option value="11-20 araç">11-20 araç</option>
                <option value="21-50 araç">21-50 araç</option>
                <option value="51-100 araç">51-100 araç</option>
                <option value="100+ araç">100+ araç</option>
              </select>
            </div>
          </div>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50">
            {saved ? <><CheckCircle size={16} /> Kaydedildi!</> : saving ? 'Kaydediliyor...' : <><Save size={16} /> Kaydet</>}
          </button>
        </div>
      </div>

      {/* Şifre */}
      <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-5">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2"><Lock size={16} /> Şifre Değiştir</h3>
        <div className="space-y-3">
          <div>
            <label className="text-gray-400 text-xs mb-1.5 block">Yeni Şifre</label>
            <input type="password" value={passwordForm.new} onChange={e => setPasswordForm(f => ({ ...f, new: e.target.value }))} placeholder="En az 8 karakter" className={inputCls} />
          </div>
          <div>
            <label className="text-gray-400 text-xs mb-1.5 block">Yeni Şifre Tekrar</label>
            <input type="password" value={passwordForm.confirm} onChange={e => setPasswordForm(f => ({ ...f, confirm: e.target.value }))} placeholder="Şifreyi tekrar girin" className={inputCls} />
          </div>
          {passwordMsg && (
            <div className={`text-sm px-3 py-2 rounded-lg ${passwordMsg.includes('başarı') ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
              {passwordMsg}
            </div>
          )}
          <button onClick={handlePasswordChange} disabled={changingPassword || !passwordForm.new || !passwordForm.confirm}
            className="flex items-center gap-2 bg-[#1E1E1E] border border-[#2A2A2A] text-gray-300 hover:text-white px-5 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50">
            {changingPassword ? 'Güncelleniyor...' : 'Şifreyi Güncelle'}
          </button>
        </div>
      </div>

      {/* Hesap Durumu */}
      <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-5">
        <h3 className="text-white font-semibold mb-3 flex items-center gap-2"><Shield size={16} /> Hesap Durumu</h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Hesap Onayı', value: profile?.status === 'approved' ? 'Onaylandı' : 'Bekliyor', color: profile?.status === 'approved' ? 'text-green-400' : 'text-yellow-400' },
            { label: 'Aktif Plan', value: planLabel[profile?.subscription_plan] || 'Ücretsiz', color: planColor[profile?.subscription_plan] || 'text-gray-400' },
            { label: 'Otomatik Yenileme', value: autoRenew ? '✓ Aktif' : '✗ Kapalı', color: autoRenew ? 'text-green-400' : 'text-gray-400' },
            { label: 'Üyelik Tarihi', value: profile?.created_at ? format(new Date(profile.created_at), 'dd MMM yyyy', { locale: tr }) : '—', color: 'text-white' },
          ].map((item, i) => (
            <div key={i} className="bg-[#1E1E1E] rounded-lg p-3">
              <div className="text-gray-500 text-xs mb-1">{item.label}</div>
              <div className={`text-sm font-medium ${item.color}`}>{item.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
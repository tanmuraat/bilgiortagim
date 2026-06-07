'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User, Building, Phone, Mail, Lock, Save, CheckCircle } from 'lucide-react'

export default function AyarlarPage() {
  const supabase = createClient()
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' })
  const [passwordMsg, setPasswordMsg] = useState('')
  const [form, setForm] = useState({ full_name: '', company_name: '', phone: '' })

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (p) {
        setProfile(p)
        setForm({ full_name: p.full_name || '', company_name: p.company_name || '', phone: p.phone || '' })
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
      full_name: form.full_name,
      company_name: form.company_name,
      phone: form.phone,
      updated_at: new Date().toISOString(),
    }).eq('id', user.id)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
    setSaving(false)
  }

  const handlePasswordChange = async () => {
    if (passwordForm.new !== passwordForm.confirm) { setPasswordMsg('Şifreler eşleşmiyor.'); return }
    if (passwordForm.new.length < 8) { setPasswordMsg('Şifre en az 8 karakter olmalı.'); return }
    setChangingPassword(true)
    const { error } = await supabase.auth.updateUser({ password: passwordForm.new })
    if (error) { setPasswordMsg('Hata: ' + error.message) }
    else { setPasswordMsg('Şifre başarıyla güncellendi.'); setPasswordForm({ current: '', new: '', confirm: '' }) }
    setChangingPassword(false)
  }

  const planLabel: Record<string, string> = { none: 'Ücretsiz', pro: 'Pro', premium: 'Premium' }
  const planColor: Record<string, string> = { none: 'text-gray-400', pro: 'text-blue-400', premium: 'text-purple-400' }
  const inputCls = "w-full bg-[#1E1E1E] border border-[#2A2A2A] text-white rounded-lg px-3 py-2.5 text-sm focus:border-red-500 outline-none"

  if (loading) return <div className="flex items-center justify-center h-96"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500" /></div>

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Ayarlar</h1>
        <p className="text-gray-400 text-sm mt-1">Hesap ve firma bilgilerinizi yönetin</p>
      </div>

      {/* Abonelik Durumu */}
      <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-5">
        <h3 className="text-white font-semibold mb-4">Abonelik Durumu</h3>
        <div className="flex items-center justify-between">
          <div>
            <div className={`text-2xl font-bold ${planColor[profile?.subscription_plan] || 'text-gray-400'}`}>
              {planLabel[profile?.subscription_plan] || 'Ücretsiz'} Plan
            </div>
            {profile?.subscription_end && (
              <div className="text-gray-400 text-sm mt-1">
                Bitiş: {new Date(profile.subscription_end).toLocaleDateString('tr-TR')}
              </div>
            )}
          </div>
          <a href="/abonelik" className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            {profile?.subscription_plan === 'none' ? 'Abonelik Al' : 'Planı Değiştir'}
          </a>
        </div>
      </div>

      {/* Profil Bilgileri */}
      <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-5">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2"><User size={16} /> Profil Bilgileri</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-gray-400 text-xs mb-1.5 block">Ad Soyad</label>
              <input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} placeholder="Ad Soyad" className={inputCls} />
            </div>
            <div>
              <label className="text-gray-400 text-xs mb-1.5 block">Firma Adı</label>
              <input value={form.company_name} onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))} placeholder="Firma Adı" className={inputCls} />
            </div>
          </div>
          <div>
            <label className="text-gray-400 text-xs mb-1.5 block">Telefon</label>
            <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+90 5XX XXX XX XX" className={inputCls} />
          </div>
          <div>
            <label className="text-gray-400 text-xs mb-1.5 block">E-posta (değiştirilemez)</label>
            <input value={profile?.email || ''} disabled className={inputCls + ' opacity-50 cursor-not-allowed'} />
          </div>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50">
            {saved ? <><CheckCircle size={16} /> Kaydedildi!</> : saving ? 'Kaydediliyor...' : <><Save size={16} /> Kaydet</>}
          </button>
        </div>
      </div>

      {/* Şifre Değiştir */}
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

      {/* Vergi Levhası */}
      <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-5">
        <h3 className="text-white font-semibold mb-2">Vergi Levhası</h3>
        <p className="text-gray-400 text-sm mb-3">Kayıt sırasında yüklediğiniz vergi levhası admin tarafından incelendi.</p>
        <div className={`inline-flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg ${profile?.status === 'approved' ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'}`}>
          <CheckCircle size={14} />
          {profile?.status === 'approved' ? 'Hesap Onaylandı' : 'İnceleme Bekliyor'}
        </div>
      </div>
    </div>
  )
}
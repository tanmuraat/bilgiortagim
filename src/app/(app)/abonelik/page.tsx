'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format, addMonths, addYears } from 'date-fns'
import { tr } from 'date-fns/locale'
import { Check, X, AlertTriangle, CreditCard, RefreshCw, Shield } from 'lucide-react'

const PLANS = [
  {
    key: 'pro',
    name: 'Pro',
    monthly: 299,
    yearly: 2990,
    color: 'text-blue-400',
    border: 'border-blue-500/30',
    bg: 'bg-blue-500/5',
    features: [
      'Günlük 10 müşteri sorgusu',
      'Max 5 araç yönetimi',
      'KM takibi ve analizi',
      'Dashboard özet görünüm',
      'Bildirimler',
    ],
    missing: ['Kiralama takvimi', 'Mini muhasebe', 'Raporlar', 'Sınırsız araç'],
  },
  {
    key: 'premium',
    name: 'Premium',
    monthly: 599,
    yearly: 5990,
    color: 'text-red-400',
    border: 'border-red-500/30',
    bg: 'bg-red-500/5',
    highlighted: true,
    features: [
      'Sınırsız müşteri sorgusu',
      'Sınırsız araç yönetimi',
      'Kiralama takvimi & arşiv',
      'Mini muhasebe',
      'Gelir/gider raporları',
      'Kira sözleşmesi arşivi',
      'Otomatik bildirimler',
      'KM analizi',
    ],
    missing: [],
  },
]

export default function AbonelikPage() {
  const supabase = createClient()
  const [profile, setProfile] = useState<any>(null)
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly')
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelling, setCancelling] = useState(false)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(p)
      setLoading(false)
    }
    init()
  }, [supabase])

  const handleSelectPlan = async (planKey: string) => {
    // Gerçek projede burada İyzico/Stripe ödeme akışı başlar
    // Şimdilik demo olarak direkt aktif ediyoruz
    setProcessing(planKey)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const now = new Date()
    const end = billing === 'yearly' ? addYears(now, 1) : addMonths(now, 1)
    const months = billing === 'yearly' ? 12 : 1
    const price = billing === 'yearly' ? PLANS.find(p => p.key === planKey)?.yearly : PLANS.find(p => p.key === planKey)?.monthly

    await supabase.from('profiles').update({
      subscription_plan: planKey,
      subscription_start: format(now, 'yyyy-MM-dd'),
      subscription_end: format(end, 'yyyy-MM-dd'),
      sub_warning_sent: false,
    }).eq('id', user.id)

    await supabase.from('subscriptions').insert({
      user_id: user.id,
      plan: planKey,
      months,
      price,
      payment_method: 'online',
      payment_status: 'completed',
      starts_at: format(now, 'yyyy-MM-dd'),
      ends_at: format(end, 'yyyy-MM-dd'),
    })

    const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    setProfile(p)
    setProcessing(null)
    alert(`${planKey === 'pro' ? 'Pro' : 'Premium'} planına geçiş başarılı! 🎉`)
  }

  const handleCancel = async () => {
    setCancelling(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    // Aboneliği sonlandır — mevcut bitiş tarihine kadar kullanabilir
    await supabase.from('profiles').update({ auto_renew: false }).eq('id', user.id)
    const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    setProfile(p)
    setShowCancelModal(false)
    setCancelling(false)
    alert('Aboneliğiniz iptal edildi. Mevcut planınızı bitiş tarihine kadar kullanmaya devam edebilirsiniz.')
  }

  const planLabel: Record<string, string> = { none: 'Ücretsiz', pro: 'Pro', premium: 'Premium' }

  if (loading) return (
    <div className="flex items-center justify-center h-96">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500" />
    </div>
  )

  const currentPlan = profile?.subscription_plan || 'none'
  const isActive = currentPlan !== 'none'

  return (
    <div className="p-6 space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Abonelik</h1>
        <p className="text-gray-400 text-sm mt-1">Planınızı yönetin veya yükseltin</p>
      </div>

      {/* Mevcut Plan */}
      {isActive && (
        <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-5">
          <h3 className="text-white font-semibold mb-4">Mevcut Planınız</h3>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-red-600/10 border border-red-600/20 rounded-xl flex items-center justify-center">
                <CreditCard size={20} className="text-red-400" />
              </div>
              <div>
                <div className="text-white font-bold text-lg">{planLabel[currentPlan]} Plan</div>
                <div className="text-gray-400 text-sm">
                  {profile?.subscription_end
                    ? `${format(new Date(profile.subscription_end), 'dd MMMM yyyy', { locale: tr })} tarihine kadar aktif`
                    : '—'}
                </div>
                <div className={`text-xs mt-1 flex items-center gap-1 ${profile?.auto_renew ? 'text-green-400' : 'text-yellow-400'}`}>
                  <RefreshCw size={10} />
                  {profile?.auto_renew ? 'Otomatik yenileme aktif' : 'Otomatik yenileme kapalı'}
                </div>
              </div>
            </div>
            <button onClick={() => setShowCancelModal(true)}
              className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-2 rounded-lg text-sm hover:bg-red-500/20 transition-colors">
              <X size={14} /> Aboneliği İptal Et
            </button>
          </div>
        </div>
      )}

      {/* Billing Toggle */}
      <div className="flex items-center justify-center gap-4">
        <div className="flex bg-[#1E1E1E] border border-[#2A2A2A] rounded-xl p-1">
          <button onClick={() => setBilling('monthly')}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${billing === 'monthly' ? 'bg-red-600 text-white' : 'text-gray-400 hover:text-white'}`}>
            Aylık
          </button>
          <button onClick={() => setBilling('yearly')}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${billing === 'yearly' ? 'bg-red-600 text-white' : 'text-gray-400 hover:text-white'}`}>
            Yıllık
            <span className="ml-2 text-[10px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded-full">%17 indirim</span>
          </button>
        </div>
      </div>

      {/* Plan Cards */}
      <div className="grid grid-cols-2 gap-6">
        {PLANS.map(plan => {
          const isCurrent = currentPlan === plan.key
          const price = billing === 'yearly' ? plan.yearly : plan.monthly
          const perMonth = billing === 'yearly' ? Math.round(plan.yearly / 12) : plan.monthly

          return (
            <div key={plan.key} className={`relative bg-[#141414] border rounded-2xl p-6 ${plan.highlighted ? 'border-red-500/40' : 'border-[#2A2A2A]'}`}>
              {plan.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-red-600 text-white text-xs font-bold px-4 py-1 rounded-full">En Popüler</div>
              )}
              {isCurrent && (
                <div className="absolute -top-3 right-4 bg-green-600 text-white text-xs font-bold px-3 py-1 rounded-full">Mevcut Plan</div>
              )}
              <div className={`text-sm font-bold uppercase tracking-wider mb-2 ${plan.color}`}>{plan.name}</div>
              <div className="text-4xl font-black text-white mb-1">
                ₺{perMonth.toLocaleString('tr-TR')}
                <span className="text-lg text-gray-400 font-normal">/ay</span>
              </div>
              {billing === 'yearly' && (
                <div className="text-gray-500 text-sm mb-4">Yıllık ₺{plan.yearly.toLocaleString('tr-TR')} faturalandırılır</div>
              )}
              <div className="space-y-2.5 mb-6 mt-4">
                {plan.features.map((f, i) => (
                  <div key={i} className="flex items-center gap-2.5 text-gray-300 text-sm">
                    <Check size={14} className="text-green-400 flex-shrink-0" /> {f}
                  </div>
                ))}
                {plan.missing.map((f, i) => (
                  <div key={i} className="flex items-center gap-2.5 text-gray-600 text-sm">
                    <X size={14} className="text-gray-600 flex-shrink-0" /> {f}
                  </div>
                ))}
              </div>
              <button
                onClick={() => !isCurrent && handleSelectPlan(plan.key)}
                disabled={isCurrent || processing === plan.key}
                className={`w-full py-3 rounded-xl font-semibold text-sm transition-colors ${
                  isCurrent
                    ? 'bg-green-600/20 border border-green-600/30 text-green-400 cursor-default'
                    : plan.highlighted
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                } disabled:opacity-50`}>
                {processing === plan.key ? 'İşleniyor...'
                  : isCurrent ? '✓ Aktif Plan'
                  : currentPlan === 'none' ? `${plan.name} ile Başla`
                  : `${plan.name} Planına Geç`}
              </button>
            </div>
          )
        })}
      </div>

      {/* Bilgi notu */}
      <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-4 flex items-start gap-3">
        <Shield size={16} className="text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="text-gray-400 text-sm">
          <span className="text-white font-medium">Güvenli Ödeme:</span> Tüm ödemeler SSL ile şifrelenir. İptal ettiğinizde mevcut planınız bitiş tarihine kadar aktif kalır, para iadesi yapılmaz.
          Otomatik yenileme ayarlarını <a href="/ayarlar" className="text-red-400 hover:text-red-300">Ayarlar</a> sayfasından yönetebilirsiniz.
        </div>
      </div>

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-500/10 rounded-xl flex items-center justify-center">
                <AlertTriangle size={20} className="text-red-400" />
              </div>
              <h3 className="text-white font-semibold text-lg">Aboneliği İptal Et</h3>
            </div>
            <div className="space-y-3 mb-6">
              <p className="text-gray-400 text-sm">
                <span className="text-white font-medium">{planLabel[currentPlan]} planınızı</span> iptal etmek üzeresiniz.
              </p>
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                <p className="text-yellow-400 text-sm font-medium mb-1">Bilmeniz Gerekenler:</p>
                <ul className="text-yellow-400/80 text-xs space-y-1">
                  <li>• Mevcut planınız <strong>{profile?.subscription_end ? format(new Date(profile.subscription_end), 'dd MMMM yyyy', { locale: tr }) : '—'}</strong> tarihine kadar aktif kalır</li>
                  <li>• Bu tarihten sonra ücretsiz plana düşersiniz</li>
                  <li>• Verileriniz silinmez, erişim kısıtlanır</li>
                  <li>• İstediğiniz zaman yeniden abone olabilirsiniz</li>
                </ul>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowCancelModal(false)} className="flex-1 bg-[#1E1E1E] border border-[#2A2A2A] text-gray-400 py-2.5 rounded-lg hover:bg-[#252525] transition-colors">
                Vazgeç
              </button>
              <button onClick={handleCancel} disabled={cancelling}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50">
                {cancelling ? 'İptal ediliyor...' : 'Evet, İptal Et'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
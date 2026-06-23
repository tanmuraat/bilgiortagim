import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Check, ArrowRight, Shield, Clock, Zap, Star } from 'lucide-react'

async function getContent() {
  const supabase = await createClient()
  const { data } = await supabase.from('landing_content').select('*').order('display_order')
  if (!data) return null

  const get = (section: string, key: string) => data.find(r => r.section === section && r.key === key)?.value

  return {
    hero: get('hero', 'main') || {},
    stats: data.filter(r => r.section === 'stats').map(r => r.value),
    features: data.filter(r => r.section === 'features').map(r => r.value),
    pricingPro: get('pricing', 'pro') || {},
    pricingPremium: get('pricing', 'premium') || {},
    upcoming: data.filter(r => r.section === 'upcoming').map(r => r.value),
  }
}

export default async function LandingPage() {
  const content = await getContent()
  const hero = content?.hero || {}
  const stats = content?.stats || []
  const features = content?.features || []
  const pricingPro = content?.pricingPro || {}
  const pricingPremium = content?.pricingPremium || {}
  const upcoming = content?.upcoming || []

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0A0A0A]/90 backdrop-blur-md border-b border-[#2A2A2A]">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src="/logo.png" alt="BilgiOrtağım" className="h-8 w-auto object-contain" />
            <span className="font-bold text-lg">BilgiOrtağım</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-gray-400">
            <a href="#ozellikler" className="hover:text-white transition-colors">Özellikler</a>
            <a href="#fiyatlar" className="hover:text-white transition-colors">Fiyatlar</a>
            <a href="/hakkimizda" className="hover:text-white transition-colors">Hakkımızda</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/giris" className="text-gray-400 hover:text-white text-sm transition-colors">Giriş Yap</Link>
            <Link href="/kayit" className="bg-red-600 hover:bg-red-700 text-white text-sm px-4 py-2 rounded-lg font-medium transition-colors">
              Ücretsiz Başla
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          {hero.badge && (
            <div className="inline-flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-1.5 rounded-full mb-8">
              <Zap size={14} /> {hero.badge}
            </div>
          )}
          <h1 className="text-5xl md:text-6xl font-black leading-tight mb-6">
            {hero.title_line1 && <span>{hero.title_line1}<br /></span>}
            {hero.title_line2_highlight && <span className="text-red-500">{hero.title_line2_highlight}</span>}
          </h1>
          <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            {hero.description}
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link href="/kayit"
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-8 py-3.5 rounded-xl font-semibold text-lg transition-colors">
              {hero.cta_primary || 'Ücretsiz Başla'} <ArrowRight size={18} />
            </Link>
            <a href="#ozellikler"
              className="flex items-center gap-2 bg-[#1E1E1E] border border-[#2A2A2A] hover:border-[#3A3A3A] text-white px-8 py-3.5 rounded-xl font-semibold text-lg transition-colors">
              {hero.cta_secondary || 'Özellikleri Gör'}
            </a>
          </div>
          {/* Trust badges */}
          <div className="flex items-center justify-center gap-6 mt-10 flex-wrap">
            {['KVKK Uyumlu', '256-bit Şifreleme', '7/24 Destek', 'Hızlı Kurulum'].map(b => (
              <div key={b} className="flex items-center gap-2 text-gray-500 text-sm">
                <Shield size={13} className="text-green-500" /> {b}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* STATS */}
      {stats.length > 0 && (
        <section className="py-12 border-y border-[#2A2A2A] bg-[#141414]">
          <div className="max-w-4xl mx-auto px-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              {stats.map((s: any, i: number) => (
                <div key={i}>
                  <div className="text-3xl font-black text-white mb-1">{s.value}</div>
                  <div className="text-gray-500 text-sm">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* FEATURES */}
      {features.length > 0 && (
        <section id="ozellikler" className="py-24 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <div className="text-red-400 text-sm font-semibold uppercase tracking-wider mb-3">Özellikler</div>
              <h2 className="text-4xl font-black mb-4">Neden BilgiOrtağım?</h2>
              <p className="text-gray-400 text-lg max-w-xl mx-auto">Rent a car sektörüne özel geliştirilmiş, tüm ihtiyaçlarınızı karşılayan platform</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {features.map((f: any, i: number) => (
                <div key={i} className="bg-[#141414] border border-[#2A2A2A] rounded-2xl p-6 hover:border-red-500/30 transition-colors">
                  <div className="w-10 h-10 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center justify-center mb-4">
                    <Zap size={18} className="text-red-400" />
                  </div>
                  <h3 className="text-white font-bold text-lg mb-2">{f.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{f.description}</p>
                  <div className="flex gap-2 mt-4">
                    {(f.available_in || []).map((plan: string) => (
                      <span key={plan} className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase ${plan === 'premium' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'}`}>
                        {plan}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* PRICING */}
      <section id="fiyatlar" className="py-24 px-6 bg-[#141414]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <div className="text-red-400 text-sm font-semibold uppercase tracking-wider mb-3">Fiyatlandırma</div>
            <h2 className="text-4xl font-black mb-4">Size Uygun Planı Seçin</h2>
            <p className="text-gray-400 text-lg">İstediğiniz zaman iptal edebilirsiniz</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Pro */}
            <div className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-2xl p-7">
              <div className="text-blue-400 font-bold text-sm uppercase tracking-wider mb-2">Pro</div>
              <div className="text-4xl font-black text-white mb-1">₺{pricingPro.price_monthly}<span className="text-lg text-gray-400 font-normal">/ay</span></div>
              <div className="text-gray-500 text-sm mb-6">veya ₺{pricingPro.price_yearly}/yıl</div>
              <ul className="space-y-3 mb-8">
                {(pricingPro.features || []).map((f: string, i: number) => (
                  <li key={i} className="flex items-center gap-3 text-gray-300 text-sm">
                    <Check size={15} className="text-blue-400 flex-shrink-0" /> {f}
                  </li>
                ))}
              </ul>
              <Link href="/kayit"
                className="block text-center bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-semibold transition-colors">
                Pro ile Başla
              </Link>
            </div>

            {/* Premium */}
            <div className="bg-gradient-to-b from-red-950/40 to-[#1E1E1E] border border-red-500/30 rounded-2xl p-7 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-red-600 text-white text-xs font-bold px-4 py-1 rounded-full">En Popüler</div>
              <div className="text-red-400 font-bold text-sm uppercase tracking-wider mb-2">Premium</div>
              <div className="text-4xl font-black text-white mb-1">₺{pricingPremium.price_monthly}<span className="text-lg text-gray-400 font-normal">/ay</span></div>
              <div className="text-gray-500 text-sm mb-6">veya ₺{pricingPremium.price_yearly}/yıl</div>
              <ul className="space-y-3 mb-8">
                {(pricingPremium.features || []).map((f: string, i: number) => (
                  <li key={i} className="flex items-center gap-3 text-gray-300 text-sm">
                    <Check size={15} className="text-red-400 flex-shrink-0" /> {f}
                  </li>
                ))}
              </ul>
              <Link href="/kayit"
                className="block text-center bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-semibold transition-colors">
                Premium ile Başla
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* UPCOMING */}
      {upcoming.length > 0 && (
        <section className="py-24 px-6">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <div className="text-yellow-400 text-sm font-semibold uppercase tracking-wider mb-3">Yakında</div>
              <h2 className="text-4xl font-black mb-4">Geliştirilen Özellikler</h2>
              <p className="text-gray-400 text-lg">Platformumuzu sürekli geliştiriyoruz</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {upcoming.map((u: any, i: number) => (
                <div key={i} className="bg-[#141414] border border-[#2A2A2A] rounded-2xl p-5">
                  <div className="inline-block bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs px-2 py-1 rounded-lg mb-3">{u.estimated}</div>
                  <h3 className="text-white font-bold mb-2">{u.title}</h3>
                  <p className="text-gray-500 text-sm">{u.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section id="hakkimizda" className="py-24 px-6 bg-[#141414]">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl font-black mb-4">Hemen Başlayın</h2>
          <p className="text-gray-400 text-lg mb-8">Başvurunuzu yapın, admin onayının ardından sistemi kullanmaya başlayın.</p>
          <Link href="/kayit"
            className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-10 py-4 rounded-xl font-bold text-lg transition-colors">
            Ücretsiz Kayıt Ol <ArrowRight size={20} />
          </Link>
          <div className="mt-6 text-gray-500 text-sm">Kredi kartı gerekmez · İstediğiniz zaman iptal edin</div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-[#2A2A2A] py-8 px-6">
        <div className="max-w-6xl mx-auto space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <img src="/logo.png" alt="BilgiOrtağım" className="h-6 w-auto object-contain" />
              <span className="text-gray-400 text-sm">BilgiOrtağım © {new Date().getFullYear()}</span>
            </div>
            <div className="flex items-center gap-6 text-gray-500 text-sm">
              <span>0850 123 45 67</span>
              <span>info@bilgiortagim.com</span>
              <Link href="/giris" className="hover:text-white transition-colors">Giriş Yap</Link>
            </div>
          </div>
          <div className="flex items-center justify-center gap-6 text-gray-600 text-xs pt-4 border-t border-[#2A2A2A]/50">
            <Link href="/kvkk" className="hover:text-gray-300 transition-colors">KVKK Aydınlatma Metni</Link>
            <span className="text-gray-700">·</span>
            <Link href="/sozlesme" className="hover:text-gray-300 transition-colors">Üyelik Sözleşmesi</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
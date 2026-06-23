import Link from 'next/link'
import { ArrowLeft, Building2, Target, Eye } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

export const metadata = {
  title: 'Hakkımızda | BilgiOrtağım',
  description: 'BilgiOrtağım — Rent A Car sektörü için müşteri sorgulama ve filo yönetim platformu',
}

export default async function HakkimizdaPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('landing_content')
    .select('value')
    .eq('section', 'about')
    .eq('key', 'main')
    .maybeSingle()

  const about = data?.value || {}

  const title = about.title || 'Hakkımızda'
  const subtitle = about.subtitle || 'Rent A Car sektörünün dijital güvencesi'
  const bodyParagraphs = (about.body || '').split('\n').filter((p: string) => p.trim() !== '')
  const missionTitle = about.mission_title || 'Misyonumuz'
  const visionTitle = about.vision_title || 'Vizyonumuz'
  const missionText = about.mission_text || ''
  const visionText = about.vision_text || ''

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <Link href="/" className="inline-flex items-center gap-2 text-gray-500 hover:text-white text-sm mb-8 transition-colors">
          <ArrowLeft size={15} /> Ana Sayfaya Dön
        </Link>

        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-red-500/10 rounded-xl flex items-center justify-center">
            <Building2 size={18} className="text-red-400" />
          </div>
          <div>
            <h1 className="text-white font-bold text-2xl">{title}</h1>
            <p className="text-gray-500 text-sm mt-0.5">{subtitle}</p>
          </div>
        </div>

        {bodyParagraphs.length > 0 ? (
          <div className="bg-[#141414] border border-[#2A2A2A] rounded-2xl p-8 space-y-4">
            {bodyParagraphs.map((p: string, i: number) => (
              <p key={i} className="text-gray-300 text-sm leading-relaxed">{p}</p>
            ))}
          </div>
        ) : (
          <div className="bg-[#141414] border border-[#2A2A2A] rounded-2xl p-8">
            <p className="text-gray-500 text-sm leading-relaxed">
              BilgiOrtağım, araç kiralama sektöründe çalışan firmaların müşteri geçmişi sorgulama,
              kiralama takibi ve muhasebe süreçlerini tek bir platformda yönetmelerini sağlayan bir
              dijital çözümdür.
            </p>
          </div>
        )}

        {(missionText || visionText) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            {missionText && (
              <div className="bg-[#141414] border border-[#2A2A2A] rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center">
                    <Target size={14} className="text-blue-400" />
                  </div>
                  <h3 className="text-white font-semibold text-sm">{missionTitle}</h3>
                </div>
                <p className="text-gray-400 text-sm leading-relaxed">{missionText}</p>
              </div>
            )}
            {visionText && (
              <div className="bg-[#141414] border border-[#2A2A2A] rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-purple-500/10 rounded-lg flex items-center justify-center">
                    <Eye size={14} className="text-purple-400" />
                  </div>
                  <h3 className="text-white font-semibold text-sm">{visionTitle}</h3>
                </div>
                <p className="text-gray-400 text-sm leading-relaxed">{visionText}</p>
              </div>
            )}
          </div>
        )}

        <div className="mt-8 text-center">
          <Link href="/kayit" className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl font-medium transition-colors">
            Hemen Başla
          </Link>
        </div>
      </div>
    </div>
  )
}

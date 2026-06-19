import Link from 'next/link'
import { ArrowLeft, Shield } from 'lucide-react'
import { KVKK_TEXT } from '@/lib/legal/texts'

export const metadata = {
  title: 'KVKK Aydınlatma Metni | BilgiOrtağım',
  description: 'BilgiOrtağım platformu KVKK aydınlatma metni',
}

export default function KvkkPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <Link href="/" className="inline-flex items-center gap-2 text-gray-500 hover:text-white text-sm mb-8 transition-colors">
          <ArrowLeft size={15} /> Ana Sayfaya Dön
        </Link>

        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center">
            <Shield size={18} className="text-blue-400" />
          </div>
          <h1 className="text-white font-bold text-2xl">KVKK Aydınlatma Metni</h1>
        </div>

        <div className="bg-[#141414] border border-[#2A2A2A] rounded-2xl p-8">
          <pre className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap font-sans">{KVKK_TEXT}</pre>
        </div>

        <div className="mt-8 text-center">
          <Link href="/kayit" className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl font-medium transition-colors">
            Kayıt Sayfasına Geri Dön
          </Link>
        </div>
      </div>
    </div>
  )
}
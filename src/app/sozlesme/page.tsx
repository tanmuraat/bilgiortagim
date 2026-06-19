import Link from 'next/link'
import { ArrowLeft, FileText } from 'lucide-react'
import { CONTRACT_TEXT } from '@/lib/legal/texts'

export const metadata = {
  title: 'Üyelik Sözleşmesi | BilgiOrtağım',
  description: 'BilgiOrtağım platformu üyelik sözleşmesi',
}

export default function SozlesmePage() {
  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <Link href="/" className="inline-flex items-center gap-2 text-gray-500 hover:text-white text-sm mb-8 transition-colors">
          <ArrowLeft size={15} /> Ana Sayfaya Dön
        </Link>

        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center">
            <FileText size={18} className="text-purple-400" />
          </div>
          <h1 className="text-white font-bold text-2xl">Üyelik Sözleşmesi</h1>
        </div>

        <div className="bg-[#141414] border border-[#2A2A2A] rounded-2xl p-8">
          <pre className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap font-sans">{CONTRACT_TEXT}</pre>
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
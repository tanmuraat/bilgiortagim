import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'BilgiOrtağım — Rent A Car Yönetim Platformu',
  description: 'Müşteri sorgulama, kiralama takibi ve muhasebe yönetimi',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body className={`${inter.className} bg-[#0A0A0A] text-white antialiased`}>
        {children}
      </body>
    </html>
  )
}
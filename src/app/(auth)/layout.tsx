// GİRİŞ SAYFASI — src/app/(auth)/giris/page.tsx
// Mevcut giris-page.tsx dosyan zaten doğru.
// Sorun (auth)/layout.tsx dosyasında logo var + sayfada da logo var.
// Aşağıdaki layout.tsx içeriğini src/app/(auth)/layout.tsx dosyasına yapıştır:

// src/app/(auth)/layout.tsx — SADECE children döndür, logo yok
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {children}
    </div>
  )
}
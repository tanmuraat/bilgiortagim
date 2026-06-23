import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Statik dosyalar ve API'yi atla
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.') ||
    pathname.startsWith('/favicon')
  ) {
    return response
  }

  // Auth sayfaları — giriş yapmışsa dashboard'a
  if (pathname === '/giris' || pathname === '/kayit') {
    if (user) {
      const { data: profile } = await supabase.from('profiles').select('status, role').eq('id', user.id).single()
      if (profile?.status === 'pending') return NextResponse.redirect(new URL('/onay-bekleniyor', request.url))
      if (profile?.status === 'blocked' || profile?.status === 'rejected') return response
      if (profile?.role === 'admin') return NextResponse.redirect(new URL('/admin', request.url))
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    return response
  }

  // Onay bekleniyor sayfası
  if (pathname === '/onay-bekleniyor') {
    if (!user) return NextResponse.redirect(new URL('/giris', request.url))
    return response
  }

  // Admin sayfaları
  if (pathname.startsWith('/admin')) {
    if (!user) return NextResponse.redirect(new URL('/giris', request.url))
    const { data: profile } = await supabase.from('profiles').select('role, status').eq('id', user.id).single()
    if (profile?.status === 'pending') return NextResponse.redirect(new URL('/onay-bekleniyor', request.url))
    if (profile?.role !== 'admin') return NextResponse.redirect(new URL('/dashboard', request.url))
    return response
  }

  // Uygulama sayfaları
  const appPaths = ['/dashboard', '/musteri-sorgulama', '/kiralama-takvimi', '/araclarim', '/mini-muhasebe', '/destek', '/bildirimler', '/ayarlar', '/abonelik']
  const isAppPath = appPaths.some(p => pathname.startsWith(p))

  if (isAppPath) {
    if (!user) return NextResponse.redirect(new URL('/giris', request.url))

    const { data: profile } = await supabase.from('profiles').select('status, subscription_plan, role, is_sub_user, permissions, is_branch').eq('id', user.id).single()

    if (!profile) return NextResponse.redirect(new URL('/giris', request.url))
    if (profile.status === 'pending') return NextResponse.redirect(new URL('/onay-bekleniyor', request.url))
    if (profile.status === 'rejected' || profile.status === 'blocked') {
      await supabase.auth.signOut()
      return NextResponse.redirect(new URL(`/giris?status=${profile.status}`, request.url))
    }

    // Alt kullanıcı yetki kontrolü
    if (profile.is_sub_user) {
      // /ayarlar ve /abonelik personel için her zaman kapalı — bunlar
      // yönetilebilir izinler değil, sadece ana firma/şube hesabına özeldir.
      if (pathname.startsWith('/ayarlar') || pathname.startsWith('/abonelik')) {
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
      const permissions: string[] = profile.permissions || []
      const permMap: Record<string, string> = {
        '/musteri-sorgulama': 'musteri-sorgulama',
        '/kiralama-takvimi': 'kiralama-takvimi',
        '/araclarim': 'araclarim',
        '/mini-muhasebe': 'mini-muhasebe',
        '/destek': 'destek',
        '/bildirimler': 'bildirimler',
      }
      for (const [path, perm] of Object.entries(permMap)) {
        if (pathname.startsWith(path) && !permissions.includes(perm)) {
          return NextResponse.redirect(new URL('/dashboard', request.url))
        }
      }
      return response
    }

    // Şube hesabı için de abonelik yönetimi kapalı — sadece ana firma yönetir.
    if (profile.is_branch && pathname.startsWith('/abonelik')) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    // Premium gerektiren sayfalar
    const premiumPaths = ['/kiralama-takvimi', '/mini-muhasebe']
    const needsPremium = premiumPaths.some(p => pathname.startsWith(p))
    if (needsPremium && profile.subscription_plan !== 'premium') {
      return NextResponse.redirect(new URL('/dashboard?upgrade=true', request.url))
    }
  }

  // Ana sayfa — giriş yapılmışsa dashboard'a
  if (pathname === '/') {
    if (user) {
      const { data: profile } = await supabase.from('profiles').select('status, role').eq('id', user.id).single()
      if (profile?.role === 'admin') return NextResponse.redirect(new URL('/admin', request.url))
      if (profile?.status === 'approved') return NextResponse.redirect(new URL('/dashboard', request.url))
      if (profile?.status === 'pending') return NextResponse.redirect(new URL('/onay-bekleniyor', request.url))
    }
    return response
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
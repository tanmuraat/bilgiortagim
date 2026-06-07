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

  // Korumalı sayfalar
  const protectedPaths = ['/dashboard', '/musteri-sorgulama', '/kiralama-takvimi', '/araclarim', '/mini-muhasebe', '/raporlar', '/bildirimler', '/ayarlar', '/abonelik', '/admin']
  const isProtected = protectedPaths.some(p => pathname.startsWith(p))

  // Auth sayfaları — giriş yapmışsa dashboard'a
  if ((pathname === '/giris' || pathname === '/kayit') && user) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Korumalı sayfa — giriş yoksa girise
  if (isProtected && !user) {
    return NextResponse.redirect(new URL('/giris', request.url))
  }

  // Admin kontrolü
  if (pathname.startsWith('/admin') && user) {
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
}
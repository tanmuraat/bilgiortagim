import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { writeAuditLog, checkRateLimit } from '@/lib/audit'

const ALLOWED_BUCKETS = ['receipts', 'contracts', 'customer-attachments', 'tax-documents', 'vergi-levhalari']

// Dosya erişimi için rate limit: dakikada 30, saatte 200
const RATE_LIMITS = [
  { windowType: 'minute' as const, maxCount: 30 },
  { windowType: 'hour' as const, maxCount: 200 },
]

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const bucket = searchParams.get('bucket')
  const path = searchParams.get('path')
  const download = searchParams.get('download') === '1'

  if (!bucket || !path) {
    return NextResponse.json({ error: 'Eksik parametre' }, { status: 400 })
  }

  if (!ALLOWED_BUCKETS.includes(bucket)) {
    return NextResponse.json({ error: 'Erişim reddedildi' }, { status: 403 })
  }

  // Oturum kontrolü
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Giriş yapınız' }, { status: 401 })
  }

  // Profil bilgisi al
  const { data: profile } = await supabase.from('profiles').select('company_name, role').eq('id', user.id).single()

  // Rate limit kontrolü (admin için uygulama)
  if (profile?.role !== 'admin') {
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
    for (const limit of RATE_LIMITS) {
      const { limited, count } = await checkRateLimit({
        userId: user.id,
        action: 'file_access',
        windowType: limit.windowType,
        maxCount: limit.maxCount,
      })
      if (limited) {
        // Rate limit aşıldı — audit log yaz
        await writeAuditLog({
          userId: user.id,
          companyName: profile?.company_name,
          action: 'file_access_rate_limited',
          resourceType: bucket,
          resourceId: path,
          ipAddress: ip,
          userAgent: req.headers.get('user-agent') || '',
          metadata: { bucket, path, count, window: limit.windowType },
        })
        return NextResponse.json({ error: 'Çok fazla istek. Lütfen bekleyiniz.' }, { status: 429 })
      }
    }
  }

  // Signed URL oluştur
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, 3600)

  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: 'Dosya bulunamadı' }, { status: 404 })
  }

  // Dosyayı Supabase'den çek
  const fileRes = await fetch(data.signedUrl)
  if (!fileRes.ok) {
    return NextResponse.json({ error: 'Dosya alınamadı' }, { status: 502 })
  }

  const contentType = fileRes.headers.get('content-type') || 'application/octet-stream'
  const fileBuffer = await fileRes.arrayBuffer()
  const filename = path.split('/').pop() || 'dosya'
  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'

  // Audit log yaz
  await writeAuditLog({
    userId: user.id,
    companyName: profile?.company_name,
    action: download ? 'file_download' : 'file_view',
    resourceType: bucket,
    resourceId: path,
    ipAddress: ip,
    userAgent: req.headers.get('user-agent') || '',
    metadata: { bucket, path, filename, contentType },
  })

  return new NextResponse(fileBuffer, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'private, max-age=3600',
      'Content-Disposition': download ? `attachment; filename="${filename}"` : 'inline',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
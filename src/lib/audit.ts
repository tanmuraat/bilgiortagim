import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Server tarafında audit log yazar.
 * API route'larından çağrılır.
 */
export async function writeAuditLog({
  userId,
  companyName,
  action,
  resourceType,
  resourceId,
  ipAddress,
  userAgent,
  metadata = {},
}: {
  userId: string
  companyName?: string
  action: string
  resourceType?: string
  resourceId?: string
  ipAddress?: string
  userAgent?: string
  metadata?: Record<string, any>
}) {
  try {
    // Service role ile yaz (RLS'i bypass eder)
    const { createClient } = await import('@supabase/supabase-js')
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    await adminClient.from('audit_logs').insert({
      user_id: userId,
      company_name: companyName,
      action,
      resource_type: resourceType,
      resource_id: resourceId,
      ip_address: ipAddress,
      user_agent: userAgent,
      metadata,
    })
  } catch (e) {
    // Audit log hatası uygulamayı durdurmamalı
    console.error('Audit log yazılamadı:', e)
  }
}

/**
 * Rate limit kontrolü.
 * Belirli bir aksiyon için kullanıcının limitini kontrol eder.
 * Limiti aşmışsa true döner.
 */
export async function checkRateLimit({
  userId,
  action,
  windowType,
  maxCount,
}: {
  userId: string
  action: string
  windowType: 'minute' | 'hour' | 'day'
  maxCount: number
}): Promise<{ limited: boolean; count: number; resetAt: Date }> {
  const { createClient } = await import('@supabase/supabase-js')
  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const now = new Date()
  let windowStart: Date

  if (windowType === 'minute') {
    windowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes(), 0, 0)
  } else if (windowType === 'hour') {
    windowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), 0, 0, 0)
  } else {
    windowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
  }

  const resetAt = new Date(windowStart)
  if (windowType === 'minute') resetAt.setMinutes(resetAt.getMinutes() + 1)
  else if (windowType === 'hour') resetAt.setHours(resetAt.getHours() + 1)
  else resetAt.setDate(resetAt.getDate() + 1)

  const { data: existing } = await adminClient
    .from('rate_limits')
    .select('id, count')
    .eq('user_id', userId)
    .eq('action', action)
    .eq('window_type', windowType)
    .eq('window_start', windowStart.toISOString())
    .maybeSingle()

  if (existing) {
    const newCount = existing.count + 1
    await adminClient.from('rate_limits').update({
      count: newCount,
      updated_at: now.toISOString(),
    }).eq('id', existing.id)

    return { limited: newCount > maxCount, count: newCount, resetAt }
  } else {
    await adminClient.from('rate_limits').insert({
      user_id: userId,
      action,
      window_type: windowType,
      window_start: windowStart.toISOString(),
      count: 1,
    })
    return { limited: false, count: 1, resetAt }
  }
}
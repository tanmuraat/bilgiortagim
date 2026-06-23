import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { full_name, email, phone, role, permissions, parent_user_id, sub_user_id } = await request.json()

    // Service role ile admin client
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Şube hesapları kendi personelini ekleyemez
    const { data: parentCheck } = await supabaseAdmin
      .from('profiles').select('is_branch').eq('id', parent_user_id).single()

    if (parentCheck?.is_branch) {
      return NextResponse.json({ error: 'Şube hesapları personel ekleyemez.' }, { status: 403 })
    }

    // Geçici şifre oluştur
    const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-4).toUpperCase() + '!1'

    // Supabase Auth'a kullanıcı ekle
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true, // Email onayı otomatik
      user_metadata: { full_name, company_name: 'Personel' }
    })

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    if (!authData.user) {
      return NextResponse.json({ error: 'Kullanıcı oluşturulamadı.' }, { status: 400 })
    }

    // Parent profilden firma bilgisi al
    const { data: parentProfile } = await supabaseAdmin
      .from('profiles').select('company_name, subscription_plan').eq('id', parent_user_id).single()

    // Profile oluştur
    await supabaseAdmin.from('profiles').upsert({
      id: authData.user.id,
      email,
      full_name,
      company_name: parentProfile?.company_name || 'Personel',
      phone,
      role: 'user',
      status: 'approved',
      subscription_plan: parentProfile?.subscription_plan || 'none',
      is_sub_user: true,
      parent_user_id,
      permissions,
    })

    // sub_users tablosunu güncelle
    await supabaseAdmin.from('sub_users').update({
      auth_user_id: authData.user.id
    }).eq('id', sub_user_id)

    // Şifre emaili gönder (Supabase üzerinden)
    await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email,
    })

    return NextResponse.json({
      success: true,
      temp_password: tempPassword,
      message: `${full_name} adlı personel oluşturuldu. Geçici şifre: ${tempPassword}`
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const BASE_BRANCH_LIMITS: Record<string, number> = {
  none: 0,
  pro: 0,
  premium: 2,
}

export async function PATCH(request: NextRequest) {
  try {
    const { branch_id, parent_user_id, action } = await request.json()

    if (!branch_id || !parent_user_id) {
      return NextResponse.json({ error: 'Şube ve ana firma bilgisi gerekli.' }, { status: 400 })
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Güvenlik: sadece gerçekten bu firmaya ait bir şube üzerinde işlem yapılabilsin
    const { data: branchProfile } = await supabaseAdmin
      .from('profiles')
      .select('id, branch_of_user_id, is_branch, branch_name')
      .eq('id', branch_id)
      .single()

    if (!branchProfile || !branchProfile.is_branch || branchProfile.branch_of_user_id !== parent_user_id) {
      return NextResponse.json({ error: 'Bu şube üzerinde işlem yapma yetkiniz yok.' }, { status: 403 })
    }

    if (action === 'reset_password') {
      // Supabase şifreleri hash'lenmiş tutar, mevcut şifre hiçbir şekilde
      // geri okunamaz — bu yüzden "görüntüleme" yerine güvenli bir
      // sıfırlama akışı sunuyoruz: yeni bir geçici şifre üretip direkt
      // ana firmaya gösteriyoruz, şube bir dahaki girişte bu şifreyi kullanır.
      const newPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-4).toUpperCase() + '!1'

      const { error: pwError } = await supabaseAdmin.auth.admin.updateUserById(branch_id, { password: newPassword })
      if (pwError) {
        return NextResponse.json({ error: pwError.message }, { status: 400 })
      }

      return NextResponse.json({ success: true, new_password: newPassword })
    }

    return NextResponse.json({ error: 'Geçersiz işlem.' }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { branch_id, parent_user_id } = await request.json()

    if (!branch_id || !parent_user_id) {
      return NextResponse.json({ error: 'Şube ve ana firma bilgisi gerekli.' }, { status: 400 })
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Güvenlik: sadece gerçekten bu firmaya ait bir şube silinebilsin
    const { data: branchProfile } = await supabaseAdmin
      .from('profiles')
      .select('id, branch_of_user_id, is_branch')
      .eq('id', branch_id)
      .single()

    if (!branchProfile || !branchProfile.is_branch || branchProfile.branch_of_user_id !== parent_user_id) {
      return NextResponse.json({ error: 'Bu şube üzerinde işlem yapma yetkiniz yok.' }, { status: 403 })
    }

    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(branch_id)
    if (authDeleteError) {
      return NextResponse.json({ error: authDeleteError.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
export async function POST(request: NextRequest) {
  try {
    const { branch_name, email, phone, parent_user_id } = await request.json()

    if (!branch_name || !email || !parent_user_id) {
      return NextResponse.json({ error: 'Şube adı, e-posta ve ana firma bilgisi gerekli.' }, { status: 400 })
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Ana firmanın planını ve mevcut şube sayısını kontrol et
    const { data: parentProfile, error: parentError } = await supabaseAdmin
      .from('profiles')
      .select('company_name, subscription_plan, is_branch, extra_branch_slots')
      .eq('id', parent_user_id)
      .single()

    if (parentError || !parentProfile) {
      return NextResponse.json({ error: 'Ana firma bulunamadı.' }, { status: 404 })
    }

    if (parentProfile.is_branch) {
      return NextResponse.json({ error: 'Bir şube kendi şubesini oluşturamaz.' }, { status: 403 })
    }

    const limit = (BASE_BRANCH_LIMITS[parentProfile.subscription_plan] ?? 0) + (parentProfile.extra_branch_slots || 0)

    const { count: existingBranches } = await supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('branch_of_user_id', parent_user_id)

    if ((existingBranches || 0) >= limit) {
      const message = limit === 0
        ? 'Şube ekleyebilmek için Premium plana geçmeniz gerekiyor.'
        : `Mevcut planınızda en fazla ${limit} şube açabilirsiniz. Daha fazla şube için lütfen destek ile iletişime geçin.`
      return NextResponse.json({ error: message }, { status: 403 })
    }

    const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-4).toUpperCase() + '!1'

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name: branch_name, company_name: parentProfile.company_name },
    })

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    if (!authData.user) {
      return NextResponse.json({ error: 'Şube hesabı oluşturulamadı.' }, { status: 400 })
    }

    const { error: profileError } = await supabaseAdmin.from('profiles').upsert({
      id: authData.user.id,
      email,
      full_name: branch_name,
      company_name: parentProfile.company_name,
      tax_number: '—',
      phone: phone || '',
      role: 'user',
      status: 'approved',
      subscription_plan: parentProfile.subscription_plan,
      is_branch: true,
      branch_of_user_id: parent_user_id,
      branch_name,
    })

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      temp_password: tempPassword,
      message: `${branch_name} şubesi oluşturuldu. Geçici şifre: ${tempPassword}`,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

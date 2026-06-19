"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const TAX_BUCKET = "tax-documents";
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/png"];

export type AuthActionState = {
  error?: string;
};

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  "Invalid login credentials": "E-posta veya şifre hatalı.",
  "Email not confirmed": "E-posta adresiniz henüz doğrulanmadı.",
  "User already registered": "Bu e-posta adresi zaten kayıtlı.",
  "Password should be at least 6 characters": "Şifre en az 6 karakter olmalıdır.",
  "Signup requires a valid password": "Geçerli bir şifre girin.",
  "Unable to validate email address: invalid format": "Geçerli bir e-posta adresi girin.",
};

function translateAuthError(message: string): string {
  return AUTH_ERROR_MESSAGES[message] ?? message;
}

export async function loginAction(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "E-posta ve şifre zorunludur." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: translateAuthError(error.message) };
  }

  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("status, role")
      .eq("id", user.id)
      .single();

    if (profile?.status === "pending") {
      redirect("/onay-bekleniyor");
    }

    if (profile?.role === "admin") {
      redirect("/admin");
    }
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function registerAction(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  // Yetkili bilgileri
  const fullName = String(formData.get("full_name") ?? "").trim();
  const tcNumber = String(formData.get("tc_number") ?? "").trim();
  const birthDate = String(formData.get("birth_date") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();

  // Firma bilgileri
  const companyName = String(formData.get("company_name") ?? "").trim();
  const taxNumber = String(formData.get("tax_number") ?? "").trim();
  const taxOffice = String(formData.get("tax_office") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const district = String(formData.get("district") ?? "").trim();
  const website = String(formData.get("website") ?? "").trim();
  const fleetSize = String(formData.get("fleet_size") ?? "").trim();

  // Hesap bilgileri
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const passwordConfirm = String(formData.get("password_confirm") ?? "");

  // Onaylar
  const kvkkAccepted = formData.get("kvkk_accepted") === "on";
  const contractAccepted = formData.get("contract_accepted") === "on";

  const file = formData.get("tax_document") as File | null;

  // Zorunlu alan kontrolü
  if (!fullName || !tcNumber || !birthDate || !phone || !companyName || !taxNumber || !taxOffice || !city || !district || !email || !password) {
    return { error: "Lütfen tüm zorunlu alanları doldurun." };
  }

  if (tcNumber.length !== 11 || !/^\d{11}$/.test(tcNumber)) {
    return { error: "TC kimlik numarası 11 haneli rakamdan oluşmalıdır." };
  }

  if (password.length < 8) {
    return { error: "Şifre en az 8 karakter olmalıdır." };
  }

  if (password !== passwordConfirm) {
    return { error: "Şifreler eşleşmiyor." };
  }

  if (!kvkkAccepted) {
    return { error: "KVKK Aydınlatma Metni'ni onaylamanız zorunludur." };
  }

  if (!contractAccepted) {
    return { error: "Üyelik Sözleşmesi'ni onaylamanız zorunludur." };
  }

  if (!file || file.size === 0) {
    return { error: "Vergi levhası yüklemeniz gereklidir." };
  }

  if (file.size > MAX_FILE_SIZE) {
    return { error: "Dosya boyutu en fazla 10 MB olabilir." };
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return { error: "Yalnızca PDF, JPG veya PNG yükleyebilirsiniz." };
  }

  const supabase = await createClient();
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        company_name: companyName,
      },
    },
  });

  if (signUpError) {
    return { error: translateAuthError(signUpError.message) };
  }

  const userId = signUpData.user?.id;
  if (!userId) {
    return { error: "Kayıt oluşturulamadı. Lütfen tekrar deneyin." };
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "pdf";
  const storagePath = `${userId}/vergi-levhasi-${Date.now()}.${ext}`;

  const admin = createAdminClient();
  const fileBuffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await admin.storage
    .from(TAX_BUCKET)
    .upload(storagePath, fileBuffer, {
      contentType: file.type,
      upsert: true,
    });

  if (uploadError) {
    return { error: `Dosya yüklenemedi: ${uploadError.message}` };
  }

  const { data: { publicUrl } } = admin.storage.from(TAX_BUCKET).getPublicUrl(storagePath);

  const now = new Date().toISOString();

  const { error: profileError } = await admin.from("profiles").upsert({
    id: userId,
    full_name: fullName,
    tc_number_encrypted: tcNumber,
    birth_date: birthDate || null,
    phone,
    company_name: companyName,
    tax_number: taxNumber,
    tax_office: taxOffice,
    city,
    district,
    website: website || null,
    fleet_size: fleetSize || null,
    email,
    tax_document_url: publicUrl,
    status: "pending",
    role: "user",
    subscription_plan: "none",
    kvkk_accepted: true,
    contract_accepted: true,
    kvkk_accepted_at: now,
    contract_accepted_at: now,
  });

  if (profileError) {
    return { error: `Profil kaydı oluşturulamadı: ${profileError.message}` };
  }

  revalidatePath("/", "layout");
  redirect("/onay-bekleniyor");
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/giris");
}
import { startOfDay } from "date-fns";
import { NextResponse } from "next/server";

import { PLAN_LIMITS, type SubscriptionPlan } from "@/lib/constants";
import { decrypt, hashSHA256, maskPhone, maskTC } from "@/lib/crypto";
import { createClient } from "@/lib/supabase/server";
import type { CustomerRecordItem, MusteriSorguResponse } from "@/types/customer";

function validateTc(tc: string): boolean {
  const digits = tc.replace(/\D/g, "");
  if (digits.length !== 11 || digits[0] === "0") return false;
  const d = digits.split("").map(Number);
  const odd = d[0]! + d[2]! + d[4]! + d[6]! + d[8]!;
  const even = d[1]! + d[3]! + d[5]! + d[7]!;
  const d10 = (odd * 7 - even) % 10;
  const d11 = d.slice(0, 10).reduce((a, b) => a + b, 0) % 10;
  return d10 === d[9] && d11 === d[10];
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json<MusteriSorguResponse>(
        { success: false, error: "Oturum açmanız gerekiyor." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const tcRaw = String(body.tc ?? "").replace(/\D/g, "");

    if (!validateTc(tcRaw)) {
      return NextResponse.json<MusteriSorguResponse>(
        { success: false, error: "Geçerli bir 11 haneli TC kimlik numarası girin." },
        { status: 400 }
      );
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("subscription_plan")
      .eq("id", user.id)
      .single();

    const plan = (profile?.subscription_plan ?? "none") as SubscriptionPlan;
    const dailyLimit = PLAN_LIMITS[plan].dailyQueries;

    if (dailyLimit === 0) {
      return NextResponse.json<MusteriSorguResponse>(
        {
          success: false,
          error:
            "Müşteri sorgulama Pro veya Premium planda kullanılabilir.",
        },
        { status: 403 }
      );
    }

    if (Number.isFinite(dailyLimit)) {
      const dayStart = startOfDay(new Date()).toISOString();
      const { count } = await supabase
        .from("query_logs")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("created_at", dayStart);

      if ((count ?? 0) >= dailyLimit) {
        return NextResponse.json<MusteriSorguResponse>(
          {
            success: false,
            error: `Günlük sorgu limitinize (${dailyLimit}) ulaştınız. Yarın tekrar deneyin veya Premium'a geçin.`,
          },
          { status: 429 }
        );
      }
    }

    const tcHash = hashSHA256(tcRaw);

    const { data: customer } = await supabase
      .from("customer_records")
      .select("*")
      .eq("tc_hash", tcHash)
      .maybeSingle();

    const queriedAt = new Date().toISOString();

    await supabase.from("query_logs").insert({
      user_id: user.id,
      tc_hash: tcHash,
      customer_id: customer?.id ?? null,
      result_found: Boolean(customer),
    });

    if (!customer) {
      return NextResponse.json<MusteriSorguResponse>(
        { success: false, error: "Bu TC kimlik numarası için kayıt bulunamadı." },
        { status: 404 }
      );
    }

    const { data: items } = await supabase
      .from("customer_record_items")
      .select("*")
      .eq("customer_id", customer.id)
      .order("occurred_at", { ascending: false });

    let phoneMasked = "—";
    if (customer.phone_encrypted) {
      try {
        phoneMasked = maskPhone(decrypt(customer.phone_encrypted));
      } catch {
        phoneMasked = "—";
      }
    }

    const recordItems = (items ?? []) as CustomerRecordItem[];

    const response: MusteriSorguResponse = {
      success: true,
      data: {
        id: customer.id,
        full_name: customer.full_name,
        risk_status: customer.risk_status,
        tc_masked: maskTC(tcRaw),
        birth_date: customer.birth_date,
        phone_masked: phoneMasked,
        email: customer.email,
        address: customer.address,
        total_records: customer.total_records,
        negative_records: customer.negative_records,
        total_debt: Number(customer.total_debt),
        last_rental_at: customer.last_rental_at,
        last_company_name: customer.last_company_name,
        queried_at: queriedAt,
        items: recordItems,
      },
    };

    return NextResponse.json(response);
  } catch (e) {
    console.error("musteri/sorgula", e);
    return NextResponse.json<MusteriSorguResponse>(
      { success: false, error: "Sorgu sırasında bir hata oluştu." },
      { status: 500 }
    );
  }
}

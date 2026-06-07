import Link from "next/link";
import { Clock, LogOut } from "lucide-react";
import { redirect } from "next/navigation";

import { signOutAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export default async function OnayBekleniyorPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/giris");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("status")
    .eq("id", user.id)
    .single();

  if (profile?.status === "active") {
    redirect("/dashboard");
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-amber-500/10">
          <Clock className="size-7 text-amber-400" />
        </div>
        <CardTitle>Onay Bekleniyor</CardTitle>
        <CardDescription>
          Başvurunuz alındı, admin onayı bekleniyor.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5 text-center">
        <p className="text-sm leading-relaxed text-[#a3a3a3]">
          Vergi levhanız ve firma bilgileriniz incelendikten sonra hesabınız
          aktifleştirilecektir. Bu süreç genellikle 1-2 iş günü sürer.
        </p>
        <p className="text-sm text-[#737373]">
          Destek:{" "}
          <a
            href="tel:08501234567"
            className="font-semibold text-[#E02424] hover:underline"
          >
            0850 123 45 67
          </a>
        </p>
        <form action={signOutAction}>
          <Button
            type="submit"
            variant="outline"
            className="w-full gap-2 border-[#2A2A2A] text-[#F5F5F5] hover:bg-[#1a1a1a]"
          >
            <LogOut className="size-4" />
            Çıkış Yap
          </Button>
        </form>
        <Link
          href="/giris"
          className="block text-xs text-[#737373] hover:text-[#F5F5F5]"
        >
          Giriş sayfasına dön
        </Link>
      </CardContent>
    </Card>
  );
}

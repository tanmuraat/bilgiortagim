"use client";

import Link from "next/link";
import { Upload } from "lucide-react";
import { useActionState, useRef, useState } from "react";

import { registerAction, type AuthActionState } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

const initialState: AuthActionState = {};

export function RegisterForm() {
  const [state, formAction, pending] = useActionState(
    registerAction,
    initialState
  );
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Kayıt Ol</CardTitle>
        <CardDescription>
          Firma bilgilerinizi girin. Onay sonrası hesabınız aktifleşir.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          {state.error ? (
            <p className="rounded-lg border border-[#E02424]/40 bg-[#E02424]/10 px-3 py-2 text-sm text-[#E02424]">
              {state.error}
            </p>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="full_name">Ad Soyad</Label>
              <Input id="full_name" name="full_name" required />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="company_name">Firma Adı</Label>
              <Input id="company_name" name="company_name" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tax_number">Vergi Numarası</Label>
              <Input id="tax_number" name="tax_number" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefon</Label>
              <Input id="phone" name="phone" type="tel" required />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="email">E-posta</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Şifre</Label>
              <Input
                id="password"
                name="password"
                type="password"
                minLength={8}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password_confirm">Şifre Tekrar</Label>
              <Input
                id="password_confirm"
                name="password_confirm"
                type="password"
                minLength={8}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Vergi Levhası (PDF / JPG / PNG, max 10 MB)</Label>
            <input
              ref={fileRef}
              type="file"
              name="tax_document"
              accept=".pdf,.jpg,.jpeg,.png"
              className="hidden"
              required
              onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className={cn(
                "flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-[#2A2A2A] bg-[#0A0A0A] px-4 py-5 text-sm transition-colors hover:border-[#E02424]/50",
                fileName && "border-[#E02424]/40"
              )}
            >
              <Upload className="size-5 text-[#737373]" />
              <span className={fileName ? "text-[#F5F5F5]" : "text-[#737373]"}>
                {fileName ?? "Dosya seçin"}
              </span>
            </button>
          </div>

          <Button
            type="submit"
            className="h-11 w-full bg-[#E02424] text-white hover:bg-[#c41f1f]"
            disabled={pending}
          >
            {pending ? "Kayıt oluşturuluyor..." : "Kayıt Ol"}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-[#737373]">
          Zaten hesabınız var mı?{" "}
          <Link
            href="/giris"
            className="font-medium text-[#E02424] hover:underline"
          >
            Giriş yapın
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

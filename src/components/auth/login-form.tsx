"use client";

import Link from "next/link";
import { useActionState } from "react";

import { loginAction, type AuthActionState } from "@/actions/auth";
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

const initialState: AuthActionState = {};

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Giriş Yap</CardTitle>
        <CardDescription>Hesabınıza giriş yapın</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          {state.error ? (
            <p className="rounded-lg border border-[#E02424]/40 bg-[#E02424]/10 px-3 py-2 text-sm text-[#E02424]">
              {state.error}
            </p>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="email">E-posta</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="ornek@firma.com"
              required
              autoComplete="email"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Şifre</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
          </div>
          <Button
            type="submit"
            className="h-11 w-full bg-[#E02424] text-white hover:bg-[#c41f1f]"
            disabled={pending}
          >
            {pending ? "Giriş yapılıyor..." : "Giriş Yap"}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-[#737373]">
          Hesabın yok mu?{" "}
          <Link
            href="/kayit"
            className="font-medium text-[#E02424] hover:underline"
          >
            Kayıt Ol
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0A0A0A] px-4 py-12">
      <Link href="/" className="mb-8 flex flex-col items-center gap-2">
        <div className="flex size-12 items-center justify-center rounded-xl bg-[#E02424] text-2xl font-bold text-white">
          B
        </div>
        <p className="text-lg font-bold tracking-tight text-[#F5F5F5]">
          BilgiOrtağım
        </p>
        <p className="text-sm text-[#737373]">Rent A Car Yönetim Platformu</p>
      </Link>
      <div className="w-full max-w-lg">{children}</div>
    </div>
  );
}

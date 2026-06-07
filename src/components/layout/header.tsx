"use client";

import { Bell, Menu } from "lucide-react";

import { useSidebar } from "./sidebar-context";

type HeaderProps = {
  title: string;
  companyName: string;
  userRole?: string;
  unreadNotifications: number;
};

export function Header({
  title,
  companyName,
  userRole = "Firma Yetkilisi",
  unreadNotifications,
}: HeaderProps) {
  const { toggle } = useSidebar();
  const initial = companyName.charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[#2A2A2A] bg-[#0A0A0A]/95 px-4 backdrop-blur-sm lg:px-6">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={toggle}
          className="rounded-lg p-2 text-[#a3a3a3] hover:bg-[#141414] hover:text-[#F5F5F5] lg:hidden"
          aria-label="Menüyü aç"
        >
          <Menu className="size-5" />
        </button>
        <h1 className="text-lg font-semibold text-[#F5F5F5]">{title}</h1>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          className="relative rounded-lg p-2 text-[#a3a3a3] hover:bg-[#141414] hover:text-[#F5F5F5]"
          aria-label="Bildirimler"
        >
          <Bell className="size-5" />
          {unreadNotifications > 0 ? (
            <span className="absolute right-0.5 top-0.5 flex size-4 min-w-4 items-center justify-center rounded-full bg-[#E02424] px-1 text-[10px] font-bold text-white">
              {unreadNotifications > 9 ? "9+" : unreadNotifications}
            </span>
          ) : null}
        </button>

        <div className="flex items-center gap-3 border-l border-[#2A2A2A] pl-3">
          <div className="flex size-9 items-center justify-center rounded-full bg-[#E02424] text-sm font-bold text-white">
            {initial}
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-semibold text-[#F5F5F5]">{companyName}</p>
            <p className="text-xs text-[#737373]">{userRole}</p>
          </div>
        </div>
      </div>
    </header>
  );
}

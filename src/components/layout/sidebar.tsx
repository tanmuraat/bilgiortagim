"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Headphones } from "lucide-react";
import { useState } from "react";

import { mainNavItems } from "@/lib/navigation";
import { cn } from "@/lib/utils";

import { useSidebar } from "./sidebar-context";

type SidebarProps = {
  unreadNotifications: number;
};

export function Sidebar({ unreadNotifications }: SidebarProps) {
  const pathname = usePathname();
  const { open, setOpen } = useSidebar();
  const [expanded, setExpanded] = useState(
    pathname.startsWith("/mini-muhasebe")
  );

  return (
    <>
      {open && (
        <button
          type="button"
          aria-label="Menüyü kapat"
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col border-r border-[#2A2A2A] bg-[#141414] transition-transform duration-300 lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="border-b border-[#2A2A2A] px-5 py-6">
          <Link
            href="/dashboard"
            className="flex items-center gap-3"
            onClick={() => setOpen(false)}
          >
            <img src="/logo.png" alt="BilgiOrtağım" className="h-8 w-auto object-contain" />
          </Link>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {mainNavItems.map((item) => {
            const Icon = item.icon;
            const isParentActive =
              pathname === item.href ||
              pathname.startsWith(`${item.href}/`);
            const hasChildren = Boolean(item.children?.length);

            if (hasChildren) {
              return (
                <div key={item.href}>
                  <button
                    type="button"
                    onClick={() => setExpanded((v) => !v)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                      isParentActive
                        ? "bg-[#E02424] text-white"
                        : "text-[#a3a3a3] hover:bg-[#1f1f1f] hover:text-[#F5F5F5]"
                    )}
                  >
                    <Icon className="size-[18px] shrink-0" />
                    <span className="flex-1 text-left">{item.title}</span>
                    <ChevronDown
                      className={cn(
                        "size-4 transition-transform",
                        expanded && "rotate-180"
                      )}
                    />
                  </button>
                  {expanded ? (
                    <div className="ml-4 mt-1 space-y-1 border-l border-[#2A2A2A] pl-3">
                      {item.children!.map((child) => {
                        const childActive = pathname === child.href;
                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            onClick={() => setOpen(false)}
                            className={cn(
                              "block rounded-lg px-3 py-2 text-sm transition-colors",
                              childActive
                                ? "bg-[#E02424] text-white"
                                : "text-[#737373] hover:text-[#F5F5F5]"
                            )}
                          >
                            {child.title}
                          </Link>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              );
            }

            const isActive =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            const badge =
              item.href === "/bildirimler" && unreadNotifications > 0
                ? unreadNotifications
                : undefined;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-[#E02424] text-white"
                    : "text-[#a3a3a3] hover:bg-[#1f1f1f] hover:text-[#F5F5F5]"
                )}
              >
                <Icon className="size-[18px] shrink-0" />
                <span className="flex-1">{item.title}</span>
                {badge ? (
                  <span className="flex size-5 items-center justify-center rounded-full bg-[#E02424] text-[10px] font-bold text-white ring-2 ring-[#141414]">
                    {badge > 9 ? "9+" : badge}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-[#2A2A2A] p-4">
          <div className="rounded-xl border border-[#2A2A2A] bg-[#0A0A0A] p-4">
            <div className="mb-1 flex items-center gap-2">
              <Headphones className="size-4 text-[#E02424]" />
              <span className="text-sm font-semibold text-[#F5F5F5]">
                Destek Hattı
              </span>
            </div>
            <p className="text-xs text-[#737373]">7/24 bize ulaşabilirsiniz</p>
            <a
              href="tel:08501234567"
              className="mt-2 block text-sm font-semibold text-[#E02424]"
            >
              0850 123 45 67
            </a>
          </div>
        </div>
      </aside>
    </>
  );
}
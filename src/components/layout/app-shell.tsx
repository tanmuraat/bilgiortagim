"use client";

import type { Profile } from "@/types/database";

import { Sidebar } from "./sidebar";
import { SidebarProvider } from "./sidebar-context";

type AppShellProps = {
  children: React.ReactNode;
  unreadNotifications: number;
};

export function AppShell({ children, unreadNotifications }: AppShellProps) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-[#0A0A0A]">
        <Sidebar unreadNotifications={unreadNotifications} />
        <div className="flex min-w-0 flex-1 flex-col">{children}</div>
      </div>
    </SidebarProvider>
  );
}

export type AppProfile = Pick<Profile, "company_name" | "full_name"> | null;

import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Bell,
  Calendar,
  Car,
  FileText,
  LayoutDashboard,
  Search,
  Settings,
  TrendingUp,
  Wallet,
} from "lucide-react";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  premium?: boolean;
  children?: { title: string; href: string }[];
};

export const mainNavItems: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Müşteri Sorgulama", href: "/musteri-sorgulama", icon: Search },
  {
    title: "Kiralama Takvimi",
    href: "/kiralama-takvimi",
    icon: Calendar,
    premium: true,
  },
  { title: "Araçlarım", href: "/araclarim", icon: Car },
  {
    title: "Mini Muhasebe",
    href: "/mini-muhasebe",
    icon: Wallet,
    premium: true,
    children: [
      { title: "Gelirler", href: "/mini-muhasebe/gelirler" },
      { title: "Giderler", href: "/mini-muhasebe/giderler" },
      { title: "Kâr Analizi", href: "/mini-muhasebe/kar-analizi" },
    ],
  },
  { title: "Raporlar", href: "/raporlar", icon: FileText },
  { title: "Bildirimler", href: "/bildirimler", icon: Bell },
  { title: "Ayarlar", href: "/ayarlar", icon: Settings },
];

export const miniMuhasebeIcons = {
  gelirler: BarChart3,
  giderler: Wallet,
  kar: TrendingUp,
};

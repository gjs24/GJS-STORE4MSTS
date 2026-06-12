"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  Bell,
  ChevronLeft,
  ChevronRight,
  Gauge,
  Gift,
  History,
  Image,
  Layers,
  Mail,
  Megaphone,
  Menu,
  Moon,
  Package,
  PanelLeftClose,
  Search,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Star,
  Tags,
  TrainFront,
  Users,
  X,
  type LucideIcon
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SidebarItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

type SidebarSection = {
  title: string;
  items: SidebarItem[];
};

const sections: SidebarSection[] = [
  {
    title: "MAIN",
    items: [
      { label: "Dashboard", href: "/admin-dashboard", icon: Gauge },
      { label: "Assets", href: "/admin-dashboard/assets", icon: Package },
      { label: "Categories", href: "/admin-dashboard/assets", icon: Layers },
      { label: "Orders", href: "/admin-dashboard/orders", icon: ShoppingCart },
      { label: "Users", href: "/admin-dashboard/users", icon: Users },
      { label: "Reviews", href: "/admin-dashboard/reviews", icon: Star },
      { label: "Downloads", href: "/admin-dashboard/downloads", icon: ChevronRight }
    ]
  },
  {
    title: "STORE",
    items: [
      { label: "Free Assets", href: "/admin-dashboard/assets?type=free", icon: Gift },
      { label: "Premium Assets", href: "/admin-dashboard/assets?type=premium", icon: ShieldCheck },
      { label: "Featured Assets", href: "/admin-dashboard/assets?featured=true", icon: Sparkles },
      { label: "Update Logs", href: "/admin-dashboard/settings", icon: History }
    ]
  },
  {
    title: "MARKETING",
    items: [
      { label: "Coupons", href: "/admin-dashboard/settings", icon: Tags },
      { label: "Banners", href: "/admin-dashboard/settings", icon: Image },
      { label: "Announcements", href: "/admin-dashboard/settings", icon: Megaphone }
    ]
  },
  {
    title: "SYSTEM",
    items: [
      { label: "Settings", href: "/admin-dashboard/settings", icon: Settings },
      { label: "Payments", href: "/admin-dashboard/settings", icon: ShieldCheck },
      { label: "Email Templates", href: "/admin-dashboard/settings", icon: Mail },
      { label: "Activity Logs", href: "/admin-dashboard/activity-logs", icon: History }
    ]
  }
];

function SidebarContent({ collapsed, closeMobile }: { collapsed: boolean; closeMobile?: () => void }) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-20 items-center gap-3 border-b border-white/10 px-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-rail-red to-rail-amber red-glow">
          <TrainFront size={25} />
        </div>
        {!collapsed ? (
          <div className="min-w-0">
            <p className="truncate text-sm font-black uppercase tracking-wide text-white">GJS PRODUCTION</p>
            <p className="truncate text-xs text-slate-400">MSTS-GJS Store Admin</p>
          </div>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
        {sections.map((section) => (
          <div key={section.title} className="mb-5">
            {!collapsed ? <p className="mb-2 px-3 text-[11px] font-bold tracking-[0.2em] text-slate-500">{section.title}</p> : null}
            <div className="space-y-1">
              {section.items.map((item) => {
                const active = pathname === item.href.split("?")[0];
                return (
                  <Link
                    key={`${section.title}-${item.label}`}
                    href={item.href}
                    onClick={closeMobile}
                    className={cn(
                      "group flex items-center gap-3 rounded px-3 py-2.5 text-sm font-semibold transition",
                      active ? "bg-rail-red text-white red-glow" : "text-slate-400 hover:bg-white/8 hover:text-white"
                    )}
                    title={collapsed ? item.label : undefined}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    {!collapsed ? <span className="truncate">{item.label}</span> : null}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {!collapsed ? (
        <div className="m-3 rounded-lg border border-rail-red/25 bg-rail-red/10 p-4">
          <p className="text-sm font-bold">RailForge Control</p>
          <p className="mt-1 text-xs leading-5 text-slate-400">Premium marketplace operations for trains, routes, sounds, and updates.</p>
        </div>
      ) : null}
    </div>
  );
}

export function PremiumAdminLayout({ title, children }: { title: string; children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <section className="admin-rail-bg relative min-h-screen overflow-hidden text-white">
      <div className="animated-rail-layer pointer-events-none absolute inset-0 admin-grid-bg opacity-55" />
      <div className="pointer-events-none absolute left-0 top-0 h-48 w-full bg-gradient-to-b from-white/6 to-transparent" />

      <aside className={cn("fixed left-0 top-0 z-40 hidden h-screen border-r border-white/10 bg-black/35 backdrop-blur-xl transition-all lg:block", collapsed ? "w-20" : "w-72")}>
        <SidebarContent collapsed={collapsed} />
        <Button
          variant="secondary"
          size="icon"
          onClick={() => setCollapsed((value) => !value)}
          className="absolute -right-5 top-24 h-10 w-10 rounded-full"
          title="Collapse sidebar"
        >
          {collapsed ? <ChevronRight size={16} /> : <PanelLeftClose size={16} />}
        </Button>
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button className="absolute inset-0 bg-black/70" onClick={() => setMobileOpen(false)} aria-label="Close mobile menu" />
          <motion.aside initial={{ x: -320 }} animate={{ x: 0 }} className="relative h-full w-80 border-r border-white/10 bg-rail-black/95 backdrop-blur-xl">
            <Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)} className="absolute right-3 top-3">
              <X size={18} />
            </Button>
            <SidebarContent collapsed={false} closeMobile={() => setMobileOpen(false)} />
          </motion.aside>
        </div>
      ) : null}

      <div className={cn("relative z-10 min-h-screen transition-all", collapsed ? "lg:pl-20" : "lg:pl-72")}>
        <header className="sticky top-0 z-30 border-b border-white/10 bg-rail-black/65 backdrop-blur-xl">
          <div className="flex h-20 items-center justify-between gap-4 px-4 md:px-6">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => setMobileOpen(true)} className="lg:hidden">
                <Menu size={20} />
              </Button>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-rail-amber">GJS PRODUCTION - MSTS-GJS Store Admin</p>
                <h1 className="text-xl font-black md:text-2xl">{title}</h1>
              </div>
            </div>

            <div className="hidden min-w-0 max-w-xl flex-1 items-center gap-3 rounded-lg border border-white/10 bg-white/[0.06] px-4 py-3 md:flex">
              <Search className="h-4 w-4 text-slate-500" />
              <input className="w-full bg-transparent text-sm outline-none placeholder:text-slate-500" placeholder="Search assets, users, orders, downloads..." />
            </div>

            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" title="Dark mode">
                <Moon size={18} />
              </Button>
              <Button variant="ghost" size="icon" title="Notifications" className="relative">
                <Bell size={18} />
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-rail-red" />
              </Button>
              <div className="hidden items-center gap-3 rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2 sm:flex">
                <div className="flex h-9 w-9 items-center justify-center rounded bg-gradient-to-br from-rail-red to-rail-amber text-sm font-black">GJ</div>
                <div>
                  <p className="text-sm font-bold">Admin</p>
                  <p className="text-xs text-slate-500">Store Manager</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="p-4 md:p-6">{children}</main>
      </div>
    </section>
  );
}

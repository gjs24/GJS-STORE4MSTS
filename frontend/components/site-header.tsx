"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Heart,
  HelpCircle,
  Home,
  LayoutDashboard,
  LayoutGrid,
  Menu,
  Package,
  Search,
  TrainFront,
  X
} from "lucide-react";
import { AuthNav } from "@/components/auth-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { AdminNotification } from "@/components/admin-notification";

const navItems = [
  { label: "Home", href: "/", icon: Home },
  { label: "Assets", href: "/assets", icon: Package },
  { label: "Categories", href: "/categories", icon: LayoutGrid },
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Support", href: "/contact", icon: HelpCircle }
];

export function SiteHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-rail-black/85 backdrop-blur-xl transition-colors">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3">
        {/* Brand Logo */}
        <Link href="/" className="group flex items-center gap-2.5 sm:gap-3 focus:outline-none">
          <span className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-rail-red text-white shadow-glow transition-transform duration-300 group-hover:scale-105">
            <TrainFront size={20} className="sm:size-[22px]" />
          </span>
          <span className="leading-tight">
            <span className="block text-xs sm:text-sm font-black uppercase tracking-wider text-white transition-colors group-hover:text-rail-amber">
              GJS Production
            </span>
            <span className="block text-[10px] sm:text-xs font-medium text-slate-400">MSTS & Open Rails</span>
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-1 text-sm md:flex lg:gap-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative rounded-md px-3 py-1.5 font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-white/[0.08] text-white shadow-inner"
                    : "text-slate-300 hover:bg-white/[0.04] hover:text-white"
                }`}
              >
                {item.label}
                {isActive && (
                  <span className="absolute bottom-0 left-1/2 h-0.5 w-4 -translate-x-1/2 rounded-full bg-rail-red shadow-[0_0_8px_rgba(239,59,45,0.8)]" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Actions / Right Bar */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <ThemeToggle />
          <AdminNotification />

          <Link
            aria-label="Search assets"
            href="/assets"
            className="rounded-lg border border-white/10 p-2 text-slate-300 transition-colors hover:border-white/20 hover:bg-white/5 hover:text-white"
          >
            <Search size={18} />
          </Link>

          <Link
            aria-label="Wishlist"
            href="/wishlist"
            className="rounded-lg border border-white/10 p-2 text-slate-300 transition-colors hover:border-white/20 hover:bg-white/5 hover:text-white"
          >
            <Heart size={18} />
          </Link>

          <div className="hidden sm:block">
            <AuthNav />
          </div>

          <button
            type="button"
            aria-label="Toggle navigation menu"
            onClick={() => setMobileOpen((prev) => !prev)}
            className="rounded-lg border border-white/10 p-2 text-slate-300 transition-colors hover:border-white/20 hover:bg-white/5 hover:text-white md:hidden"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileOpen && (
        <div className="animate-in fade-in slide-in-from-top-2 duration-200 border-t border-white/10 bg-rail-black/95 px-4 py-4 backdrop-blur-2xl md:hidden">
          <nav className="flex flex-col gap-1.5 text-sm">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 font-medium transition-colors ${
                    isActive
                      ? "border-l-2 border-rail-red bg-white/[0.08] text-white pl-3.5"
                      : "text-slate-300 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <Icon size={18} className={isActive ? "text-rail-amber" : "text-slate-400"} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-4 border-t border-white/10 pt-4 sm:hidden">
            <AuthNav />
          </div>
        </div>
      )}
    </header>
  );
}


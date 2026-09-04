"use client";

import { useState } from "react";
import Link from "next/link";
import { Heart, Menu, Search, TrainFront, X } from "lucide-react";
import { AuthNav } from "@/components/auth-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { AdminNotification } from "@/components/admin-notification";

const links = [
  ["Home", "/"],
  ["Assets", "/assets"],
  ["Categories", "/categories"],
  ["Dashboard", "/dashboard"],
  ["Support", "/contact"]
];

export function SiteHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-rail-black/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded bg-rail-red shadow-glow">
            <TrainFront size={22} />
          </span>
          <span>
            <span className="block text-sm font-semibold uppercase tracking-wide text-white">GJS Production</span>
            <span className="block text-xs text-slate-400">MSTS-GJS Store</span>
          </span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-slate-300 md:flex">
          {links.map(([label, href]) => (
            <Link key={href} href={href} className="hover:text-white transition-colors">
              {label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <AdminNotification />
          <Link aria-label="Search assets" href="/assets" className="rounded border border-white/10 p-2 text-slate-300 hover:text-white transition-colors">
            <Search size={18} />
          </Link>
          <Link aria-label="Wishlist" href="/wishlist" className="rounded border border-white/10 p-2 text-slate-300 hover:text-white transition-colors">
            <Heart size={18} />
          </Link>
          <div className="hidden sm:block">
            <AuthNav />
          </div>
          <button
            type="button"
            aria-label="Toggle navigation menu"
            onClick={() => setMobileOpen((prev) => !prev)}
            className="rounded border border-white/10 p-2 text-slate-300 hover:text-white md:hidden"
          >
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-white/10 bg-rail-black/95 px-4 py-4 md:hidden">
          <nav className="flex flex-col gap-3 text-sm text-slate-200">
            {links.map(([label, href]) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className="rounded px-3 py-2 transition-colors hover:bg-white/5 hover:text-white"
              >
                {label}
              </Link>
            ))}
          </nav>
          <div className="mt-4 border-t border-white/10 pt-4 sm:hidden">
            <AuthNav />
          </div>
        </div>
      )}
    </header>
  );
}

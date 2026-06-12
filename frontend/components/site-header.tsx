import Link from "next/link";
import { Heart, Search, TrainFront } from "lucide-react";
import { AuthNav } from "@/components/auth-nav";
import { ThemeToggle } from "@/components/theme-toggle";

const links = [
  ["Home", "/"],
  ["Assets", "/assets"],
  ["Categories", "/categories"],
  ["Dashboard", "/dashboard"],
  ["Support", "/contact"]
];

export function SiteHeader() {
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
            <Link key={href} href={href} className="hover:text-white">
              {label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link aria-label="Search assets" href="/assets" className="rounded border border-white/10 p-2 text-slate-300 hover:text-white">
            <Search size={18} />
          </Link>
          <Link aria-label="Wishlist" href="/wishlist" className="rounded border border-white/10 p-2 text-slate-300 hover:text-white">
            <Heart size={18} />
          </Link>
          <AuthNav />
        </div>
      </div>
    </header>
  );
}

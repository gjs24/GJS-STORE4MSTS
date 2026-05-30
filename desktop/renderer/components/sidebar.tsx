"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Download, Gamepad2, HardDrive, Home, Info, Settings, ShoppingBag, TrainFront, type LucideIcon } from "lucide-react";

const links: Array<[string, string, LucideIcon]> = [
  ["Home", "/", Home],
  ["Asset Store", "/store", ShoppingBag],
  ["Installed", "/installed", HardDrive],
  ["Downloads", "/downloads", Download],
  ["Settings", "/settings", Settings],
  ["About", "/about", Info]
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="flex h-screen w-72 shrink-0 flex-col border-r border-white/10 bg-black/35">
      <div className="drag-region flex h-16 items-center gap-3 border-b border-white/10 px-5">
        <span className="flex h-10 w-10 items-center justify-center rounded bg-forge-red shadow-heat">
          <TrainFront size={22} />
        </span>
        <div>
          <p className="text-sm font-black uppercase tracking-wide">GJS RailForge</p>
          <p className="text-xs text-slate-400">Launcher</p>
        </div>
      </div>
      <nav className="no-drag flex-1 space-y-1 p-4">
        {links.map(([label, href, Icon]) => {
          const active = pathname === href;
          return (
            <Link key={href} href={href} className={`flex items-center gap-3 rounded px-4 py-3 text-sm font-semibold ${active ? "bg-forge-red text-white" : "text-slate-300 hover:bg-white/10 hover:text-white"}`}>
              <Icon size={18} /> {label}
            </Link>
          );
        })}
      </nav>
      <div className="m-4 rounded border border-white/10 bg-white/[0.04] p-4">
        <Gamepad2 className="mb-3 text-forge-amber" />
        <p className="text-sm font-semibold">Ready for MSTS and Open Rails</p>
        <p className="mt-1 text-xs text-slate-400">Downloads, install cache, updates, and dependency support.</p>
      </div>
    </aside>
  );
}

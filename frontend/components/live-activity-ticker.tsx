"use client";

import { useEffect, useState } from "react";
import { Flame, ShieldCheck, Sparkles, TrendingUp, Zap } from "lucide-react";

const BUZZ_ITEMS = [
  {
    icon: Flame,
    color: "text-rail-amber",
    text: "🔥 Over 240+ Indian Railway addon packages downloaded this week!",
  },
  {
    icon: Zap,
    color: "text-amber-400",
    text: "⚡ Instant UPI & Netbanking checkout with direct high-speed download links",
  },
  {
    icon: Sparkles,
    color: "text-purple-400",
    text: "⭐ VIP Loyalty Program: Previous product owners receive exclusive early access & discounts",
  },
  {
    icon: ShieldCheck,
    color: "text-emerald-400",
    text: "🛡️ 100% Virus-free & verified Open Rails and MSTS physics on every release",
  },
  {
    icon: TrendingUp,
    color: "text-cyan-400",
    text: "🚀 Authentic 3-Phase AC traction motor sounds, custom cab views & accurate liveries",
  },
];

export function LiveActivityTicker() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % BUZZ_ITEMS.length);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  const current = BUZZ_ITEMS[index];
  const Icon = current.icon;

  return (
    <div className="relative border-b border-white/10 bg-black/40 py-2.5 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <span className="flex h-2 w-2 relative shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <div className="flex items-center gap-2 transition-all duration-500 ease-in-out">
            <Icon size={14} className={current.color} />
            <span className="font-semibold text-slate-200 truncate sm:overflow-visible">
              {current.text}
            </span>
          </div>
        </div>

        <span className="hidden md:inline-flex items-center gap-1 font-mono text-[11px] text-slate-400">
          <span className="font-bold text-emerald-400">LIVE</span> COMMUNITY BUZZ
        </span>
      </div>
    </div>
  );
}

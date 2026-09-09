"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Sparkles, X } from "lucide-react";
import type { SiteSettings } from "@/lib/api";

function getThemeStyles(type?: string) {
  switch (type) {
    case "DIWALI":
      return {
        bg: "bg-gradient-to-r from-[#2a1303] via-[#4d2507] to-[#2a1303]",
        border: "border-amber-500/40",
        badgeBg: "bg-amber-500/20 text-amber-300 border-amber-400/40",
        buttonClass: "bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 hover:brightness-110",
        defaultEmoji: "🪔",
      };
    case "PONGAL":
      return {
        bg: "bg-gradient-to-r from-[#0f2413] via-[#332205] to-[#122817]",
        border: "border-yellow-500/40",
        badgeBg: "bg-yellow-500/20 text-yellow-300 border-yellow-400/40",
        buttonClass: "bg-gradient-to-r from-yellow-400 to-amber-500 text-slate-950 hover:brightness-110",
        defaultEmoji: "🌾",
      };
    case "CHRISTMAS":
      return {
        bg: "bg-gradient-to-r from-[#2e090f] via-[#102917] to-[#2e090f]",
        border: "border-rose-500/40",
        badgeBg: "bg-rose-500/20 text-rose-300 border-rose-400/40",
        buttonClass: "bg-gradient-to-r from-rose-500 to-red-600 text-white hover:brightness-110",
        defaultEmoji: "🎄",
      };
    case "NEW_YEAR":
      return {
        bg: "bg-gradient-to-r from-[#0d1330] via-[#221035] to-[#0c182c]",
        border: "border-cyan-500/40",
        badgeBg: "bg-cyan-500/20 text-cyan-300 border-cyan-400/40",
        buttonClass: "bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 hover:brightness-110",
        defaultEmoji: "🎆",
      };
    case "INDEPENDENCE_DAY":
      return {
        bg: "bg-gradient-to-r from-[#331805] via-[#091524] to-[#092613]",
        border: "border-orange-500/40",
        badgeBg: "bg-orange-500/20 text-orange-300 border-orange-400/40",
        buttonClass: "bg-gradient-to-r from-orange-500 via-amber-400 to-emerald-500 text-slate-950 font-black hover:brightness-110",
        defaultEmoji: "🇮🇳",
      };
    case "CUSTOM":
      return {
        bg: "bg-gradient-to-r from-slate-950 via-[#181a24] to-slate-950",
        border: "border-purple-500/40",
        badgeBg: "bg-purple-500/20 text-purple-300 border-purple-400/40",
        buttonClass: "bg-gradient-to-r from-purple-500 to-indigo-500 text-white hover:brightness-110",
        defaultEmoji: "✨",
      };
    case "ANNIVERSARY":
    default:
      return {
        bg: "bg-gradient-to-r from-[#2c1a04] via-[#472d07] to-[#2c1a04]",
        border: "border-amber-400/50 shadow-[0_0_25px_rgba(245,158,11,0.15)]",
        badgeBg: "bg-amber-400/20 text-amber-200 border-amber-400/40",
        buttonClass: "bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-slate-950 font-black hover:brightness-110 shadow-lg shadow-amber-500/20",
        defaultEmoji: "🎉",
      };
  }
}

export function FestivalThemeBanner({ settings }: { settings?: SiteSettings | null }) {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      sessionStorage.removeItem("gjs_festival_dismissed");
    } catch {
      // ignore
    }
  }, []);

  if (!settings || !settings.festival_theme_enabled || !settings.festival_announcement_bar) {
    return null;
  }

  const themeStyle = getThemeStyles(settings.festival_theme_type);
  const title = settings.festival_title || "🎉 Celebrating 1 Year of MSTS-GJS Production Store!";
  const badge = settings.festival_badge || "1st Year Anniversary";
  const buttonText = settings.festival_button_text || "Explore Anniversary Specials";
  const buttonUrl = settings.festival_button_url || "/assets";
  const discount = settings.festival_discount_percent ? Number(settings.festival_discount_percent) : 0;

  // When collapsed, show a subtle compact ribbon so users can easily click to re-open
  // And whenever the page is refreshed, the full banner is automatically shown again
  if (dismissed) {
    return (
      <div className="relative z-40 border-b border-amber-500/20 bg-black/60 px-4 py-1 text-center backdrop-blur-md">
        <button
          type="button"
          onClick={() => setDismissed(false)}
          className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-0.5 text-[11px] font-semibold text-amber-300 transition hover:bg-amber-400/20 hover:text-white"
        >
          <span>{themeStyle.defaultEmoji}</span>
          <span>{badge}</span>
          <span className="text-slate-400">• Click to show celebration announcement</span>
        </button>
      </div>
    );
  }

  return (
    <div
      role="banner"
      className={`relative z-40 border-b ${themeStyle.border} ${themeStyle.bg} px-4 py-2.5 backdrop-blur-xl transition-all duration-300`}
    >
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 text-xs">
        {/* Left: Badge, Emoji & Message */}
        <div className="flex flex-1 flex-wrap items-center gap-2 sm:gap-3">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-black uppercase tracking-wider text-[10px] sm:text-[11px] ${themeStyle.badgeBg}`}
          >
            <Sparkles size={12} className="animate-spin duration-1000" />
            <span>{badge}</span>
          </span>

          <span className="text-base sm:text-lg select-none">{themeStyle.defaultEmoji}</span>

          <p className="font-bold text-white text-xs sm:text-sm max-w-3xl leading-snug">
            {title}
            {discount > 0 ? (
              <span className="ml-2 inline-block rounded bg-emerald-500/20 border border-emerald-400/40 px-2 py-0.5 text-[11px] font-extrabold text-emerald-300">
                🏷️ {discount}% Festive Offer
              </span>
            ) : null}
          </p>
        </div>

        {/* Right: CTA Button & Dismiss */}
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href={buttonUrl}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all duration-150 ${themeStyle.buttonClass}`}
          >
            <span>{buttonText}</span>
            <ArrowRight size={13} />
          </Link>

          <button
            type="button"
            onClick={() => setDismissed(true)}
            aria-label="Collapse celebration announcement"
            title="Collapse banner (you can re-open it or refresh the page anytime)"
            className="rounded p-1 text-slate-400 hover:bg-white/10 hover:text-white transition"
          >
            <X size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}

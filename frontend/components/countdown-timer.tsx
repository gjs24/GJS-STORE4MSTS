"use client";

import { useEffect, useState } from "react";
import { Clock, Flame, Rocket, Sparkles, Timer } from "lucide-react";
import type { Asset } from "@/lib/api";

export type CountdownTheme = "cyan" | "emerald" | "amber" | "purple" | "red";
export type CountdownVariant = "banner" | "card" | "inline";
export type CountdownIcon = "clock" | "flame" | "rocket" | "sparkles" | "timer";

interface CountdownTimerProps {
  startDate?: string | null;
  endDate?: string | null;
  startLabel?: string;
  endLabel?: string;
  completedLabel?: string;
  hideWhenCompleted?: boolean;
  variant?: CountdownVariant;
  theme?: CountdownTheme;
  icon?: CountdownIcon;
}

function pad2(n: number) {
  return String(Math.max(0, Math.floor(n))).padStart(2, "0");
}

function getBreakdown(diffMs: number) {
  const totalSeconds = Math.max(0, Math.floor(diffMs / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return { days, hours, minutes, seconds, totalSeconds };
}

function renderIcon(icon: CountdownIcon, size = 16, className = "") {
  switch (icon) {
    case "flame":
      return <Flame size={size} className={className} />;
    case "rocket":
      return <Rocket size={size} className={className} />;
    case "sparkles":
      return <Sparkles size={size} className={className} />;
    case "timer":
      return <Timer size={size} className={className} />;
    default:
      return <Clock size={size} className={className} />;
  }
}

const themeClasses: Record<
  CountdownTheme,
  {
    wrapper: string;
    box: string;
    label: string;
    num: string;
    unit: string;
    badge: string;
    icon: string;
  }
> = {
  cyan: {
    wrapper: "border-cyan-400/40 bg-gradient-to-r from-cyan-950/70 via-slate-900/80 to-cyan-950/50 text-cyan-100",
    box: "border-cyan-400/30 bg-black/60",
    label: "text-cyan-300",
    num: "text-cyan-200",
    unit: "text-cyan-400/80",
    badge: "bg-cyan-500/20 border-cyan-400/40 text-cyan-200",
    icon: "text-cyan-400"
  },
  emerald: {
    wrapper: "border-emerald-400/40 bg-gradient-to-r from-emerald-950/70 via-slate-900/80 to-emerald-950/50 text-emerald-100",
    box: "border-emerald-400/30 bg-black/60",
    label: "text-emerald-300",
    num: "text-emerald-200",
    unit: "text-emerald-400/80",
    badge: "bg-emerald-500/20 border-emerald-400/40 text-emerald-200",
    icon: "text-emerald-400"
  },
  amber: {
    wrapper: "border-amber-400/40 bg-gradient-to-r from-amber-950/70 via-slate-900/80 to-amber-950/50 text-amber-100",
    box: "border-amber-400/30 bg-black/60",
    label: "text-amber-300",
    num: "text-amber-200",
    unit: "text-amber-400/80",
    badge: "bg-amber-500/20 border-amber-400/40 text-amber-200",
    icon: "text-amber-400"
  },
  purple: {
    wrapper: "border-purple-400/40 bg-gradient-to-r from-purple-950/70 via-slate-900/80 to-purple-950/50 text-purple-100",
    box: "border-purple-400/30 bg-black/60",
    label: "text-purple-300",
    num: "text-purple-200",
    unit: "text-purple-400/80",
    badge: "bg-purple-500/20 border-purple-400/40 text-purple-200",
    icon: "text-purple-400"
  },
  red: {
    wrapper: "border-red-400/40 bg-gradient-to-r from-red-950/70 via-slate-900/80 to-red-950/50 text-red-100",
    box: "border-red-400/30 bg-black/60",
    label: "text-red-300",
    num: "text-red-200",
    unit: "text-red-400/80",
    badge: "bg-red-500/20 border-red-400/40 text-red-200",
    icon: "text-red-400"
  }
};

export function CountdownTimer({
  startDate,
  endDate,
  startLabel = "Starts In",
  endLabel = "Ends In",
  completedLabel = "Ended",
  hideWhenCompleted = false,
  variant = "banner",
  theme = "cyan",
  icon = "clock"
}: CountdownTimerProps) {
  const [nowMs, setNowMs] = useState<number | null>(null);

  useEffect(() => {
    setNowMs(Date.now());
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (nowMs === null) {
    return null;
  }

  const startMs = startDate ? new Date(startDate).getTime() : NaN;
  const endMs = endDate ? new Date(endDate).getTime() : NaN;
  const hasStart = !Number.isNaN(startMs);
  const hasEnd = !Number.isNaN(endMs);

  if (!hasStart && !hasEnd) {
    return null;
  }

  let activeLabel = endLabel;
  let targetMs = endMs;
  let isCompleted = false;

  if (hasStart && nowMs < startMs) {
    activeLabel = startLabel;
    targetMs = startMs;
  } else if (hasEnd) {
    if (nowMs < endMs) {
      activeLabel = endLabel;
      targetMs = endMs;
    } else {
      isCompleted = true;
    }
  } else {
    // Only startDate was provided and it has now passed
    isCompleted = true;
  }

  if (isCompleted && hideWhenCompleted) {
    return null;
  }

  const palette = themeClasses[theme] || themeClasses.cyan;

  if (isCompleted) {
    if (variant === "card" || variant === "inline") {
      return (
        <div className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-bold ${palette.badge}`}>
          {renderIcon(icon, 12, palette.icon)}
          <span>{completedLabel}</span>
        </div>
      );
    }
    return (
      <div className={`flex items-center gap-2 rounded-lg border px-3.5 py-2.5 text-xs font-bold ${palette.wrapper}`}>
        {renderIcon(icon, 16, palette.icon)}
        <span>{completedLabel}</span>
      </div>
    );
  }

  const { days, hours, minutes, seconds } = getBreakdown(targetMs - nowMs);

  if (variant === "card") {
    return (
      <div className={`flex items-center justify-between gap-2 rounded-lg border px-2.5 py-1.5 text-[11px] shadow-sm ${palette.wrapper}`}>
        <span className={`flex items-center gap-1 font-bold uppercase tracking-wide truncate ${palette.label}`}>
          {renderIcon(icon, 12, `${palette.icon} shrink-0 animate-pulse`)}
          <span className="truncate">{activeLabel}</span>
        </span>
        <span className={`font-mono font-black tracking-tight shrink-0 ${palette.num}`}>
          {days > 0 ? `${days}d ` : ""}
          {pad2(hours)}h : {pad2(minutes)}m : {pad2(seconds)}s
        </span>
      </div>
    );
  }

  if (variant === "inline") {
    return (
      <div className={`inline-flex flex-wrap items-center gap-2 rounded-lg border px-3 py-1.5 text-xs shadow-sm ${palette.wrapper}`}>
        <span className={`flex items-center gap-1.5 font-bold uppercase tracking-wider ${palette.label}`}>
          {renderIcon(icon, 14, `${palette.icon} animate-pulse`)}
          <span>{activeLabel}:</span>
        </span>
        <span className={`font-mono font-black tracking-wide ${palette.num}`}>
          {days > 0 ? `${days}d ` : ""}
          {pad2(hours)}h {pad2(minutes)}m {pad2(seconds)}s
        </span>
      </div>
    );
  }

  return (
    <div className={`rounded-xl border p-3.5 shadow-md ${palette.wrapper}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${palette.box}`}>
            {renderIcon(icon, 16, `${palette.icon} animate-pulse`)}
          </div>
          <div>
            <p className={`text-xs font-black uppercase tracking-wider ${palette.label}`}>{activeLabel}</p>
            <p className="text-[11px] text-slate-300">
              {new Date(targetMs).toLocaleString("en-IN", {
                dateStyle: "medium",
                timeStyle: "short"
              })}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-1.5 sm:gap-2 text-center">
          <div className={`rounded-lg border px-2.5 py-1.5 min-w-[52px] ${palette.box}`}>
            <p className={`font-mono text-base sm:text-lg font-black leading-none ${palette.num}`}>{pad2(days)}</p>
            <p className={`mt-1 text-[9px] font-bold uppercase tracking-wider ${palette.unit}`}>Days</p>
          </div>
          <div className={`rounded-lg border px-2.5 py-1.5 min-w-[52px] ${palette.box}`}>
            <p className={`font-mono text-base sm:text-lg font-black leading-none ${palette.num}`}>{pad2(hours)}</p>
            <p className={`mt-1 text-[9px] font-bold uppercase tracking-wider ${palette.unit}`}>Hrs</p>
          </div>
          <div className={`rounded-lg border px-2.5 py-1.5 min-w-[52px] ${palette.box}`}>
            <p className={`font-mono text-base sm:text-lg font-black leading-none ${palette.num}`}>{pad2(minutes)}</p>
            <p className={`mt-1 text-[9px] font-bold uppercase tracking-wider ${palette.unit}`}>Min</p>
          </div>
          <div className={`rounded-lg border px-2.5 py-1.5 min-w-[52px] ${palette.box}`}>
            <p className={`font-mono text-base sm:text-lg font-black leading-none ${palette.num}`}>{pad2(seconds)}</p>
            <p className={`mt-1 text-[9px] font-bold uppercase tracking-wider ${palette.unit}`}>Sec</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AssetCardTimer({ asset }: { asset: Asset }) {
  const [nowMs, setNowMs] = useState<number | null>(null);

  useEffect(() => {
    setNowMs(Date.now());
    const id = setInterval(() => setNowMs(Date.now()), 60000);
    return () => clearInterval(id);
  }, []);

  if (nowMs === null) return null;

  const pbStartMs = asset.prebooking_starts_at ? new Date(asset.prebooking_starts_at).getTime() : NaN;
  const pbEndMs = asset.prebooking_ends_at ? new Date(asset.prebooking_ends_at).getTime() : NaN;
  const releaseMs = asset.release_date ? new Date(asset.release_date).getTime() : NaN;
  const dealStartMs = asset.deal_starts_at ? new Date(asset.deal_starts_at).getTime() : NaN;
  const dealEndMs = asset.deal_ends_at ? new Date(asset.deal_ends_at).getTime() : NaN;

  // 1. Pre-booking start or close countdown
  if (asset.is_upcoming && asset.prebooking_enabled) {
    if (!Number.isNaN(pbStartMs) && nowMs < pbStartMs) {
      return (
        <CountdownTimer
          startDate={asset.prebooking_starts_at}
          startLabel="Pre-Book Opens"
          variant="card"
          theme="cyan"
          icon="timer"
          hideWhenCompleted
        />
      );
    }
    if (!Number.isNaN(pbEndMs) && nowMs < pbEndMs) {
      return (
        <CountdownTimer
          endDate={asset.prebooking_ends_at}
          endLabel="Pre-Book Ends"
          variant="card"
          theme="cyan"
          icon="timer"
          hideWhenCompleted
        />
      );
    }
  }

  // 2. Scheduled release countdown
  if (!Number.isNaN(releaseMs) && nowMs < releaseMs) {
    return (
      <CountdownTimer
        endDate={asset.release_date}
        endLabel="Releases In"
        variant="card"
        theme="amber"
        icon="rocket"
        hideWhenCompleted
      />
    );
  }

  // 3. Special Offer / Deal start or close countdown
  if (asset.deal_is_open && !asset.is_upcoming) {
    if (!Number.isNaN(dealStartMs) && nowMs < dealStartMs) {
      return (
        <CountdownTimer
          startDate={asset.deal_starts_at}
          startLabel="Offer Starts"
          variant="card"
          theme="emerald"
          icon="flame"
          hideWhenCompleted
        />
      );
    }
    if (!Number.isNaN(dealEndMs) && nowMs < dealEndMs) {
      return (
        <CountdownTimer
          endDate={asset.deal_ends_at}
          endLabel="Offer Ends"
          variant="card"
          theme="emerald"
          icon="flame"
          hideWhenCompleted
        />
      );
    }
  }

  return null;
}

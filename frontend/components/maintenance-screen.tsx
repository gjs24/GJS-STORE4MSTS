"use client";

import { useState } from "react";
import Link from "next/link";
import { Clock, Mail, MessageCircle, RefreshCw, Train, Wrench } from "lucide-react";

type MaintenanceScreenProps = {
  title?: string;
  message?: string;
  estimatedEnd?: string;
  isPreview?: boolean;
  onRefresh?: () => void;
};

export function MaintenanceScreen({
  title = "System Under Scheduled Maintenance",
  message = "We are currently upgrading server systems and performing essential depot maintenance. We'll be back online shortly!",
  estimatedEnd = "Expected to return shortly",
  isPreview = false,
  onRefresh,
}: MaintenanceScreenProps) {
  const [checking, setChecking] = useState(false);

  const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "gjs2721@gmail.com";
  const supportPhone = process.env.NEXT_PUBLIC_SUPPORT_PHONE || "+91-7845727002";
  const cleanPhone = supportPhone.replace(/[^0-9]/g, "");
  const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent("Hello MSTS-GJS Support, I am inquiring about the site maintenance.")}`;

  function handleCheck() {
    setChecking(true);
    if (onRefresh) {
      onRefresh();
      setTimeout(() => setChecking(false), 1000);
    } else {
      setTimeout(() => {
        window.location.reload();
      }, 800);
    }
  }

  return (
    <div className="relative min-h-[90vh] flex flex-col items-center justify-center px-4 py-12 text-center select-none">
      {/* Background Ambience Glow */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-96 w-96 rounded-full bg-rail-amber/10 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-40 left-1/2 -translate-x-1/2 h-96 w-96 rounded-full bg-rail-red/10 blur-[120px]" />

      {/* Preview Mode Alert Banner */}
      {isPreview && (
        <div className="mb-6 flex flex-wrap items-center justify-center gap-3 rounded-full border border-rail-amber/40 bg-rail-amber/10 px-5 py-2 text-xs font-semibold text-rail-amber backdrop-blur-md">
          <span className="flex h-2 w-2 rounded-full bg-rail-amber animate-ping" />
          <span>Testing Area: Maintenance Screen Live Preview</span>
          <Link
            href="/admin-dashboard/settings"
            className="rounded-full bg-rail-amber/20 px-3 py-0.5 text-[11px] font-bold text-white transition hover:bg-rail-amber/40"
          >
            ← Return to Settings
          </Link>
        </div>
      )}

      {/* Main Container Panel */}
      <div className="cinematic-panel relative z-10 mx-auto max-w-2xl w-full rounded-2xl border border-white/10 bg-rail-black/90 p-8 shadow-2xl backdrop-blur-2xl md:p-12">
        {/* Animated Railway Signal / Beacon */}
        <div className="relative mx-auto mb-6 flex h-20 w-20 items-center justify-center">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rail-amber/20 opacity-75" />
          <span className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-rail-amber/40 bg-rail-amber/10 text-rail-amber shadow-[0_0_30px_rgba(245,158,11,0.3)]">
            <Wrench size={32} className="animate-pulse" />
          </span>
        </div>

        {/* Status Chip */}
        <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-slate-300">
          <Train size={14} className="text-rail-amber" />
          <span>Depot Maintenance in Progress</span>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-black uppercase tracking-tight text-white sm:text-3xl md:text-4xl">
          {title}
        </h1>

        {/* Description Message */}
        <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-slate-300 md:text-base">
          {message}
        </p>

        {/* Estimated Completion Card */}
        {estimatedEnd && (
          <div className="mx-auto mt-6 flex max-w-md items-center justify-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-xs text-slate-300">
            <Clock size={16} className="text-rail-amber shrink-0" />
            <span>
              Status Window: <strong className="text-white font-semibold">{estimatedEnd}</strong>
            </span>
          </div>
        )}

        {/* Action Controls */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={handleCheck}
            disabled={checking}
            className="inline-flex items-center gap-2 rounded-lg bg-rail-red px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-white shadow-glow transition hover:bg-rail-red/90 disabled:opacity-50"
          >
            <RefreshCw size={14} className={checking ? "animate-spin" : ""} />
            {checking ? "Checking..." : "Check Status"}
          </button>

          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-xs font-semibold text-emerald-400 transition hover:bg-emerald-500/20"
          >
            <MessageCircle size={14} />
            WhatsApp Support
          </a>

          <a
            href={`mailto:${supportEmail}`}
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white"
          >
            <Mail size={14} />
            Email Us
          </a>
        </div>

        {/* Testing Mode Note */}
        {isPreview && (
          <div className="mt-6 rounded-lg border border-white/10 bg-black/40 p-3 text-xs text-slate-400">
            💡 This preview updates in real-time as you modify settings in the Admin Testing Depot.
          </div>
        )}
      </div>
    </div>
  );
}


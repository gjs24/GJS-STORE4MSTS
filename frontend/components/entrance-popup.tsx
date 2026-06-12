"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { fallbackSiteSettings, getSiteSettings, type SiteSettings } from "@/lib/api";

const STORAGE_KEY = "msts-gjs-popup-dismissed";

export function EntrancePopup() {
  const [settings, setSettings] = useState<SiteSettings>(fallbackSiteSettings);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    getSiteSettings().then((data) => {
      setSettings(data);
      const dismissed = sessionStorage.getItem(STORAGE_KEY);
      setOpen(Boolean(data.popup_enabled && data.popup_message && !dismissed));
    });
  }, []);

  function close() {
    sessionStorage.setItem(STORAGE_KEY, "1");
    setOpen(false);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
      <div className="cinematic-panel relative w-full max-w-lg rounded-lg border border-white/15 p-6 shadow-glow">
        <button
          type="button"
          onClick={close}
          className="absolute right-4 top-4 rounded border border-white/10 p-2 text-slate-300 hover:border-rail-red hover:text-white"
          aria-label="Close popup"
        >
          <X size={18} />
        </button>
        <p className="text-sm font-semibold uppercase text-rail-amber">Announcement</p>
        <h2 className="mt-3 pr-10 text-2xl font-black text-white">{settings.popup_title}</h2>
        <p className="mt-4 whitespace-pre-line text-sm leading-6 text-slate-300">{settings.popup_message}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href={settings.popup_button_url || "/assets"} onClick={close} className="rounded bg-rail-red px-4 py-2 font-semibold text-white">
            {settings.popup_button_text || "Browse assets"}
          </Link>
          <button type="button" onClick={close} className="rounded border border-white/15 px-4 py-2 font-semibold text-white">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

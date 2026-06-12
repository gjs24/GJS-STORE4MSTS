"use client";

import Link from "next/link";
import { Bell, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { fallbackSiteSettings, getSiteSettings, type SiteSettings } from "@/lib/api";

const SEEN_KEY = "msts-gjs-admin-message-seen";

export function AdminNotification() {
  const [settings, setSettings] = useState<SiteSettings>(fallbackSiteSettings);
  const [open, setOpen] = useState(false);
  const [seenMessage, setSeenMessage] = useState("");

  useEffect(() => {
    setSeenMessage(localStorage.getItem(SEEN_KEY) || "");
    getSiteSettings().then((data) => setSettings({ ...fallbackSiteSettings, ...data }));
  }, []);

  const notification = useMemo(() => {
    const message = settings.scroller_enabled && settings.scroller_message
      ? settings.scroller_message
      : settings.popup_enabled && settings.popup_message
        ? settings.popup_message
        : "";

    return {
      title: settings.popup_title || "Store announcement",
      message,
      buttonText: settings.popup_button_text || "View assets",
      buttonUrl: settings.popup_button_url || "/assets"
    };
  }, [settings]);

  const hasMessage = Boolean(notification.message);
  const unread = hasMessage && seenMessage !== notification.message;

  function toggleOpen() {
    const nextOpen = !open;
    setOpen(nextOpen);
    if (nextOpen && hasMessage) {
      localStorage.setItem(SEEN_KEY, notification.message);
      setSeenMessage(notification.message);
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={toggleOpen}
        className="relative rounded border border-white/10 p-2 text-slate-300 hover:text-white"
        aria-label="Admin notifications"
        title="Admin notifications"
      >
        <Bell size={18} />
        {unread ? <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-rail-red ring-2 ring-black" /> : null}
      </button>
      {open ? (
        <div className="absolute right-0 top-12 z-50 w-80 rounded-lg border border-white/10 bg-rail-black p-4 shadow-glow">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase text-rail-amber">Admin message</p>
              <h2 className="mt-1 font-semibold text-white">{hasMessage ? notification.title : "No message now"}</h2>
            </div>
            <button type="button" onClick={() => setOpen(false)} className="rounded border border-white/10 p-1 text-slate-400 hover:text-white" aria-label="Close notification">
              <X size={14} />
            </button>
          </div>
          <p className="mt-3 max-h-48 overflow-auto whitespace-pre-line text-sm leading-6 text-slate-300">
            {hasMessage ? notification.message : "There are no active announcements from admin."}
          </p>
          {hasMessage ? (
            <Link href={notification.buttonUrl} onClick={() => setOpen(false)} className="mt-4 inline-flex rounded bg-rail-red px-3 py-2 text-sm font-semibold text-white">
              {notification.buttonText}
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

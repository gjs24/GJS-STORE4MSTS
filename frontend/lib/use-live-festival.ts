"use client";

import { useEffect, useState } from "react";
import { API_URL, type SiteSettings } from "@/lib/api";

export function useLiveSiteSettings(initialSettings?: SiteSettings | null) {
  const [liveSettings, setLiveSettings] = useState<SiteSettings | null | undefined>(initialSettings);

  useEffect(() => {
    setLiveSettings(initialSettings);
  }, [initialSettings]);

  useEffect(() => {
    let active = true;

    async function refresh() {
      try {
        const res = await fetch(`${API_URL}/site-settings/`, { cache: "no-store" });
        if (!res.ok) return;
        const fresh: SiteSettings = await res.json();
        if (active) setLiveSettings(fresh);
      } catch {
        // Keep last known settings on transient network errors
      }
    }

    refresh();

    const interval = window.setInterval(() => {
      const now = Date.now();
      const endsAt = liveSettings?.festival_ends_at ? new Date(liveSettings.festival_ends_at).getTime() : NaN;
      const upcomingStarts = liveSettings?.upcoming_festival?.starts_at
        ? new Date(liveSettings.upcoming_festival.starts_at).getTime()
        : NaN;

      if (
        (liveSettings?.festival_theme_enabled && !Number.isNaN(endsAt) && now >= endsAt) ||
        (!liveSettings?.festival_theme_enabled && !Number.isNaN(upcomingStarts) && now >= upcomingStarts)
      ) {
        refresh();
      }
    }, 15000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [
    liveSettings?.festival_theme_enabled,
    liveSettings?.festival_ends_at,
    liveSettings?.upcoming_festival?.starts_at,
  ]);

  return liveSettings;
}

export function formatShortRemaining(endIso?: string | null, nowMs?: number): string {
  if (!endIso || !nowMs) return "";
  const diff = new Date(endIso).getTime() - nowMs;
  if (Number.isNaN(diff) || diff <= 0) return "";
  const totalSec = Math.floor(diff / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  if (days > 0) return `${days}d ${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h ${mins}m ${secs}s`;
  return `${mins}m ${secs}s`;
}


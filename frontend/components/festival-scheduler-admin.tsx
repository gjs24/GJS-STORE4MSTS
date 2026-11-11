"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import {
  CalendarClock,
  CheckCircle2,
  Edit3,
  PauseCircle,
  PlayCircle,
  Plus,
  Save,
  Search,
  Sparkles,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  adminDelete,
  adminGet,
  adminPatch,
  adminPost,
  formatDateTimeLocal,
  toIsoDateTimeOrEmpty,
} from "@/lib/admin-api";
import type { Asset, FestivalAssetPrice, FestivalSchedule } from "@/lib/api";

type ScheduleAssetDraft = {
  is_included: boolean;
  festival_price: string;
};

type ScheduleFormState = {
  name: string;
  is_active: boolean;
  starts_at_local: string;
  ends_at_local: string;
  priority: number;
  theme_type: string;
  title: string;
  subtitle: string;
  badge: string;
  button_text: string;
  button_url: string;
  effect: string;
  banner_image: string;
  discount_percent: number;
  apply_discount_to_prices: boolean;
  announcement_bar: boolean;
  popup_card: boolean;
};

const QUICK_THEME_PRESETS = [
  {
    id: "DIWALI",
    label: "🪔 Diwali",
    badge: "Diwali Special Offer",
    title: "🪔 Happy Diwali! Celebrate with GJS Festival Rail Offers",
    subtitle: "Light up your MSTS & Open Rails depot with festive pricing on locomotives and coach packs.",
    buttonText: "Shop Diwali Deals",
    effect: "diyas",
    discountPercent: 20,
  },
  {
    id: "PONGAL",
    label: "🌾 Pongal",
    badge: "Pongal Harvest Sale",
    title: "🌾 Happy Pongal! Special Southern Rail Celebration",
    subtitle: "Special festival prices unlocked for the Pongal celebration window.",
    buttonText: "Explore Pongal Offers",
    effect: "sparkles",
    discountPercent: 15,
  },
  {
    id: "CHRISTMAS",
    label: "🎄 Christmas",
    badge: "Christmas Rail Sale",
    title: "🎄 Merry Christmas! Winter Festival Express Sale",
    subtitle: "Limited-time Christmas holiday pricing on MSTS & Open Rails assets.",
    buttonText: "Explore Holiday Deals",
    effect: "snow",
    discountPercent: 25,
  },
  {
    id: "NEW_YEAR",
    label: "🎆 New Year",
    badge: "New Year Bash",
    title: "🎆 Happy New Year! Mega Rail Sale Now Live",
    subtitle: "Ring in the New Year with pre-defined festival pricing across top add-ons.",
    buttonText: "Shop New Year Sale",
    effect: "skyshots",
    discountPercent: 25,
  },
  {
    id: "ANNIVERSARY",
    label: "🎂 Anniversary",
    badge: "1st Year Anniversary",
    title: "🎉 Store Anniversary Special Offers Live!",
    subtitle: "Exclusive celebration discounts across the GJS Production Store.",
    buttonText: "Explore Specials",
    effect: "confetti",
    discountPercent: 15,
  },
  {
    id: "INDEPENDENCE_DAY",
    label: "🇮🇳 Independence Day",
    badge: "Freedom Rail Sale",
    title: "🇮🇳 Happy Independence Day! Patriotic Rail Specials",
    subtitle: "Celebrate Indian Railways heritage with limited-time festival offers.",
    buttonText: "View Deals",
    effect: "fireworks",
    discountPercent: 15,
  },
];

function emptyScheduleForm(): ScheduleFormState {
  const start = new Date();
  start.setMinutes(0, 0, 0);
  const end = new Date(start.getTime() + 3 * 24 * 60 * 60 * 1000);
  return {
    name: "",
    is_active: true,
    starts_at_local: formatDateTimeLocal(start.toISOString()),
    ends_at_local: formatDateTimeLocal(end.toISOString()),
    priority: 10,
    theme_type: "DIWALI",
    title: "🪔 Festival Special Sale is Live!",
    subtitle: "Limited-time festival celebration pricing across MSTS & Open Rails addons.",
    badge: "FESTIVAL SPECIAL",
    button_text: "Explore Festival Offers",
    button_url: "/assets",
    effect: "fireworks",
    banner_image: "",
    discount_percent: 20,
    apply_discount_to_prices: true,
    announcement_bar: true,
    popup_card: false,
  };
}

function statusBadgeVariant(label?: string): "success" | "warning" | "muted" | "default" {
  if (label === "live") return "success";
  if (label === "upcoming") return "warning";
  if (label === "paused") return "default";
  return "muted";
}

function formatReadableDt(iso?: string | null) {
  if (!iso) return "Not set";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

export function FestivalSchedulerSection({
  onStatus,
}: {
  onStatus: (status: { type: "success" | "error"; message: string } | null) => void;
}) {
  const [schedules, setSchedules] = useState<FestivalSchedule[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | "new" | null>(null);
  const [form, setForm] = useState<ScheduleFormState>(emptyScheduleForm());
  const [assetRows, setAssetRows] = useState<Record<number, ScheduleAssetDraft>>({});
  const [assetQuery, setAssetQuery] = useState("");

  async function loadAll() {
    setLoading(true);
    try {
      const [schedData, assetsData] = await Promise.all([
        adminGet<FestivalSchedule[]>("/admin/festivals/", []),
        adminGet<Asset[]>("/admin/assets/", []),
      ]);
      setSchedules(Array.isArray(schedData) ? schedData : []);
      setAssets(Array.isArray(assetsData) ? assetsData : []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  function buildDraftRows(existingPrices: FestivalAssetPrice[] = []) {
    const existingMap = new Map<number, FestivalAssetPrice>();
    existingPrices.forEach((ap) => existingMap.set(ap.asset, ap));
    const draft: Record<number, ScheduleAssetDraft> = {};
    assets.forEach((asset) => {
      const match = existingMap.get(asset.id);
      draft[asset.id] = {
        is_included: match ? match.is_included : true,
        festival_price:
          match && match.festival_price !== null && match.festival_price !== undefined
            ? String(match.festival_price)
            : "",
      };
    });
    return draft;
  }

  function startCreate() {
    setForm(emptyScheduleForm());
    setAssetRows(buildDraftRows([]));
    setAssetQuery("");
    setEditingId("new");
    onStatus(null);
  }

  function startEdit(schedule: FestivalSchedule) {
    setForm({
      name: schedule.name,
      is_active: schedule.is_active,
      starts_at_local: formatDateTimeLocal(schedule.starts_at),
      ends_at_local: formatDateTimeLocal(schedule.ends_at),
      priority: schedule.priority ?? 10,
      theme_type: schedule.theme_type || "DIWALI",
      title: schedule.title || "",
      subtitle: schedule.subtitle || "",
      badge: schedule.badge || "FESTIVAL SPECIAL",
      button_text: schedule.button_text || "Explore Store",
      button_url: schedule.button_url || "/assets",
      effect: schedule.effect || "none",
      banner_image: schedule.banner_image || "",
      discount_percent: Number(schedule.discount_percent || 0),
      apply_discount_to_prices: schedule.apply_discount_to_prices !== false,
      announcement_bar: schedule.announcement_bar !== false,
      popup_card: Boolean(schedule.popup_card),
    });
    setAssetRows(buildDraftRows(schedule.asset_prices || []));
    setAssetQuery("");
    setEditingId(schedule.id);
    onStatus(null);
  }

  function applyQuickPreset(presetId: string) {
    const preset = QUICK_THEME_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setForm((prev) => ({
      ...prev,
      name: prev.name || `${preset.label.replace(/^.+\s/, "")} Festival Sale`,
      theme_type: preset.id,
      badge: preset.badge,
      title: preset.title,
      subtitle: preset.subtitle,
      button_text: preset.buttonText,
      effect: preset.effect,
      discount_percent: preset.discountPercent,
    }));
  }

  function setQuickWindowDays(days: number) {
    const start = new Date();
    const end = new Date(start.getTime() + days * 24 * 60 * 60 * 1000);
    setForm((prev) => ({
      ...prev,
      starts_at_local: formatDateTimeLocal(start.toISOString()),
      ends_at_local: formatDateTimeLocal(end.toISOString()),
    }));
  }

  function updateAssetDraft(assetId: number, patch: Partial<ScheduleAssetDraft>) {
    setAssetRows((prev) => ({
      ...prev,
      [assetId]: {
        is_included: prev[assetId]?.is_included ?? true,
        festival_price: prev[assetId]?.festival_price ?? "",
        ...patch,
      },
    }));
  }

  function bulkSetInclusion(includeAll: boolean) {
    setAssetRows((prev) => {
      const next: Record<number, ScheduleAssetDraft> = {};
      assets.forEach((a) => {
        next[a.id] = {
          is_included: includeAll,
          festival_price: prev[a.id]?.festival_price ?? "",
        };
      });
      return next;
    });
  }

  function clearCustomPrices() {
    setAssetRows((prev) => {
      const next: Record<number, ScheduleAssetDraft> = {};
      assets.forEach((a) => {
        next[a.id] = {
          is_included: prev[a.id]?.is_included ?? true,
          festival_price: "",
        };
      });
      return next;
    });
  }

  const filteredAssets = useMemo(() => {
    const q = assetQuery.trim().toLowerCase();
    if (!q) return assets;
    return assets.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.category?.name?.toLowerCase().includes(q)
    );
  }, [assets, assetQuery]);

  async function handleSaveSchedule(e: FormEvent) {
    e.preventDefault();
    onStatus(null);
    if (!form.name.trim()) {
      onStatus({ type: "error", message: "Please enter a Campaign / Festival Name." });
      return;
    }
    if (!form.starts_at_local || !form.ends_at_local) {
      onStatus({ type: "error", message: "Both From Date & Time and End Date & Time are required." });
      return;
    }
    if (new Date(form.ends_at_local).getTime() <= new Date(form.starts_at_local).getTime()) {
      onStatus({ type: "error", message: "End Date & Time must be strictly after Start Date & Time." });
      return;
    }

    setSaving(true);
    try {
      const assetPricesPayload = assets.map((asset) => {
        const draft = assetRows[asset.id] || { is_included: true, festival_price: "" };
        const trimmed = draft.festival_price.trim();
        return {
          asset: asset.id,
          is_included: draft.is_included,
          festival_price: trimmed !== "" && !asset.is_free ? trimmed : null,
        };
      });

      const payload = {
        name: form.name.trim(),
        is_active: form.is_active,
        starts_at: toIsoDateTimeOrEmpty(form.starts_at_local),
        ends_at: toIsoDateTimeOrEmpty(form.ends_at_local),
        priority: Number(form.priority) || 10,
        theme_type: form.theme_type,
        title: form.title,
        subtitle: form.subtitle,
        badge: form.badge,
        button_text: form.button_text,
        button_url: form.button_url,
        effect: form.effect,
        banner_image: form.banner_image,
        discount_percent: Number(form.discount_percent) || 0,
        apply_discount_to_prices: form.apply_discount_to_prices,
        announcement_bar: form.announcement_bar,
        popup_card: form.popup_card,
        asset_prices: assetPricesPayload,
      };

      let saved: FestivalSchedule;
      if (editingId === "new") {
        saved = await adminPost<FestivalSchedule>("/admin/festivals/", payload);
        setSchedules((prev) => [saved, ...prev]);
        onStatus({
          type: "success",
          message: `Scheduled festival "${saved.name}" created with ${assetPricesPayload.filter((x) => x.festival_price !== null).length} pre-defined product prices!`,
        });
      } else {
        saved = await adminPatch<FestivalSchedule>(`/admin/festivals/${editingId}/`, payload);
        setSchedules((prev) => prev.map((s) => (s.id === saved.id ? saved : s)));
        onStatus({
          type: "success",
          message: `Scheduled festival "${saved.name}" updated successfully.`,
        });
      }
      setEditingId(null);
    } catch (err: any) {
      onStatus({
        type: "error",
        message: err?.message || "Failed to save scheduled festival.",
      });
    } finally {
      setSaving(false);
    }
  }

  async function toggleScheduleActive(schedule: FestivalSchedule) {
    try {
      const updated = await adminPatch<FestivalSchedule>(`/admin/festivals/${schedule.id}/`, {
        is_active: !schedule.is_active,
      });
      setSchedules((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      onStatus({
        type: "success",
        message: `"${updated.name}" is now ${updated.is_active ? "active for its schedule window" : "paused"}.`,
      });
    } catch (err: any) {
      onStatus({ type: "error", message: err?.message || "Could not update schedule status." });
    }
  }

  async function deleteSchedule(schedule: FestivalSchedule) {
    if (!window.confirm(`Delete scheduled festival "${schedule.name}"?`)) return;
    try {
      await adminDelete(`/admin/festivals/${schedule.id}/`);
      setSchedules((prev) => prev.filter((s) => s.id !== schedule.id));
      if (editingId === schedule.id) setEditingId(null);
      onStatus({ type: "success", message: `Deleted festival schedule "${schedule.name}".` });
    } catch (err: any) {
      onStatus({ type: "error", message: err?.message || "Failed to delete schedule." });
    }
  }

  return (
    <Card className="border-cyan-500/30 bg-gradient-to-br from-slate-900/90 via-[#0d1526] to-black shadow-xl">
      <CardContent className="p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
              <CalendarClock size={20} className="text-cyan-400" />
              <span>Scheduled Festival Campaigns & Pre-Defined Product Prices</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Plan upcoming festivals with exact Start &amp; End Date/Time windows and pre-define exact selling prices (₹) per product. Active scheduled campaigns automatically update storefront prices, banners, and checkout orders!
            </p>
          </div>
          {editingId === null ? (
            <Button
              type="button"
              onClick={startCreate}
              className="gap-2 bg-gradient-to-r from-cyan-500 to-teal-500 text-slate-950 font-black hover:brightness-110"
            >
              <Plus size={16} />
              <span>Schedule New Festival</span>
            </Button>
          ) : (
            <Button
              type="button"
              variant="secondary"
              onClick={() => setEditingId(null)}
              className="gap-1.5 border border-white/20 text-slate-200 hover:bg-white/10"
            >
              <X size={15} />
              <span>Close Editor</span>
            </Button>
          )}
        </div>

        {/* Campaign Editor Form */}
        {editingId !== null ? (
          <form onSubmit={handleSaveSchedule} className="space-y-5 rounded-xl border border-cyan-500/30 bg-black/40 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-base font-bold text-cyan-200 flex items-center gap-2">
                <Sparkles size={16} className="text-amber-400" />
                <span>{editingId === "new" ? "Create Scheduled Festival" : `Editing: ${form.name}`}</span>
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_THEME_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => applyQuickPreset(p.id)}
                    className={`rounded-md border px-2.5 py-1 text-[11px] font-bold transition ${
                      form.theme_type === p.id
                        ? "border-amber-400 bg-amber-400/20 text-amber-200"
                        : "border-white/10 bg-white/5 text-slate-300 hover:border-white/25"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <label className="block md:col-span-2">
                <span className="text-xs font-bold uppercase text-slate-400">Festival Campaign Name *</span>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Diwali Mega Rail Sale 2026"
                  className="mt-1.5 w-full rounded-lg border border-white/15 bg-black/60 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-400"
                />
              </label>
              <label className="block">
                <span className="text-xs font-bold uppercase text-slate-400">Priority (higher wins overlap)</span>
                <input
                  type="number"
                  min={1}
                  max={999}
                  value={form.priority}
                  onChange={(e) => setForm((f) => ({ ...f, priority: Number(e.target.value) || 10 }))}
                  className="mt-1.5 w-full rounded-lg border border-white/15 bg-black/60 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-400"
                />
              </label>
            </div>

            {/* Date From -> End Date Time */}
            <div className="rounded-lg border border-cyan-500/30 bg-cyan-950/20 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-cyan-300">
                  ⏰ Schedule Window (From Date/Time → End Date/Time)
                </span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setQuickWindowDays(1)}
                    className="rounded border border-cyan-500/30 bg-black/40 px-2 py-0.5 text-[11px] font-semibold text-cyan-200 hover:bg-cyan-500/20"
                  >
                    Now → +24h
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickWindowDays(3)}
                    className="rounded border border-cyan-500/30 bg-black/40 px-2 py-0.5 text-[11px] font-semibold text-cyan-200 hover:bg-cyan-500/20"
                  >
                    Now → +3 Days
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickWindowDays(7)}
                    className="rounded border border-cyan-500/30 bg-black/40 px-2 py-0.5 text-[11px] font-semibold text-cyan-200 hover:bg-cyan-500/20"
                  >
                    Now → +7 Days
                  </button>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="text-xs font-semibold text-emerald-300">🟢 From Date &amp; Time *</span>
                  <input
                    type="datetime-local"
                    required
                    value={form.starts_at_local}
                    onChange={(e) => setForm((f) => ({ ...f, starts_at_local: e.target.value }))}
                    className="mt-1.5 w-full rounded-lg border border-emerald-500/30 bg-black/60 px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-400"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-rose-300">🔴 End Date &amp; Time *</span>
                  <input
                    type="datetime-local"
                    required
                    value={form.ends_at_local}
                    onChange={(e) => setForm((f) => ({ ...f, ends_at_local: e.target.value }))}
                    className="mt-1.5 w-full rounded-lg border border-rose-500/30 bg-black/60 px-3 py-2.5 text-sm text-white outline-none focus:border-rose-400"
                  />
                </label>
              </div>
            </div>

            {/* Banner & Pricing Options */}
            <div className="grid gap-4 md:grid-cols-3">
              <label className="block md:col-span-2">
                <span className="text-xs font-bold uppercase text-slate-400">Banner Headline</span>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  className="mt-1.5 w-full rounded-lg border border-white/15 bg-black/60 px-3 py-2 text-sm text-white"
                />
              </label>
              <label className="block">
                <span className="text-xs font-bold uppercase text-amber-300">Default Fallback Discount %</span>
                <input
                  type="number"
                  min={0}
                  max={95}
                  value={form.discount_percent}
                  onChange={(e) => setForm((f) => ({ ...f, discount_percent: Number(e.target.value) || 0 }))}
                  className="mt-1.5 w-full rounded-lg border border-amber-500/30 bg-black/60 px-3 py-2 text-sm text-amber-100"
                />
                <span className="mt-1 block text-[11px] text-slate-500">
                  Used for included items that do not have a specific ₹ price below.
                </span>
              </label>
              <label className="block">
                <span className="text-xs font-bold uppercase text-slate-400">Badge Text</span>
                <input
                  type="text"
                  value={form.badge}
                  onChange={(e) => setForm((f) => ({ ...f, badge: e.target.value }))}
                  className="mt-1.5 w-full rounded-lg border border-white/15 bg-black/60 px-3 py-2 text-sm text-white"
                />
              </label>
              <label className="block">
                <span className="text-xs font-bold uppercase text-slate-400">Effect</span>
                <select
                  value={form.effect}
                  onChange={(e) => setForm((f) => ({ ...f, effect: e.target.value }))}
                  className="mt-1.5 w-full rounded-lg border border-white/15 bg-black/60 px-3 py-2 text-sm text-white"
                >
                  <option value="confetti">Confetti Party</option>
                  <option value="diyas">Glowing Diyas &amp; Gold</option>
                  <option value="fireworks">Skyshots &amp; Fireworks</option>
                  <option value="snow">Falling Snowflakes</option>
                  <option value="sparkles">Golden Sparkles</option>
                  <option value="skyshots">New Year Skyshots</option>
                  <option value="none">No Particles</option>
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-bold uppercase text-slate-400">CTA Button Text</span>
                <input
                  type="text"
                  value={form.button_text}
                  onChange={(e) => setForm((f) => ({ ...f, button_text: e.target.value }))}
                  className="mt-1.5 w-full rounded-lg border border-white/15 bg-black/60 px-3 py-2 text-sm text-white"
                />
              </label>
            </div>

            <div className="flex flex-wrap gap-4 rounded-lg border border-white/10 bg-white/[0.02] p-3 text-xs">
              <label className="flex items-center gap-2 cursor-pointer text-white font-semibold">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                  className="h-4 w-4 accent-cyan-400"
                />
                <span>Campaign Active (Auto-runs inside dates)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-emerald-300 font-semibold">
                <input
                  type="checkbox"
                  checked={form.apply_discount_to_prices}
                  onChange={(e) => setForm((f) => ({ ...f, apply_discount_to_prices: e.target.checked }))}
                  className="h-4 w-4 accent-emerald-400"
                />
                <span>Apply Pre-Defined Prices &amp; % Discount to Live Checkout</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-amber-200 font-semibold">
                <input
                  type="checkbox"
                  checked={form.announcement_bar}
                  onChange={(e) => setForm((f) => ({ ...f, announcement_bar: e.target.checked }))}
                  className="h-4 w-4 accent-amber-400"
                />
                <span>Show Storewide Ribbon Banner</span>
              </label>
            </div>

            {/* Per-Product Pre-Defined Festival Pricing Matrix */}
            <div className="space-y-3 rounded-xl border border-amber-500/30 bg-amber-950/10 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-bold text-amber-200 flex items-center gap-1.5">
                    <Tag size={15} className="text-amber-400" />
                    <span>Pre-Defined Festival Product Prices ({assets.length} products)</span>
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Enter an exact ₹ Festival Price for specific products, or leave blank to auto-calculate using {form.discount_percent || 0}% off. Uncheck &quot;Include&quot; to keep a product at its normal price.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <Search size={14} className="absolute left-2.5 top-2.5 text-slate-500" />
                    <input
                      type="text"
                      value={assetQuery}
                      onChange={(e) => setAssetQuery(e.target.value)}
                      placeholder="Filter products..."
                      className="rounded-lg border border-white/15 bg-black/50 pl-8 pr-3 py-1.5 text-xs text-white outline-none focus:border-amber-400"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => bulkSetInclusion(true)}
                    className="rounded border border-white/15 bg-white/5 px-2.5 py-1.5 text-[11px] font-semibold text-slate-200 hover:bg-white/10"
                  >
                    Include All
                  </button>
                  <button
                    type="button"
                    onClick={() => bulkSetInclusion(false)}
                    className="rounded border border-white/15 bg-white/5 px-2.5 py-1.5 text-[11px] font-semibold text-slate-200 hover:bg-white/10"
                  >
                    Exclude All
                  </button>
                  <button
                    type="button"
                    onClick={clearCustomPrices}
                    className="rounded border border-rose-500/30 bg-rose-500/10 px-2.5 py-1.5 text-[11px] font-semibold text-rose-200 hover:bg-rose-500/20"
                  >
                    Clear Custom ₹
                  </button>
                </div>
              </div>

              <div className="max-h-80 overflow-y-auto rounded-lg border border-white/10 bg-black/50 divide-y divide-white/[0.06]">
                {filteredAssets.map((asset) => {
                  const draft = assetRows[asset.id] || { is_included: true, festival_price: "" };
                  const regPrice =
                    Number(asset.price || 0) +
                    (asset.has_paid_update && Number(asset.update_price || 0) > 0
                      ? Number(asset.update_price)
                      : 0);
                  let previewLabel = "Regular price";
                  let previewColor = "text-slate-400";
                  if (asset.is_free) {
                    previewLabel = "Already Free";
                  } else if (!draft.is_included) {
                    previewLabel = `Excluded (stays ₹${regPrice.toFixed(2)})`;
                    previewColor = "text-slate-500";
                  } else if (!form.apply_discount_to_prices) {
                    previewLabel = "Banner only (no discount)";
                    previewColor = "text-slate-400";
                  } else if (draft.festival_price.trim() !== "") {
                    const custom = Math.min(regPrice, Math.max(0, Number(draft.festival_price)));
                    const pct = regPrice > 0 ? Math.round(((regPrice - custom) / regPrice) * 100) : 0;
                    previewLabel = `Festival Price: ₹${custom.toFixed(2)} (${pct}% OFF)`;
                    previewColor = "text-emerald-300 font-bold";
                  } else if (asset.festival_price !== null && asset.festival_price !== undefined && asset.festival_price !== "") {
                    const assetFp = Number(asset.festival_price);
                    previewLabel = `Asset Preset: ₹${assetFp.toFixed(2)}`;
                    previewColor = "text-amber-300 font-semibold";
                  } else if (form.discount_percent > 0 && regPrice > 0) {
                    const auto = regPrice * ((100 - form.discount_percent) / 100);
                    previewLabel = `Auto ${form.discount_percent}% off: ₹${auto.toFixed(2)}`;
                    previewColor = "text-cyan-300";
                  }

                  return (
                    <div
                      key={asset.id}
                      className="grid gap-3 px-3 py-2.5 sm:grid-cols-[auto_1fr_140px_190px] sm:items-center text-xs"
                    >
                      <input
                        type="checkbox"
                        checked={draft.is_included}
                        disabled={asset.is_free}
                        onChange={(e) => updateAssetDraft(asset.id, { is_included: e.target.checked })}
                        className="h-4 w-4 accent-cyan-400 cursor-pointer"
                        title="Include this product in festival campaign"
                      />
                      <div className="min-w-0">
                        <p className="font-semibold text-white truncate">{asset.title}</p>
                        <p className="text-[11px] text-slate-400">
                          {asset.category?.name || "Asset"} • Regular:{" "}
                          <span className="text-slate-200 font-medium">
                            {asset.is_free ? "Free" : `₹${regPrice.toFixed(2)}`}
                          </span>
                        </p>
                      </div>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        disabled={asset.is_free || !draft.is_included}
                        value={draft.festival_price}
                        onChange={(e) => updateAssetDraft(asset.id, { festival_price: e.target.value })}
                        placeholder={asset.is_free ? "Free" : "Custom ₹"}
                        className="rounded border border-white/15 bg-black/60 px-2.5 py-1.5 text-xs text-amber-100 outline-none focus:border-amber-400 disabled:opacity-40"
                      />
                      <p className={`text-[11px] ${previewColor}`}>{previewLabel}</p>
                    </div>
                  );
                })}
                {filteredAssets.length === 0 ? (
                  <p className="p-4 text-center text-xs text-slate-500">No matching products found.</p>
                ) : null}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setEditingId(null)}
                className="border border-white/20 text-slate-200"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="gap-2 bg-gradient-to-r from-cyan-500 to-teal-500 text-slate-950 font-black hover:brightness-110"
              >
                <Save size={15} />
                <span>{saving ? "Saving Schedule..." : "Save Scheduled Festival"}</span>
              </Button>
            </div>
          </form>
        ) : null}

        {/* Existing Schedules List */}
        {loading ? (
          <p className="text-xs text-slate-400 py-4">Loading scheduled festivals...</p>
        ) : schedules.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/15 bg-black/30 p-6 text-center space-y-2">
            <p className="text-sm font-semibold text-slate-300">No scheduled festival campaigns yet.</p>
            <p className="text-xs text-slate-500">
              Click &quot;Schedule New Festival&quot; above to set up upcoming festival dates, countdown timers, and pre-defined product prices in advance.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {schedules.map((s) => {
              const customPriceCount = (s.asset_prices || []).filter(
                (ap) => ap.is_included && ap.festival_price !== null && ap.festival_price !== ""
              ).length;
              return (
                <div
                  key={s.id}
                  className="flex flex-col gap-3 rounded-xl border border-white/10 bg-black/40 p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-white text-sm">{s.name}</span>
                      <Badge variant={statusBadgeVariant(s.status_label)}>
                        {(s.status_label || (s.is_active ? "active" : "paused")).toUpperCase()}
                      </Badge>
                      <Badge variant="muted">Priority {s.priority}</Badge>
                      {s.discount_percent > 0 ? (
                        <Badge variant="warning">{s.discount_percent}% Default Off</Badge>
                      ) : null}
                      {customPriceCount > 0 ? (
                        <Badge variant="success">
                          <CheckCircle2 size={11} className="mr-1" />
                          {customPriceCount} Custom Product {customPriceCount === 1 ? "Price" : "Prices"}
                        </Badge>
                      ) : null}
                    </div>
                    <p className="text-xs text-slate-300" suppressHydrationWarning>
                      📅 <strong>From:</strong> {formatReadableDt(s.starts_at)}{" "}
                      <span className="text-slate-500 mx-1">→</span> <strong>Ends:</strong>{" "}
                      {formatReadableDt(s.ends_at)}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate">
                      Banner: {s.title || "(Uses default text)"} • Effect: {s.effect}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => toggleScheduleActive(s)}
                      className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-white/10"
                      title={s.is_active ? "Pause campaign" : "Resume campaign"}
                    >
                      {s.is_active ? <PauseCircle size={14} className="text-amber-300" /> : <PlayCircle size={14} className="text-emerald-300" />}
                      <span>{s.is_active ? "Pause" : "Resume"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => startEdit(s)}
                      className="inline-flex items-center gap-1 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-1.5 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/20"
                    >
                      <Edit3 size={14} />
                      <span>Edit Schedule &amp; Prices</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteSchedule(s)}
                      className="inline-flex items-center gap-1 rounded-lg border border-rose-500/30 bg-rose-500/10 px-2.5 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-500/20"
                      title="Delete schedule"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}


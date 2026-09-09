"use client";

import { type FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Cake,
  Check,
  Flame,
  Globe,
  HelpCircle,
  Lightbulb,
  PartyPopper,
  Save,
  Sparkles,
  Sun,
  Trees,
  Volume2
} from "lucide-react";
import { AdminLoginNote } from "@/components/admin-login-note";
import { AdminLayout } from "@/components/admin-table";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { adminGet, adminPatch, type AdminSettings } from "@/lib/admin-api";
import { fallbackSiteSettings, type SiteSettings } from "@/lib/api";

type FestivalPreset = {
  id: "ANNIVERSARY" | "DIWALI" | "PONGAL" | "CHRISTMAS" | "NEW_YEAR" | "INDEPENDENCE_DAY" | "CUSTOM";
  label: string;
  emoji: string;
  badge: string;
  title: string;
  subtitle: string;
  buttonText: string;
  buttonUrl: string;
  effect: "confetti" | "sparkles" | "snow" | "fireworks" | "diyas" | "skyshots" | "none";
  discountPercent: number;
  description: string;
};

const FESTIVAL_PRESETS: FestivalPreset[] = [
  {
    id: "ANNIVERSARY",
    label: "1st Year Anniversary",
    emoji: "🎂",
    badge: "1st Year Anniversary",
    title: "🎉 Celebrating 1 Year of MSTS-GJS Production Store!",
    subtitle:
      "Thank you to our Indian Railways simulation community for 1 year of amazing support! Explore exclusive anniversary addons & special celebration offers.",
    buttonText: "Explore Anniversary Specials",
    buttonUrl: "/assets",
    effect: "confetti",
    discountPercent: 15,
    description: "Golden celebration theme with festive confetti streamers and special anniversary rewards.",
  },
  {
    id: "DIWALI",
    label: "Diwali (Deepavali)",
    emoji: "🪔",
    badge: "Diwali Festival of Lights",
    title: "🪔 Shubh Deepavali! Light Up Your Railway Simulator!",
    subtitle:
      "Celebrate Diwali with exclusive festive discounts across Indian Railways locomotives, passenger consists, and authentic route addons!",
    buttonText: "Explore Diwali Deals",
    buttonUrl: "/assets",
    effect: "diyas",
    discountPercent: 20,
    description: "Warm golden glow, festive diyas, and auspicious Deepavali simulation deals.",
  },
  {
    id: "PONGAL",
    label: "Pongal / Sankranti",
    emoji: "🌾",
    badge: "Happy Pongal & Sankranti",
    title: "🌾 Happy Pongal & Makar Sankranti! Festive Railway Celebrations!",
    subtitle:
      "Celebrate the joyous harvest festival with special Indian Railways consists, custom liveries, and celebratory addon offers.",
    buttonText: "Explore Pongal Releases",
    buttonUrl: "/assets",
    effect: "sparkles",
    discountPercent: 10,
    description: "Traditional South Indian harvest tones, warm greetings, and seasonal railway additions.",
  },
  {
    id: "CHRISTMAS",
    label: "Christmas & Holidays",
    emoji: "🎄",
    badge: "Holiday Season Special",
    title: "🎄 Merry Christmas & Happy Holidays from GJS Production!",
    subtitle:
      "Season's greetings! Unwrap holiday discounts on popular MSTS & Open Rails locomotives, functional cab views, and sound packs.",
    buttonText: "Claim Holiday Deals",
    buttonUrl: "/assets",
    effect: "snow",
    discountPercent: 15,
    description: "Gentle falling winter snow, festive holiday red/green accents, and year-end discounts.",
  },
  {
    id: "NEW_YEAR",
    label: "New Year Celebration",
    emoji: "🎆",
    badge: "Happy New Year",
    title: "🎆 Happy New Year! Welcome to a New Era of Railway Simulation!",
    subtitle:
      "Kick off the new year with brand new locomotives, consist expansions, realistic 3-phase sound packs, and launch offers.",
    buttonText: "Ring in New Addons",
    buttonUrl: "/assets",
    effect: "fireworks",
    discountPercent: 20,
    description: "Celebratory sparkle bursts, futuristic cyan/purple accents, and fresh new year energy.",
  },
  {
    id: "INDEPENDENCE_DAY",
    label: "Independence / Republic Day",
    emoji: "🇮🇳",
    badge: "Pride of Indian Railways",
    title: "🇮🇳 Vande Mataram! Saluting the Lifeline of the Nation!",
    subtitle:
      "Proudly Indian! Celebrate national heritage with iconic Indian locomotives, Vande Bharat expresses, and authentic regional routes.",
    buttonText: "View Indian Addons",
    buttonUrl: "/assets",
    effect: "confetti",
    discountPercent: 15,
    description: "Tricolor saffron-white-green pride, Vande Bharat celebration, and patriotism.",
  },
  {
    id: "CUSTOM",
    label: "Custom Celebration",
    emoji: "✨",
    badge: "Special Event",
    title: "✨ Special Community Celebration Event!",
    subtitle: "Custom announcement and celebration for our Indian Railways simulator fans.",
    buttonText: "Explore Specials",
    buttonUrl: "/assets",
    effect: "sparkles",
    discountPercent: 0,
    description: "Freely customize your own title, subtitle, badges, colors, and particle animations.",
  },
];

export default function FestivalThemesAdminPage() {
  const [siteForm, setSiteForm] = useState<SiteSettings>(fallbackSiteSettings);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    adminGet<AdminSettings>("/admin/settings/", { site: fallbackSiteSettings } as any).then((data) => {
      if (data && data.site) {
        setSiteForm({ ...fallbackSiteSettings, ...data.site });
      }
    });
  }, []);

  function updateField<K extends keyof SiteSettings>(field: K, value: SiteSettings[K]) {
    setSiteForm((prev) => ({ ...prev, [field]: value }));
  }

  function applyPreset(preset: FestivalPreset) {
    setSiteForm((prev) => ({
      ...prev,
      festival_theme_type: preset.id,
      festival_badge: preset.badge,
      festival_title: preset.title,
      festival_subtitle: preset.subtitle,
      festival_button_text: preset.buttonText,
      festival_button_url: preset.buttonUrl,
      festival_effect: preset.effect,
      festival_discount_percent: preset.discountPercent,
    }));
    setStatus({
      type: "success",
      message: `Loaded template for "${preset.label}". Click "Save Festival Theme" below to apply.`,
    });
  }

  async function handleToggleTheme(enabled: boolean) {
    setSaving(true);
    setStatus(null);
    try {
      const nextForm = { ...siteForm, festival_theme_enabled: enabled };
      const updated = await adminPatch<AdminSettings>("/admin/settings/", { site: nextForm });
      setSiteForm(updated.site);
      setStatus({
        type: "success",
        message: enabled
          ? "🎉 Celebration theme is now ACTIVATED storewide! Public visitors will see the festive banner & effects."
          : "⚪ Celebration theme is now DEACTIVATED. Store has returned to the standard display.",
      });
    } catch (err: any) {
      setStatus({
        type: "error",
        message: err.message || "Failed to update theme status.",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setStatus(null);
    try {
      const updated = await adminPatch<AdminSettings>("/admin/settings/", { site: siteForm });
      setSiteForm(updated.site);
      setStatus({
        type: "success",
        message: "Festival & celebration theme settings saved successfully!",
      });
    } catch (err: any) {
      setStatus({
        type: "error",
        message: err.message || "Failed to save festival theme settings.",
      });
    } finally {
      setSaving(false);
    }
  }

  const isThemeActive = Boolean(siteForm.festival_theme_enabled);

  return (
    <AdminLayout title="Festival & Event Themes">
      <AdminLoginNote />

      <div className="space-y-6">
        {/* Status Notification */}
        {status ? (
          <div
            className={`flex items-center justify-between rounded-xl border p-4 text-xs font-semibold shadow-md ${
              status.type === "success"
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                : "border-rose-500/40 bg-rose-500/10 text-rose-200"
            }`}
          >
            <div className="flex items-center gap-2">
              <Check size={16} />
              <span>{status.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setStatus(null)}
              className="text-slate-400 hover:text-white"
            >
              ✕
            </button>
          </div>
        ) : null}

        {/* Master Control Card */}
        <div
          className={`rounded-2xl border p-6 backdrop-blur-xl transition-all duration-300 shadow-2xl ${
            isThemeActive
              ? "border-amber-400/50 bg-gradient-to-r from-amber-950/40 via-black/80 to-amber-950/40 shadow-[0_0_35px_rgba(245,158,11,0.15)]"
              : "border-white/10 bg-white/[0.03]"
          }`}
        >
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5">
                <PartyPopper
                  size={24}
                  className={isThemeActive ? "text-amber-400 animate-bounce" : "text-slate-400"}
                />
                <h2 className="text-xl font-black text-white uppercase tracking-wide">
                  Storewide Celebration Theme Control
                </h2>
              </div>
              <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                Activate celebratory visual banners, anniversary greetings, and festive particle
                effects (Confetti, Sparkles, Diyas, Snowfall, or Fireworks) across the whole store.
              </p>
            </div>

            <div className="flex items-center gap-4 shrink-0">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-bold uppercase tracking-wider ${
                  isThemeActive
                    ? "bg-amber-400/20 text-amber-300 border border-amber-400/40 shadow-md animate-pulse"
                    : "bg-white/10 text-slate-400 border border-white/10"
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    isThemeActive ? "bg-amber-400" : "bg-slate-500"
                  }`}
                />
                {isThemeActive ? "Theme Active Live" : "Theme Inactive"}
              </span>

              <Button
                type="button"
                variant={isThemeActive ? "danger" : "default"}
                onClick={() => handleToggleTheme(!isThemeActive)}
                disabled={saving}
                className="h-10 px-5 text-xs font-bold shadow-lg"
              >
                {isThemeActive ? "Turn Theme OFF" : "Turn Theme ON"}
              </Button>
            </div>
          </div>
        </div>

        {/* Live Preview Box */}
        <div className="rounded-xl border border-white/10 bg-black/60 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Sparkles size={14} className="text-amber-400" />
              Live Visitor Banner Preview
            </span>
            <span className="text-[11px] text-slate-500">
              {isThemeActive ? "Currently Visible on Storefront" : "Preview (Theme is currently disabled)"}
            </span>
          </div>

          <div className="overflow-hidden rounded-xl border border-amber-500/40 bg-gradient-to-r from-[#2c1a04] via-[#472d07] to-[#2c1a04] p-3.5 text-xs shadow-xl">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-1 flex-wrap items-center gap-2.5">
                <span className="rounded-full border border-amber-400/40 bg-amber-400/20 px-2.5 py-0.5 text-[10px] font-black uppercase text-amber-200">
                  {siteForm.festival_badge || "1st Year Anniversary"}
                </span>
                <p className="font-bold text-white text-xs sm:text-sm">
                  {siteForm.festival_title || "🎉 Celebrating 1 Year of MSTS-GJS Production Store!"}
                </p>
                {siteForm.festival_discount_percent ? (
                  <span className="rounded bg-emerald-500/20 border border-emerald-400/40 px-2 py-0.5 text-[10px] font-black text-emerald-300">
                    🏷️ {siteForm.festival_discount_percent}% Festive Offer
                  </span>
                ) : null}
              </div>

              <span className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 px-3 py-1.5 text-xs font-black text-slate-950 shadow-md">
                <span>{siteForm.festival_button_text || "Explore Anniversary Specials"}</span>
                <ArrowRight size={13} />
              </span>
            </div>
          </div>
        </div>

        {/* Preset Templates Selector */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Flame size={16} className="text-rail-amber" />
              Select Celebration Template (1-Click Apply)
            </h3>
            <span className="text-xs text-slate-400">
              Click any card to auto-fill festive messages & effects
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {FESTIVAL_PRESETS.map((preset) => {
              const isSelected = siteForm.festival_theme_type === preset.id;
              return (
                <div
                  key={preset.id}
                  onClick={() => applyPreset(preset)}
                  className={`group relative cursor-pointer rounded-xl border p-4 transition-all duration-200 ${
                    isSelected
                      ? "border-amber-400 bg-amber-400/[0.08] ring-1 ring-amber-400/50 shadow-lg shadow-amber-500/10"
                      : "border-white/10 bg-white/[0.02] hover:border-white/25 hover:bg-white/[0.05]"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl">{preset.emoji}</span>
                    <span
                      className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        isSelected
                          ? "bg-amber-400 text-slate-950"
                          : "bg-white/10 text-slate-400 group-hover:text-white"
                      }`}
                    >
                      {isSelected ? "Selected" : "Use Preset"}
                    </span>
                  </div>

                  <h4 className="font-bold text-white text-sm">{preset.label}</h4>
                  <p className="mt-1 text-xs text-slate-400 line-clamp-2">{preset.description}</p>

                  <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[10px]">
                    <span className="rounded bg-black/40 border border-white/10 px-2 py-0.5 font-medium text-slate-300">
                      Effect: {preset.effect}
                    </span>
                    {preset.discountPercent > 0 ? (
                      <span className="rounded bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 font-bold text-emerald-300">
                        {preset.discountPercent}% Discount
                      </span>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Detailed Customization Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card className="glass-card">
            <CardContent className="p-6 space-y-5">
              <h3 className="text-base font-bold text-white border-b border-white/10 pb-3">
                Customize Active Celebration Theme
              </h3>

              <div className="grid gap-5 sm:grid-cols-2">
                {/* Theme Type */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Theme Category
                  </label>
                  <select
                    value={siteForm.festival_theme_type || "ANNIVERSARY"}
                    onChange={(e) => updateField("festival_theme_type", e.target.value as any)}
                    className="w-full rounded-lg border border-white/10 bg-black/60 px-3.5 py-2.5 text-xs font-medium text-white outline-none focus:border-amber-400"
                  >
                    <option value="ANNIVERSARY">🎂 1st Year Store Anniversary</option>
                    <option value="DIWALI">🪔 Diwali (Deepavali)</option>
                    <option value="PONGAL">🌾 Pongal / Makar Sankranti</option>
                    <option value="CHRISTMAS">🎄 Christmas & Holiday Season</option>
                    <option value="NEW_YEAR">🎆 New Year Celebration</option>
                    <option value="INDEPENDENCE_DAY">🇮🇳 Independence / Republic Day</option>
                    <option value="CUSTOM">✨ Custom Celebration</option>
                  </select>
                </div>

                {/* Particle Effect */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Visual Particle Effect
                  </label>
                  <select
                    value={siteForm.festival_effect || "confetti"}
                    onChange={(e) => updateField("festival_effect", e.target.value as any)}
                    className="w-full rounded-lg border border-white/10 bg-black/60 px-3.5 py-2.5 text-xs font-medium text-white outline-none focus:border-amber-400"
                  >
                    <option value="skyshots">🚀 Sky Shots & Firecrackers (Aerial Crackers)</option>
                    <option value="fireworks">🎆 Celebratory Fireworks & Crackers</option>
                    <option value="confetti">🎉 Confetti Streamers (Anniversary & Celebration)</option>
                    <option value="diyas">🪔 Glowing Festive Diyas (Diwali / Deepavali)</option>
                    <option value="sparkles">✨ Golden Sparkles (Pongal & Sankranti)</option>
                    <option value="snow">❄️ Winter Snowfall (Christmas & Winter)</option>
                    <option value="none">🚫 No Particle Effects (Top Banner Only)</option>
                  </select>
                </div>

                {/* Celebration Title */}
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Celebration Headline / Banner Title
                  </label>
                  <input
                    type="text"
                    value={siteForm.festival_title || ""}
                    onChange={(e) => updateField("festival_title", e.target.value)}
                    placeholder="e.g. 🎉 Celebrating 1 Year of MSTS-GJS Production Store!"
                    className="w-full rounded-lg border border-white/10 bg-black/60 px-3.5 py-2.5 text-xs font-medium text-white outline-none focus:border-amber-400"
                  />
                </div>

                {/* Subtitle / Greeting Message */}
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Celebration Message / Community Thank You Note
                  </label>
                  <textarea
                    rows={3}
                    value={siteForm.festival_subtitle || ""}
                    onChange={(e) => updateField("festival_subtitle", e.target.value)}
                    placeholder="Thank our community and describe what makes this festival or anniversary special..."
                    className="w-full rounded-lg border border-white/10 bg-black/60 px-3.5 py-2.5 text-xs font-medium text-white outline-none focus:border-amber-400"
                  />
                </div>

                {/* Badge Label */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Badge Label
                  </label>
                  <input
                    type="text"
                    value={siteForm.festival_badge || ""}
                    onChange={(e) => updateField("festival_badge", e.target.value)}
                    placeholder="e.g. 1st Year Anniversary"
                    className="w-full rounded-lg border border-white/10 bg-black/60 px-3.5 py-2.5 text-xs font-medium text-white outline-none focus:border-amber-400"
                  />
                </div>

                {/* Optional Festive Discount % */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Festive Discount % (Optional)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={90}
                    value={siteForm.festival_discount_percent || 0}
                    onChange={(e) => updateField("festival_discount_percent", Number(e.target.value))}
                    placeholder="e.g. 15"
                    className="w-full rounded-lg border border-white/10 bg-black/60 px-3.5 py-2.5 text-xs font-medium text-white outline-none focus:border-amber-400"
                  />
                </div>

                {/* Button Text */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Call To Action Button Text
                  </label>
                  <input
                    type="text"
                    value={siteForm.festival_button_text || ""}
                    onChange={(e) => updateField("festival_button_text", e.target.value)}
                    placeholder="e.g. Explore Anniversary Specials"
                    className="w-full rounded-lg border border-white/10 bg-black/60 px-3.5 py-2.5 text-xs font-medium text-white outline-none focus:border-amber-400"
                  />
                </div>

                {/* Button URL */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Button Destination URL
                  </label>
                  <input
                    type="text"
                    value={siteForm.festival_button_url || "/assets"}
                    onChange={(e) => updateField("festival_button_url", e.target.value)}
                    placeholder="e.g. /assets or /assets?sort=trending"
                    className="w-full rounded-lg border border-white/10 bg-black/60 px-3.5 py-2.5 text-xs font-medium text-white outline-none focus:border-amber-400"
                  />
                </div>

                {/* Announcement Bar Toggle */}
                <div className="sm:col-span-2 pt-2 border-t border-white/10">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(siteForm.festival_announcement_bar)}
                      onChange={(e) => updateField("festival_announcement_bar", e.target.checked)}
                      className="h-4 w-4 rounded border-white/20 bg-black/50 text-amber-500 focus:ring-amber-400"
                    />
                    <div className="space-y-0.5">
                      <span className="text-xs font-bold text-white">
                        Display Top Announcement Ribbon Across All Store Pages
                      </span>
                      <p className="text-[11px] text-slate-400">
                        Shows the celebration banner at the very top of the header for visitors.
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-white/10">
                <div className="text-xs text-slate-400">
                  {isThemeActive ? (
                    <span className="text-emerald-400 font-semibold">
                      🟢 Celebration theme is currently ON and visible to visitors.
                    </span>
                  ) : (
                    <span>⚪ Theme is currently OFF. Visitors see the standard theme.</span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <Button
                    type="submit"
                    disabled={saving}
                    className="gap-2 bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-black hover:brightness-110 shadow-lg shadow-amber-500/20 text-xs h-10 px-5"
                  >
                    <Save size={15} />
                    <span>{saving ? "Saving Changes..." : "Save Festival Theme"}</span>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </AdminLayout>
  );
}

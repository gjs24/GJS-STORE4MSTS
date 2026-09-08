"use client";

import { type FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { Check, Clock, Copy, CreditCard, Database, ExternalLink, Eye, Image, Megaphone, MonitorDown, ShieldCheck, Wrench } from "lucide-react";
import { AdminLoginNote } from "@/components/admin-login-note";
import { AdminLayout } from "@/components/admin-table";
import { adminGet, adminPatch, type AdminSettings } from "@/lib/admin-api";
import { fallbackSiteSettings } from "@/lib/api";

const fallbackSettings: AdminSettings = {
  api_status: "offline",
  payments: { cashfree_configured: false, cashfree_environment: "sandbox", manual_upi_configured: false, stripe_configured: false },
  storage: { cloudinary_configured: false, media_url: "/media/" },
  security: { debug: true, allowed_hosts: ["localhost"], download_rate_limit: "20/hour" },
  site: fallbackSiteSettings
};

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<AdminSettings>(fallbackSettings);
  const [siteForm, setSiteForm] = useState(fallbackSettings.site);
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [copiedBypass, setCopiedBypass] = useState(false);
  const slideshowUrls = siteForm.hero_slideshow_urls
    ? siteForm.hero_slideshow_urls.split(/\r?\n/).slice(0, 10)
    : [""];

  useEffect(() => {
    adminGet<AdminSettings>("/admin/settings/", fallbackSettings).then((data) => {
      setSettings(data);
      setSiteForm({ ...fallbackSettings.site, ...(data.site || {}) });
    });
  }, []);

  async function toggleMaintenanceMode() {
    setSaving(true);
    setStatus("");
    try {
      const nextState = !siteForm.maintenance_mode;
      const updatedForm = { ...siteForm, maintenance_mode: nextState };
      const updated = await adminPatch<AdminSettings>("/admin/settings/", { site: updatedForm });
      setSettings(updated);
      setSiteForm(updated.site);
      setStatus(
        nextState
          ? "🚨 Maintenance mode is now ACTIVATED. Public visitors will see the maintenance screen."
          : "🟢 Maintenance mode is DEACTIVATED. Store is now live to all visitors!"
      );
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to toggle maintenance mode.");
    } finally {
      setSaving(false);
    }
  }

  function updateSiteForm(field: keyof typeof siteForm, value: string | boolean) {
    setSiteForm((current) => ({ ...current, [field]: value }));
  }

  function updateSlideshowUrl(index: number, value: string) {
    const nextUrls = [...slideshowUrls];
    nextUrls[index] = value;
    updateSiteForm("hero_slideshow_urls", nextUrls.join("\n"));
  }

  function addSlideshowUrl() {
    if (slideshowUrls.length >= 10) return;
    updateSiteForm("hero_slideshow_urls", [...slideshowUrls, ""].join("\n"));
  }

  function removeSlideshowUrl(index: number) {
    const nextUrls = slideshowUrls.filter((_, itemIndex) => itemIndex !== index);
    updateSiteForm("hero_slideshow_urls", (nextUrls.length ? nextUrls : [""]).join("\n"));
  }

  async function saveSiteSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setStatus("");
    try {
      const updated = await adminPatch<AdminSettings>("/admin/settings/", { site: siteForm });
      setSettings(updated);
      setSiteForm(updated.site);
      setStatus("Homepage and popup settings saved.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Settings update failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminLayout title="Store Settings">
      <AdminLoginNote />
      <div className="grid gap-5 md:grid-cols-3">
        <div className="rounded border border-white/10 bg-white/[0.03] p-5">
          <CreditCard className="text-rail-amber" />
          <h2 className="mt-4 font-semibold">Payments</h2>
          <p className="mt-3 text-sm text-slate-400">Cashfree: {settings.payments.cashfree_configured ? "Configured" : "Missing keys"}</p>
          <p className="mt-1 text-sm text-slate-400">Mode: {settings.payments.cashfree_environment || "sandbox"}</p>
          <p className="mt-1 text-sm text-slate-400">Stripe: {settings.payments.stripe_configured ? "Configured" : "Optional / not configured"}</p>
        </div>
        <div className="rounded border border-white/10 bg-white/[0.03] p-5">
          <Database className="text-rail-amber" />
          <h2 className="mt-4 font-semibold">File Storage</h2>
          <p className="mt-3 text-sm text-slate-400">Cloudinary: {settings.storage.cloudinary_configured ? "Configured" : "Using local media"}</p>
          <p className="mt-1 text-sm text-slate-400">Media URL: {settings.storage.media_url}</p>
        </div>
        <div className="rounded border border-white/10 bg-white/[0.03] p-5">
          <ShieldCheck className="text-rail-amber" />
          <h2 className="mt-4 font-semibold">Security</h2>
          <p className="mt-3 text-sm text-slate-400">Debug mode: {settings.security.debug ? "On" : "Off"}</p>
          <p className="mt-1 text-sm text-slate-400">Download limit: {settings.security.download_rate_limit}</p>
        </div>
      </div>
      <div className="mt-6 rounded border border-white/10 bg-white/[0.03] p-5">
        <h2 className="font-semibold">Allowed hosts</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {settings.security.allowed_hosts.map((host) => <span key={host} className="rounded bg-white/10 px-3 py-1 text-sm">{host}</span>)}
        </div>
      </div>

      {/* MAINTENANCE MODE & TESTING AREA */}
      <div className={`mt-6 rounded-xl border p-6 transition-colors ${
        siteForm.maintenance_mode
          ? "border-rail-amber/50 bg-rail-amber/[0.05] shadow-[0_0_30px_rgba(245,158,11,0.1)]"
          : "border-white/10 bg-white/[0.03]"
      }`}>
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Wrench className={siteForm.maintenance_mode ? "text-rail-amber animate-pulse" : "text-slate-400"} size={22} />
              <h2 className="text-lg font-bold text-white uppercase tracking-wide">Maintenance Mode & Testing Area</h2>
            </div>
            <p className="text-xs text-slate-400 max-w-xl">
              When activated, all public visitors see the cinematic Maintenance Screen. Administrators retain full access to browse, test, and manage the depot.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${
              siteForm.maintenance_mode
                ? "bg-rail-amber/20 text-rail-amber border border-rail-amber/40 animate-pulse"
                : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
            }`}>
              <span className={`h-2 w-2 rounded-full ${siteForm.maintenance_mode ? "bg-rail-amber" : "bg-emerald-400"}`} />
              {siteForm.maintenance_mode ? "Maintenance Active" : "Store Live"}
            </span>

            <button
              type="button"
              disabled={saving}
              onClick={toggleMaintenanceMode}
              className={`rounded px-4 py-2 text-xs font-bold uppercase tracking-wider text-white transition shadow-glow disabled:opacity-50 ${
                siteForm.maintenance_mode
                  ? "bg-emerald-600 hover:bg-emerald-500"
                  : "bg-rail-red hover:bg-rail-red/90"
              }`}
            >
              {saving ? "Updating..." : siteForm.maintenance_mode ? "Deactivate (Go Live)" : "Activate Maintenance"}
            </button>
          </div>
        </div>

        {/* Controls & Live Simulator Grid */}
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          {/* Configuration Column */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">Screen Configuration</h3>

            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Maintenance Screen Title
              <input
                value={siteForm.maintenance_title || ""}
                onChange={(e) => updateSiteForm("maintenance_title", e.target.value)}
                placeholder="System Under Scheduled Maintenance"
                className="mt-1.5 w-full rounded border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-rail-red"
              />
            </label>

            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Maintenance Notice / Message
              <textarea
                rows={3}
                value={siteForm.maintenance_message || ""}
                onChange={(e) => updateSiteForm("maintenance_message", e.target.value)}
                placeholder="We are currently upgrading server systems and performing essential depot maintenance..."
                className="mt-1.5 w-full rounded border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-rail-red"
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Estimated Window
                <input
                  value={siteForm.maintenance_estimated_end || ""}
                  onChange={(e) => updateSiteForm("maintenance_estimated_end", e.target.value)}
                  placeholder="Expected to return shortly"
                  className="mt-1.5 w-full rounded border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-rail-red"
                />
              </label>

              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Bypass Key (Testing)
                <input
                  value={siteForm.maintenance_bypass_token || ""}
                  onChange={(e) => updateSiteForm("maintenance_bypass_token", e.target.value)}
                  placeholder="e.g. gjs-preview-2026"
                  className="mt-1.5 w-full rounded border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-rail-red"
                />
              </label>
            </div>

            {/* Quick Share Testing Link */}
            {siteForm.maintenance_bypass_token && (
              <div className="rounded-lg border border-white/10 bg-black/40 p-3 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-400 font-mono truncate text-[11px]">
                    Testing URL: ?bypass={siteForm.maintenance_bypass_token}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof window !== "undefined") {
                        const url = `${window.location.origin}/?bypass=${siteForm.maintenance_bypass_token}`;
                        navigator.clipboard.writeText(url);
                        setCopiedBypass(true);
                        setTimeout(() => setCopiedBypass(false), 2000);
                      }
                    }}
                    className="shrink-0 inline-flex items-center gap-1 rounded bg-white/10 px-2 py-1 text-[11px] font-semibold text-slate-200 hover:text-white hover:bg-white/20 transition"
                  >
                    {copiedBypass ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                    {copiedBypass ? "Copied!" : "Copy URL"}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Testing Area / Live Simulator Box */}
          <div className="flex flex-col justify-between rounded-xl border border-white/10 bg-black/60 p-4">
            <div>
              <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-rail-amber">
                  <Eye size={14} />
                  <span>Interactive Testing Area</span>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href="/maintenance?preview=true"
                    target="_blank"
                    className="inline-flex items-center gap-1 rounded border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-slate-300 hover:text-white hover:bg-white/10 transition"
                  >
                    <ExternalLink size={12} />
                    Fullscreen Preview
                  </Link>
                </div>
              </div>

              {/* Scaled Preview Box */}
              <div className="mt-4 rounded-lg border border-white/10 bg-rail-black/90 p-5 text-center shadow-inner">
                <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-rail-amber/40 bg-rail-amber/10 text-rail-amber">
                  <Wrench size={18} />
                </div>
                <h4 className="text-sm font-black uppercase text-white tracking-tight">
                  {siteForm.maintenance_title || "System Under Scheduled Maintenance"}
                </h4>
                <p className="mt-2 text-xs text-slate-300 line-clamp-3 leading-relaxed">
                  {siteForm.maintenance_message || "We are currently upgrading server systems and performing essential depot maintenance. We'll be back online shortly!"}
                </p>
                {siteForm.maintenance_estimated_end && (
                  <div className="mt-3 inline-flex items-center gap-1.5 rounded bg-white/5 px-2.5 py-1 text-[10px] text-slate-300">
                    <Clock size={12} className="text-rail-amber" />
                    <span>Status Window: {siteForm.maintenance_estimated_end}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
              <span>Preview updates live with above inputs</span>
              <Link
                href="/maintenance"
                target="_blank"
                className="text-rail-amber hover:underline inline-flex items-center gap-1 font-semibold"
              >
                Visit /maintenance route →
              </Link>
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={saveSiteSettings} className="mt-6 space-y-5 rounded border border-white/10 bg-white/[0.03] p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-rail-amber">
              <Image size={20} />
              <h2 className="font-semibold text-white">Homepage image</h2>
            </div>
            <p className="mt-2 text-sm text-slate-400">Paste a Cloudinary or public image URL to replace the train icon card on the home page.</p>
          </div>
          <button type="submit" disabled={saving} className="rounded bg-rail-red px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">
            {saving ? "Saving..." : "Save settings"}
          </button>
        </div>

        <label className="block text-sm font-semibold text-slate-200">
          Home page image URL
          <input
            value={siteForm.hero_image_url}
            onChange={(event) => updateSiteForm("hero_image_url", event.target.value)}
            placeholder="https://res.cloudinary.com/.../image/upload/your-home-image.jpg"
            className="mt-2 w-full rounded border border-white/10 bg-black/40 px-3 py-2 text-white outline-none focus:border-rail-red"
          />
        </label>
        <div className="space-y-3 rounded border border-white/10 bg-black/20 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-200">Home page slideshow image URLs</h3>
              <p className="mt-1 text-xs text-slate-500">Add up to 10 extra slide images. The main image URL above shows first.</p>
            </div>
            <button
              type="button"
              onClick={addSlideshowUrl}
              disabled={slideshowUrls.length >= 10}
              className="rounded border border-white/10 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              Add slide image
            </button>
          </div>
          <div className="space-y-2">
            {slideshowUrls.map((url, index) => (
              <div key={index} className="flex gap-2">
                <input
                  value={url}
                  onChange={(event) => updateSlideshowUrl(index, event.target.value)}
                  placeholder={`Slide image ${index + 1} URL`}
                  className="w-full rounded border border-white/10 bg-black/40 px-3 py-2 text-white outline-none focus:border-rail-red"
                />
                <button
                  type="button"
                  onClick={() => removeSlideshowUrl(index)}
                  className="rounded border border-white/10 px-3 py-2 text-sm font-semibold text-slate-300 hover:text-white"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-500">{slideshowUrls.length}/10 slide image slots used.</p>
        </div>
        <label className="block text-sm font-semibold text-slate-200">
          Image alt text
          <input
            value={siteForm.hero_image_alt}
            onChange={(event) => updateSiteForm("hero_image_alt", event.target.value)}
            className="mt-2 w-full rounded border border-white/10 bg-black/40 px-3 py-2 text-white outline-none focus:border-rail-red"
          />
        </label>

        <div className="border-t border-white/10 pt-5">
          <div className="flex items-center gap-2 text-rail-amber">
            <Megaphone size={20} />
            <h2 className="font-semibold text-white">Entrance popup</h2>
          </div>
          <p className="mt-2 text-sm text-slate-400">Enable this when you want to show an announcement when users enter the web app.</p>
        </div>
        <label className="flex items-center gap-3 text-sm font-semibold text-slate-200">
          <input
            type="checkbox"
            checked={siteForm.popup_enabled}
            onChange={(event) => updateSiteForm("popup_enabled", event.target.checked)}
            className="h-4 w-4 accent-rail-red"
          />
          Enable entrance popup
        </label>
        <label className="block text-sm font-semibold text-slate-200">
          Popup title
          <input
            value={siteForm.popup_title}
            onChange={(event) => updateSiteForm("popup_title", event.target.value)}
            className="mt-2 w-full rounded border border-white/10 bg-black/40 px-3 py-2 text-white outline-none focus:border-rail-red"
          />
        </label>
        <label className="block text-sm font-semibold text-slate-200">
          Popup message
          <textarea
            value={siteForm.popup_message}
            onChange={(event) => updateSiteForm("popup_message", event.target.value)}
            rows={4}
            placeholder="Example: New Vande Bharat combo pack is live. Login and download from your account after payment."
            className="mt-2 w-full rounded border border-white/10 bg-black/40 px-3 py-2 text-white outline-none focus:border-rail-red"
          />
        </label>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block text-sm font-semibold text-slate-200">
            Popup button text
            <input
              value={siteForm.popup_button_text}
              onChange={(event) => updateSiteForm("popup_button_text", event.target.value)}
              className="mt-2 w-full rounded border border-white/10 bg-black/40 px-3 py-2 text-white outline-none focus:border-rail-red"
            />
          </label>
          <label className="block text-sm font-semibold text-slate-200">
            Popup button URL
            <input
              value={siteForm.popup_button_url}
              onChange={(event) => updateSiteForm("popup_button_url", event.target.value)}
              placeholder="/assets"
              className="mt-2 w-full rounded border border-white/10 bg-black/40 px-3 py-2 text-white outline-none focus:border-rail-red"
            />
          </label>
        </div>
        <div className="border-t border-white/10 pt-5">
          <div className="flex items-center gap-2 text-rail-amber">
            <Megaphone size={20} />
            <h2 className="font-semibold text-white">Home page scrolling message</h2>
          </div>
          <p className="mt-2 text-sm text-slate-400">Show a moving announcement bar on the home page for coming soon products, offers, or support updates.</p>
        </div>
        <label className="flex items-center gap-3 text-sm font-semibold text-slate-200">
          <input
            type="checkbox"
            checked={siteForm.scroller_enabled}
            onChange={(event) => updateSiteForm("scroller_enabled", event.target.checked)}
            className="h-4 w-4 accent-rail-red"
          />
          Enable home page scroller
        </label>
        <label className="block text-sm font-semibold text-slate-200">
          Scroller message
          <input
            value={siteForm.scroller_message}
            onChange={(event) => updateSiteForm("scroller_message", event.target.value)}
            placeholder="COMING SOON: GJS Vande Bharat Express Train Pack - Detailed Model, Functional Cab, Custom Sounds and Door Animations."
            className="mt-2 w-full rounded border border-white/10 bg-black/40 px-3 py-2 text-white outline-none focus:border-rail-red"
          />
        </label>

        {/* Desktop App Distribution */}
        <div className="border-t border-white/10 pt-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-rail-amber">
              <MonitorDown size={20} />
              <h2 className="font-semibold text-white">Desktop App Distribution (Windows)</h2>
            </div>
            <Link
              href="/download-app"
              target="_blank"
              className="inline-flex items-center gap-1 text-xs text-slate-300 hover:text-rail-amber transition"
            >
              <span>Preview Download Page</span>
              <ExternalLink size={13} />
            </Link>
          </div>
          <p className="mt-2 text-sm text-slate-400">
            Control the desktop app feature, public download links, and direct file URL across your entire website.
          </p>
        </div>

        {/* Master Visibility Switch */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-white/10 bg-black/40 p-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white">Public Desktop App Feature</span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                  siteForm.desktop_app_enabled
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    : "bg-red-500/20 text-red-400 border border-red-500/30"
                }`}
              >
                {siteForm.desktop_app_enabled ? "Visible (Active)" : "Hidden (Disabled)"}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              When disabled, all desktop app buttons in the navbar, header, and footer will be hidden from visitors, and the download page will show a private testing notice.
            </p>
          </div>

          <label className="relative inline-flex cursor-pointer items-center">
            <input
              type="checkbox"
              checked={Boolean(siteForm.desktop_app_enabled)}
              onChange={(e) => updateSiteForm("desktop_app_enabled", e.target.checked)}
              className="peer sr-only"
            />
            <div className="h-6 w-11 rounded-full bg-neutral-800 peer-focus:outline-none peer-checked:bg-rail-red after:absolute after:top-[2px] after:left-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full peer-checked:after:border-white"></div>
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <label className="block text-sm font-semibold text-slate-200 md:col-span-2">
            Desktop App Download URL
            <input
              value={siteForm.desktop_app_download_url || ""}
              onChange={(event) => updateSiteForm("desktop_app_download_url", event.target.value)}
              placeholder="https://github.com/gjs24/msts-gjs-desktop-releases/releases/download/v1.0.0/MSTS-GJS.Production.Store.Setup.1.0.0.exe"
              className="mt-2 w-full rounded border border-white/10 bg-black/40 px-3 py-2 text-white outline-none focus:border-rail-red"
            />
            <span className="mt-1 block text-xs text-slate-500">
              Users who click &quot;Download for Windows&quot; on <code className="text-slate-400">/download-app</code> will be directed to this file link.
            </span>
          </label>

          <label className="block text-sm font-semibold text-slate-200">
            Release Version
            <input
              value={siteForm.desktop_app_version || ""}
              onChange={(event) => updateSiteForm("desktop_app_version", event.target.value)}
              placeholder="1.0.0"
              className="mt-2 w-full rounded border border-white/10 bg-black/40 px-3 py-2 text-white outline-none focus:border-rail-red"
            />
            <span className="mt-1 block text-xs text-slate-500">
              Shown on the download badge (e.g. 1.0.0).
            </span>
          </label>
        </div>

        <div className="flex items-center justify-between border-t border-white/10 pt-4">
          <div>{status ? <p className="text-sm text-rail-amber">{status}</p> : null}</div>
          <button
            type="submit"
            disabled={saving}
            className="rounded bg-rail-red px-5 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-rail-red/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save all settings"}
          </button>
        </div>
      </form>
    </AdminLayout>
  );
}

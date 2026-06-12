"use client";

import { type FormEvent, useEffect, useState } from "react";
import { CreditCard, Database, Image, Megaphone, ShieldCheck } from "lucide-react";
import { AdminLoginNote } from "@/components/admin-login-note";
import { AdminLayout } from "@/components/admin-table";
import { adminGet, adminPatch, type AdminSettings } from "@/lib/admin-api";
import { fallbackSiteSettings } from "@/lib/api";

const fallbackSettings: AdminSettings = {
  api_status: "offline",
  payments: { razorpay_configured: false, stripe_configured: false },
  storage: { cloudinary_configured: false, media_url: "/media/" },
  security: { debug: true, allowed_hosts: ["localhost"], download_rate_limit: "20/hour" },
  site: fallbackSiteSettings
};

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<AdminSettings>(fallbackSettings);
  const [siteForm, setSiteForm] = useState(fallbackSettings.site);
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const slideshowUrls = siteForm.hero_slideshow_urls
    ? siteForm.hero_slideshow_urls.split(/\r?\n/).slice(0, 10)
    : [""];

  useEffect(() => {
    adminGet<AdminSettings>("/admin/settings/", fallbackSettings).then((data) => {
      setSettings(data);
      setSiteForm({ ...fallbackSettings.site, ...(data.site || {}) });
    });
  }, []);

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
          <p className="mt-3 text-sm text-slate-400">Razorpay: {settings.payments.razorpay_configured ? "Configured" : "Missing keys"}</p>
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
        {status ? <p className="text-sm text-rail-amber">{status}</p> : null}
      </form>
    </AdminLayout>
  );
}

"use client";

import { useEffect, useState } from "react";
import { CreditCard, Database, ShieldCheck } from "lucide-react";
import { AdminLoginNote } from "@/components/admin-login-note";
import { AdminLayout } from "@/components/admin-table";
import { adminGet, type AdminSettings } from "@/lib/admin-api";

const fallbackSettings: AdminSettings = {
  api_status: "offline",
  payments: { razorpay_configured: false, stripe_configured: false },
  storage: { cloudinary_configured: false, media_url: "/media/" },
  security: { debug: true, allowed_hosts: ["localhost"], download_rate_limit: "20/hour" }
};

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<AdminSettings>(fallbackSettings);

  useEffect(() => {
    adminGet<AdminSettings>("/admin/settings/", fallbackSettings).then(setSettings);
  }, []);

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
    </AdminLayout>
  );
}

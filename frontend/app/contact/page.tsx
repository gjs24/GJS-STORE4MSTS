import type { Metadata } from "next";
import { Building2, Mail, MapPin, MessageSquare, Phone, ShieldQuestion } from "lucide-react";
import { PageShell } from "@/components/page-shell";

const businessName = process.env.NEXT_PUBLIC_BUSINESS_NAME || "MSTS-GJS Production Store";
const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "gjs2721@gmail.com";
const supportPhone = process.env.NEXT_PUBLIC_SUPPORT_PHONE || "+91-7845727002";
const businessAddress = process.env.NEXT_PUBLIC_BUSINESS_ADDRESS || "No 18 Kamala Nehru Colony, Arumuganeri, Tamilnadu, India - 628202";
const legalOwnerName = process.env.NEXT_PUBLIC_LEGAL_OWNER_NAME || "GNANAJEBASEELAN G";

export const metadata: Metadata = {
  title: "Contact Us | MSTS-GJS Production Store",
  description: "Contact MSTS-GJS Production Store for digital download, payment, and account support."
};

export default function ContactPage() {
  return (
    <PageShell title="Contact Us" eyebrow="MSTS-GJS Production Store support">
      <div className="grid gap-5 md:grid-cols-[.9fr_1.1fr]">
        <div className="space-y-3">
          <div className="rounded border border-white/10 bg-white/[0.03] p-5">
            <Building2 className="mb-3 text-rail-amber" />
            <h2 className="font-semibold text-white">{businessName}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Digital asset store for MSTS and Open Rails train models, routes, textures, sounds, cab views, and 3D assets.
            </p>
            <p className="mt-3 text-sm text-slate-400">Owned and operated by {legalOwnerName}.</p>
          </div>
          <div className="rounded border border-white/10 bg-white/[0.03] p-5">
            <Mail className="mb-3 text-rail-amber" />
            <h2 className="font-semibold text-white">Support Email</h2>
            <p className="mt-2 text-sm text-slate-400">{supportEmail}</p>
          </div>
          <div className="rounded border border-white/10 bg-white/[0.03] p-5">
            <Phone className="mb-3 text-rail-amber" />
            <h2 className="font-semibold text-white">Phone</h2>
            <p className="mt-2 text-sm text-slate-400">{supportPhone}</p>
          </div>
          <div className="rounded border border-white/10 bg-white/[0.03] p-5">
            <MapPin className="mb-3 text-rail-amber" />
            <h2 className="font-semibold text-white">Address</h2>
            <p className="mt-2 text-sm text-slate-400">{businessAddress}</p>
          </div>
          <div className="rounded border border-white/10 bg-white/[0.03] p-5">
            <ShieldQuestion className="mb-3 text-rail-amber" />
            <h2 className="font-semibold text-white">Support Scope</h2>
            <p className="mt-2 text-sm text-slate-400">Download access, Cashfree payment status, order issues, file access, and installation queries.</p>
          </div>
        </div>
        <form action={`mailto:${supportEmail}`} method="post" encType="text/plain" className="cinematic-panel space-y-4 rounded-lg p-6">
          <div>
            <h2 className="text-xl font-semibold text-white">Send a Support Request</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Include your order ID or payment reference for faster help with digital downloads.
            </p>
          </div>
          <input name="name" placeholder="Name" className="w-full rounded border border-white/10 bg-black/40 px-3 py-3" />
          <input name="email" type="email" placeholder="Email" className="w-full rounded border border-white/10 bg-black/40 px-3 py-3" />
          <input name="phone" type="tel" placeholder="Phone number" className="w-full rounded border border-white/10 bg-black/40 px-3 py-3" />
          <input name="orderId" placeholder="Order ID or payment reference" className="w-full rounded border border-white/10 bg-black/40 px-3 py-3" />
          <textarea name="message" placeholder="Message" rows={6} className="w-full rounded border border-white/10 bg-black/40 px-3 py-3" />
          <button type="submit" className="rounded bg-rail-red px-5 py-3 font-semibold">
            <MessageSquare className="mr-2 inline" size={18} /> Send message
          </button>
          <p className="text-xs leading-5 text-slate-500">
            This form is for support enquiries related to MSTS-GJS Production Store digital products.
          </p>
        </form>
      </div>
    </PageShell>
  );
}

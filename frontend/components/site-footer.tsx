import Link from "next/link";
import { CheckCircle2, DownloadCloud, Mail, Phone, ShieldCheck, TrainFront } from "lucide-react";

const policyLinks = [
  ["Privacy Policy", "/privacy-policy"],
  ["Terms & Conditions", "/terms-and-conditions"],
  ["Cancellation & Refund Policy", "/cancellation-refund-policy"],
  ["Shipping & Delivery Policy", "/shipping-delivery-policy"],
  ["Contact Us", "/contact"]
];

const quickLinks = [
  ["All Assets", "/assets"],
  ["Upcoming Releases", "/assets?upcoming=true"],
  ["Free Assets", "/assets?price=free"],
  ["Deals & Offers", "/assets?deal=true"],
  ["Asset Categories", "/categories"],
  ["User Dashboard", "/dashboard"]
];

const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "gjs2721@gmail.com";
const supportPhone = process.env.NEXT_PUBLIC_SUPPORT_PHONE || "+91-7845727002";
const legalOwnerName = process.env.NEXT_PUBLIC_LEGAL_OWNER_NAME || "GNANAJEBASEELAN G";

export function SiteFooter() {
  return (
    <footer className="border-t border-white/10 bg-rail-black transition-colors">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-[1.4fr_0.9fr_0.9fr_1fr] lg:gap-10">
        {/* Column 1: Brand & Details */}
        <div className="space-y-4">
          <Link href="/" className="group inline-flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rail-red text-white shadow-glow transition-transform duration-300 group-hover:scale-105">
              <TrainFront size={22} />
            </span>
            <span>
              <span className="block text-sm font-black uppercase tracking-wider text-white transition-colors group-hover:text-rail-amber">
                GJS Production
              </span>
              <span className="block text-xs font-medium text-slate-400">MSTS & Open Rails Store</span>
            </span>
          </Link>

          <p className="text-xs sm:text-sm leading-relaxed text-slate-400 max-w-md">
            The premier marketplace for Microsoft Train Simulator and Open Rails digital assets. Featuring custom Indian locomotives, routes, liveries, realistic horn audio, cab views, and scenery objects.
          </p>

          <div className="space-y-1 text-xs text-slate-400">
            <p>Merchant: <span className="font-semibold text-slate-300">{legalOwnerName}</span></p>
            <p>Pricing Currency: <span className="font-semibold text-slate-300">Indian Rupees (INR ₹)</span></p>
          </div>
        </div>

        {/* Column 2: Quick Links */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-white">Store Directory</h3>
          <nav className="mt-4 flex flex-col gap-2.5 text-xs sm:text-sm text-slate-400">
            {quickLinks.map(([label, href]) => (
              <Link key={href} href={href} className="transition-colors hover:text-rail-amber">
                {label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Column 3: Legal & Policies */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-white">Policies & Trust</h3>
          <nav className="mt-4 flex flex-col gap-2.5 text-xs sm:text-sm text-slate-400">
            {policyLinks.map(([label, href]) => (
              <Link key={href} href={href} className="transition-colors hover:text-rail-amber">
                {label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Column 4: Contact & Security Badges */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-white">Direct Support</h3>

          <div className="space-y-2 text-xs sm:text-sm text-slate-400">
            <a
              href={`mailto:${supportEmail}`}
              className="flex items-center gap-2.5 transition-colors hover:text-white"
            >
              <Mail size={16} className="text-rail-amber shrink-0" />
              <span>{supportEmail}</span>
            </a>

            <a
              href={`https://wa.me/${supportPhone.replace(/[^0-9]/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2.5 transition-colors hover:text-white"
            >
              <Phone size={16} className="text-emerald-400 shrink-0" />
              <span>{supportPhone}</span>
            </a>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3.5 space-y-2 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <ShieldCheck size={16} className="text-rail-amber shrink-0" />
              <span>Cashfree Payments Secured</span>
            </div>
            <div className="flex items-center gap-2">
              <DownloadCloud size={16} className="text-rail-amber shrink-0" />
              <span>Instant Digital Delivery</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-rail-amber shrink-0" />
              <span>Tested for MSTS & Open Rails</span>
            </div>
          </div>
        </div>
      </div>

      {/* Copyright Bar */}
      <div className="border-t border-white/10 px-4 py-4 text-center text-xs text-slate-500">
        &copy; {new Date().getFullYear()} MSTS-GJS Production Store. Owned & operated by {legalOwnerName}. All Rights Reserved.
      </div>
    </footer>
  );
}


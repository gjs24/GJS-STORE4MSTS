import Link from "next/link";
import { Mail, ShieldCheck, TrainFront } from "lucide-react";

const policyLinks = [
  ["Privacy Policy", "/privacy-policy"],
  ["Terms & Conditions", "/terms-and-conditions"],
  ["Cancellation & Refund Policy", "/cancellation-refund-policy"],
  ["Shipping/Delivery Policy", "/shipping-delivery-policy"],
  ["Contact Us", "/contact"]
];

export function SiteFooter() {
  return (
    <footer className="border-t border-white/10 bg-rail-black">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 md:grid-cols-[1.2fr_.8fr_.8fr]">
        <div>
          <Link href="/" className="inline-flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded bg-rail-red shadow-glow">
              <TrainFront size={22} />
            </span>
            <span>
              <span className="block text-sm font-semibold uppercase tracking-wide text-white">GJS Production</span>
              <span className="block text-xs text-slate-400">MSTS-GJS Store</span>
            </span>
          </Link>
          <p className="mt-4 max-w-xl text-sm leading-6 text-slate-400">
            MSTS-GJS Production Store is a digital asset marketplace for MSTS and Open Rails downloads including train models,
            routes, textures, sounds, cab views, and 3D assets.
          </p>
        </div>

        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-white">Policies</h2>
          <nav className="mt-4 grid gap-2 text-sm text-slate-400">
            {policyLinks.map(([label, href]) => (
              <Link key={href} href={href} className="hover:text-white">
                {label}
              </Link>
            ))}
          </nav>
        </div>

        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-white">Support</h2>
          <div className="mt-4 space-y-3 text-sm text-slate-400">
            <p className="flex gap-2">
              <Mail className="mt-0.5 h-4 w-4 text-rail-amber" />
              support@msts-gjs.example
            </p>
            <p className="flex gap-2">
              <ShieldCheck className="mt-0.5 h-4 w-4 text-rail-amber" />
              Secure payments processed by Razorpay.
            </p>
          </div>
        </div>
      </div>
      <div className="border-t border-white/10 px-4 py-4 text-center text-xs text-slate-500">
        &copy; 2026 MSTS-GJS Production Store. Independent digital asset platform.
      </div>
    </footer>
  );
}

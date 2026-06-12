import Link from "next/link";
import { Download, Heart, PackageCheck, User, type LucideIcon } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { ProfilePanel } from "@/components/profile-panel";

export default function DashboardPage() {
  const cards: Array<[string, string, LucideIcon]> = [
    ["My purchases", "/dashboard/purchases", PackageCheck],
    ["Download history", "/dashboard/downloads", Download],
    ["Wishlist", "/wishlist", Heart],
    ["Profile", "/dashboard", User]
  ];
  return (
    <PageShell title="User Dashboard" eyebrow="Your simulator library">
      <ProfilePanel />
      <div className="grid gap-4 md:grid-cols-4">
        {cards.map(([label, href, Icon]) => (
          <Link key={href} href={href} className="rounded border border-white/10 bg-white/[0.03] p-5 hover:border-rail-red">
            <Icon className="mb-4 text-rail-amber" />
            <h2 className="font-semibold">{label}</h2>
            <p className="mt-2 text-sm text-slate-400">Manage your GJS Production account content.</p>
          </Link>
        ))}
      </div>
    </PageShell>
  );
}

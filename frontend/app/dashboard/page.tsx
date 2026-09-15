import Link from "next/link";
import { Download, Heart, PackageCheck, TrainFront, User, type LucideIcon } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { ProfilePanel } from "@/components/profile-panel";

export default function DashboardPage() {
  const cards: Array<[string, string, LucideIcon, string]> = [
    ["My purchases", "/dashboard/purchases", PackageCheck, "View paid asset and LED nameboard access."],
    ["Board Studio", "/board-studio", TrainFront, "Design authentic Indian Railways LED texture boards."],
    ["Download history", "/dashboard/downloads", Download, "Track your simulator package download logs."],
    ["Wishlist", "/wishlist", Heart, "Quick access to your saved railway packs."],
    ["Profile", "/dashboard/profile", User, "Manage your name and verified store email."]
  ];
  return (
    <PageShell title="User Dashboard" eyebrow="Your simulator library">
      <ProfilePanel />
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        {cards.map(([label, href, Icon, desc]) => (
          <Link key={href} href={href} className="rounded border border-white/10 bg-white/[0.03] p-5 hover:border-rail-red transition-all">
            <Icon className="mb-4 text-rail-amber" size={24} />
            <h2 className="font-semibold">{label}</h2>
            <p className="mt-2 text-sm text-slate-400">{desc}</p>
          </Link>
        ))}
      </div>
    </PageShell>
  );
}

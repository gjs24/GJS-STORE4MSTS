import Link from "next/link";
import {
  ArrowRight,
  Download,
  Gauge,
  Layers,
  Map,
  Palette,
  Sparkles,
  TrainFront,
  Volume2
} from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { getCategories } from "@/lib/api";

function getCategoryIcon(slug: string) {
  switch (slug) {
    case "trains":
      return TrainFront;
    case "routes":
      return Map;
    case "sounds":
      return Volume2;
    case "cab-views":
      return Gauge;
    case "textures":
      return Palette;
    case "free-downloads":
      return Download;
    case "premium-downloads":
      return Sparkles;
    default:
      return Layers;
  }
}

export default async function CategoriesPage() {
  const categories = await getCategories();

  return (
    <PageShell title="Asset Categories" eyebrow="Browse the depot">
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {categories.map((category) => {
          const Icon = getCategoryIcon(category.slug);
          return (
            <Link
              key={category.slug}
              href={`/assets?category=${category.slug}`}
              className="card-shine group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-[#0c182b]/80 via-rail-navy/60 to-rail-black/95 p-6 shadow-xl transition-all duration-300 hover:-translate-y-1.5 hover:border-rail-red/40 hover:shadow-[0_16px_36px_rgba(0,0,0,0.5),0_0_24px_rgba(239,59,45,0.18)]"
            >
              <div>
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-rail-red/20 text-rail-red transition-all duration-300 group-hover:scale-105 group-hover:bg-rail-red group-hover:text-white group-hover:shadow-glow">
                  <Icon size={28} />
                </div>
                <h2 className="text-xl font-bold text-white transition-colors group-hover:text-rail-amber">
                  {category.name}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">
                  {category.description}
                </p>
              </div>

              <div className="mt-6 flex items-center justify-between border-t border-white/[0.08] pt-4 text-xs font-semibold">
                <span className="rounded-full bg-white/[0.06] px-3 py-1 text-rail-amber">
                  {category.asset_count || 0} packs available
                </span>
                <span className="flex items-center gap-1 text-slate-300 transition-colors group-hover:text-white">
                  <span>Explore</span>
                  <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </PageShell>
  );
}


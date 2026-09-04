import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BadgeIndianRupee,
  Download,
  Flame,
  Gauge,
  Layers,
  Map,
  Palette,
  ShieldCheck,
  Sparkles,
  TrainFront,
  Volume2
} from "lucide-react";
import { AssetCard } from "@/components/asset-card";
import { HomeHeroSlideshow } from "@/components/home-hero-slideshow";
import { getAssets, getCategories, getSiteSettings } from "@/lib/api";

const legalOwnerName = process.env.NEXT_PUBLIC_LEGAL_OWNER_NAME || "GNANAJEBASEELAN G";

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

export default async function HomePage() {
  const [assets, upcomingAssets, categories, siteSettings] = await Promise.all([
    getAssets("/assets/?featured=true"),
    getAssets("/assets/?upcoming=true"),
    getCategories(),
    getSiteSettings()
  ]);
  const heroImages = [
    siteSettings.hero_image_url,
    ...siteSettings.hero_slideshow_urls.split(/\r?\n/).map((url) => url.trim())
  ].filter(Boolean);

  return (
    <section className="rail-grid min-h-screen">
      {/* Hero Section */}
      <div className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(5,7,11,.98),rgba(7,19,33,.75)),radial-gradient(circle_at_80%_20%,rgba(239,59,45,.28),transparent_40%)]" />
        <div className="relative mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:py-16 md:grid-cols-[1.1fr_.9fr] md:gap-12 md:py-24">
          <div className="flex flex-col justify-center max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-rail-amber/30 bg-rail-amber/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-rail-amber w-max mb-4 shadow-sm">
              <Flame size={14} className="text-rail-amber" />
              MSTS & Open Rails Marketplace
            </div>

            <h1 className="text-3xl font-black leading-tight text-white sm:text-5xl lg:text-6xl tracking-tight">
              MSTS-GJS <br className="hidden sm:block" />
              <span className="bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
                Production Store
              </span>
            </h1>

            <p className="mt-4 text-base sm:text-lg leading-relaxed text-slate-300 max-w-2xl">
              Download premium railway assets created by GJS Production: authentic Indian locomotives, high-speed consists, detailed routes, functional cab views, realistic horn sounds, and custom liveries.
            </p>

            <p className="mt-3 text-xs sm:text-sm leading-relaxed text-slate-400 max-w-2xl">
              Merchant: <strong className="text-slate-300">{legalOwnerName}</strong>. All paid digital downloads are priced in Indian Rupees (INR) and processed securely via Cashfree Payments.
            </p>

            {/* CTAs */}
            <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row gap-3">
              <Link
                href="/assets"
                className="flex items-center justify-center rounded-xl bg-rail-red px-6 py-3.5 text-sm font-bold text-white shadow-glow transition-all duration-200 hover:bg-rail-red/90 hover:scale-[1.02] active:scale-[0.98]"
              >
                Browse Assets <ArrowRight className="ml-2 inline" size={18} />
              </Link>
              <Link
                href="/categories"
                className="flex items-center justify-center rounded-xl border border-white/15 bg-white/[0.04] px-6 py-3.5 text-sm font-semibold text-white transition-all duration-200 hover:border-white/30 hover:bg-white/[0.08]"
              >
                Explore Categories
              </Link>
            </div>

            {/* Feature Badges */}
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs sm:text-sm text-slate-300">
              <span className="flex items-center gap-2.5 rounded-lg border border-white/10 bg-white/[0.04] p-3 backdrop-blur-md">
                <Download size={18} className="text-rail-amber shrink-0" />
                <span className="font-medium">Instant Downloads</span>
              </span>
              <span className="flex items-center gap-2.5 rounded-lg border border-white/10 bg-white/[0.04] p-3 backdrop-blur-md">
                <BadgeIndianRupee size={18} className="text-rail-amber shrink-0" />
                <span className="font-medium">INR Pricing & UPI</span>
              </span>
              <span className="flex items-center gap-2.5 rounded-lg border border-white/10 bg-white/[0.04] p-3 backdrop-blur-md">
                <ShieldCheck size={18} className="text-rail-amber shrink-0" />
                <span className="font-medium">JWT Secure Access</span>
              </span>
            </div>
          </div>

          {/* Hero Media Card */}
          <div className="cinematic-panel hero-media-card relative flex min-h-[280px] sm:min-h-[360px] md:min-h-[420px] items-center justify-center overflow-hidden rounded-2xl shadow-2xl">
            <HomeHeroSlideshow
              images={heroImages}
              alt={siteSettings.hero_image_alt || "MSTS-GJS Production Store railway asset preview"}
            />
          </div>
        </div>

        {/* Scroller Banner */}
        {siteSettings.scroller_enabled && siteSettings.scroller_message ? (
          <div className="relative border-t border-white/10 bg-black/50 backdrop-blur-md">
            <div className="mx-auto max-w-7xl overflow-hidden px-4 py-2.5">
              <div className="home-announcement-track text-xs sm:text-sm font-bold uppercase tracking-wider text-rail-amber">
                <span>{siteSettings.scroller_message}</span>
                <span aria-hidden="true">{siteSettings.scroller_message}</span>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* Featured Releases Section */}
      <div className="mx-auto max-w-7xl px-4 py-12 sm:py-16">
        <div className="mb-6 sm:mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs sm:text-sm font-bold uppercase tracking-wider text-rail-amber">Featured Releases</p>
            <h2 className="mt-1 text-2xl sm:text-3xl font-black text-white">Premium Railway Assets</h2>
          </div>
          <Link
            href="/assets"
            className="group flex items-center gap-1 text-xs sm:text-sm font-semibold text-rail-amber hover:text-white transition-colors"
          >
            <span>View all assets</span>
            <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {assets.map((asset) => (
            <AssetCard key={asset.id} asset={asset} />
          ))}
        </div>
      </div>

      {/* Upcoming Products Section */}
      <div className="mx-auto max-w-7xl px-4 pb-12 sm:pb-16">
        <div className="mb-6 sm:mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs sm:text-sm font-bold uppercase tracking-wider text-rail-amber">In The Pipeline</p>
            <h2 className="mt-1 text-2xl sm:text-3xl font-black text-white">Upcoming Products</h2>
          </div>
          <Link
            href="/assets?upcoming=true"
            className="group flex items-center gap-1 text-xs sm:text-sm font-semibold text-rail-amber hover:text-white transition-colors"
          >
            <span>Preview all upcoming</span>
            <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

        {upcomingAssets.length ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {upcomingAssets.slice(0, 3).map((asset) => (
              <AssetCard key={asset.id} asset={asset} />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-8 text-center text-sm text-slate-400">
            No upcoming products announced right now. Check back soon!
          </div>
        )}
      </div>

      {/* Category Directory Cards */}
      <div className="mx-auto max-w-7xl px-4 pb-16 sm:pb-24">
        <div className="mb-6 sm:mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs sm:text-sm font-bold uppercase tracking-wider text-rail-amber">The Railway Depot</p>
            <h2 className="mt-1 text-2xl sm:text-3xl font-black text-white">Explore By Category</h2>
          </div>
          <Link
            href="/categories"
            className="group flex items-center gap-1 text-xs sm:text-sm font-semibold text-rail-amber hover:text-white transition-colors"
          >
            <span>All categories</span>
            <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((category) => {
            const Icon = getCategoryIcon(category.slug);
            return (
              <Link
                key={category.slug}
                href={`/assets?category=${category.slug}`}
                className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.02] p-5 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:border-rail-red/40 hover:bg-white/[0.08]"
              >
                <div>
                  <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-rail-red/20 text-rail-red transition-all duration-300 group-hover:bg-rail-red group-hover:text-white group-hover:shadow-glow">
                    <Icon size={22} />
                  </div>
                  <h3 className="text-base font-bold text-white transition-colors group-hover:text-rail-amber">
                    {category.name}
                  </h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
                    {category.description}
                  </p>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-white/[0.06] pt-3 text-xs font-semibold text-rail-amber">
                  <span>Browse packs</span>
                  <ArrowUpRight size={14} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}


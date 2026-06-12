import Link from "next/link";
import { ArrowRight, BadgeIndianRupee, Download, ShieldCheck } from "lucide-react";
import { AssetCard } from "@/components/asset-card";
import { HomeHeroSlideshow } from "@/components/home-hero-slideshow";
import { getAssets, getCategories, getSiteSettings } from "@/lib/api";

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
      <div className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(5,7,11,.98),rgba(7,19,33,.72)),radial-gradient(circle_at_75%_20%,rgba(239,59,45,.35),transparent_35%)]" />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-16 md:grid-cols-[1.1fr_.9fr] md:py-24">
          <div className="max-w-3xl">
            <p className="mb-4 text-sm font-semibold uppercase text-rail-amber">MSTS and Open Rails marketplace</p>
            <h1 className="text-4xl font-black leading-tight text-white md:text-6xl">MSTS-GJS Production Store</h1>
            <p className="mt-5 max-w-2xl text-lg text-slate-300">
              Download professional train simulator assets from GJS Production: locomotives, routes, cab views, sounds, textures, updates, logos, and 3D-ready packs.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/assets" className="rounded bg-rail-red px-5 py-3 font-semibold text-white shadow-glow">
                Browse assets <ArrowRight className="ml-2 inline" size={18} />
              </Link>
              <Link href="/categories" className="rounded border border-white/15 px-5 py-3 font-semibold text-white">
                Explore categories
              </Link>
            </div>
            <div className="mt-8 grid max-w-2xl grid-cols-3 gap-3 text-sm text-slate-300">
              <span className="rounded border border-white/10 bg-white/5 p-3"><Download size={18} /> Protected downloads</span>
              <span className="rounded border border-white/10 bg-white/5 p-3"><BadgeIndianRupee size={18} /> Razorpay ready</span>
              <span className="rounded border border-white/10 bg-white/5 p-3"><ShieldCheck size={18} /> JWT secure</span>
            </div>
          </div>
          <div className="cinematic-panel hero-media-card relative flex min-h-[320px] items-center justify-center overflow-hidden rounded-lg">
            <HomeHeroSlideshow images={heroImages} alt={siteSettings.hero_image_alt || "MSTS-GJS Production Store railway asset preview"} />
          </div>
        </div>
        {siteSettings.scroller_enabled && siteSettings.scroller_message ? (
          <div className="relative border-t border-white/10 bg-black/45">
            <div className="mx-auto max-w-7xl overflow-hidden px-4 py-3">
              <div className="home-announcement-track text-sm font-semibold uppercase tracking-wide text-rail-amber">
                <span>{siteSettings.scroller_message}</span>
                <span aria-hidden="true">{siteSettings.scroller_message}</span>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <p className="text-sm font-semibold uppercase text-rail-amber">Featured releases</p>
            <h2 className="text-3xl font-bold">Premium railway assets</h2>
          </div>
          <Link href="/assets" className="text-sm text-rail-amber">View all</Link>
        </div>
        <div className="grid gap-5 md:grid-cols-3">{assets.map((asset) => <AssetCard key={asset.id} asset={asset} />)}</div>
      </div>

      <div className="mx-auto max-w-7xl px-4 pb-12">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <p className="text-sm font-semibold uppercase text-rail-amber">Coming soon</p>
            <h2 className="text-3xl font-bold">Upcoming products</h2>
          </div>
          <Link href="/assets?upcoming=true" className="text-sm text-rail-amber">Preview all</Link>
        </div>
        {upcomingAssets.length ? (
          <div className="grid gap-5 md:grid-cols-3">{upcomingAssets.slice(0, 3).map((asset) => <AssetCard key={asset.id} asset={asset} />)}</div>
        ) : (
          <div className="rounded border border-white/10 bg-white/[0.03] p-5 text-sm text-slate-400">
            No upcoming products announced yet.
          </div>
        )}
      </div>

      <div className="mx-auto max-w-7xl px-4 pb-16">
        <div className="grid gap-3 md:grid-cols-4">
          {categories.map((category) => (
            <Link key={category.slug} href={`/assets?category=${category.slug}`} className="rounded border border-white/10 bg-white/[0.03] p-4 hover:border-rail-red">
              <h3 className="font-semibold">{category.name}</h3>
              <p className="mt-1 text-sm text-slate-400">{category.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

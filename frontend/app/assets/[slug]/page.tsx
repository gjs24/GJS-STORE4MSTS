import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { CheckCircle2, HardDriveDownload, ShieldCheck, Star, TrainFront } from "lucide-react";
import { AssetActions } from "@/components/asset-actions";
import { PriceDisplay } from "@/components/price-display";
import { ReviewSection } from "@/components/review-section";
import { API_URL, Asset, fallbackAssets } from "@/lib/api";

async function getAsset(slug: string): Promise<Asset> {
  try {
    const res = await fetch(`${API_URL}/assets/${slug}/`, { next: { revalidate: 60 } });
    if (!res.ok) throw new Error("not found");
    return res.json();
  } catch {
    const fallback = fallbackAssets.find((asset) => asset.slug === slug);
    if (fallback) return fallback;
    notFound();
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const asset = await getAsset(slug);
  return {
    title: `${asset.title} | MSTS-GJS Production Store`,
    description: asset.short_description || asset.description || "MSTS and Open Rails digital asset download.",
    openGraph: {
      title: asset.title,
      description: asset.short_description,
      images: asset.thumbnail ? [asset.thumbnail] : []
    }
  };
}

export default async function AssetDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const asset = await getAsset(slug);
  const showDeal = Boolean(asset.deal_is_open && !asset.is_upcoming && !asset.is_free && Number(asset.discount_percent || 0) > 0);
  const galleryUrlImages = (asset.gallery_image_urls || "")
    .split(/\r?\n/)
    .map((url, index) => ({ id: index + 1000, image: url.trim(), alt_text: `${asset.title} screenshot ${index + 1}`, sort_order: index + 1 }))
    .filter((image) => image.image);
  const galleryImages = [
    asset.thumbnail ? { id: 0, image: asset.thumbnail, alt_text: asset.title, sort_order: 0 } : null,
    ...(asset.images || []),
    ...galleryUrlImages
  ].filter((image): image is { id: number; image?: string | null; alt_text: string; sort_order: number } => Boolean(image?.image));

  return (
    <section className="rail-grid min-h-screen px-4 py-10">
      <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1.1fr_.9fr]">
        <div className="cinematic-panel relative flex aspect-video items-center justify-center overflow-hidden rounded-lg">
          {asset.thumbnail ? (
            <Image src={asset.thumbnail} alt={asset.title} fill sizes="(min-width: 1024px) 55vw, 100vw" className="object-cover" />
          ) : (
            <TrainFront className="h-32 w-32 text-white" />
          )}
          <div className="absolute bottom-4 left-4 flex flex-wrap gap-2 text-xs">
            <span className="rounded bg-black/75 px-3 py-2 text-white">{asset.simulator_type.replace("_", " ")}</span>
            <span className="rounded bg-black/75 px-3 py-2 text-white">{asset.file_size}</span>
            {showDeal ? (
              <span className="rounded bg-rail-amber px-3 py-2 font-black text-black">{asset.deal_badge || "Limited Time"}</span>
            ) : null}
            <span className="rounded bg-rail-red px-3 py-2 font-semibold text-white">
              {asset.is_upcoming ? "Coming soon" : asset.is_free ? "Free release" : asset.discount_percent ? `${asset.discount_percent}% OFF` : `INR ${asset.price}`}
            </span>
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold uppercase text-rail-amber">{asset.category?.name} / v{asset.version}</p>
          <h1 className="mt-2 text-4xl font-black">{asset.title}</h1>
          <div className="mt-4 text-xl">
            <PriceDisplay asset={asset} />
            {!asset.is_free ? <p className="mt-1 text-sm text-slate-400">Currency: Indian Rupees (INR)</p> : null}
            {showDeal && Number(asset.savings_amount || 0) > 0 ? (
              <p className="mt-1 text-sm text-emerald-300">{asset.deal_title || "Launch Offer"} - You save INR {asset.savings_amount}</p>
            ) : null}
          </div>
          <p className="mt-4 text-slate-300">{asset.description || asset.short_description}</p>
          <div className="mt-5 flex flex-wrap gap-3 text-sm">
            <span className="rounded border border-white/10 px-3 py-2">{asset.simulator_type.replace("_", " ")}</span>
            <span className="rounded border border-white/10 px-3 py-2">{asset.file_size}</span>
            <span className="rounded border border-white/10 px-3 py-2"><Star className="inline fill-rail-amber text-rail-amber" size={16} /> {asset.average_rating}</span>
            <span className="rounded border border-white/10 px-3 py-2"><HardDriveDownload className="inline text-rail-amber" size={16} /> {asset.download_count} downloads</span>
          </div>
          {asset.is_upcoming ? (
            <div className="mt-6 rounded-lg border border-rail-amber/30 bg-rail-amber/10 p-5">
              <p className="text-sm font-black uppercase tracking-wide text-rail-amber">
                {asset.coming_soon_badge || "COMING SOON"}
              </p>
              <h2 className="mt-2 text-2xl font-black text-white">
                {asset.coming_soon_banner_title || asset.title}
              </h2>
              <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-200">
                {asset.coming_soon_message || asset.short_description}
              </p>
              <p className="mt-4 inline-flex rounded bg-black/40 px-3 py-2 text-sm font-semibold text-rail-amber">
                {asset.coming_soon_status_text || "Release Date: To Be Announced"}
              </p>
            </div>
          ) : null}
          {showDeal ? (
            <div className="mt-6 rounded-lg border border-emerald-400/30 bg-emerald-400/10 p-5">
              <p className="text-sm font-black uppercase tracking-wide text-emerald-300">{asset.deal_badge || "Limited Time"}</p>
              <h2 className="mt-2 text-2xl font-black text-white">{asset.deal_title || "Launch Offer"}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-200">
                {asset.deal_status_text || "Special launch pricing is currently open for this product."}
                {asset.deal_ends_at ? ` Ends: ${new Date(asset.deal_ends_at).toLocaleString("en-IN")}.` : ""}
              </p>
            </div>
          ) : null}
          <AssetActions asset={asset} />
          <div className="mt-6 grid gap-3 text-sm text-slate-300 sm:grid-cols-2">
            <span className="rounded border border-white/10 bg-white/[0.03] p-3"><ShieldCheck className="mr-2 inline text-rail-amber" size={16} /> Account protected access</span>
            <span className="rounded border border-white/10 bg-white/[0.03] p-3"><CheckCircle2 className="mr-2 inline text-rail-amber" size={16} /> Version updates tracked</span>
          </div>
        </div>
      </div>
      {galleryImages.length > 1 ? (
        <div className="mx-auto mt-8 max-w-7xl">
          <h2 className="mb-4 text-xl font-bold">Product gallery</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {galleryImages.map((image) => (
              <div key={`${image.id}-${image.image}`} className="cinematic-panel relative aspect-video overflow-hidden rounded-lg">
                <Image src={image.image || ""} alt={image.alt_text || asset.title} fill sizes="(min-width: 768px) 33vw, 100vw" className="object-cover transition hover:scale-105" />
              </div>
            ))}
          </div>
        </div>
      ) : null}
      <div className="mx-auto mt-10 grid max-w-7xl gap-5 lg:grid-cols-3">
        {[
          ["Requirements", asset.requirements],
          ["Installation", asset.installation_steps],
          ["Changelog", asset.changelog]
        ].map(([title, content]) => (
          <div key={title} className="rounded border border-white/10 bg-white/[0.03] p-5">
            <h2 className="text-lg font-semibold">{title}</h2>
            <p className="mt-3 text-sm text-slate-400">{content || "Details will be included with this asset release."}</p>
          </div>
        ))}
      </div>
      <ReviewSection assetId={asset.id} initialReviews={asset.reviews} />
      <div className="mx-auto mt-12 max-w-7xl">
        <Link href="/assets" className="text-sm text-rail-amber hover:underline">← Back to marketplace</Link>
      </div>
    </section>
  );
}

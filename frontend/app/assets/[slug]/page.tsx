import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { CheckCircle2, HardDriveDownload, ShieldCheck, Star, TrainFront } from "lucide-react";
import { AssetActions } from "@/components/asset-actions";
import { PriceDisplay } from "@/components/price-display";
import { ProductGallery } from "@/components/product-gallery";
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
      <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-start">
        <div className="w-full min-w-0">
          <ProductGallery asset={asset} />
        </div>
        <div className="w-full min-w-0">
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
            {Number(asset.average_rating) > 0 ? (
              <span className="inline-flex items-center gap-1.5 rounded border border-white/10 px-3 py-2 text-white">
                <Star className="fill-rail-amber text-rail-amber" size={16} />
                <span>{Number(asset.average_rating).toFixed(1)} / 5</span>
                {asset.review_count ? (
                  <span className="text-slate-400 font-normal">({asset.review_count} {asset.review_count === 1 ? "review" : "reviews"})</span>
                ) : null}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded border border-white/10 px-3 py-2 text-slate-400">
                <Star className="text-slate-500" size={16} />
                <span>No reviews yet</span>
              </span>
            )}
            <span className="rounded border border-white/10 px-3 py-2"><HardDriveDownload className="inline text-rail-amber" size={16} /> {asset.download_count} downloads</span>
          </div>
          {asset.is_upcoming ? (
            asset.prebooking_enabled ? (
              <div className="mt-6 rounded-lg border border-cyan-500/40 bg-gradient-to-br from-cyan-950/40 via-cyan-950/20 to-black/40 p-5 shadow-lg">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="rounded bg-cyan-500/20 border border-cyan-400/40 px-2.5 py-1 text-xs font-black uppercase tracking-wide text-cyan-300 flex items-center gap-1.5">
                    <span>🚀</span> {asset.prebooking_badge || "PRE-BOOKING OPEN"}
                  </span>
                  {asset.prebooking_slots && asset.prebooking_slots > 0 ? (
                    <span className="rounded bg-cyan-500/20 border border-cyan-400/30 px-2.5 py-1 text-xs font-semibold text-cyan-200">
                      {Math.max(0, asset.prebooking_slots - (asset.prebooking_count || 0))} Slots Remaining
                    </span>
                  ) : null}
                </div>
                <h2 className="mt-3 text-2xl font-black text-white">
                  {asset.coming_soon_banner_title || asset.title}
                </h2>
                <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-200">
                  {asset.prebooking_message ||
                    asset.coming_soon_message ||
                    "Pre-book your copy now to lock in exclusive launch pricing and guarantee day-one access!"}
                </p>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {asset.prebooking_price ? (
                    <div className="rounded border border-cyan-500/20 bg-black/40 p-3">
                      <p className="text-xs text-slate-400">Pre-Booking Offer Price</p>
                      <p className="text-lg font-black text-cyan-300">
                        INR {asset.prebooking_price}{" "}
                        <span className="text-xs font-normal text-slate-400 line-through">
                          INR {asset.price}
                        </span>
                      </p>
                      <p className="text-[11px] text-emerald-300 mt-0.5">
                        🌟 VIP loyalty discounts automatically stack on top!
                      </p>
                    </div>
                  ) : null}

                  {asset.prebooking_download_unlock_at ? (
                    <div className="rounded border border-cyan-500/20 bg-black/40 p-3">
                      <p className="text-xs text-slate-400">Pre-Bookers Early Download Unlock</p>
                      <p className="text-sm font-bold text-white mt-0.5">
                        ⏰{" "}
                        {new Date(asset.prebooking_download_unlock_at).toLocaleString("en-IN", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </p>
                      <p className="text-[11px] text-cyan-400 mt-0.5">
                        Early download access before general public!
                      </p>
                    </div>
                  ) : asset.release_date ? (
                    <div className="rounded border border-cyan-500/20 bg-black/40 p-3">
                      <p className="text-xs text-slate-400">General Public Release</p>
                      <p className="text-sm font-bold text-white mt-0.5">
                        🚀{" "}
                        {new Date(asset.release_date).toLocaleString("en-IN", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : (
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
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <p className="inline-flex rounded bg-black/40 px-3 py-2 text-sm font-semibold text-rail-amber">
                    {asset.coming_soon_status_text || "Release Date: To Be Announced"}
                  </p>
                  {asset.release_date ? (
                    <p className="inline-flex items-center gap-1.5 rounded bg-black/40 border border-rail-amber/30 px-3 py-2 text-sm font-medium text-white">
                      <span>🚀 Official Release:</span>
                      <strong className="text-rail-amber">
                        {new Date(asset.release_date).toLocaleString("en-IN", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </strong>
                    </p>
                  ) : null}
                </div>
              </div>
            )
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
          {asset.early_access_enabled ? (
            <div className="mt-6 rounded-lg border border-purple-500/40 bg-purple-950/20 p-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded bg-purple-500/20 border border-purple-400/40 px-2.5 py-1 text-xs font-black uppercase tracking-wide text-purple-300">
                  {asset.early_access_badge || "VIP Early Access"}
                </span>
                {asset.early_access_has_discount && asset.early_access_discount_percent ? (
                  <span className="rounded bg-emerald-500/20 border border-emerald-400/40 px-2.5 py-1 text-xs font-bold text-emerald-300">
                    {asset.early_access_discount_percent}% Loyalty Discount
                  </span>
                ) : null}
                {asset.early_access_starts_at ? (
                  new Date(asset.early_access_starts_at) > new Date() ? (
                    <span className="rounded bg-amber-500/20 border border-amber-400/40 px-2.5 py-1 text-xs font-semibold text-amber-300">
                      ⏰ VIP Access Opens: {new Date(asset.early_access_starts_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                    </span>
                  ) : (
                    <span className="rounded bg-emerald-500/20 border border-emerald-400/40 px-2.5 py-1 text-xs font-semibold text-emerald-300">
                      🟢 VIP Access Active Now
                    </span>
                  )
                ) : null}
              </div>
              <h3 className="mt-2.5 text-xl font-bold text-white">
                {asset.early_access_has_access && asset.early_access_has_discount
                  ? "Early Access & Exclusive Discount Available"
                  : asset.early_access_has_access
                  ? "Early Access Available Before Release"
                  : "Exclusive Customer Loyalty Discount Available"}
              </h3>
              <p className="mt-2 text-sm text-slate-300 leading-relaxed">
                {asset.early_access_message ||
                  `Special perks unlocked for customers who purchased ${
                    asset.early_access_required_asset_titles && asset.early_access_required_asset_titles.length > 0
                      ? asset.early_access_required_asset_titles.join(", ")
                      : "any previously purchased store product"
                  }.`}
              </p>
              {asset.early_access_required_asset_titles && asset.early_access_required_asset_titles.length > 0 ? (
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-purple-300">
                  <span className="font-semibold text-slate-400">Qualifying products:</span>
                  {asset.early_access_required_asset_titles.map((title) => (
                    <span key={title} className="rounded bg-purple-900/40 border border-purple-500/30 px-2 py-0.5 font-medium text-purple-200">
                      {title}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
          <AssetActions asset={asset} />
          <div className="mt-6 grid gap-3 text-sm text-slate-300 sm:grid-cols-2">
            <span className="rounded border border-white/10 bg-white/[0.03] p-3"><ShieldCheck className="mr-2 inline text-rail-amber" size={16} /> Account protected access</span>
            <span className="rounded border border-white/10 bg-white/[0.03] p-3"><CheckCircle2 className="mr-2 inline text-rail-amber" size={16} /> Version updates tracked</span>
          </div>
        </div>
      </div>
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

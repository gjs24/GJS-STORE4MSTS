import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight, Download, Star, TrainFront } from "lucide-react";
import { PriceDisplay } from "@/components/price-display";
import { WishlistButton } from "@/components/wishlist-button";
import type { Asset } from "@/lib/api";

export function AssetCard({ asset }: { asset: Asset }) {
  const showDeal = Boolean(asset.deal_is_open && !asset.is_upcoming);

  return (
    <Link
      href={`/assets/${asset.slug}`}
      className="card-shine group relative flex flex-col justify-between overflow-hidden rounded-xl border border-white/10 bg-gradient-to-b from-[#0c182b]/80 via-rail-navy/60 to-rail-black/95 p-0 shadow-lg transition-all duration-300 hover:-translate-y-1.5 hover:border-rail-red/40 hover:shadow-[0_16px_36px_rgba(0,0,0,0.5),0_0_24px_rgba(239,59,45,0.16)]"
    >
      {/* Media & Badges */}
      <div>
        <div className="relative flex aspect-video items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_center,#17385d,#05070b_80%)]">
          {asset.thumbnail ? (
            <Image
              src={asset.thumbnail}
              alt={asset.title}
              fill
              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              className="object-cover transition-transform duration-500 ease-out group-hover:scale-108 group-hover:brightness-105"
            />
          ) : (
            <TrainFront className="h-16 w-16 text-white/70 transition-transform duration-500 group-hover:scale-110 group-hover:text-white" />
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/30" />

          {/* Simulator Type Badge */}
          <span className="absolute left-3 top-3 rounded-full border border-white/15 bg-black/65 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-200 backdrop-blur-md">
            {asset.simulator_type.replace("_", " ")}
          </span>

          {/* Price / Status Badge */}
          <span
            className={`absolute right-3 top-3 rounded-full px-2.5 py-1 text-xs font-bold tracking-wide shadow-md backdrop-blur-md ${
              asset.is_upcoming
                ? "bg-gradient-to-r from-amber-400 to-amber-500 text-black font-black"
          {/* Price / Status Badge & Quick Wishlist Heart */}
          <div className="absolute right-3 top-3 z-10 flex items-center gap-1.5">
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-bold tracking-wide shadow-md backdrop-blur-md ${
                asset.is_upcoming
                  ? "bg-gradient-to-r from-amber-400 to-amber-500 text-black font-black"
                  : showDeal
                  ? "animate-deal-pulse bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-extrabold"
                  : asset.is_free
                  ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-extrabold"
                  : asset.discount_percent
                  ? "bg-rail-red text-white font-extrabold shadow-glow"
                  : "border border-white/20 bg-rail-red text-white"
              }`}
            >
              {asset.is_upcoming
                ? asset.coming_soon_badge || "COMING SOON"
                : showDeal
                ? "animate-deal-pulse bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-extrabold"
                ? asset.deal_title || "DEAL OPEN"
                : asset.is_free
                ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-extrabold"
                ? "FREE"
                : asset.discount_percent
                ? "bg-rail-red text-white font-extrabold shadow-glow"
                : "border border-white/20 bg-rail-red text-white"
            }`}
          >
            {asset.is_upcoming
              ? asset.coming_soon_badge || "COMING SOON"
              : showDeal
              ? asset.deal_title || "DEAL OPEN"
              : asset.is_free
              ? "FREE"
              : asset.discount_percent
              ? `${asset.discount_percent}% OFF`
              : `INR ${asset.price}`}
          </span>
                ? `${asset.discount_percent}% OFF`
                : `INR ${asset.price}`}
            </span>
            <WishlistButton assetId={asset.id} variant="icon" />
          </div>

          {/* Special Deal Sub-Badge */}
          {showDeal ? (
            <span className="absolute bottom-2.5 left-3 rounded-md bg-rail-amber px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-black shadow-md">
              {asset.deal_badge || "Limited Time"}
            </span>
          ) : null}
        </div>

        {/* Content Body */}
        <div className="space-y-2.5 p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-rail-amber">
              {asset.category?.name || "Asset"}
            </p>
            <span className="text-[11px] font-medium text-slate-400">v{asset.version}</span>
          </div>

          <h3 className="line-clamp-2 text-base font-bold text-white transition-colors duration-200 group-hover:text-rail-amber">
            {asset.title}
          </h3>

          <p className="line-clamp-2 text-xs leading-relaxed text-slate-400">
            {asset.short_description}
          </p>
        </div>
      </div>

      {/* Footer / Price & Metrics */}
      <div className="border-t border-white/[0.08] bg-black/25 px-4 py-3">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-sm">
            {asset.is_upcoming ? (
              <span className="text-xs font-semibold text-rail-amber">
                {asset.coming_soon_status_text || "Release: TBA"}
              </span>
            ) : showDeal ? (
              <span className="text-xs font-bold text-emerald-400">
                {asset.deal_status_text || (asset.discount_percent ? `${asset.discount_percent}% OFF now` : "Special Deal")}
              </span>
            ) : (
              <PriceDisplay asset={asset} compact />
            )}
          </div>

          <span className="flex items-center gap-1 rounded-md bg-white/[0.06] px-2 py-0.5 text-[11px] font-semibold text-slate-300">
            <Star size={12} className="fill-rail-amber text-rail-amber" />
            <span>{Number(asset.average_rating || 5).toFixed(1)}</span>
          </span>
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <span className="flex items-center gap-1">
            <Download size={13} className="text-slate-400 group-hover:text-rail-amber transition-colors" />
            <span>{asset.download_count} downloads</span>
          </span>

          <span className="inline-flex items-center gap-0.5 font-semibold text-slate-300 group-hover:text-white transition-colors">
            Details
            <ArrowUpRight size={13} className="transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}


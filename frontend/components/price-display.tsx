import type { Asset } from "@/lib/api";
import { hasOffer } from "@/lib/api";

type PriceDisplayProps = {
  asset: Asset;
  compact?: boolean;
};

export function PriceDisplay({ asset, compact = false }: PriceDisplayProps) {
  if (asset.is_free) {
    return <span className="font-semibold text-emerald-300">Free</span>;
  }

  if (!hasOffer(asset)) {
    return <span className="font-semibold text-rail-amber">INR {asset.price}</span>;
  }

  return (
    <span className={compact ? "inline-flex flex-wrap items-center gap-1.5" : "inline-flex flex-wrap items-baseline gap-2"}>
      <span className="font-semibold text-rail-amber">INR {asset.price}</span>
      <span className="text-xs text-slate-500 line-through">INR {asset.original_price}</span>
      <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-xs font-bold text-emerald-300">
        {asset.discount_percent}% OFF
      </span>
    </span>
  );
}

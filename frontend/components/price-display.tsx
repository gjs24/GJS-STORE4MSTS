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

  const hasPaidUpdate = Boolean(asset.has_paid_update && Number(asset.update_price || 0) > 0);
  const basePrice = asset.base_price || (hasPaidUpdate ? String(Math.max(0, Number(asset.price) - Number(asset.update_price))) : null);

  if (!hasOffer(asset)) {
    return (
      <span className={compact ? "inline-flex flex-wrap items-center gap-1.5" : "inline-flex flex-wrap items-baseline gap-2"}>
        <span className="font-semibold text-rail-amber">₹{asset.price}</span>
        {hasPaidUpdate && basePrice && !compact && (
          <span className="text-xs text-amber-300/80 font-normal">
            (₹{basePrice} + ₹{asset.update_price} update)
          </span>
        )}
      </span>
    );
  }

  return (
    <span className={compact ? "inline-flex flex-wrap items-center gap-1.5" : "inline-flex flex-wrap items-baseline gap-2"}>
      <span className="font-semibold text-rail-amber">₹{asset.price}</span>
      <span className="text-xs text-slate-500 line-through">₹{asset.original_price}</span>
      <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-xs font-bold text-emerald-300">
        {asset.discount_percent}% OFF
      </span>
      {hasPaidUpdate && basePrice && !compact && (
        <span className="text-xs text-amber-300/80 font-normal">
          (₹{basePrice} + ₹{asset.update_price} update)
        </span>
      )}
    </span>
  );
}

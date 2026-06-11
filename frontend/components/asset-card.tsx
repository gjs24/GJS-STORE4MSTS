import Link from "next/link";
import Image from "next/image";
import { Download, Star, TrainFront } from "lucide-react";
import type { Asset } from "@/lib/api";

export function AssetCard({ asset }: { asset: Asset }) {
  return (
    <Link href={`/assets/${asset.slug}`} className="cinematic-panel group overflow-hidden rounded-lg">
      <div className="relative flex aspect-video items-center justify-center bg-[radial-gradient(circle_at_center,#17385d,#05070b_70%)]">
        {asset.thumbnail ? (
          <Image src={asset.thumbnail} alt={asset.title} fill sizes="(min-width: 768px) 33vw, 100vw" className="object-cover transition group-hover:scale-105" />
        ) : (
          <TrainFront className="h-16 w-16 text-white/80 transition group-hover:scale-110" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20" />
        <span className="absolute left-3 top-3 rounded bg-black/70 px-2 py-1 text-xs text-white">{asset.simulator_type.replace("_", " ")}</span>
        <span className="absolute right-3 top-3 rounded bg-rail-red px-2 py-1 text-xs font-semibold">
          {asset.is_upcoming ? "COMING SOON" : asset.is_free ? "FREE" : `INR ${asset.price}`}
        </span>
      </div>
      <div className="space-y-3 p-4">
        <div>
          <p className="text-xs uppercase text-rail-amber">{asset.category?.name}</p>
          <h3 className="mt-1 line-clamp-2 text-lg font-semibold text-white">{asset.title}</h3>
        </div>
        <p className="line-clamp-2 text-sm text-slate-400">{asset.short_description}</p>
        <div className="flex items-center justify-between text-xs text-slate-300">
          <span className="flex items-center gap-1"><Star size={14} className="fill-rail-amber text-rail-amber" /> {asset.average_rating}</span>
          <span>v{asset.version}</span>
          <span className="flex items-center gap-1"><Download size={14} /> {asset.download_count}</span>
        </div>
      </div>
    </Link>
  );
}

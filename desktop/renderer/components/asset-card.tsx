"use client";

import { Download, ImageIcon, Star, Wrench } from "lucide-react";
import type { Asset } from "@/lib/types";

export function AssetCard({ asset, onDownload }: { asset: Asset; onDownload?: (asset: Asset) => void }) {
  return (
    <div className="launcher-panel group overflow-hidden rounded-lg shadow-forge">
      <div className="relative flex aspect-video items-center justify-center bg-[radial-gradient(circle_at_50%_20%,#254a73,#07111f_65%)]">
        <ImageIcon className="h-16 w-16 text-white/70" />
        <span className="absolute left-3 top-3 rounded bg-black/60 px-2 py-1 text-xs">{asset.simulator_type.replace("_", " ")}</span>
        <span className="absolute right-3 top-3 rounded bg-forge-red px-2 py-1 text-xs font-bold">{asset.is_free ? "FREE" : `INR ${asset.price}`}</span>
      </div>
      <div className="p-4">
        <p className="text-xs font-semibold uppercase text-forge-amber">{asset.category?.name || "Asset"}</p>
        <h3 className="mt-1 line-clamp-2 text-lg font-bold">{asset.title}</h3>
        <p className="mt-2 line-clamp-2 text-sm text-slate-400">{asset.short_description}</p>
        <div className="mt-4 flex items-center justify-between text-xs text-slate-300">
          <span className="flex items-center gap-1"><Star size={14} className="fill-forge-amber text-forge-amber" /> {asset.average_rating}</span>
          <span>v{asset.version}</span>
          <span>{asset.file_size}</span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button onClick={() => onDownload?.(asset)} className="rounded bg-forge-red px-3 py-2 text-sm font-bold">
            <Download className="mr-1 inline" size={16} /> Download
          </button>
          <button className="rounded border border-white/10 px-3 py-2 text-sm font-bold text-slate-200">
            <Wrench className="mr-1 inline" size={16} /> Details
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { AssetCard } from "@/components/asset-card";
import { fetchAssets, requestAssetDownloadUrl } from "@/lib/api";
import type { Asset } from "@/lib/types";

export default function StorePage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    fetchAssets().then(setAssets);
  }, []);

  const filtered = useMemo(() => {
    return assets.filter((asset) => {
      const matchesQuery = asset.title.toLowerCase().includes(query.toLowerCase()) || asset.short_description.toLowerCase().includes(query.toLowerCase());
      const matchesFilter = filter === "all" || (filter === "free" && asset.is_free) || (filter === "premium" && !asset.is_free) || asset.simulator_type === filter;
      return matchesQuery && matchesFilter;
    });
  }, [assets, filter, query]);

  async function download(asset: Asset) {
    const url = await requestAssetDownloadUrl(asset.id);
    await window.railforge?.startDownload({
      assetId: asset.id,
      title: asset.title,
      url,
      fileName: `${asset.slug}.zip`
    });
  }

  return (
    <section className="p-6">
      <div className="mb-5 flex items-end justify-between">
        <div>
          <p className="text-sm font-bold uppercase text-forge-amber">Asset store</p>
          <h1 className="text-3xl font-black">MSTS and Open Rails depot</h1>
        </div>
      </div>
      <div className="mb-5 grid gap-3 md:grid-cols-[1fr_220px]">
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search locomotives, routes, sounds, cab views" className="rounded border border-white/10 bg-black/35 px-4 py-3 outline-none" />
        <select value={filter} onChange={(event) => setFilter(event.target.value)} className="rounded border border-white/10 bg-black/35 px-4 py-3 outline-none">
          <option value="all">All assets</option>
          <option value="free">Free</option>
          <option value="premium">Premium</option>
          <option value="MSTS">MSTS</option>
          <option value="OPEN_RAILS">Open Rails</option>
          <option value="BOTH">MSTS + Open Rails</option>
        </select>
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        {filtered.map((asset) => <AssetCard key={asset.id} asset={asset} onDownload={download} />)}
      </div>
    </section>
  );
}

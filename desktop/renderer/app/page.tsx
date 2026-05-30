"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Download, HardDrive, RefreshCw, ShieldCheck } from "lucide-react";
import { AssetCard } from "@/components/asset-card";
import { StatCard } from "@/components/stat-card";
import { fetchAssets, requestAssetDownloadUrl } from "@/lib/api";
import type { Asset } from "@/lib/types";

export default function HomePage() {
  const [assets, setAssets] = useState<Asset[]>([]);

  useEffect(() => {
    fetchAssets().then(setAssets);
  }, []);

  async function startDownload(asset: Asset) {
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
      <div className="relative overflow-hidden rounded-lg border border-white/10 bg-[linear-gradient(120deg,rgba(5,7,11,.92),rgba(12,21,36,.65)),radial-gradient(circle_at_78%_20%,rgba(239,59,45,.35),transparent_32%)] p-8 shadow-forge">
        <p className="text-sm font-bold uppercase text-forge-amber">GJS Production desktop launcher</p>
        <h1 className="mt-2 max-w-3xl text-5xl font-black">GJS RailForge Launcher</h1>
        <p className="mt-4 max-w-2xl text-slate-300">
          Browse, download, install, update, and manage MSTS and Open Rails assets from one dark gaming launcher.
        </p>
        <div className="mt-7 flex gap-3">
          <Link href="/store" className="rounded bg-forge-red px-5 py-3 font-bold shadow-heat">Open asset store</Link>
          <Link href="/settings" className="rounded border border-white/10 px-5 py-3 font-bold">Configure paths</Link>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-4">
        <StatCard label="Installed assets" value="Ready" icon={HardDrive} />
        <StatCard label="Download manager" value="Resume" icon={Download} />
        <StatCard label="Asset updates" value="Tracked" icon={RefreshCw} />
        <StatCard label="Integrity checks" value="SHA-256" icon={ShieldCheck} />
      </div>

      <div className="mt-8">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <p className="text-sm font-bold uppercase text-forge-amber">Featured depot</p>
            <h2 className="text-2xl font-black">Recommended rail assets</h2>
          </div>
          <Link href="/store" className="text-sm text-forge-amber">View all</Link>
        </div>
        <div className="grid gap-4 xl:grid-cols-3">
          {assets.slice(0, 3).map((asset) => <AssetCard key={asset.id} asset={asset} onDownload={startDownload} />)}
        </div>
      </div>
    </section>
  );
}

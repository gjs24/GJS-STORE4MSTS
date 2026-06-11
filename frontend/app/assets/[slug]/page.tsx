import Link from "next/link";
import Image from "next/image";
import { CheckCircle2, HardDriveDownload, ShieldCheck, Star, TrainFront } from "lucide-react";
import { AssetActions } from "@/components/asset-actions";
import { API_URL, Asset, fallbackAssets } from "@/lib/api";

async function getAsset(slug: string): Promise<Asset> {
  try {
    const res = await fetch(`${API_URL}/assets/${slug}/`, { next: { revalidate: 60 } });
    if (!res.ok) throw new Error("not found");
    return res.json();
  } catch {
    return fallbackAssets.find((asset) => asset.slug === slug) || fallbackAssets[0];
  }
}

export default async function AssetDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const asset = await getAsset(slug);

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
            <span className="rounded bg-rail-red px-3 py-2 font-semibold text-white">
              {asset.is_upcoming ? "Coming soon" : asset.is_free ? "Free release" : `INR ${asset.price}`}
            </span>
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold uppercase text-rail-amber">{asset.category?.name} / v{asset.version}</p>
          <h1 className="mt-2 text-4xl font-black">{asset.title}</h1>
          <p className="mt-4 text-slate-300">{asset.description || asset.short_description}</p>
          <div className="mt-5 flex flex-wrap gap-3 text-sm">
            <span className="rounded border border-white/10 px-3 py-2">{asset.simulator_type.replace("_", " ")}</span>
            <span className="rounded border border-white/10 px-3 py-2">{asset.file_size}</span>
            <span className="rounded border border-white/10 px-3 py-2"><Star className="inline fill-rail-amber text-rail-amber" size={16} /> {asset.average_rating}</span>
            <span className="rounded border border-white/10 px-3 py-2"><HardDriveDownload className="inline text-rail-amber" size={16} /> {asset.download_count} downloads</span>
          </div>
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
      <div className="mx-auto mt-8 max-w-7xl">
        <Link href="/assets" className="text-sm text-rail-amber">Back to marketplace</Link>
      </div>
    </section>
  );
}

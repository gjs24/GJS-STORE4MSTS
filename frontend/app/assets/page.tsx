import { AssetCard } from "@/components/asset-card";
import { PageShell } from "@/components/page-shell";
import { getAssets, getCategories } from "@/lib/api";
import Link from "next/link";

type AssetsSearchParams = Record<string, string | string[] | undefined>;

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AssetsPage({ searchParams }: { searchParams: Promise<AssetsSearchParams> }) {
  const params = await searchParams;
  const query = new URLSearchParams();
  ["search", "category", "price", "version", "simulator_type"].forEach((key) => {
    const value = firstParam(params[key]);
    if (value) query.set(key, value);
  });
  const [assets, categories] = await Promise.all([getAssets(`/assets/?${query}`), getCategories()]);
  const hasFilters = query.size > 0;

  return (
    <PageShell title="Asset Marketplace" eyebrow="Search, filter, download">
      <form action="/assets" className="mb-4 grid gap-3 rounded border border-white/10 bg-white/[0.03] p-4 md:grid-cols-6">
        <input name="search" placeholder="Search assets" defaultValue={firstParam(params.search)} className="rounded border border-white/10 bg-black/40 px-3 py-2 text-sm" />
        <select name="category" defaultValue={firstParam(params.category) || ""} className="rounded border border-white/10 bg-black/40 px-3 py-2 text-sm">
          <option value="">All categories</option>
          {categories.map((category) => <option key={category.slug} value={category.slug}>{category.name}</option>)}
        </select>
        <select name="simulator_type" defaultValue={firstParam(params.simulator_type) || ""} className="rounded border border-white/10 bg-black/40 px-3 py-2 text-sm">
          <option value="">All simulators</option>
          <option value="MSTS">MSTS</option>
          <option value="OPEN_RAILS">Open Rails</option>
        </select>
        <select name="price" defaultValue={firstParam(params.price) || ""} className="rounded border border-white/10 bg-black/40 px-3 py-2 text-sm">
          <option value="">Any price</option>
          <option value="free">Free</option>
          <option value="premium">Premium</option>
        </select>
        <input name="version" placeholder="Version" defaultValue={firstParam(params.version)} className="rounded border border-white/10 bg-black/40 px-3 py-2 text-sm" />
        <button className="rounded bg-rail-red px-4 py-2 text-sm font-semibold">Filter</button>
      </form>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-400">
        <p>{assets.length} asset{assets.length === 1 ? "" : "s"} found</p>
        {hasFilters ? <Link href="/assets" className="font-semibold text-rail-amber">Clear filters</Link> : null}
      </div>
      {assets.length ? (
        <div className="grid gap-5 md:grid-cols-3">{assets.map((asset) => <AssetCard key={asset.id} asset={asset} />)}</div>
      ) : (
        <div className="rounded border border-white/10 bg-white/[0.03] p-6 text-sm text-slate-300">
          No assets match your filters. Try a different search, category, simulator, price, or version.
        </div>
      )}
    </PageShell>
  );
}

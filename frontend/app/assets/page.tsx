import { AssetCard } from "@/components/asset-card";
import { PageShell } from "@/components/page-shell";
import { getAssets, getCategories } from "@/lib/api";
import Link from "next/link";
import { Filter, RotateCcw, Search, Sparkles, TrainFront } from "lucide-react";

type AssetsSearchParams = Record<string, string | string[] | undefined>;

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AssetsPage({ searchParams }: { searchParams: Promise<AssetsSearchParams> }) {
  const params = await searchParams;
  const query = new URLSearchParams();
  ["search", "category", "price", "version", "simulator_type", "upcoming", "deal"].forEach((key) => {
    const value = firstParam(params[key]);
    if (value) query.set(key, value);
  });
  const [assets, categories] = await Promise.all([getAssets(`/assets/?${query}`), getCategories()]);
  const hasFilters = query.size > 0;

  return (
    <PageShell title="Asset Marketplace" eyebrow="Search, Filter & Download">
      {/* Modern Filter Toolbar */}
      <form
        action="/assets"
        className="glass-panel mb-8 rounded-2xl border border-white/10 p-5 shadow-2xl space-y-4"
      >
        {/* Top Row: Search & Version */}
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <div className="relative">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              name="search"
              placeholder="Search by locomotive model, route name, pack..."
              defaultValue={firstParam(params.search)}
              className="w-full rounded-xl border border-white/10 bg-black/50 pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-rail-red focus:outline-none focus:ring-1 focus:ring-rail-red transition-all"
            />
          </div>
          <div className="flex gap-2">
            <input
              name="version"
              placeholder="v1.0"
              defaultValue={firstParam(params.version)}
              className="w-24 rounded-xl border border-white/10 bg-black/50 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-rail-red focus:outline-none focus:ring-1 focus:ring-rail-red transition-all"
            />
            <button
              type="submit"
              className="flex items-center gap-2 rounded-xl bg-rail-red px-5 py-2.5 text-sm font-bold text-white shadow-glow transition-all hover:bg-rail-red/90 active:scale-95"
            >
              <Filter size={16} />
              <span>Filter</span>
            </button>
          </div>
        </div>

        {/* Secondary Row: Select Dropdowns */}
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 pt-1">
          <select
            name="category"
            defaultValue={firstParam(params.category) || ""}
            className="rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-xs sm:text-sm text-slate-200 focus:border-rail-red focus:outline-none focus:ring-1 focus:ring-rail-red transition-all"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.slug} value={cat.slug}>
                {cat.name}
              </option>
            ))}
          </select>

          <select
            name="simulator_type"
            defaultValue={firstParam(params.simulator_type) || ""}
            className="rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-xs sm:text-sm text-slate-200 focus:border-rail-red focus:outline-none focus:ring-1 focus:ring-rail-red transition-all"
          >
            <option value="">All Simulators</option>
            <option value="BOTH">MSTS + Open Rails</option>
            <option value="MSTS">MSTS Only</option>
            <option value="OPEN_RAILS">Open Rails Only</option>
          </select>

          <select
            name="price"
            defaultValue={firstParam(params.price) || ""}
            className="rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-xs sm:text-sm text-slate-200 focus:border-rail-red focus:outline-none focus:ring-1 focus:ring-rail-red transition-all"
          >
            <option value="">Any Pricing</option>
            <option value="free">Free Downloads</option>
            <option value="premium">Premium (INR)</option>
          </select>

          <select
            name="upcoming"
            defaultValue={firstParam(params.upcoming) || ""}
            className="rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-xs sm:text-sm text-slate-200 focus:border-rail-red focus:outline-none focus:ring-1 focus:ring-rail-red transition-all"
          >
            <option value="">Any Status</option>
            <option value="true">Coming Soon</option>
          </select>

          <select
            name="deal"
            defaultValue={firstParam(params.deal) || ""}
            className="col-span-2 sm:col-span-1 rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-xs sm:text-sm text-slate-200 focus:border-rail-red focus:outline-none focus:ring-1 focus:ring-rail-red transition-all"
          >
            <option value="">Any Deal</option>
            <option value="true">Deals Open</option>
          </select>
        </div>
      </form>

      {/* Results Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm text-slate-400">
        <p className="flex items-center gap-2">
          <Sparkles size={16} className="text-rail-amber" />
          <span>
            <strong className="text-white">{assets.length}</strong> asset{assets.length === 1 ? "" : "s"} found. All paid assets priced in Indian Rupees (INR).
          </span>
        </p>

        {hasFilters && (
          <Link
            href="/assets"
            className="flex items-center gap-1.5 rounded-lg border border-rail-amber/30 bg-rail-amber/10 px-3 py-1 font-semibold text-rail-amber transition-colors hover:bg-rail-amber/20"
          >
            <RotateCcw size={14} />
            <span>Reset filters</span>
          </Link>
        )}
      </div>

      {/* Asset Grid */}
      {assets.length ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {assets.map((asset) => (
            <AssetCard key={asset.id} asset={asset} />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-12 text-center text-slate-300">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/[0.04] text-slate-400">
            <TrainFront size={32} />
          </div>
          <h3 className="text-lg font-bold text-white">No matching railway assets found</h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">
            Try adjusting your search query, or clear simulator and category filters to browse all available depot assets.
          </p>
          {hasFilters && (
            <Link
              href="/assets"
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-rail-red px-5 py-2.5 text-sm font-bold text-white shadow-glow"
            >
              <RotateCcw size={15} />
              <span>Show All Assets</span>
            </Link>
          )}
        </div>
      )}
    </PageShell>
  );
}


import { AssetCard } from "@/components/asset-card";
import { PageShell } from "@/components/page-shell";
import { MarketplaceFilters } from "@/components/marketplace-filters";
import { getAssets, getCategories } from "@/lib/api";
import Link from "next/link";
import { RotateCcw, Sparkles, TrainFront } from "lucide-react";

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
      {/* Modern Themed Filter Toolbar with Railway Dropdowns */}
      <MarketplaceFilters
        categories={categories}
        initialParams={{
          search: firstParam(params.search),
          version: firstParam(params.version),
          category: firstParam(params.category),
          simulator_type: firstParam(params.simulator_type),
          price: firstParam(params.price),
          upcoming: firstParam(params.upcoming),
          deal: firstParam(params.deal),
        }}
        totalCount={assets.length}
      />

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


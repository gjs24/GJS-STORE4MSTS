"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  AlertCircle,
  BadgeIndianRupee,
  CheckCircle2,
  Eye,
  EyeOff,
  Package,
  Pencil,
  Search,
  Star,
  Trash2,
  X
} from "lucide-react";
import { AdminLoginNote } from "@/components/admin-login-note";
import { AdminLayout } from "@/components/admin-table";
import { PriceDisplay } from "@/components/price-display";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { adminDelete, adminGet, adminPatch, adminPost } from "@/lib/admin-api";
import type { Asset } from "@/lib/api";

type AssetFilter = "all" | "published" | "hidden" | "free" | "premium" | "featured" | "upcoming" | "deal";

function AssetsContent() {
  const searchParams = useSearchParams();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [query, setQuery] = useState(searchParams.get("search") || "");
  const [filter, setFilter] = useState<AssetFilter>("all");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const typeParam = searchParams.get("type");
    const filterParam = searchParams.get("filter");
    const featuredParam = searchParams.get("featured");
    const sParam = searchParams.get("search");

    if (featuredParam === "true" || filterParam === "featured" || typeParam === "featured") {
      setFilter("featured");
    } else if (typeParam === "free") {
      setFilter("free");
    } else if (typeParam === "premium") {
      setFilter("premium");
    }

    if (sParam) setQuery(sParam);
  }, [searchParams]);

  useEffect(() => {
    adminGet<Asset[]>("/admin/assets/", [])
      .then(setAssets)
      .finally(() => setLoading(false));
  }, []);

  const stats = useMemo(() => {
    const total = assets.length;
    const visible = assets.filter((a) => a.is_published !== false).length;
    const featured = assets.filter((a) => a.is_featured).length;
    const free = assets.filter((a) => a.is_free).length;
    const premium = assets.filter((a) => !a.is_free).length;
    return { total, visible, featured, free, premium };
  }, [assets]);

  const filteredAssets = useMemo(() => {
    return assets.filter((asset) => {
      const matchesQuery = `${asset.title} ${asset.category?.name || ""} ${asset.simulator_type}`
        .toLowerCase()
        .includes(query.toLowerCase());
      const matchesFilter =
        filter === "all" ||
        (filter === "published" && asset.is_published !== false) ||
        (filter === "hidden" && asset.is_published === false) ||
        (filter === "free" && asset.is_free) ||
        (filter === "premium" && !asset.is_free) ||
        (filter === "featured" && asset.is_featured) ||
        (filter === "upcoming" && asset.is_upcoming) ||
        (filter === "deal" && asset.deal_is_open);
      return matchesQuery && matchesFilter;
    });
  }, [assets, filter, query]);

  async function toggleFeature(asset: Asset) {
    try {
      const result = await adminPost<{ id: number; is_featured: boolean }>(`/admin/assets/${asset.id}/feature/`);
      setAssets((current) => current.map((item) => (item.id === result.id ? { ...item, is_featured: result.is_featured } : item)));
      setFeedback({
        type: "success",
        message: `"${asset.title}" is now ${result.is_featured ? "featured on the homepage" : "unfeatured"}.`,
      });
    } catch {
      setFeedback({ type: "error", message: `Failed to toggle feature for ${asset.title}.` });
    }
  }

  async function togglePublished(asset: Asset) {
    const nextPublished = asset.is_published === false;
    try {
      const updated = await adminPatch<Asset>(`/admin/assets/${asset.id}/`, { is_published: nextPublished });
      setAssets((current) => current.map((item) => (item.id === asset.id ? { ...item, is_published: updated.is_published } : item)));
      setFeedback({
        type: "success",
        message: `"${asset.title}" is now ${nextPublished ? "visible to customers" : "hidden from the user store"}.`,
      });
    } catch {
      setFeedback({ type: "error", message: `Failed to update visibility for ${asset.title}.` });
    }
  }

  async function toggleDeal(asset: Asset) {
    const nextDeal = !asset.deal_is_open;
    try {
      const updated = await adminPatch<Asset>(`/admin/assets/${asset.id}/`, { deal_is_open: nextDeal });
      setAssets((current) => current.map((item) => (item.id === asset.id ? { ...item, deal_is_open: updated.deal_is_open } : item)));
      setFeedback({
        type: "success",
        message: `Deal for "${asset.title}" is now ${updated.deal_is_open ? "open with launch offer badge" : "closed"}.`,
      });
    } catch {
      setFeedback({ type: "error", message: `Failed to update deal status for ${asset.title}.` });
    }
  }

  async function deleteAsset(asset: Asset) {
    const confirmed = window.confirm(`Delete "${asset.title}" permanently? This cannot be undone.`);
    if (!confirmed) return;
    try {
      await adminDelete(`/admin/assets/${asset.id}/`);
      setAssets((current) => current.filter((item) => item.id !== asset.id));
      setFeedback({ type: "success", message: `"${asset.title}" was deleted.` });
    } catch (error) {
      setFeedback({
        type: "error",
        message: error instanceof Error ? error.message : `Cannot delete "${asset.title}".`,
      });
    }
  }

  return (
    <div className="space-y-6">
      <AdminLoginNote />

      {feedback ? (
        <div
          className={`flex items-center justify-between gap-3 rounded-lg border p-4 text-sm ${
            feedback.type === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
              : "border-red-500/30 bg-red-500/10 text-red-300"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="rounded p-1 hover:bg-white/10">
            <X size={14} />
          </button>
        </div>
      ) : null}

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card className="glass-card">
          <CardContent className="p-4">
            <span className="text-xs font-bold uppercase text-slate-400">Total Assets</span>
            <p className="mt-2 text-2xl font-black text-white">{stats.total}</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4">
            <span className="text-xs font-bold uppercase text-slate-400">Visible to Public</span>
            <p className="mt-2 text-2xl font-black text-emerald-400">{stats.visible}</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4">
            <span className="text-xs font-bold uppercase text-slate-400">Featured</span>
            <p className="mt-2 text-2xl font-black text-rail-amber">{stats.featured}</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4">
            <span className="text-xs font-bold uppercase text-slate-400">Free Downloads</span>
            <p className="mt-2 text-2xl font-black text-cyan-400">{stats.free}</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4">
            <span className="text-xs font-bold uppercase text-slate-400">Premium / Paid</span>
            <p className="mt-2 text-2xl font-black text-rail-red">{stats.premium}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-slate-400">Manage Indian Railways locomotives, coaches, routes, and sound packs.</p>
        </div>
        <Button asChild>
          <Link href="/admin-dashboard/assets/create" className="gap-2">
            <Package size={16} /> Add new asset
          </Link>
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="grid gap-3 lg:grid-cols-[1fr_220px]">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by asset title, category, simulator..."
            className="w-full rounded-lg border border-white/10 bg-black/40 py-2.5 pl-9 pr-8 text-sm text-white outline-none focus:border-rail-red"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
            >
              <X size={14} />
            </button>
          ) : null}
        </div>

        <select
          value={filter}
          onChange={(event) => setFilter(event.target.value as AssetFilter)}
          className="rounded-lg border border-white/10 bg-black/50 px-3 py-2.5 text-sm text-white outline-none focus:border-rail-red"
        >
          <option value="all">All assets</option>
          <option value="published">Visible to users</option>
          <option value="hidden">Hidden from users</option>
          <option value="featured">Featured Only</option>
          <option value="upcoming">Coming Soon</option>
          <option value="deal">Deal Open</option>
          <option value="free">Free Only</option>
          <option value="premium">Premium Only</option>
        </select>
      </div>

      {/* Assets Table */}
      <div className="overflow-hidden rounded-lg border border-white/10 bg-white/[0.02]">
        <div className="grid gap-2 bg-white/10 p-3 text-xs uppercase tracking-wider text-slate-400 md:grid-cols-[1.4fr_120px_120px_120px_130px_190px]">
          <span>Asset Details</span>
          <span>Category</span>
          <span>Price</span>
          <span>Visibility</span>
          <span>Downloads</span>
          <span>Manage Actions</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-slate-400">Loading catalog...</div>
        ) : filteredAssets.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-400">
            {query || filter !== "all"
              ? "No assets match your search or filter."
              : "No assets found in store catalog."}
          </div>
        ) : (
          filteredAssets.map((asset) => (
            <div
              key={asset.id}
              className="grid items-center gap-3 border-t border-white/10 p-4 text-sm transition hover:bg-white/[0.03] md:grid-cols-[1.4fr_120px_120px_120px_130px_190px]"
            >
              <div>
                <span className="block font-bold text-white">{asset.title}</span>
                <span className="text-xs text-slate-400">
                  v{asset.version} / {asset.simulator_type.replace("_", " ")}
                </span>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {asset.is_featured ? <Badge variant="warning">Featured</Badge> : null}
                  {asset.is_upcoming ? <Badge variant="muted">Upcoming</Badge> : null}
                  {asset.deal_is_open ? <Badge variant="success">Deal Open</Badge> : null}
                  <Badge variant={asset.is_free ? "success" : "default"}>
                    {asset.is_free ? "Free" : "Premium"}
                  </Badge>
                  <Badge variant={asset.has_file ? "success" : "warning"}>
                    {asset.has_file ? "Package Ready" : "No File"}
                  </Badge>
                </div>
              </div>

              <div>
                <span className="text-slate-300">{asset.category?.name || "Uncategorized"}</span>
              </div>

              <div>
                <PriceDisplay asset={asset} compact />
              </div>

              <div>
                <Badge variant={asset.is_published === false ? "muted" : "success"}>
                  {asset.is_published === false ? "Hidden" : "Visible"}
                </Badge>
              </div>

              <div>
                <span className="font-semibold text-white">{asset.download_count}</span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                <Link
                  title="Preview user detail page"
                  href={`/assets/${asset.slug}`}
                  target="_blank"
                  className="rounded border border-white/10 p-2 hover:bg-white/10 text-slate-300 hover:text-white"
                >
                  <Eye size={16} />
                </Link>

                <button
                  title={asset.is_published === false ? "Make visible on store" : "Hide from store"}
                  onClick={() => togglePublished(asset)}
                  className="rounded border border-white/10 p-2 hover:bg-white/10 text-slate-300 hover:text-white"
                >
                  {asset.is_published === false ? <Eye size={16} /> : <EyeOff size={16} />}
                </button>

                <button
                  title={asset.is_featured ? "Remove from featured" : "Feature on homepage"}
                  onClick={() => toggleFeature(asset)}
                  className={`rounded border p-2 hover:bg-white/10 transition ${
                    asset.is_featured ? "border-rail-amber bg-rail-amber/10 text-rail-amber" : "border-white/10 text-slate-400 hover:text-white"
                  }`}
                >
                  <Star size={16} />
                </button>

                <button
                  title={asset.deal_is_open ? "Close deal" : "Open launch deal"}
                  onClick={() => toggleDeal(asset)}
                  className={`rounded border p-2 hover:bg-white/10 transition ${
                    asset.deal_is_open ? "border-emerald-400 bg-emerald-500/10 text-emerald-300" : "border-white/10 text-slate-400 hover:text-white"
                  }`}
                >
                  <BadgeIndianRupee size={16} />
                </button>

                <Link
                  title="Edit asset details"
                  href={`/admin-dashboard/assets/${asset.id}/edit`}
                  className="rounded border border-white/10 p-2 hover:bg-white/10 text-slate-300 hover:text-white"
                >
                  <Pencil size={16} />
                </Link>

                <button
                  title="Delete product permanently"
                  onClick={() => deleteAsset(asset)}
                  className="rounded border border-red-500/40 p-2 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default function AdminAssetsPage() {
  return (
    <AdminLayout title="Manage Assets">
      <Suspense fallback={<div className="p-8 text-center text-slate-400">Loading assets catalog...</div>}>
        <AssetsContent />
      </Suspense>
    </AdminLayout>
  );
}

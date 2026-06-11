"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Eye, EyeOff, Pencil, Search, Star, Trash2 } from "lucide-react";
import { AdminLoginNote } from "@/components/admin-login-note";
import { AdminLayout } from "@/components/admin-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { adminDelete, adminGet, adminPatch, adminPost } from "@/lib/admin-api";
import type { Asset } from "@/lib/api";

type AssetFilter = "all" | "published" | "hidden" | "free" | "premium" | "featured";

export default function AdminAssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<AssetFilter>("all");
  const [message, setMessage] = useState("");

  useEffect(() => {
    adminGet<Asset[]>("/admin/assets/", []).then(setAssets);
  }, []);

  const filteredAssets = useMemo(() => {
    return assets.filter((asset) => {
      const matchesQuery = `${asset.title} ${asset.category.name} ${asset.simulator_type}`.toLowerCase().includes(query.toLowerCase());
      const matchesFilter =
        filter === "all" ||
        (filter === "published" && asset.is_published !== false) ||
        (filter === "hidden" && asset.is_published === false) ||
        (filter === "free" && asset.is_free) ||
        (filter === "premium" && !asset.is_free) ||
        (filter === "featured" && asset.is_featured);
      return matchesQuery && matchesFilter;
    });
  }, [assets, filter, query]);

  async function toggleFeature(asset: Asset) {
    const result = await adminPost<{ id: number; is_featured: boolean }>(`/admin/assets/${asset.id}/feature/`);
    setAssets((current) => current.map((item) => item.id === result.id ? { ...item, is_featured: result.is_featured } : item));
  }

  async function togglePublished(asset: Asset) {
    const nextPublished = asset.is_published === false;
    const updated = await adminPatch<Asset>(`/admin/assets/${asset.id}/`, { is_published: nextPublished });
    setAssets((current) => current.map((item) => item.id === asset.id ? { ...item, is_published: updated.is_published } : item));
    setMessage(`${asset.title} is now ${nextPublished ? "visible" : "hidden"} on the user store.`);
  }

  async function deleteAsset(asset: Asset) {
    const confirmed = window.confirm(`Delete "${asset.title}" permanently? This cannot be undone.`);
    if (!confirmed) return;
    await adminDelete(`/admin/assets/${asset.id}/`);
    setAssets((current) => current.filter((item) => item.id !== asset.id));
    setMessage(`${asset.title} deleted.`);
  }

  return (
    <AdminLayout title="Manage Assets">
      <AdminLoginNote />
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-slate-400">Full asset CRUD: create, edit, preview, feature, hide/show, and delete products.</p>
          {message ? <p className="mt-2 text-sm text-rail-amber">{message}</p> : null}
        </div>
        <Button asChild>
          <Link href="/admin-dashboard/assets/create">Add asset</Link>
        </Button>
      </div>

      <div className="mb-5 grid gap-3 lg:grid-cols-[1fr_220px]">
        <label className="flex items-center gap-2 rounded border border-white/10 bg-white/[0.04] px-3 py-2">
          <Search size={18} className="text-slate-500" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by asset, category, simulator..." className="w-full bg-transparent text-sm outline-none" />
        </label>
        <select value={filter} onChange={(event) => setFilter(event.target.value as AssetFilter)} className="rounded border border-white/10 bg-black/40 px-3 py-2 text-sm">
          <option value="all">All assets</option>
          <option value="published">Visible to users</option>
          <option value="hidden">Hidden from users</option>
          <option value="featured">Featured</option>
          <option value="free">Free</option>
          <option value="premium">Premium</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-lg border border-white/10 bg-white/[0.03]">
        <div className="grid gap-2 bg-white/10 p-3 text-xs uppercase text-slate-400 md:grid-cols-[1.4fr_120px_120px_120px_130px_190px]">
          <span>Asset</span><span>Category</span><span>Price</span><span>Visibility</span><span>Downloads</span><span>Actions</span>
        </div>
        {filteredAssets.length === 0 ? <div className="p-5 text-sm text-slate-400">No assets yet. Create your first downloadable product.</div> : null}
        {filteredAssets.map((asset) => (
          <div key={asset.id} className="grid items-center gap-2 border-t border-white/10 p-4 text-sm md:grid-cols-[1.4fr_120px_120px_120px_130px_190px]">
            <span>
              <span className="block font-semibold">{asset.title}</span>
              <span className="text-xs text-slate-400">v{asset.version} / {asset.simulator_type.replace("_", " ")}</span>
              <span className="mt-2 flex gap-2">
                {asset.is_featured ? <Badge variant="warning">Featured</Badge> : null}
                {asset.is_upcoming ? <Badge variant="muted">Upcoming</Badge> : null}
                <Badge variant={asset.is_free ? "success" : "default"}>{asset.is_free ? "Free" : "Premium"}</Badge>
                <Badge variant={asset.has_file ? "success" : "warning"}>{asset.has_file ? "File uploaded" : "No file"}</Badge>
              </span>
            </span>
            <span>{asset.category.name}</span>
            <span>{asset.is_free ? "Free" : `INR ${asset.price}`}</span>
            <span>
              <Badge variant={asset.is_published === false ? "muted" : "success"}>
                {asset.is_published === false ? "Hidden" : "Visible"}
              </Badge>
            </span>
            <span>{asset.download_count}</span>
            <span className="flex flex-wrap gap-2">
              <Link title="Preview user page" href={`/assets/${asset.slug}`} className="rounded border border-white/10 p-2 hover:bg-white/10"><Eye size={16} /></Link>
              <button title="Show/hide on user store" onClick={() => togglePublished(asset)} className="rounded border border-white/10 p-2 hover:bg-white/10">
                {asset.is_published === false ? <Eye size={16} /> : <EyeOff size={16} />}
              </button>
              <button title="Feature/unfeature" onClick={() => toggleFeature(asset)} className={`rounded border p-2 hover:bg-white/10 ${asset.is_featured ? "border-rail-amber text-rail-amber" : "border-white/10"}`}><Star size={16} /></button>
              <Link title="Edit" href={`/admin-dashboard/assets/${asset.id}/edit`} className="rounded border border-white/10 p-2 hover:bg-white/10"><Pencil size={16} /></Link>
              <button title="Delete" onClick={() => deleteAsset(asset)} className="rounded border border-red-500/40 p-2 text-red-300 hover:bg-red-500/10"><Trash2 size={16} /></button>
            </span>
          </div>
        ))}
      </div>
    </AdminLayout>
  );
}

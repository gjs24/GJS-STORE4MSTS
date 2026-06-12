"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, Save } from "lucide-react";
import { AdminLoginNote } from "@/components/admin-login-note";
import { AdminLayout } from "@/components/admin-table";
import { adminGet, adminPatchForm } from "@/lib/admin-api";
import { fallbackAssets, fallbackCategories, type Asset, type Category } from "@/lib/api";

type EditableAsset = Asset & {
  category: Category | number;
};

function categoryId(category: Category | number) {
  return typeof category === "number" ? category : category.id;
}

export default function EditAssetPage({ params }: { params: Promise<{ id: string }> }) {
  const [assetId, setAssetId] = useState("");
  const [asset, setAsset] = useState<EditableAsset | null>(null);
  const [categories, setCategories] = useState<Category[]>(fallbackCategories);
  const [isFree, setIsFree] = useState(false);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [thumbnailInfo, setThumbnailInfo] = useState("");
  const [packageInfo, setPackageInfo] = useState("");

  useEffect(() => {
    params.then(({ id }) => {
      setAssetId(id);
      adminGet<EditableAsset>(`/admin/assets/${id}/`, fallbackAssets[0] as EditableAsset).then((data) => {
        setAsset(data);
        setIsFree(data.is_free);
      });
    });
    adminGet<Category[]>("/admin/categories/", fallbackCategories).then(setCategories);
  }, [params]);

  async function updateAsset(formData: FormData) {
    if (!asset) return;
    setSaving(true);
    setMessage(packageInfo || thumbnailInfo ? "Uploading selected files and updating asset..." : "Updating asset...");
    const price = isFree ? "0.00" : String(formData.get("price") || "0");
    const category = Number(formData.get("category"));
    const file = formData.get("download_file");
    const thumbnail = formData.get("thumbnail");

    formData.set("price", price);
    formData.set("is_free", String(isFree));
    formData.set("is_published", String(formData.get("is_published") === "on"));
    formData.set("is_featured", String(formData.get("is_featured") === "on"));
    formData.set("is_upcoming", String(formData.get("is_upcoming") === "on"));

    if (file instanceof File && file.size === 0) {
      formData.delete("download_file");
    }
    if (thumbnail instanceof File && thumbnail.size === 0) {
      formData.delete("thumbnail");
    }

    try {
      const updated = await adminPatchForm<EditableAsset>(`/admin/assets/${assetId}/`, formData);
      const nextCategory = categories.find((item) => item.id === category) || asset.category;
      setAsset({ ...asset, ...updated, category: nextCategory, price, is_free: isFree });
      setMessage(file instanceof File && file.size > 0 ? "Upload completed. Asset updated and new file uploaded." : "Asset updated successfully.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update asset.");
    } finally {
      setSaving(false);
    }
  }

  if (!asset) {
    return (
      <AdminLayout title="Edit Asset">
        <AdminLoginNote />
        <div className="rounded border border-white/10 bg-white/[0.03] p-5 text-slate-300">Loading asset...</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title={`Edit: ${asset.title}`}>
      <AdminLoginNote />
      <form action={updateAsset} className="grid gap-4 rounded border border-white/10 bg-white/[0.03] p-5 md:grid-cols-2">
        <label className="block">
          <span className="text-sm text-slate-300">Product title</span>
          <input name="title" required defaultValue={asset.title} className="mt-2 w-full rounded border border-white/10 bg-black/40 px-3 py-3" />
        </label>
        <label className="block">
          <span className="text-sm text-slate-300">Slug</span>
          <input name="slug" required defaultValue={asset.slug} className="mt-2 w-full rounded border border-white/10 bg-black/40 px-3 py-3" />
        </label>
        <label className="block">
          <span className="text-sm text-slate-300">Category</span>
          <select name="category" required defaultValue={categoryId(asset.category)} className="mt-2 w-full rounded border border-white/10 bg-black/40 px-3 py-3">
            {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="text-sm text-slate-300">Simulator</span>
          <select name="simulator_type" defaultValue={asset.simulator_type} className="mt-2 w-full rounded border border-white/10 bg-black/40 px-3 py-3">
            <option value="BOTH">MSTS + Open Rails</option>
            <option value="MSTS">MSTS</option>
            <option value="OPEN_RAILS">Open Rails</option>
          </select>
        </label>
        <label className="block">
          <span className="text-sm text-slate-300">Version</span>
          <input name="version" defaultValue={asset.version} className="mt-2 w-full rounded border border-white/10 bg-black/40 px-3 py-3" />
        </label>
        <label className="block">
          <span className="text-sm text-slate-300">File size</span>
          <input name="file_size" defaultValue={asset.file_size} className="mt-2 w-full rounded border border-white/10 bg-black/40 px-3 py-3" />
        </label>
        <label className="block">
          <span className="text-sm text-slate-300">Price type</span>
          <select value={isFree ? "free" : "premium"} onChange={(event) => setIsFree(event.target.value === "free")} className="mt-2 w-full rounded border border-white/10 bg-black/40 px-3 py-3">
            <option value="premium">Premium / Paid</option>
            <option value="free">Free Download</option>
          </select>
        </label>
        <label className="block">
          <span className="text-sm text-slate-300">Price in INR</span>
          <input name="price" type="number" min="0" step="0.01" disabled={isFree} defaultValue={asset.price} className="mt-2 w-full rounded border border-white/10 bg-black/40 px-3 py-3 disabled:opacity-50" />
        </label>
        <label className="block md:col-span-2">
          <span className="text-sm text-slate-300">Short description</span>
          <input name="short_description" required defaultValue={asset.short_description} className="mt-2 w-full rounded border border-white/10 bg-black/40 px-3 py-3" />
        </label>
        <label className="block md:col-span-2">
          <span className="text-sm text-slate-300">Full description</span>
          <textarea name="description" required rows={5} defaultValue={asset.description || ""} className="mt-2 w-full rounded border border-white/10 bg-black/40 px-3 py-3" />
        </label>
        <label className="block">
          <span className="text-sm text-slate-300">Preview video URL</span>
          <input name="preview_video_url" defaultValue={asset.preview_video_url || ""} className="mt-2 w-full rounded border border-white/10 bg-black/40 px-3 py-3" />
        </label>
        <label className="block">
          <span className="text-sm text-slate-300">Replace product card / home image</span>
          <input name="thumbnail" type="file" accept="image/*" onChange={(event) => setThumbnailInfo(fileStatus(event.currentTarget.files?.[0]))} className="mt-2 w-full rounded border border-white/10 bg-black/40 px-3 py-3 text-sm" />
          <span className="mt-1 block text-xs text-slate-500">
            Leave empty to keep the current image. This image appears on the home page, asset cards, and product detail hero.
          </span>
          {thumbnailInfo ? <span className="mt-1 block text-xs text-rail-amber">{thumbnailInfo}</span> : null}
        </label>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="flex items-center gap-3 rounded border border-white/10 bg-black/30 px-3 py-3">
            <input name="is_published" type="checkbox" defaultChecked={asset.is_published !== false} />
            <span>Visible to users</span>
          </label>
          <label className="flex items-center gap-3 rounded border border-white/10 bg-black/30 px-3 py-3">
            <input name="is_featured" type="checkbox" defaultChecked={asset.is_featured} />
            <span>Feature on homepage</span>
          </label>
          <label className="flex items-center gap-3 rounded border border-white/10 bg-black/30 px-3 py-3">
            <input name="is_upcoming" type="checkbox" defaultChecked={asset.is_upcoming} />
            <span>Upcoming product / coming soon</span>
          </label>
        </div>
        <textarea name="requirements" defaultValue={asset.requirements || ""} placeholder="Requirements" rows={4} className="rounded border border-white/10 bg-black/40 px-3 py-3" />
        <textarea name="installation_steps" defaultValue={asset.installation_steps || ""} placeholder="Installation steps" rows={4} className="rounded border border-white/10 bg-black/40 px-3 py-3" />
        <textarea name="changelog" defaultValue={asset.changelog || ""} placeholder="Changelog" rows={4} className="rounded border border-white/10 bg-black/40 px-3 py-3 md:col-span-2" />
        <label className="block md:col-span-2">
          <span className="text-sm text-slate-300">Replace ZIP file</span>
          <input name="download_file" type="file" accept=".zip" onChange={(event) => setPackageInfo(fileStatus(event.currentTarget.files?.[0]))} className="mt-2 w-full rounded border border-white/10 bg-black/40 px-3 py-3 text-sm" />
          <span className="mt-1 block text-xs text-slate-500">
            Leave empty to keep the current uploaded package. Cloudinary works best with .zip files.
          </span>
          {packageInfo ? <span className="mt-1 block text-xs text-rail-amber">{packageInfo}</span> : null}
        </label>
        <label className="block md:col-span-2">
          <span className="text-sm text-slate-300">Manual Cloudinary download URL</span>
          <input name="external_download_url" type="url" defaultValue={asset.external_download_url || ""} placeholder="https://res.cloudinary.com/.../raw/upload/..." className="mt-2 w-full rounded border border-white/10 bg-black/40 px-3 py-3" />
          <span className="mt-1 block text-xs text-slate-500">
            For large files, upload the ZIP directly in Cloudinary and paste the secure URL here. Leave empty if you use the uploaded package field.
          </span>
        </label>
        <div className="flex flex-wrap gap-3 md:col-span-2">
          <button disabled={saving} className="rounded bg-rail-red px-5 py-3 font-semibold disabled:opacity-60">
            {saving ? <Loader2 className="mr-2 inline animate-spin" size={18} /> : <Save className="mr-2 inline" size={18} />}
            {saving ? "Uploading..." : "Save changes"}
          </button>
          <Link href="/admin-dashboard/assets" className="rounded border border-white/10 px-5 py-3 font-semibold">Back to assets</Link>
        </div>
        {message ? (
          <p className="flex items-center gap-2 text-sm text-slate-300 md:col-span-2">
            {message.includes("completed") ? <CheckCircle2 className="text-emerald-400" size={18} /> : null}
            {message}
          </p>
        ) : null}
      </form>
    </AdminLayout>
  );
}

function fileStatus(file?: File) {
  if (!file) return "";
  const sizeMb = file.size / (1024 * 1024);
  return `Selected: ${file.name} (${sizeMb.toFixed(sizeMb >= 10 ? 0 : 1)} MB)`;
}

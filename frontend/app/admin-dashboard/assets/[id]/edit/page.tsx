"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, Save } from "lucide-react";
import { AdminLoginNote } from "@/components/admin-login-note";
import { AdminLayout } from "@/components/admin-table";
import { adminGet, adminGetRequired, adminPatchForm, type AdminNotifyRequest } from "@/lib/admin-api";
import { fallbackCategories, type Asset, type Category } from "@/lib/api";
import type { DownloadLog } from "@/lib/store-api";

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
  const [notifyRequests, setNotifyRequests] = useState<AdminNotifyRequest[]>([]);
  const [downloadHistory, setDownloadHistory] = useState<DownloadLog[]>([]);

  useEffect(() => {
    params.then(({ id }) => {
      setAssetId(id);
      adminGet<AdminNotifyRequest[]>(`/admin/notify-requests/?asset=${id}`, []).then(setNotifyRequests);
      adminGet<DownloadLog[]>(`/admin/download-history/?asset=${id}`, []).then(setDownloadHistory);
      adminGetRequired<EditableAsset>(`/admin/assets/${id}/`)
        .then((data) => {
          setAsset(data);
          setIsFree(data.is_free);
          setMessage("");
        })
        .catch((error) => {
          setMessage(error instanceof Error ? error.message : "Could not load this asset.");
        });
    });
    adminGet<Category[]>("/admin/categories/", fallbackCategories).then(setCategories);
  }, [params]);

  async function updateAsset(formData: FormData) {
    if (!asset) return;
    setSaving(true);
    setMessage(packageInfo || thumbnailInfo ? "Uploading selected files and updating asset..." : "Updating asset...");
    const price = isFree ? "0.00" : String(formData.get("price") || "0");
    const originalPrice = isFree ? "0.00" : String(formData.get("original_price") || price);
    const category = Number(formData.get("category"));
    const file = formData.get("download_file");
    const thumbnail = formData.get("thumbnail");

    formData.set("original_price", originalPrice);
    formData.set("price", price);
    formData.set("is_free", String(isFree));
    formData.set("is_published", String(formData.get("is_published") === "on"));
    formData.set("is_featured", String(formData.get("is_featured") === "on"));
    formData.set("is_upcoming", String(formData.get("is_upcoming") === "on"));
    formData.set("deal_is_open", String(formData.get("deal_is_open") === "on"));
    if (!formData.get("deal_ends_at")) {
      formData.delete("deal_ends_at");
    }

    if (file instanceof File && file.size === 0) {
      formData.delete("download_file");
    } else if (file instanceof File && formData.get("external_download_url")) {
      formData.delete("download_file");
      setPackageInfo("");
    }
    if (thumbnail instanceof File && thumbnail.size === 0) {
      formData.delete("thumbnail");
    } else if (thumbnail instanceof File && formData.get("thumbnail_url")) {
      formData.delete("thumbnail");
      setThumbnailInfo("");
    }

    try {
      const updated = await adminPatchForm<EditableAsset>(`/admin/assets/${assetId}/`, formData);
      const nextCategory = categories.find((item) => item.id === category) || asset.category;
      setAsset({ ...asset, ...updated, category: nextCategory, original_price: originalPrice, price, is_free: isFree });
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
        <div className="rounded border border-white/10 bg-white/[0.03] p-5 text-slate-300">
          {message || "Loading asset..."}
        </div>
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
          <span className="text-sm text-slate-300">Original price in INR</span>
          <input name="original_price" type="number" min="0" step="0.01" disabled={isFree} defaultValue={asset.original_price || asset.price} className="mt-2 w-full rounded border border-white/10 bg-black/40 px-3 py-3 disabled:opacity-50" />
          <span className="mt-1 block text-xs text-slate-500">Old/MRP price. Keep higher than selling price to show an offer.</span>
        </label>
        <label className="block">
          <span className="text-sm text-slate-300">Selling price in INR</span>
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
            Leave empty to keep the current image. For production, prefer the manual Cloudinary image URL below.
          </span>
          {thumbnailInfo ? <span className="mt-1 block text-xs text-rail-amber">{thumbnailInfo}</span> : null}
        </label>
        <label className="block md:col-span-2">
          <span className="text-sm text-slate-300">Manual Cloudinary image URL</span>
          <input name="thumbnail_url" type="url" defaultValue={asset.thumbnail_url || ""} placeholder="https://res.cloudinary.com/.../image/upload/..." className="mt-2 w-full rounded border border-white/10 bg-black/40 px-3 py-3" />
          <span className="mt-1 block text-xs text-slate-500">
            Paste the secure image URL here to show product card/home/detail image without uploading through Render.
          </span>
        </label>
        <label className="block md:col-span-2">
          <span className="text-sm text-slate-300">Product gallery image URLs</span>
          <textarea name="gallery_image_urls" rows={4} defaultValue={asset.gallery_image_urls || ""} placeholder={"https://res.cloudinary.com/.../image/upload/screenshot-1.jpg\nhttps://res.cloudinary.com/.../image/upload/screenshot-2.jpg"} className="mt-2 w-full rounded border border-white/10 bg-black/40 px-3 py-3" />
          <span className="mt-1 block text-xs text-slate-500">Paste one screenshot URL per line. These appear on the product detail page.</span>
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
        <div className="space-y-4 rounded border border-emerald-400/20 bg-emerald-400/5 p-4 md:col-span-2">
          <h2 className="font-semibold text-emerald-300">Deal Open / Close</h2>
          <label className="flex items-center gap-3 rounded border border-white/10 bg-black/30 px-3 py-3">
            <input name="deal_is_open" type="checkbox" defaultChecked={asset.deal_is_open} />
            <span>Deal open - show launch offer badge to users</span>
          </label>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="text-sm text-slate-300">Deal title</span>
              <input name="deal_title" defaultValue={asset.deal_title || "Launch Offer"} className="mt-2 w-full rounded border border-white/10 bg-black/40 px-3 py-3" />
            </label>
            <label className="block">
              <span className="text-sm text-slate-300">Deal badge</span>
              <input name="deal_badge" defaultValue={asset.deal_badge || "Limited Time"} className="mt-2 w-full rounded border border-white/10 bg-black/40 px-3 py-3" />
            </label>
            <label className="block">
              <span className="text-sm text-slate-300">Deal status text</span>
              <input name="deal_status_text" defaultValue={asset.deal_status_text || ""} placeholder="Offer closes soon" className="mt-2 w-full rounded border border-white/10 bg-black/40 px-3 py-3" />
            </label>
            <label className="block">
              <span className="text-sm text-slate-300">Deal end date optional</span>
              <input name="deal_ends_at" type="datetime-local" defaultValue={formatDateTimeLocal(asset.deal_ends_at)} className="mt-2 w-full rounded border border-white/10 bg-black/40 px-3 py-3" />
            </label>
          </div>
        </div>
        <div className="space-y-4 rounded border border-rail-amber/20 bg-rail-amber/5 p-4 md:col-span-2">
          <h2 className="font-semibold text-rail-amber">Coming Soon Banner</h2>
          <label className="block">
            <span className="text-sm text-slate-300">Coming Soon Banner Title</span>
            <input name="coming_soon_banner_title" defaultValue={asset.coming_soon_banner_title || "Vande Bharat Express Train Pack"} className="mt-2 w-full rounded border border-white/10 bg-black/40 px-3 py-3" />
          </label>
          <label className="block">
            <span className="text-sm text-slate-300">Coming Soon Message</span>
            <textarea
              name="coming_soon_message"
              rows={8}
              defaultValue={asset.coming_soon_message || `The highly detailed Indian Railways Vande Bharat Express Train Pack for MSTS and Open Rails is coming soon.\n\nFeatures include:\n- Detailed exterior and interior\n- Fully functional cab view\n- Working door animations\n- Custom sounds\n- Night textures\n- Realistic lighting\n- Open Rails compatibility\n\nStay tuned for the official release.`}
              className="mt-2 w-full rounded border border-white/10 bg-black/40 px-3 py-3"
            />
          </label>
          <div className="grid gap-4 md:grid-cols-3">
            <label className="block">
              <span className="text-sm text-slate-300">Button Text</span>
              <input name="coming_soon_button_text" defaultValue={asset.coming_soon_button_text || "Notify Me"} className="mt-2 w-full rounded border border-white/10 bg-black/40 px-3 py-3" />
            </label>
            <label className="block">
              <span className="text-sm text-slate-300">Homepage Badge</span>
              <input name="coming_soon_badge" defaultValue={asset.coming_soon_badge || "COMING SOON"} className="mt-2 w-full rounded border border-white/10 bg-black/40 px-3 py-3" />
            </label>
            <label className="block">
              <span className="text-sm text-slate-300">Product Status Text</span>
              <input name="coming_soon_status_text" defaultValue={asset.coming_soon_status_text || "Release Date: To Be Announced"} className="mt-2 w-full rounded border border-white/10 bg-black/40 px-3 py-3" />
            </label>
          </div>
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
        <label className="block md:col-span-2">
          <span className="text-sm text-slate-300">Private S3/R2 object key</span>
          <input name="private_download_key" defaultValue={asset.private_download_key || ""} placeholder="assets/gjs-pack-v1.zip" className="mt-2 w-full rounded border border-white/10 bg-black/40 px-3 py-3" />
          <span className="mt-1 block text-xs text-slate-500">
            Most secure option for paid files. Upload ZIP to a private S3/R2 bucket and paste only the object key here.
          </span>
        </label>
        <label className="block md:col-span-2">
          <span className="text-sm text-slate-300">Restricted Google Drive file ID</span>
          <input name="google_drive_file_id" defaultValue={asset.google_drive_file_id || ""} placeholder="1AbCDefGhIjKlMnOpQrStUvWxYz" className="mt-2 w-full rounded border border-white/10 bg-black/40 px-3 py-3" />
          <span className="mt-1 block text-xs text-slate-500">
            Keep the Drive file restricted. After payment, the backend grants access only to the logged-in user's email.
          </span>
        </label>
        <div className="flex flex-wrap gap-3 md:col-span-2">
          <button disabled={saving} className="rounded bg-rail-red px-5 py-3 font-semibold disabled:opacity-60">
            {saving ? <Loader2 className="mr-2 inline animate-spin" size={18} /> : <Save className="mr-2 inline" size={18} />}
            {saving ? "Uploading..." : "Save changes"}
          </button>
          <Link href={`/assets/${asset.slug}`} className="rounded border border-rail-amber px-5 py-3 font-semibold text-rail-amber">Preview Product</Link>
          <Link href="/admin-dashboard/assets" className="rounded border border-white/10 px-5 py-3 font-semibold">Back to assets</Link>
        </div>
        {message ? (
          <p className="flex items-center gap-2 text-sm text-slate-300 md:col-span-2">
            {message.includes("completed") ? <CheckCircle2 className="text-emerald-400" size={18} /> : null}
            {message}
          </p>
        ) : null}
      </form>
      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <div className="rounded border border-white/10 bg-white/[0.03] p-5">
          <h2 className="font-semibold text-white">Notify Me users</h2>
          <p className="mt-1 text-sm text-slate-400">{notifyRequests.length} interested user{notifyRequests.length === 1 ? "" : "s"}</p>
          <div className="mt-4 space-y-3">
            {notifyRequests.length ? notifyRequests.map((item) => (
              <div key={item.id} className="rounded border border-white/10 bg-black/20 p-3 text-sm">
                <p className="font-semibold">{item.email}</p>
                <p className="text-xs text-slate-400">{new Date(item.created_at).toLocaleString("en-IN")}</p>
              </div>
            )) : <p className="text-sm text-slate-400">No Notify Me requests yet.</p>}
          </div>
        </div>
        <div className="rounded border border-white/10 bg-white/[0.03] p-5">
          <h2 className="font-semibold text-white">Download history</h2>
          <p className="mt-1 text-sm text-slate-400">{downloadHistory.length} download record{downloadHistory.length === 1 ? "" : "s"}</p>
          <div className="mt-4 space-y-3">
            {downloadHistory.length ? downloadHistory.slice(0, 10).map((item) => (
              <div key={item.id} className="rounded border border-white/10 bg-black/20 p-3 text-sm">
                <p className="font-semibold">{item.user?.email || item.user?.username || "User"}</p>
                <p className="text-xs text-slate-400">{new Date(item.downloaded_at).toLocaleString("en-IN")} {item.ip_address ? `/ ${item.ip_address}` : ""}</p>
              </div>
            )) : <p className="text-sm text-slate-400">No downloads yet.</p>}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

function fileStatus(file?: File) {
  if (!file) return "";
  const sizeMb = file.size / (1024 * 1024);
  return `Selected: ${file.name} (${sizeMb.toFixed(sizeMb >= 10 ? 0 : 1)} MB)`;
}

function formatDateTimeLocal(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 16);
}

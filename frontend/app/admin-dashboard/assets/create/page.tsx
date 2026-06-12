"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, Save } from "lucide-react";
import { AdminLoginNote } from "@/components/admin-login-note";
import { AdminLayout } from "@/components/admin-table";
import { adminGet, adminPostForm } from "@/lib/admin-api";
import { fallbackCategories, type Category } from "@/lib/api";

type CreatedAsset = {
  id: number;
  title: string;
  slug: string;
  original_price: string;
  price: string;
  discount_percent?: number;
};

export default function CreateAssetPage() {
  const [categories, setCategories] = useState<Category[]>(fallbackCategories);
  const [isFree, setIsFree] = useState(false);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [thumbnailInfo, setThumbnailInfo] = useState("");
  const [packageInfo, setPackageInfo] = useState("");

  useEffect(() => {
    adminGet<Category[]>("/admin/categories/", fallbackCategories).then(setCategories);
  }, []);

  async function createAsset(formData: FormData) {
    setSaving(true);
    setMessage(packageInfo || thumbnailInfo ? "Uploading selected files and saving asset..." : "Saving asset...");
    try {
      const title = String(formData.get("title") || "");
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

      if (!title || !formData.get("short_description") || !formData.get("description") || !category) {
        setMessage("Please fill title, category, short description, and description.");
        return;
      }

      const created = await adminPostForm<CreatedAsset>("/admin/assets/", formData);
      setMessage(`Upload completed. Asset created: ${created.title}. Selling price INR ${created.price}${created.discount_percent ? ` (${created.discount_percent}% off)` : ""}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not create asset.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminLayout title="Add New Asset">
      <AdminLoginNote />
      <form action={createAsset} className="grid gap-4 rounded border border-white/10 bg-white/[0.03] p-5 md:grid-cols-2">
        <label className="block">
          <span className="text-sm text-slate-300">Product title</span>
          <input name="title" required placeholder="GJS WAP-7 Locomotive Pack" className="mt-2 w-full rounded border border-white/10 bg-black/40 px-3 py-3" />
        </label>
        <label className="block">
          <span className="text-sm text-slate-300">Slug</span>
          <input name="slug" placeholder="gjs-wap-7-locomotive-pack" className="mt-2 w-full rounded border border-white/10 bg-black/40 px-3 py-3" />
        </label>
        <label className="block">
          <span className="text-sm text-slate-300">Category</span>
          <select name="category" required className="mt-2 w-full rounded border border-white/10 bg-black/40 px-3 py-3">
            {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="text-sm text-slate-300">Simulator</span>
          <select name="simulator_type" className="mt-2 w-full rounded border border-white/10 bg-black/40 px-3 py-3">
            <option value="BOTH">MSTS + Open Rails</option>
            <option value="MSTS">MSTS</option>
            <option value="OPEN_RAILS">Open Rails</option>
          </select>
        </label>
        <label className="block">
          <span className="text-sm text-slate-300">Version</span>
          <input name="version" defaultValue="1.0.0" className="mt-2 w-full rounded border border-white/10 bg-black/40 px-3 py-3" />
        </label>
        <label className="block">
          <span className="text-sm text-slate-300">File size</span>
          <input name="file_size" placeholder="485 MB" className="mt-2 w-full rounded border border-white/10 bg-black/40 px-3 py-3" />
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
          <input name="original_price" type="number" min="0" step="0.01" disabled={isFree} defaultValue="149.00" className="mt-2 w-full rounded border border-white/10 bg-black/40 px-3 py-3 disabled:opacity-50" />
          <span className="mt-1 block text-xs text-slate-500">Old/MRP price. Keep higher than selling price to show an offer.</span>
        </label>
        <label className="block">
          <span className="text-sm text-slate-300">Selling price in INR</span>
          <input name="price" type="number" min="0" step="0.01" disabled={isFree} defaultValue="99.00" className="mt-2 w-full rounded border border-white/10 bg-black/40 px-3 py-3 disabled:opacity-50" />
          <span className="mt-1 block text-xs text-slate-500">{isFree ? "Free product price will be saved as INR 0.00." : "Example: 149.00, 349.00, 999.00"}</span>
        </label>
        <label className="block md:col-span-2">
          <span className="text-sm text-slate-300">Short description</span>
          <input name="short_description" required placeholder="One-line product summary for listing cards" className="mt-2 w-full rounded border border-white/10 bg-black/40 px-3 py-3" />
        </label>
        <label className="block md:col-span-2">
          <span className="text-sm text-slate-300">Full description</span>
          <textarea name="description" required rows={5} className="mt-2 w-full rounded border border-white/10 bg-black/40 px-3 py-3" />
        </label>
        <label className="block">
          <span className="text-sm text-slate-300">Preview video URL</span>
          <input name="preview_video_url" placeholder="https://youtube.com/..." className="mt-2 w-full rounded border border-white/10 bg-black/40 px-3 py-3" />
        </label>
        <label className="block">
          <span className="text-sm text-slate-300">Product card / home image</span>
          <input name="thumbnail" type="file" accept="image/*" onChange={(event) => setThumbnailInfo(fileStatus(event.currentTarget.files?.[0]))} className="mt-2 w-full rounded border border-white/10 bg-black/40 px-3 py-3 text-sm" />
          <span className="mt-1 block text-xs text-slate-500">For production, prefer uploading the image in Cloudinary and pasting the secure URL below.</span>
          {thumbnailInfo ? <span className="mt-1 block text-xs text-rail-amber">{thumbnailInfo}</span> : null}
        </label>
        <label className="block md:col-span-2">
          <span className="text-sm text-slate-300">Manual Cloudinary image URL</span>
          <input name="thumbnail_url" type="url" placeholder="https://res.cloudinary.com/.../image/upload/..." className="mt-2 w-full rounded border border-white/10 bg-black/40 px-3 py-3" />
          <span className="mt-1 block text-xs text-slate-500">
            Paste the secure image URL here to show product card/home/detail image without uploading through Render.
          </span>
        </label>
        <label className="flex items-center gap-3 rounded border border-white/10 bg-black/30 px-3 py-3">
          <input name="is_published" type="checkbox" defaultChecked />
          <span>Visible to users</span>
        </label>
        <label className="flex items-center gap-3 rounded border border-white/10 bg-black/30 px-3 py-3">
          <input name="is_featured" type="checkbox" />
          <span>Feature on homepage</span>
        </label>
        <label className="flex items-center gap-3 rounded border border-white/10 bg-black/30 px-3 py-3">
          <input name="is_upcoming" type="checkbox" />
          <span>Upcoming product / coming soon</span>
        </label>
        <div className="space-y-4 rounded border border-rail-amber/20 bg-rail-amber/5 p-4 md:col-span-2">
          <h2 className="font-semibold text-rail-amber">Coming Soon Banner</h2>
          <label className="block">
            <span className="text-sm text-slate-300">Coming Soon Banner Title</span>
            <input name="coming_soon_banner_title" defaultValue="Vande Bharat Express Train Pack" className="mt-2 w-full rounded border border-white/10 bg-black/40 px-3 py-3" />
          </label>
          <label className="block">
            <span className="text-sm text-slate-300">Coming Soon Message</span>
            <textarea
              name="coming_soon_message"
              rows={8}
              defaultValue={`The highly detailed Indian Railways Vande Bharat Express Train Pack for MSTS and Open Rails is coming soon.\n\nFeatures include:\n- Detailed exterior and interior\n- Fully functional cab view\n- Working door animations\n- Custom sounds\n- Night textures\n- Realistic lighting\n- Open Rails compatibility\n\nStay tuned for the official release.`}
              className="mt-2 w-full rounded border border-white/10 bg-black/40 px-3 py-3"
            />
          </label>
          <div className="grid gap-4 md:grid-cols-3">
            <label className="block">
              <span className="text-sm text-slate-300">Button Text</span>
              <input name="coming_soon_button_text" defaultValue="Notify Me" className="mt-2 w-full rounded border border-white/10 bg-black/40 px-3 py-3" />
            </label>
            <label className="block">
              <span className="text-sm text-slate-300">Homepage Badge</span>
              <input name="coming_soon_badge" defaultValue="COMING SOON" className="mt-2 w-full rounded border border-white/10 bg-black/40 px-3 py-3" />
            </label>
            <label className="block">
              <span className="text-sm text-slate-300">Product Status Text</span>
              <input name="coming_soon_status_text" defaultValue="Release Date: To Be Announced" className="mt-2 w-full rounded border border-white/10 bg-black/40 px-3 py-3" />
            </label>
          </div>
        </div>
        <textarea name="requirements" placeholder="Requirements" rows={4} className="rounded border border-white/10 bg-black/40 px-3 py-3" />
        <textarea name="installation_steps" placeholder="Installation steps" rows={4} className="rounded border border-white/10 bg-black/40 px-3 py-3" />
        <textarea name="changelog" placeholder="Changelog" rows={4} className="rounded border border-white/10 bg-black/40 px-3 py-3 md:col-span-2" />
        <label className="block md:col-span-2">
          <span className="text-sm text-slate-300">Asset ZIP file</span>
          <input name="download_file" type="file" accept=".zip" onChange={(event) => setPackageInfo(fileStatus(event.currentTarget.files?.[0]))} className="mt-2 w-full rounded border border-white/10 bg-black/40 px-3 py-3 text-sm" />
          <span className="mt-1 block text-xs text-slate-500">Upload the downloadable MSTS/Open Rails package here. Cloudinary works best with .zip files.</span>
          {packageInfo ? <span className="mt-1 block text-xs text-rail-amber">{packageInfo}</span> : null}
        </label>
        <label className="block md:col-span-2">
          <span className="text-sm text-slate-300">Manual Cloudinary download URL</span>
          <input name="external_download_url" type="url" placeholder="https://res.cloudinary.com/.../raw/upload/..." className="mt-2 w-full rounded border border-white/10 bg-black/40 px-3 py-3" />
          <span className="mt-1 block text-xs text-slate-500">
            For large files, upload the ZIP directly in Cloudinary and paste the secure URL here instead of uploading through this form.
          </span>
        </label>
        <label className="block md:col-span-2">
          <span className="text-sm text-slate-300">Private S3/R2 object key</span>
          <input name="private_download_key" placeholder="assets/gjs-pack-v1.zip" className="mt-2 w-full rounded border border-white/10 bg-black/40 px-3 py-3" />
          <span className="mt-1 block text-xs text-slate-500">
            Most secure option for paid files. Upload ZIP to a private S3/R2 bucket and paste only the object key here.
          </span>
        </label>
        <label className="block md:col-span-2">
          <span className="text-sm text-slate-300">Restricted Google Drive file ID</span>
          <input name="google_drive_file_id" placeholder="1AbCDefGhIjKlMnOpQrStUvWxYz" className="mt-2 w-full rounded border border-white/10 bg-black/40 px-3 py-3" />
          <span className="mt-1 block text-xs text-slate-500">
            Keep the Drive file restricted. After payment, the backend grants access only to the logged-in user's email.
          </span>
        </label>
        <div className="flex flex-wrap gap-3 md:col-span-2">
          <button disabled={saving} className="rounded bg-rail-red px-5 py-3 font-semibold disabled:opacity-60">
            {saving ? <Loader2 className="mr-2 inline animate-spin" size={18} /> : <Save className="mr-2 inline" size={18} />}
            {saving ? "Uploading..." : "Create product"}
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

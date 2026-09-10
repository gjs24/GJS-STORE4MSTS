"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, Save } from "lucide-react";
import { AdminLoginNote } from "@/components/admin-login-note";
import { AdminLayout } from "@/components/admin-table";
import { adminGet, adminPostForm } from "@/lib/admin-api";
import { fallbackCategories, type Asset, type Category } from "@/lib/api";

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
  const [availableAssets, setAvailableAssets] = useState<Asset[]>([]);
  const [isFree, setIsFree] = useState(false);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [thumbnailInfo, setThumbnailInfo] = useState("");
  const [packageInfo, setPackageInfo] = useState("");
  const [earlyAccessEnabled, setEarlyAccessEnabled] = useState(false);
  const [earlyAccessHasAccess, setEarlyAccessHasAccess] = useState(false);
  const [earlyAccessHasDiscount, setEarlyAccessHasDiscount] = useState(false);
  const [earlyAccessDiscountPercent, setEarlyAccessDiscountPercent] = useState<number>(0);
  const [earlyAccessPrice, setEarlyAccessPrice] = useState<string>("");
  const [earlyAccessRequiredAssets, setEarlyAccessRequiredAssets] = useState<number[]>([]);
  const [earlyAccessBadge, setEarlyAccessBadge] = useState("VIP Early Access");
  const [earlyAccessMessage, setEarlyAccessMessage] = useState("");
  const [earlyAccessStartsAt, setEarlyAccessStartsAt] = useState<string>("");
  const [earlyAccessEndsAt, setEarlyAccessEndsAt] = useState<string>("");
  const [prebookingEnabled, setPrebookingEnabled] = useState(false);
  const [prebookingPrice, setPrebookingPrice] = useState<string>("");
  const [prebookingBadge, setPrebookingBadge] = useState("PRE-BOOKING OPEN");
  const [prebookingMessage, setPrebookingMessage] = useState("Pre-book your copy now to lock in exclusive launch pricing and guarantee day-one access!");
  const [prebookingDownloadUnlockAt, setPrebookingDownloadUnlockAt] = useState<string>("");
  const [prebookingDownloadsUnlocked, setPrebookingDownloadsUnlocked] = useState(false);
  const [prebookingSlots, setPrebookingSlots] = useState<number | "">("");

  useEffect(() => {
    adminGet<Category[]>("/admin/categories/", fallbackCategories).then(setCategories);
    adminGet<Asset[]>("/admin/assets/", []).then(setAvailableAssets);
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
      formData.set("deal_is_open", String(formData.get("deal_is_open") === "on"));
      formData.set("early_access_enabled", String(earlyAccessEnabled));
      formData.set("early_access_has_access", String(earlyAccessHasAccess));
      formData.set("early_access_has_discount", String(earlyAccessHasDiscount));
      formData.set("early_access_discount_percent", String(earlyAccessDiscountPercent || 0));
      formData.set("early_access_price", earlyAccessPrice || "0.00");
      formData.set("early_access_badge", earlyAccessBadge);
      formData.set("early_access_message", earlyAccessMessage);
      formData.set("early_access_starts_at", earlyAccessStartsAt || "");
      formData.set("early_access_ends_at", earlyAccessEndsAt || "");
      formData.set("prebooking_enabled", String(prebookingEnabled));
      if (prebookingPrice && prebookingPrice.trim() !== "") {
        formData.set("prebooking_price", prebookingPrice.trim());
      } else {
        formData.set("prebooking_price", "");
      }
      formData.set("prebooking_badge", prebookingBadge);
      formData.set("prebooking_message", prebookingMessage);
      formData.set("prebooking_download_unlock_at", prebookingDownloadUnlockAt || "");
      formData.set("prebooking_downloads_unlocked", String(prebookingDownloadsUnlocked));
      formData.set("prebooking_slots", String(prebookingSlots || 0));
      formData.delete("early_access_required_assets");
      if (earlyAccessRequiredAssets.length > 0) {
        earlyAccessRequiredAssets.forEach((id) => {
          formData.append("early_access_required_assets", String(id));
        });
      } else {
        formData.set("early_access_required_assets", "[]");
      }
      if (!formData.get("deal_ends_at")) {
        formData.delete("deal_ends_at");
      }
      if (!formData.get("release_date")) {
        formData.delete("release_date");
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
        <label className="block md:col-span-2">
          <span className="text-sm text-slate-300">Product gallery image URLs</span>
          <textarea name="gallery_image_urls" rows={4} placeholder={"https://res.cloudinary.com/.../image/upload/screenshot-1.jpg\nhttps://res.cloudinary.com/.../image/upload/screenshot-2.jpg"} className="mt-2 w-full rounded border border-white/10 bg-black/40 px-3 py-3" />
          <span className="mt-1 block text-xs text-slate-500">Paste one screenshot URL per line. These appear on the product detail page.</span>
        </label>
        <label className="block md:col-span-2">
          <span className="text-sm text-slate-300">Demo media URLs</span>
          <textarea name="media_gallery_urls" rows={4} placeholder={"https://youtube.com/watch?v=demo-video-id\nhttps://res.cloudinary.com/.../video/upload/demo-output.mp4"} className="mt-2 w-full rounded border border-white/10 bg-black/40 px-3 py-3" />
          <span className="mt-1 block text-xs text-slate-500">Paste one demo video or output preview URL per line. YouTube and direct MP4/WebM links are shown as playable previews.</span>
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
        <div className="space-y-4 rounded border border-emerald-400/20 bg-emerald-400/5 p-4 md:col-span-2">
          <h2 className="font-semibold text-emerald-300">Deal Open / Close</h2>
          <label className="flex items-center gap-3 rounded border border-white/10 bg-black/30 px-3 py-3">
            <input name="deal_is_open" type="checkbox" />
            <span>Deal open - show launch offer badge to users</span>
          </label>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="text-sm text-slate-300">Deal title</span>
              <input name="deal_title" defaultValue="Launch Offer" className="mt-2 w-full rounded border border-white/10 bg-black/40 px-3 py-3" />
            </label>
            <label className="block">
              <span className="text-sm text-slate-300">Deal badge</span>
              <input name="deal_badge" defaultValue="Limited Time" className="mt-2 w-full rounded border border-white/10 bg-black/40 px-3 py-3" />
            </label>
            <label className="block">
              <span className="text-sm text-slate-300">Deal status text</span>
              <input name="deal_status_text" placeholder="Offer closes soon" className="mt-2 w-full rounded border border-white/10 bg-black/40 px-3 py-3" />
            </label>
            <label className="block">
              <span className="text-sm text-slate-300">Deal end date optional</span>
              <input name="deal_ends_at" type="datetime-local" className="mt-2 w-full rounded border border-white/10 bg-black/40 px-3 py-3" />
            </label>
          </div>
        </div>
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
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="text-sm text-slate-300">Button Text</span>
              <input name="coming_soon_button_text" defaultValue="Notify Me" className="mt-2 w-full rounded border border-white/10 bg-black/40 px-3 py-3" />
            </label>
            <label className="block">
              <span className="text-sm text-slate-300">Homepage Badge</span>
              <input name="coming_soon_badge" defaultValue="COMING SOON" className="mt-2 w-full rounded border border-white/10 bg-black/40 px-3 py-3" />
            </label>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="text-sm text-slate-300">Official General Release Date & Time</span>
              <input
                name="release_date"
                type="datetime-local"
                className="mt-2 w-full rounded border border-white/10 bg-black/40 px-3 py-3"
              />
              <span className="mt-1 block text-xs text-slate-500">
                When this product officially launches for all public customers.
              </span>
            </label>
            <label className="block">
              <span className="text-sm text-slate-300">Product Status Text</span>
              <input name="coming_soon_status_text" defaultValue="Release Date: To Be Announced" className="mt-2 w-full rounded border border-white/10 bg-black/40 px-3 py-3" />
              <span className="mt-1 block text-xs text-slate-500">
                Shown to customers (e.g. &quot;Release Date: To Be Announced&quot;).
              </span>
            </label>
          </div>
        </div>

        {/* Early Access & Customer Loyalty Perks Section */}
        <div className="space-y-4 rounded border border-purple-500/30 bg-purple-500/5 p-5 md:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-purple-500/20 pb-3">
            <div>
              <h2 className="text-lg font-bold text-purple-300 flex items-center gap-2">
                <span>⭐ Early Access & Customer Loyalty Perks</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Reward previous customers (who bought specific products) with early access to upcoming releases and/or exclusive discounts.
              </p>
            </div>
            <label className="flex items-center gap-2 rounded bg-purple-950/60 border border-purple-500/40 px-3 py-1.5 cursor-pointer hover:bg-purple-900/60">
              <input
                type="checkbox"
                checked={earlyAccessEnabled}
                onChange={(e) => setEarlyAccessEnabled(e.target.checked)}
                className="rounded accent-purple-500"
              />
              <span className="text-xs font-semibold text-purple-200">
                {earlyAccessEnabled ? "Feature ENABLED" : "Feature DISABLED"}
              </span>
            </label>
          </div>

          {earlyAccessEnabled ? (
            <div className="space-y-4 pt-1">
              {/* Prerequisite Products Selection */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-slate-200">
                    Selected Qualifying Product(s)
                  </span>
                  <span className="text-xs text-purple-300">
                    {earlyAccessRequiredAssets.length === 0
                      ? "None selected (Any prior purchase qualifies)"
                      : `${earlyAccessRequiredAssets.length} product(s) selected`}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mb-2">
                  Check the product(s) that the customer must have previously purchased to unlock these perks:
                </p>
                <div className="max-h-48 overflow-y-auto rounded border border-white/10 bg-black/40 p-2 space-y-1">
                  {availableAssets.map((item) => {
                    const checked = earlyAccessRequiredAssets.includes(item.id);
                    return (
                      <label
                        key={item.id}
                        className={`flex items-center justify-between p-2 rounded cursor-pointer text-xs transition ${
                          checked ? "bg-purple-900/40 border border-purple-500/40" : "hover:bg-white/5"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setEarlyAccessRequiredAssets([...earlyAccessRequiredAssets, item.id]);
                              } else {
                                setEarlyAccessRequiredAssets(earlyAccessRequiredAssets.filter((id) => id !== item.id));
                              }
                            }}
                            className="rounded accent-purple-500"
                          />
                          <span className="font-medium text-white">{item.title}</span>
                          <span className="text-slate-400">({item.category?.name || "Category"})</span>
                        </div>
                        <span className="text-slate-300 font-mono">
                          {item.is_free ? "Free" : `₹${item.price}`}
                        </span>
                      </label>
                    );
                  })}
                  {availableAssets.length === 0 && (
                    <p className="text-xs text-slate-500 p-2">No other products found.</p>
                  )}
                </div>
              </div>

              {/* Perks Options (The 4 combinations requested by user) */}
              <div className="grid gap-3 md:grid-cols-2 pt-2 border-t border-purple-500/20">
                <label className="flex items-start gap-3 rounded border border-white/10 bg-black/30 p-3 cursor-pointer hover:bg-black/40">
                  <input
                    type="checkbox"
                    checked={earlyAccessHasAccess}
                    onChange={(e) => setEarlyAccessHasAccess(e.target.checked)}
                    className="mt-1 rounded accent-purple-500"
                  />
                  <div>
                    <span className="block text-sm font-semibold text-white">1. Grant Early Access</span>
                    <span className="block text-xs text-slate-400 mt-0.5">
                      Eligible buyers can purchase & download this product before official release while it is marked as Upcoming.
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-3 rounded border border-white/10 bg-black/30 p-3 cursor-pointer hover:bg-black/40">
                  <input
                    type="checkbox"
                    checked={earlyAccessHasDiscount}
                    onChange={(e) => setEarlyAccessHasDiscount(e.target.checked)}
                    className="mt-1 rounded accent-purple-500"
                  />
                  <div>
                    <span className="block text-sm font-semibold text-white">2. Grant Exclusive Discount</span>
                    <span className="block text-xs text-slate-400 mt-0.5">
                      Eligible buyers receive a special loyalty/early-access discount on this product.
                    </span>
                  </div>
                </label>
              </div>

              {/* Mode Summary Indicator */}
              <div className="rounded bg-black/30 p-2.5 text-xs">
                {earlyAccessHasAccess && earlyAccessHasDiscount ? (
                  <p className="text-emerald-400 font-medium">
                    🌟 Active Mode: <strong>BOTH Early Access AND Discount</strong> will be granted to eligible buyers.
                  </p>
                ) : earlyAccessHasAccess ? (
                  <p className="text-amber-400 font-medium">
                    🚀 Active Mode: <strong>ONLY Early Access</strong> is granted (eligible buyers can buy early at regular price).
                  </p>
                ) : earlyAccessHasDiscount ? (
                  <p className="text-cyan-400 font-medium">
                    🏷️ Active Mode: <strong>ONLY Discount</strong> is granted (eligible buyers get discount, but cannot buy early while upcoming).
                  </p>
                ) : (
                  <p className="text-red-400 font-medium">
                    ⚠️ Active Mode: <strong>NEITHER perk selected</strong>. Enable at least one perk above or turn off the feature.
                  </p>
                )}
              </div>

              {/* Discount inputs if discount is enabled */}
              {earlyAccessHasDiscount ? (
                <div className="grid gap-4 md:grid-cols-2 rounded border border-purple-500/20 bg-purple-950/20 p-3">
                  <label className="block">
                    <span className="text-xs text-slate-300">Discount Percentage (%)</span>
                    <input
                      type="number"
                      min="1"
                      max="99"
                      value={earlyAccessDiscountPercent || ""}
                      onChange={(e) => setEarlyAccessDiscountPercent(Number(e.target.value))}
                      placeholder="e.g. 20 for 20% off"
                      className="mt-1 w-full rounded border border-white/10 bg-black/40 px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs text-slate-300">Or Explicit Price in INR (Optional Override)</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={earlyAccessPrice}
                      onChange={(e) => setEarlyAccessPrice(e.target.value)}
                      placeholder="e.g. 199.00"
                      className="mt-1 w-full rounded border border-white/10 bg-black/40 px-3 py-2 text-sm"
                    />
                  </label>
                </div>
              ) : null}

              {/* VIP Early Access Date & Time Scheduling */}
              <div className="grid gap-4 md:grid-cols-2 rounded border border-purple-500/20 bg-purple-950/20 p-3.5">
                <label className="block">
                  <span className="text-xs font-semibold text-purple-200">
                    VIP Early Access Starts At
                  </span>
                  <input
                    type="datetime-local"
                    value={earlyAccessStartsAt}
                    onChange={(e) => setEarlyAccessStartsAt(e.target.value)}
                    className="mt-1.5 w-full rounded border border-white/10 bg-black/40 px-3 py-2 text-sm"
                  />
                  <span className="mt-1 block text-xs text-slate-400">
                    When eligible VIPs can begin purchasing/downloading before official release.
                  </span>
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-purple-200">
                    VIP Early Access Ends At (Optional)
                  </span>
                  <input
                    type="datetime-local"
                    value={earlyAccessEndsAt}
                    onChange={(e) => setEarlyAccessEndsAt(e.target.value)}
                    className="mt-1.5 w-full rounded border border-white/10 bg-black/40 px-3 py-2 text-sm"
                  />
                  <span className="mt-1 block text-xs text-slate-400">
                    Leave empty to keep early access open until general release.
                  </span>
                </label>
              </div>

              {/* Badge & Custom note */}
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="text-xs text-slate-300">Early Access Badge</span>
                  <input
                    type="text"
                    value={earlyAccessBadge}
                    onChange={(e) => setEarlyAccessBadge(e.target.value)}
                    placeholder="VIP Early Access"
                    className="mt-1 w-full rounded border border-white/10 bg-black/40 px-3 py-2 text-sm"
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-slate-300">Custom Message for Customers (Optional)</span>
                  <input
                    type="text"
                    value={earlyAccessMessage}
                    onChange={(e) => setEarlyAccessMessage(e.target.value)}
                    placeholder="Exclusive early access & loyalty discount for existing customers."
                    className="mt-1 w-full rounded border border-white/10 bg-black/40 px-3 py-2 text-sm"
                  />
                </label>
              </div>
            </div>
          ) : null}
        </div>

        {/* Pre-Booking (Pre-Order) & Early Access Download Schedule */}
        <div className="rounded-xl border border-cyan-500/30 bg-cyan-950/20 p-4 md:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-semibold text-cyan-300">🚀 Pre-Booking (Pre-Order) & Early Download Schedule</span>
                <span className="rounded bg-cyan-500/20 px-2 py-0.5 text-xs font-semibold text-cyan-200">
                  {prebookingEnabled ? "ACTIVE" : "DISABLED"}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Allow customers to pre-order this upcoming asset ahead of release. VIP loyalty discounts automatically stack on top of the pre-booking price.
              </p>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                checked={prebookingEnabled}
                onChange={(e) => setPrebookingEnabled(e.target.checked)}
                className="peer sr-only"
              />
              <div className="peer h-6 w-11 rounded-full bg-slate-700 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-cyan-500 peer-checked:after:translate-x-full" />
            </label>
          </div>

          {prebookingEnabled ? (
            <div className="space-y-4 pt-2 border-t border-cyan-500/20">
              <div className="grid gap-4 md:grid-cols-3">
                <label className="block">
                  <span className="text-xs font-medium text-slate-300">Pre-Booking Price (₹ INR)</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={prebookingPrice}
                    onChange={(e) => setPrebookingPrice(e.target.value)}
                    placeholder="Leave empty for regular price"
                    className="mt-1 w-full rounded border border-white/10 bg-black/40 px-3 py-2 text-sm"
                  />
                  <span className="mt-1 block text-xs text-slate-400">
                    Set a promotional pre-order price. VIP discounts stack on this.
                  </span>
                </label>

                <label className="block">
                  <span className="text-xs font-medium text-slate-300">Pre-Booking Badge</span>
                  <input
                    type="text"
                    value={prebookingBadge}
                    onChange={(e) => setPrebookingBadge(e.target.value)}
                    placeholder="PRE-BOOKING OPEN"
                    className="mt-1 w-full rounded border border-white/10 bg-black/40 px-3 py-2 text-sm"
                  />
                  <span className="mt-1 block text-xs text-slate-400">
                    Badge shown on marketplace card & product page.
                  </span>
                </label>

                <label className="block">
                  <span className="text-xs font-medium text-slate-300">Pre-Booking Slots Limit</span>
                  <input
                    type="number"
                    min="0"
                    value={prebookingSlots}
                    onChange={(e) => setPrebookingSlots(e.target.value === "" ? "" : Number(e.target.value))}
                    placeholder="0 for unlimited"
                    className="mt-1 w-full rounded border border-white/10 bg-black/40 px-3 py-2 text-sm"
                  />
                  <span className="mt-1 block text-xs text-slate-400">
                    Max number of pre-orders allowed (0 = no limit).
                  </span>
                </label>
              </div>

              <label className="block">
                <span className="text-xs font-medium text-slate-300">Pre-Booking Promo Message</span>
                <input
                  type="text"
                  value={prebookingMessage}
                  onChange={(e) => setPrebookingMessage(e.target.value)}
                  placeholder="Pre-book your copy now to lock in exclusive launch pricing and guarantee day-one access!"
                  className="mt-1 w-full rounded border border-white/10 bg-black/40 px-3 py-2 text-sm"
                />
              </label>

              {/* Scheduled Pre-booking Download Release Date & Time */}
              <div className="rounded-lg border border-cyan-500/30 bg-cyan-950/40 p-3.5 space-y-3">
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block">
                    <span className="text-xs font-semibold text-cyan-200">
                      ⏰ Scheduled Pre-Booked Customer Download Unlock (Date & Time)
                    </span>
                    <input
                      type="datetime-local"
                      value={prebookingDownloadUnlockAt}
                      onChange={(e) => setPrebookingDownloadUnlockAt(e.target.value)}
                      className="mt-1.5 w-full rounded border border-cyan-500/30 bg-black/50 px-3 py-2 text-sm text-cyan-100"
                    />
                    <span className="mt-1 block text-xs text-slate-400">
                      Exact schedule when pre-booked customers and VIPs can download (e.g. 24–48 hours before official release).
                    </span>
                  </label>

                  <div className="flex flex-col justify-center rounded border border-white/10 bg-black/30 p-3">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={prebookingDownloadsUnlocked}
                        onChange={(e) => setPrebookingDownloadsUnlocked(e.target.checked)}
                        className="h-4 w-4 rounded border-white/20 bg-black/40 text-cyan-500 focus:ring-cyan-500"
                      />
                      <div>
                        <span className="text-sm font-semibold text-white">⚡ Unlock Downloads Immediately (1-Click Release)</span>
                        <span className="block text-xs text-slate-400">
                          Override schedule: Instantly grant download access to all pre-booked customers right now.
                        </span>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
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

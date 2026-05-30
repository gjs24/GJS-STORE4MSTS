"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckCircle2, Download, Heart, Lock, ShoppingCart } from "lucide-react";
import type { Asset } from "@/lib/api";
import { addToWishlist, createOrder, downloadAsset, isLoggedIn, verifyDebugPayment } from "@/lib/store-api";

export function AssetActions({ asset }: { asset: Asset }) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function requireLogin() {
    if (!isLoggedIn()) {
      setMessage("Please login or create an account to continue.");
      return false;
    }
    return true;
  }

  async function handlePrimaryAction() {
    if (!(await requireLogin())) return;
    setBusy(true);
    setMessage(asset.is_free ? "Preparing secure download..." : "Creating your order...");
    try {
      if (!asset.is_free && !asset.can_download) {
        const order = await createOrder(asset.id);
        if (order.status === "PENDING") {
          await verifyDebugPayment(order.id);
        }
        setMessage("Purchase confirmed. Preparing secure download...");
      }
      const url = await downloadAsset(asset.id);
      setMessage("Download ready. Opening package link...");
      window.location.href = url;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not complete this action.");
    } finally {
      setBusy(false);
    }
  }

  async function handleWishlist() {
    if (!(await requireLogin())) return;
    setBusy(true);
    setMessage("Saving to wishlist...");
    try {
      await addToWishlist(asset.id);
      setMessage("Saved to your wishlist.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update wishlist.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-8 space-y-4">
      <div className="flex flex-wrap gap-3">
        <button onClick={handlePrimaryAction} disabled={busy} className="rounded bg-rail-red px-5 py-3 font-semibold text-white disabled:opacity-60">
          {asset.is_free || asset.can_download ? <Download className="mr-2 inline" size={18} /> : <ShoppingCart className="mr-2 inline" size={18} />}
          {asset.is_free || asset.can_download ? "Download package" : `Buy for INR ${asset.price}`}
        </button>
        <button onClick={handleWishlist} disabled={busy} className="rounded border border-white/15 px-5 py-3 font-semibold disabled:opacity-60">
          <Heart className="mr-2 inline" size={18} /> Wishlist
        </button>
      </div>
      {message ? (
        <div className="flex max-w-xl items-start gap-2 rounded border border-white/10 bg-white/[0.04] px-3 py-3 text-sm text-slate-300">
          {message.includes("login") ? <Lock className="mt-0.5 shrink-0 text-rail-amber" size={16} /> : <CheckCircle2 className="mt-0.5 shrink-0 text-rail-amber" size={16} />}
          <span>
            {message}{" "}
            {message.includes("login") ? (
              <Link href="/login" className="font-semibold text-rail-amber">
                Login here.
              </Link>
            ) : null}
          </span>
        </div>
      ) : null}
    </div>
  );
}

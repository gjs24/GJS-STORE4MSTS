"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckCircle2, Download, Heart, Lock, ShoppingCart } from "lucide-react";
import type { Asset } from "@/lib/api";
import { addToWishlist, createOrder, downloadAsset, isLoggedIn, verifyDebugPayment } from "@/lib/store-api";

const RAZORPAY_KEY_ID = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "";

type RazorpaySuccessResponse = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};

type RazorpayOptions = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (response: RazorpaySuccessResponse) => void;
  prefill?: { name?: string; email?: string };
  theme?: { color?: string };
  modal?: { ondismiss?: () => void };
};

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => { open: () => void };
  }
}

function loadRazorpayCheckout() {
  return new Promise<void>((resolve, reject) => {
    if (window.Razorpay) {
      resolve();
      return;
    }
    const existingScript = document.querySelector<HTMLScriptElement>("script[src='https://checkout.razorpay.com/v1/checkout.js']");
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener("error", () => reject(new Error("Could not load Razorpay Checkout.")), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Could not load Razorpay Checkout."));
    document.body.appendChild(script);
  });
}

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
        if (order.status === "PENDING" && order.provider_order_id && RAZORPAY_KEY_ID) {
          const providerOrderId = order.provider_order_id;
          setMessage("Opening Razorpay secure checkout...");
          await loadRazorpayCheckout();
          await new Promise<void>((resolve, reject) => {
            const checkout = new window.Razorpay!({
              key: RAZORPAY_KEY_ID,
              amount: Math.round(Number(order.amount) * 100),
              currency: order.currency,
              name: "MSTS-GJS Production Store",
              description: asset.title,
              order_id: providerOrderId,
              handler: async (response) => {
                try {
                  await verifyDebugPayment(order.id, {
                    provider: "RAZORPAY",
                    provider_payment_id: response.razorpay_payment_id,
                    provider_signature: response.razorpay_signature
                  });
                  resolve();
                } catch (error) {
                  reject(error);
                }
              },
              theme: { color: "#dc2626" },
              modal: { ondismiss: () => reject(new Error("Payment was cancelled before completion.")) }
            });
            checkout.open();
          });
        } else if (order.status === "PENDING") {
          await verifyDebugPayment(order.id);
        }
        setMessage("Purchase confirmed. Preparing secure download...");
      }
      const download = await downloadAsset(asset.id);
      setMessage("Download ready. Starting package download...");
      const link = document.createElement("a");
      link.href = download.url;
      link.download = download.filename || `${asset.slug}.zip`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      if (download.revoke) setTimeout(download.revoke, 1000);
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

"use client";

import Link from "next/link";
import { useState } from "react";
import { load } from "@cashfreepayments/cashfree-js";
import { CheckCircle2, Download, Lock, ShoppingCart } from "lucide-react";
import { priceLabel, type Asset } from "@/lib/api";
import { WishlistButton } from "@/components/wishlist-button";
import { createOrder, downloadAsset, isLoggedIn, notifyMe, verifyPayment, type StoreOrder } from "@/lib/store-api";

function qrCodeUrl(value: string) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(value)}`;
}

const cashfreeMode = process.env.NEXT_PUBLIC_CASHFREE_MODE === "production" ? "production" : "sandbox";

export function AssetActions({ asset }: { asset: Asset }) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [order, setOrder] = useState<StoreOrder | null>(null);
  const [utr, setUtr] = useState("");
  const [payerName, setPayerName] = useState("");

  async function requireLogin() {
    if (!isLoggedIn()) {
      setMessage("Please login or create an account to continue.");
      return false;
    }
    return true;
  }

  async function startCashfreeCheckout(nextOrder: StoreOrder) {
    if (!nextOrder.payment_session_id) {
      return false;
    }
    setMessage("Redirecting to secure Cashfree checkout...");
    const cashfree = await load({ mode: cashfreeMode });
    const result = await cashfree.checkout({
      paymentSessionId: nextOrder.payment_session_id,
      redirectTarget: "_self"
    });
    if (result.error) {
      throw new Error(result.error.message || "Cashfree checkout could not be completed.");
    }
    return true;
  }

  async function startDownload() {
    const download = await downloadAsset(asset.id);
    setMessage("Download ready. Starting package download...");
    const link = document.createElement("a");
    link.href = download.url;
    link.download = download.filename || `${asset.slug}.zip`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    if (download.revoke) setTimeout(download.revoke, 1000);
  }

  async function handlePrimaryAction() {
    if (asset.is_upcoming) {
      if (!(await requireLogin())) return;
      setBusy(true);
      setMessage("Saving your Notify Me request...");
      try {
        const result = await notifyMe(asset.slug);
        setMessage(result.detail);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Could not save notification request.");
      } finally {
        setBusy(false);
      }
      return;
    }
    if (!(await requireLogin())) return;
    setBusy(true);
    setMessage(asset.is_free ? "Preparing secure download..." : "Creating your order...");
    try {
      if (!asset.is_free && !asset.can_download) {
        const nextOrder = await createOrder(asset.id);
        setOrder(nextOrder);
        if (nextOrder.status === "PENDING" && nextOrder.payment_session_id) {
          await startCashfreeCheckout(nextOrder);
          setMessage("Complete the Cashfree payment to unlock this download.");
          return;
        } else if (nextOrder.status === "PENDING" && nextOrder.manual_payment) {
          setMessage("Scan the UPI QR code below and submit your UTR / Transaction ID for admin verification.");
          return;
        } else if (nextOrder.status === "PENDING") {
          setMessage(
            "Payment checkout could not start for this order. Please contact support or try again shortly."
          );
          return;
        } else if (nextOrder.status === "VERIFICATION_PENDING") {
          setMessage("Your payment is waiting for admin verification.");
          return;
        } else if (nextOrder.status === "REJECTED") {
          setMessage("This payment was rejected. Contact support if you believe this is a mistake.");
          return;
        } else if (nextOrder.download_enabled) {
          setMessage("Purchase confirmed. Preparing secure download...");
        } else {
          setMessage("Purchase required before downloading this asset. Complete payment or wait for admin verification.");
          return;
        }
      }
      await startDownload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not complete this action.");
    } finally {
      setBusy(false);
    }
  }

  async function handleUtrSubmit() {
    if (!order) return;
    if (!utr.trim()) {
      setMessage("Enter the UTR / transaction ID after making the UPI payment.");
      return;
    }
    setBusy(true);
    setMessage("Submitting payment details for verification...");
    try {
      const updated = await verifyPayment(order.id, { utr: utr.trim(), payer_name: payerName.trim() });
      setOrder(updated);
      setMessage("Payment details submitted. Admin verification is pending.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not submit payment details.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-8 space-y-4">
      <div className="flex flex-wrap gap-3">
        <button onClick={handlePrimaryAction} disabled={busy} className="rounded bg-rail-red px-5 py-3 font-semibold text-white disabled:opacity-60">
          {asset.is_free || asset.can_download ? <Download className="mr-2 inline" size={18} /> : <ShoppingCart className="mr-2 inline" size={18} />}
          {asset.is_upcoming ? asset.coming_soon_button_text || "Notify Me" : asset.is_free || asset.can_download ? "Download package" : `Buy for ${priceLabel(asset)}`}
        </button>
        <WishlistButton
          assetId={asset.id}
          variant="button"
          onWishlistChange={(inWishlist) => {
            setMessage(inWishlist ? "Saved to your wishlist." : "Removed from your wishlist.");
          }}
        />
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
      {order?.manual_payment && order.status === "PENDING" ? (
        <div className="max-w-xl rounded border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-300">
          <div className="grid gap-4 sm:grid-cols-[220px_1fr]">
            <img src={qrCodeUrl(order.manual_payment.upi_uri)} alt={`UPI QR code for order ${order.order_id || order.id}`} className="h-[220px] w-[220px] rounded bg-white p-2" />
            <div className="space-y-2">
              <p><span className="font-semibold text-white">Order ID:</span> {order.order_id || order.provider_order_id || `#${order.id}`}</p>
              <p><span className="font-semibold text-white">Amount:</span> {order.currency} {order.amount}</p>
              <p><span className="font-semibold text-white">UPI ID:</span> {order.manual_payment.upi_id || "Not configured"}</p>
              <p>{order.manual_payment.instructions}</p>
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <input value={utr} onChange={(event) => setUtr(event.target.value)} placeholder="UTR / Transaction ID" className="rounded border border-white/10 bg-black/40 px-3 py-3 outline-none" />
            <input value={payerName} onChange={(event) => setPayerName(event.target.value)} placeholder="Payer name (optional)" className="rounded border border-white/10 bg-black/40 px-3 py-3 outline-none" />
          </div>
          <button onClick={handleUtrSubmit} disabled={busy} className="mt-3 rounded bg-rail-red px-5 py-3 font-semibold text-white disabled:opacity-60">
            Submit UTR for verification
          </button>
        </div>
      ) : null}
    </div>
  );
}

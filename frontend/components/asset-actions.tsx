"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { load } from "@cashfreepayments/cashfree-js";
import { CheckCircle2, Download, Lock, ShoppingCart, Sparkles } from "lucide-react";
import { priceLabel, type Asset } from "@/lib/api";
import { WishlistButton } from "@/components/wishlist-button";
import { createOrder, downloadAsset, isLoggedIn, notifyMe, userGet, verifyPayment, type StoreOrder } from "@/lib/store-api";

function qrCodeUrl(value: string) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(value)}`;
}

const cashfreeMode = process.env.NEXT_PUBLIC_CASHFREE_MODE === "production" ? "production" : "sandbox";

export function AssetActions({ asset }: { asset: Asset }) {
  const [currentAsset, setCurrentAsset] = useState<Asset>(asset);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [order, setOrder] = useState<StoreOrder | null>(null);
  const [utr, setUtr] = useState("");
  const [payerName, setPayerName] = useState("");

  useEffect(() => {
    setCurrentAsset(asset);
    if (isLoggedIn()) {
      userGet<Asset>(`/assets/${asset.slug}/`)
        .then((fresh) => {
          setCurrentAsset(fresh);
        })
        .catch(() => {});
    }
  }, [asset.slug, asset]);

  const activeAsset = currentAsset;
  const isUpcoming = Boolean(activeAsset.is_upcoming);
  const isPrebooking = Boolean(activeAsset.prebooking_enabled && isUpcoming);
  const hasPrebooked = Boolean(activeAsset.user_has_prebooked);
  const downloadsReady = Boolean(activeAsset.can_download || activeAsset.prebooking_downloads_ready);
  const canEarlyAccess = Boolean(isUpcoming && activeAsset.user_can_access_early);
  const isUpcomingBlocked = Boolean(isUpcoming && !canEarlyAccess && !isPrebooking && !hasPrebooked);
  const isPrebookingSoldOut = Boolean(
    isPrebooking &&
    !hasPrebooked &&
    activeAsset.prebooking_slots &&
    activeAsset.prebooking_slots > 0 &&
    (activeAsset.prebooking_count || 0) >= activeAsset.prebooking_slots
  );
  const effectivePrice = activeAsset.user_effective_price
    ? activeAsset.user_effective_price
    : (isPrebooking && activeAsset.prebooking_price ? activeAsset.prebooking_price : activeAsset.price);

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
    const download = await downloadAsset(activeAsset.id);
    setMessage("Download ready. Starting package download...");
    const link = document.createElement("a");
    link.href = download.url;
    link.download = download.filename || `${activeAsset.slug}.zip`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    if (download.revoke) setTimeout(download.revoke, 1000);
  }

  async function handlePrimaryAction() {
    if (activeAsset.user_early_access_pending) {
      if (activeAsset.early_access_starts_at) {
        setMessage(
          `VIP Early Access will open for you on ${new Date(activeAsset.early_access_starts_at).toLocaleString("en-IN", {
            dateStyle: "medium",
            timeStyle: "short",
          })}. Stay tuned!`
        );
      } else {
        setMessage("VIP Early Access is scheduled to open soon.");
      }
      return;
    }
    if (hasPrebooked) {
      if (downloadsReady) {
        setBusy(true);
        try {
          await startDownload();
        } catch (error) {
          setMessage(error instanceof Error ? error.message : "Could not start download.");
        } finally {
          setBusy(false);
        }
      } else {
        const unlockMsg = activeAsset.prebooking_download_unlock_at
          ? `✅ Pre-booking confirmed! Your package download unlocks on ${new Date(activeAsset.prebooking_download_unlock_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}.`
          : activeAsset.release_date
          ? `✅ Pre-booking confirmed! Download unlocks on release date (${new Date(activeAsset.release_date).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}).`
          : "✅ Pre-booking confirmed! Download access will be unlocked shortly.";
        setMessage(unlockMsg);
      }
      return;
    }
    if (isPrebookingSoldOut) {
      setMessage("Pre-booking limit has been reached for this asset.");
      return;
    }
    if (isUpcomingBlocked) {
      if (!(await requireLogin())) return;
      setBusy(true);
      setMessage("Saving your Notify Me request...");
      try {
        const result = await notifyMe(activeAsset.slug);
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
    setMessage(
      activeAsset.is_free
        ? "Preparing secure download..."
        : isPrebooking
        ? "Setting up your pre-order..."
        : "Creating your order..."
    );
    try {
      if (!activeAsset.is_free && !activeAsset.can_download) {
        const nextOrder = await createOrder(activeAsset.id);
        setOrder(nextOrder);
        if (nextOrder.status === "PENDING" && nextOrder.payment_session_id) {
          await startCashfreeCheckout(nextOrder);
          setMessage("Complete the Cashfree payment to confirm your order.");
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
          if (downloadsReady) {
            setMessage("Purchase confirmed. Preparing secure download...");
          } else {
            setMessage("Pre-booking confirmed! Your download package will unlock on the scheduled date.");
            return;
          }
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

  function getButtonLabel() {
    if (activeAsset.user_early_access_pending) {
      return activeAsset.early_access_starts_at
        ? `VIP Access Opens ${new Date(activeAsset.early_access_starts_at).toLocaleDateString("en-IN")}`
        : "VIP Access Opening Soon";
    }
    if (hasPrebooked) {
      if (downloadsReady) {
        return "🚀 Download Package (Early Access Unlocked)";
      }
      return "✅ Pre-Booked (Order Confirmed)";
    }
    if (isPrebookingSoldOut) {
      return "Pre-Booking Sold Out";
    }
    if (isPrebooking) {
      if (activeAsset.user_has_early_discount && activeAsset.user_discount_percent) {
        return `🚀 Pre-Book for INR ${effectivePrice} (${activeAsset.user_discount_percent}% VIP Loyalty Discount)`;
      }
      return `🚀 Pre-Book Now for INR ${effectivePrice}`;
    }
    if (isUpcomingBlocked) {
      return activeAsset.coming_soon_button_text || "Notify Me";
    }
    if (activeAsset.is_free || activeAsset.can_download) {
      return isUpcoming ? "Early Access Download" : "Download package";
    }
    if (isUpcoming) {
      return `VIP Early Access: Buy for INR ${effectivePrice}`;
    }
    if (activeAsset.user_has_early_discount && activeAsset.user_discount_percent) {
      return `Buy for INR ${effectivePrice} (${activeAsset.user_discount_percent}% Loyalty Discount)`;
    }
    return `Buy for ${priceLabel(activeAsset)}`;
  }

  return (
    <div className="mt-8 space-y-4">
      {/* Pre-Booking Confirmed Status */}
      {hasPrebooked ? (
        <div className="rounded-lg border border-emerald-400/40 bg-emerald-950/30 p-4 text-xs text-emerald-200 flex items-start gap-3 shadow-sm">
          <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-400" size={20} />
          <div className="space-y-1">
            <p className="font-bold text-emerald-100 text-sm flex items-center gap-2">
              <span>✅ Pre-Booking Confirmed</span>
              <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[11px] font-semibold text-emerald-300">
                Order Verified
              </span>
            </p>
            {downloadsReady ? (
              <p className="text-emerald-300 font-medium leading-relaxed">
                🎉 Early access download is now unlocked! Click the download button below to get your package immediately.
              </p>
            ) : (
              <div className="text-slate-300 space-y-1 leading-relaxed">
                <p>
                  Your pre-order has been secured. Your download package will automatically unlock on:
                </p>
                <p className="text-sm font-bold text-white bg-black/40 border border-emerald-500/20 rounded px-2.5 py-1 inline-block">
                  ⏰{" "}
                  {activeAsset.prebooking_download_unlock_at
                    ? new Date(activeAsset.prebooking_download_unlock_at).toLocaleString("en-IN", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })
                    : activeAsset.release_date
                    ? new Date(activeAsset.release_date).toLocaleString("en-IN", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })
                    : "Scheduled Release Date"}
                </p>
                <p className="text-xs text-slate-400">
                  You will be able to download your asset from this page as soon as the unlock time arrives.
                </p>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* Pre-Booking Promotional Banner */}
      {isPrebooking && !hasPrebooked ? (
        <div className="rounded-lg border border-cyan-500/40 bg-cyan-950/30 p-4 text-xs text-cyan-200 flex items-start gap-3 shadow-sm">
          <Sparkles className="mt-0.5 shrink-0 text-cyan-400" size={20} />
          <div className="space-y-1.5 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-bold text-white text-sm flex items-center gap-2">
                <span>🚀 {activeAsset.prebooking_badge || "PRE-BOOKING OPEN"}</span>
                {isPrebookingSoldOut ? (
                  <span className="rounded bg-red-500/20 text-red-300 px-2 py-0.5 text-xs font-semibold">
                    SOLD OUT
                  </span>
                ) : null}
              </p>
              {activeAsset.prebooking_slots && activeAsset.prebooking_slots > 0 ? (
                <span className="rounded bg-cyan-500/20 border border-cyan-400/40 px-2 py-0.5 text-[11px] font-semibold text-cyan-300">
                  {Math.max(0, activeAsset.prebooking_slots - (activeAsset.prebooking_count || 0))} slots remaining
                </span>
              ) : null}
            </div>
            <p className="text-slate-200 leading-relaxed">
              {activeAsset.prebooking_message ||
                "Pre-book your copy now to lock in exclusive launch pricing and guarantee day-one access!"}
            </p>
            {activeAsset.user_has_early_discount && activeAsset.user_discount_percent ? (
              <p className="text-emerald-300 font-semibold">
                🌟 VIP Loyalty Discount Applied: You get an additional {activeAsset.user_discount_percent}% off the pre-booking price!
              </p>
            ) : null}
            {activeAsset.prebooking_download_unlock_at ? (
              <p className="text-cyan-300 text-xs">
                ⏰ Early Download Schedule: Pre-booked customers unlock downloads on{" "}
                <strong className="text-white">
                  {new Date(activeAsset.prebooking_download_unlock_at).toLocaleString("en-IN", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </strong>
                .
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* Early Access & Loyalty Perks Status Banner */}
      {activeAsset.early_access_enabled && !hasPrebooked ? (
        canEarlyAccess ? (
          <div className="rounded-lg border border-emerald-400/40 bg-emerald-400/10 p-3.5 text-xs text-emerald-300 flex items-start gap-2.5 shadow-sm">
            <Sparkles className="mt-0.5 shrink-0 text-emerald-400" size={17} />
            <div>
              <p className="font-bold text-emerald-100 text-sm">
                ⭐ VIP Early Access Active
              </p>
              <p className="text-emerald-300 mt-0.5 leading-relaxed">
                Because you purchased qualifying products, you have unlocked exclusive early purchase and download access before official release!
              </p>
              {activeAsset.user_has_early_discount && activeAsset.user_discount_percent ? (
                <p className="text-emerald-200 font-semibold mt-1">
                  Exclusive loyalty discount applied: Pay INR {effectivePrice} ({activeAsset.user_discount_percent}% OFF).
                </p>
              ) : null}
            </div>
          </div>
        ) : activeAsset.user_early_access_pending ? (
          <div className="rounded-lg border border-amber-400/40 bg-amber-400/10 p-3.5 text-xs text-amber-200 flex items-start gap-2.5 shadow-sm">
            <Sparkles className="mt-0.5 shrink-0 text-amber-400" size={17} />
            <div>
              <p className="font-bold text-amber-100 text-sm">
                🌟 You Qualify for VIP Early Access!
              </p>
              <p className="text-amber-200 mt-0.5 leading-relaxed">
                As a loyal customer, VIP early access will open for you on:{" "}
                <strong className="text-white">
                  {activeAsset.early_access_starts_at
                    ? new Date(activeAsset.early_access_starts_at).toLocaleString("en-IN", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })
                    : "Scheduled VIP Date"}
                </strong>
                .
              </p>
            </div>
          </div>
        ) : activeAsset.user_has_early_discount && !isPrebooking ? (
          <div className="rounded-lg border border-emerald-400/40 bg-emerald-400/10 p-3.5 text-xs text-emerald-300 flex items-start gap-2.5 shadow-sm">
            <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-400" size={17} />
            <div>
              <p className="font-bold text-emerald-100 text-sm">
                🏷️ Loyalty Discount Unlocked
              </p>
              <p className="text-emerald-300 mt-0.5 leading-relaxed">
                As a valued customer, you qualify for an exclusive {activeAsset.user_discount_percent}% discount!
              </p>
              <p className="text-emerald-200 font-semibold mt-1">
                Your exclusive price: INR {effectivePrice} (Regular price: INR {activeAsset.price}).
              </p>
            </div>
          </div>
        ) : !isLoggedIn() ? (
          <div className="rounded-lg border border-purple-500/30 bg-purple-950/25 p-3.5 text-xs text-purple-200 flex items-start gap-2.5">
            <Lock className="mt-0.5 shrink-0 text-purple-400" size={17} />
            <div>
              <p className="font-bold text-white text-sm">
                Own previously released products?
              </p>
              <p className="text-purple-300 mt-0.5 leading-relaxed">
                <Link href="/login" className="underline font-bold text-white hover:text-purple-200">
                  Log in to your account
                </Link>{" "}
                to check if you qualify for VIP early access or exclusive loyalty discounts!
              </p>
            </div>
          </div>
        ) : isUpcoming && !isPrebooking ? (
          <div className="rounded-lg border border-purple-500/20 bg-purple-950/20 p-3 text-xs text-slate-300 space-y-1.5">
            <p className="text-slate-300 leading-relaxed">
              ℹ️ Early access for this upcoming product is currently reserved for owners of:{" "}
              <span className="font-bold text-amber-300">
                {activeAsset.early_access_required_asset_titles && activeAsset.early_access_required_asset_titles.length > 0
                  ? activeAsset.early_access_required_asset_titles.join(", ")
                  : "any previously purchased store product"}
              </span>
              . Click &quot;Notify Me&quot; below to be alerted upon general release.
            </p>
            {activeAsset.release_date ? (
              <p className="text-xs text-slate-400">
                🚀 General release scheduled for:{" "}
                <span className="font-semibold text-white">
                  {new Date(activeAsset.release_date).toLocaleString("en-IN", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </span>
              </p>
            ) : null}
          </div>
        ) : null
      ) : null}

      <div className="flex flex-wrap gap-3">
        <button
          onClick={handlePrimaryAction}
          disabled={busy || isPrebookingSoldOut}
          className={`rounded px-5 py-3 font-semibold text-white transition disabled:opacity-60 ${
            hasPrebooked
              ? downloadsReady
                ? "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-md shadow-emerald-900/30"
                : "bg-slate-700/90 hover:bg-slate-700 text-cyan-200 border border-cyan-500/40"
              : isPrebooking
              ? "bg-gradient-to-r from-cyan-600 via-teal-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 shadow-md shadow-cyan-900/30"
              : canEarlyAccess
              ? "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-md shadow-purple-900/30"
              : "bg-rail-red hover:bg-rail-red/90"
          }`}
        >
          {hasPrebooked ? (
            downloadsReady ? (
              <Download className="mr-2 inline" size={18} />
            ) : (
              <CheckCircle2 className="mr-2 inline text-cyan-300" size={18} />
            )
          ) : activeAsset.is_free || activeAsset.can_download ? (
            <Download className="mr-2 inline" size={18} />
          ) : isUpcomingBlocked ? null : (
            <ShoppingCart className="mr-2 inline" size={18} />
          )}
          {getButtonLabel()}
        </button>
        <WishlistButton
          assetId={activeAsset.id}
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

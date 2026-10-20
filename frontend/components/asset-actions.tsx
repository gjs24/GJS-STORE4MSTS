"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { load } from "@cashfreepayments/cashfree-js";
import { CheckCircle2, Download, Lock, ShoppingCart, Sparkles, Zap } from "lucide-react";
import { CountdownTimer } from "@/components/countdown-timer";
import { getStoredUser, priceLabel, type Asset, type AssetFeatureAddon } from "@/lib/api";
import { WishlistButton } from "@/components/wishlist-button";
import { createOrder, createAddonOrder, downloadAsset, downloadAddon, isLoggedIn, notifyMe, userGet, verifyPayment, type StoreOrder } from "@/lib/store-api";

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
  const [nowMs, setNowMs] = useState<number>(0);

  useEffect(() => {
    setNowMs(Date.now());
    const timer = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

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
  const releaseMs = activeAsset.release_date ? new Date(activeAsset.release_date).getTime() : NaN;
  const isReleasedBySchedule = Boolean(nowMs > 0 && !Number.isNaN(releaseMs) && nowMs >= releaseMs);
  const isUpcoming = Boolean(activeAsset.is_upcoming && !isReleasedBySchedule);

  const pbStartsMs = activeAsset.prebooking_starts_at ? new Date(activeAsset.prebooking_starts_at).getTime() : NaN;
  const pbEndsMs = activeAsset.prebooking_ends_at ? new Date(activeAsset.prebooking_ends_at).getTime() : NaN;
  const isPrebookingPending = Boolean(
    activeAsset.prebooking_enabled && isUpcoming && nowMs > 0 && !Number.isNaN(pbStartsMs) && nowMs < pbStartsMs
  );
  const isPrebookingClosed = Boolean(
    activeAsset.prebooking_enabled && isUpcoming && nowMs > 0 && !Number.isNaN(pbEndsMs) && nowMs >= pbEndsMs
  );
  const isPrebooking = Boolean(
    activeAsset.prebooking_enabled && isUpcoming && !isPrebookingPending && !isPrebookingClosed
  );

  const hasPrebooked = Boolean(activeAsset.user_has_prebooked);
  const pbUnlockMs = activeAsset.prebooking_download_unlock_at
    ? new Date(activeAsset.prebooking_download_unlock_at).getTime()
    : NaN;
  const isUnlockedBySchedule = Boolean(
    (nowMs > 0 && !Number.isNaN(pbUnlockMs) && nowMs >= pbUnlockMs) || isReleasedBySchedule
  );
  const downloadsReady = Boolean(
    activeAsset.can_download || activeAsset.prebooking_downloads_ready || isUnlockedBySchedule
  );
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

  const activeAddons = activeAsset.addons || [];
  const hasAddons = activeAddons.length > 0;
  const userOwnsBase = Boolean(activeAsset.can_download || activeAsset.user_owns_base || activeAsset.is_free);
  const [selectedEdition, setSelectedEdition] = useState<"bundle" | "base">("bundle");

  const baseNumeric = Number(effectivePrice) || 0;
  const addonSum = activeAddons.reduce((sum, a) => sum + (Number(a.bundle_price_addition) || 0), 0);
  const computedBundlePrice = (baseNumeric + addonSum).toFixed(2).replace(/\.00$/, "");
  const bundlePrice = activeAsset.bundle_price || computedBundlePrice;

  async function requireLogin() {
    if (!isLoggedIn()) {
      setMessage("Please login or create an account to continue.");
      return false;
    }
    return true;
  }

  function loadRazorpayScript(): Promise<boolean> {
    return new Promise((resolve) => {
      if (typeof window === "undefined") {
        resolve(false);
        return;
      }
      if ((window as any).Razorpay) {
        resolve(true);
        return;
      }
      const existing = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
      if (existing) {
        existing.addEventListener("load", () => resolve(true));
        return;
      }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  }

  async function startRazorpayCheckout(nextOrder: StoreOrder) {
    if (!nextOrder.razorpay_order_id || !nextOrder.razorpay_key_id) {
      return false;
    }
    setMessage("Opening secure Razorpay checkout...");
    const loaded = await loadRazorpayScript();
    if (!loaded) {
      throw new Error("Could not load Razorpay payment gateway. Please check your internet connection.");
    }
    const storedUser = getStoredUser();
    const customerName = storedUser?.username || "GJS Customer";
    const customerEmail = storedUser?.email || "";
    const customerPhone = nextOrder.customer_phone || (storedUser?.phone_number || "");

    const options = {
      key: nextOrder.razorpay_key_id,
      amount: Math.round(Number(nextOrder.amount) * 100),
      currency: nextOrder.currency || "INR",
      name: "MSTS-GJS Production Store",
      description: activeAsset.title.slice(0, 40),
      order_id: nextOrder.razorpay_order_id,
      image: "/desktop-app-icon.png",
      prefill: {
        name: customerName,
        email: customerEmail,
        contact: customerPhone,
      },
      theme: {
        color: "#dc2626",
      },
      modal: {
        ondismiss: function () {
          setMessage("Payment was cancelled. You can retry whenever ready.");
          setBusy(false);
        },
      },
      handler: async function (response: {
        razorpay_payment_id: string;
        razorpay_order_id: string;
        razorpay_signature: string;
      }) {
        setBusy(true);
        setMessage("Verifying payment with bank...");
        try {
          const verifiedOrder = await verifyPayment(nextOrder.id, {
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_signature: response.razorpay_signature,
          });
          setOrder(verifiedOrder);
          setMessage("Payment verified successfully! Your download is now ready.");
          if (isLoggedIn()) {
            userGet<Asset>(`/assets/${activeAsset.slug}/`).then(setCurrentAsset).catch(() => {});
          }
        } catch (err) {
          setMessage(err instanceof Error ? err.message : "Payment verification failed.");
        } finally {
          setBusy(false);
        }
      },
    };

    const rzp = new (window as any).Razorpay(options);
    rzp.on("payment.failed", function (response: any) {
      setMessage(`Payment failed: ${response?.error?.description || "Transaction was not completed"}`);
      setBusy(false);
    });
    rzp.open();
    return true;
  }

  async function startCashfreeCheckout(nextOrder: StoreOrder) {
    if (!nextOrder.payment_session_id) {
      return false;
    }
    setMessage("Redirecting to secure Cashfree checkout...");
    const targetMode = nextOrder.cashfree_mode || cashfreeMode;
    const cashfree = await load({ mode: targetMode });
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
        const storedUser = getStoredUser();
        let phone = storedUser?.phone_number || (typeof window !== "undefined" ? (localStorage.getItem("gjs_customer_phone") || "") : "");
        if (!phone || phone.replace(/\D/g, "").length !== 10) {
          const userPhone = window.prompt(
            "Enter your 10-digit mobile number for order receipt & OTP:",
            phone
          );
          if (userPhone && userPhone.replace(/\D/g, "").length >= 10) {
            phone = userPhone.replace(/\D/g, "").slice(-10);
            localStorage.setItem("gjs_customer_phone", phone);
          }
        }
        const isBuyingBundle = hasAddons && !userOwnsBase && selectedEdition === "bundle";
        const nextOrder = await createOrder(activeAsset.id, phone || undefined, true, isBuyingBundle);
        setOrder(nextOrder);
        if (nextOrder.status === "PENDING" && nextOrder.payment_provider === "RAZORPAY" && nextOrder.razorpay_order_id) {
          await startRazorpayCheckout(nextOrder);
          setMessage("Complete the payment in the Razorpay window to confirm your order.");
          return;
        } else if (nextOrder.status === "PENDING" && nextOrder.payment_session_id) {
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
        } else if (nextOrder.download_enabled || nextOrder.status === "APPROVED" || nextOrder.status === "PAID") {
          if (isLoggedIn()) {
            userGet<Asset>(`/assets/${activeAsset.slug}/`).then(setCurrentAsset).catch(() => {});
          }
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

  async function handleUpgradeAction(addon: AssetFeatureAddon) {
    if (!(await requireLogin())) return;
    setBusy(true);
    setMessage(`Creating upgrade order for ${addon.title}...`);
    try {
      const storedUser = getStoredUser();
      let phone = storedUser?.phone_number || (typeof window !== "undefined" ? (localStorage.getItem("gjs_customer_phone") || "") : "");
      if (!phone || phone.replace(/\D/g, "").length !== 10) {
        const userPhone = window.prompt(
          "Enter your 10-digit mobile number for order receipt & OTP:",
          phone
        );
        if (userPhone && userPhone.replace(/\D/g, "").length >= 10) {
          phone = userPhone.replace(/\D/g, "").slice(-10);
          localStorage.setItem("gjs_customer_phone", phone);
        }
      }
      const nextOrder = await createAddonOrder(addon.id, phone || undefined, true);
      setOrder(nextOrder);
      if (nextOrder.status === "PENDING" && nextOrder.payment_provider === "RAZORPAY" && nextOrder.razorpay_order_id) {
        await startRazorpayCheckout(nextOrder);
        setMessage("Complete the payment in the Razorpay window to unlock your upgrade.");
        return;
      } else if (nextOrder.status === "PENDING" && nextOrder.payment_session_id) {
        await startCashfreeCheckout(nextOrder);
        setMessage("Complete the Cashfree payment to unlock your upgrade.");
        return;
      } else if (nextOrder.status === "PENDING" && nextOrder.manual_payment) {
        setMessage("Scan the UPI QR code below and submit your UTR / Transaction ID for admin verification.");
        return;
      } else if (nextOrder.download_enabled || nextOrder.status === "APPROVED" || nextOrder.status === "PAID") {
        setMessage(`🎉 ${addon.title} upgrade unlocked successfully!`);
        if (isLoggedIn()) {
          const fresh = await userGet<Asset>(`/assets/${activeAsset.slug}/`);
          setCurrentAsset(fresh);
        }
      } else {
        setMessage("Purchase required before downloading this upgrade.");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not complete upgrade purchase.");
    } finally {
      setBusy(false);
    }
  }

  async function handleAddonDownload(addon: AssetFeatureAddon) {
    setBusy(true);
    setMessage(`Preparing download for ${addon.title}...`);
    try {
      const download = await downloadAddon(addon.id);
      setMessage(`Download ready for ${addon.title}.`);
      const link = document.createElement("a");
      link.href = download.url;
      link.download = download.filename || `${addon.slug || "addon"}.zip`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      if (download.revoke) setTimeout(download.revoke, 1000);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not start addon download.");
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
        return `🚀 Pre-Book for ₹${effectivePrice} (${activeAsset.user_discount_percent}% VIP Loyalty Discount)`;
      }
      return `🚀 Pre-Book Now for ₹${effectivePrice}`;
    }
    if (isPrebookingPending) {
      return `⏳ Pre-Booking Opens Soon (${activeAsset.coming_soon_button_text || "Notify Me"})`;
    }
    if (isPrebookingClosed && isUpcomingBlocked) {
      return `Pre-Booking Closed (${activeAsset.coming_soon_button_text || "Notify Me"})`;
    }
    if (isUpcomingBlocked) {
      return activeAsset.coming_soon_button_text || "Notify Me";
    }
    if (activeAsset.is_free || activeAsset.can_download) {
      return isUpcoming ? "Early Access Download" : "Download package";
    }
    if (hasAddons && !userOwnsBase) {
      if (selectedEdition === "bundle") {
        return `Buy Complete Bundle for ₹${bundlePrice}`;
      }
      return `Buy Base Only for ₹${effectivePrice}`;
    }
    if (isUpcoming) {
      return `VIP Early Access: Buy for ₹${effectivePrice}`;
    }
    if (activeAsset.user_has_early_discount && activeAsset.user_discount_percent) {
      return `Buy for ₹${effectivePrice} (${activeAsset.user_discount_percent}% Loyalty Discount)`;
    }
    return `Buy for ${priceLabel(activeAsset)}`;
  }

  return (
    <div className="mt-8 space-y-4">
      {/* Pre-Booking Confirmed Status */}
      {hasPrebooked ? (
        <div className="rounded-lg border border-emerald-400/40 bg-emerald-950/30 p-4 text-xs text-emerald-200 flex items-start gap-3 shadow-sm">
          <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-400" size={20} />
          <div className="space-y-2 flex-1">
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
              <div className="text-slate-300 space-y-2 leading-relaxed">
                <p>
                  Your pre-order has been secured. Your download package will automatically unlock on schedule:
                </p>
                {activeAsset.prebooking_download_unlock_at || activeAsset.release_date ? (
                  <CountdownTimer
                    endDate={activeAsset.prebooking_download_unlock_at || activeAsset.release_date}
                    endLabel="Your Pre-Order Download Unlocks In"
                    completedLabel="Download Unlocked! Click below to download"
                    theme="cyan"
                    icon="clock"
                  />
                ) : (
                  <p className="text-sm font-bold text-white bg-black/40 border border-emerald-500/20 rounded px-2.5 py-1 inline-block">
                    ⏰ Scheduled Release Date
                  </p>
                )}
                <p className="text-xs text-slate-400">
                  You will be able to download your asset from this page as soon as the unlock timer completes.
                </p>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* Pre-Booking Promotional Banner */}
      {(isPrebooking || isPrebookingPending || isPrebookingClosed) && !hasPrebooked ? (
        <div className="rounded-lg border border-cyan-500/40 bg-cyan-950/30 p-4 text-xs text-cyan-200 flex items-start gap-3 shadow-sm">
          <Sparkles className="mt-0.5 shrink-0 text-cyan-400" size={20} />
          <div className="space-y-2 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-bold text-white text-sm flex items-center gap-2">
                <span>
                  🚀{" "}
                  {isPrebookingClosed
                    ? "PRE-BOOKING CLOSED"
                    : isPrebookingPending
                    ? "PRE-BOOKING OPENS SOON"
                    : activeAsset.prebooking_badge || "PRE-BOOKING OPEN"}
                </span>
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
            {activeAsset.prebooking_starts_at || activeAsset.prebooking_ends_at ? (
              <div className="pt-0.5">
                <CountdownTimer
                  startDate={activeAsset.prebooking_starts_at}
                  endDate={activeAsset.prebooking_ends_at}
                  startLabel="Pre-Booking Opens In"
                  endLabel="Pre-Booking Closes In"
                  completedLabel="Pre-Booking Window Has Closed"
                  variant="inline"
                  theme="cyan"
                  icon="timer"
                />
              </div>
            ) : null}
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
                  Exclusive loyalty discount applied: Pay ₹{effectivePrice} ({activeAsset.user_discount_percent}% OFF).
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
                Your exclusive price: ₹{effectivePrice} (Regular price: ₹{activeAsset.price}).
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

      {/* Edition Selector for New Buyers */}
      {!userOwnsBase && hasAddons && !isUpcomingBlocked && !activeAsset.is_free && (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Choose Your Edition
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {/* Complete Bundle Option */}
            <button
              type="button"
              onClick={() => setSelectedEdition("bundle")}
              className={`relative flex flex-col items-start p-3.5 rounded-lg border text-left transition-all ${
                selectedEdition === "bundle"
                  ? "border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500/50"
                  : "border-white/10 bg-black/30 hover:border-white/20"
              }`}
            >
              <span className="absolute -top-2.5 right-3 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm">
                Recommended
              </span>
              <div className="flex items-center justify-between w-full">
                <span className="font-bold text-white text-sm">Complete Bundle</span>
                <span className="font-extrabold text-emerald-400 text-base">₹{bundlePrice}</span>
              </div>
              <p className="mt-1 text-xs text-slate-300">
                Base Pack + All Feature Upgrades ({activeAddons.map((a) => a.title).join(", ")})
              </p>
              <span className="mt-2 text-[11px] font-semibold text-emerald-300 flex items-center gap-1">
                <Sparkles size={12} /> Includes all current & future updates
              </span>
            </button>

            {/* Base Edition Option */}
            <button
              type="button"
              onClick={() => setSelectedEdition("base")}
              className={`relative flex flex-col items-start p-3.5 rounded-lg border text-left transition-all ${
                selectedEdition === "base"
                  ? "border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500/50"
                  : "border-white/10 bg-black/30 hover:border-white/20"
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="font-bold text-white text-sm">Base Pack Only</span>
                <span className="font-extrabold text-slate-200 text-base">₹{effectivePrice}</span>
              </div>
              <p className="mt-1 text-xs text-slate-400">
                Standard release without optional add-on features
              </p>
              <span className="mt-2 text-[11px] text-slate-400">
                Add-ons can be purchased separately later
              </span>
            </button>
          </div>
        </div>
      )}

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

      {/* Feature Addons Section */}
      {hasAddons && (
        <div className="space-y-3 pt-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Zap size={14} className="text-amber-400" />
            <span>Product Feature Add-ons & Upgrades</span>
          </p>
          {activeAddons.map((addon) => (
            <div
              key={addon.id}
              className={`rounded-xl border p-4 transition-all ${
                addon.is_unlocked
                  ? "border-emerald-500/40 bg-emerald-950/20"
                  : "border-amber-500/40 bg-gradient-to-r from-amber-950/25 to-black/40 shadow-sm"
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-white text-sm">{addon.title}</span>
                    <span className="rounded bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-slate-300">
                      v{addon.version}
                    </span>
                    {addon.badge ? (
                      <span className="rounded bg-amber-500/20 border border-amber-400/30 px-2 py-0.5 text-[10px] font-bold text-amber-300 uppercase">
                        {addon.badge}
                      </span>
                    ) : null}
                    {addon.is_unlocked ? (
                      <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300 uppercase flex items-center gap-1">
                        <CheckCircle2 size={11} /> Unlocked
                      </span>
                    ) : null}
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {addon.short_description || addon.description}
                  </p>
                  {addon.file_size ? (
                    <p className="text-[11px] text-slate-400">File size: {addon.file_size}</p>
                  ) : null}
                </div>

                <div className="shrink-0 flex items-center gap-3">
                  {addon.is_unlocked ? (
                    <button
                      type="button"
                      onClick={() => handleAddonDownload(addon)}
                      disabled={busy}
                      className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2.5 text-xs font-bold text-white shadow-md transition-all hover:from-emerald-500 hover:to-teal-500 disabled:opacity-60"
                    >
                      <Download size={15} />
                      <span>Download {addon.title}</span>
                    </button>
                  ) : userOwnsBase ? (
                    <div className="flex items-center gap-3">
                      <div className="text-right hidden sm:block">
                        <p className="text-[11px] text-amber-300 font-medium">Owner Upgrade</p>
                        <p className="text-base font-extrabold text-white">₹{addon.upgrade_price}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleUpgradeAction(addon)}
                        disabled={busy}
                        className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-amber-600 to-orange-600 px-4 py-2.5 text-xs font-bold text-white shadow-md transition-all hover:from-amber-500 hover:to-orange-500 disabled:opacity-60"
                      >
                        <Sparkles size={14} />
                        <span>Upgrade for ₹{addon.upgrade_price}</span>
                      </button>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-400 italic">
                      Included in Complete Bundle or buy base first
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
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

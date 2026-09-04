"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Heart, Loader2 } from "lucide-react";
import {
  isLoggedIn,
  addToWishlist,
  removeAssetFromWishlist,
  userGet,
  WISHLIST_CHANGE_EVENT,
  type WishlistItem,
} from "@/lib/store-api";

// Shared in-memory cache for wishlisted asset IDs to prevent duplicate network calls across cards
let cachedWishlistIds: Set<number> | null = null;
let pendingFetch: Promise<Set<number>> | null = null;

async function getWishlistIds(): Promise<Set<number>> {
  if (cachedWishlistIds) return cachedWishlistIds;
  if (!isLoggedIn()) return new Set();

  if (!pendingFetch) {
    pendingFetch = userGet<WishlistItem[]>("/wishlist/")
      .then((items) => {
        const ids = new Set(items.map((item) => item.asset?.id).filter(Boolean));
        cachedWishlistIds = ids;
        return ids;
      })
      .catch(() => new Set<number>())
      .finally(() => {
        pendingFetch = null;
      });
  }
  return pendingFetch;
}

interface WishlistButtonProps {
  assetId: number;
  variant?: "button" | "icon";
  className?: string;
  onWishlistChange?: (inWishlist: boolean) => void;
}

export function WishlistButton({
  assetId,
  variant = "button",
  className = "",
  onWishlistChange,
}: WishlistButtonProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [busy, setBusy] = useState(false);

  // Initialize wishlist state from cache or API
  useEffect(() => {
    if (!isLoggedIn()) {
      setIsWishlisted(false);
      return;
    }

    if (cachedWishlistIds) {
      setIsWishlisted(cachedWishlistIds.has(assetId));
    } else {
      getWishlistIds().then((ids) => {
        setIsWishlisted(ids.has(assetId));
      });
    }
  }, [assetId]);

  // Synchronize state across all mounted instances
  useEffect(() => {
    function handleEvent(event: Event) {
      const custom = event as CustomEvent<{ assetId: number; isWishlisted: boolean }>;
      if (custom.detail && custom.detail.assetId === assetId) {
        setIsWishlisted(custom.detail.isWishlisted);
        if (cachedWishlistIds) {
          if (custom.detail.isWishlisted) {
            cachedWishlistIds.add(assetId);
          } else {
            cachedWishlistIds.delete(assetId);
          }
        }
      }
    }

    window.addEventListener(WISHLIST_CHANGE_EVENT, handleEvent);
    return () => window.removeEventListener(WISHLIST_CHANGE_EVENT, handleEvent);
  }, [assetId]);

  const toggleWishlist = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (!isLoggedIn()) {
        router.push(`/login?next=${encodeURIComponent(pathname)}`);
        return;
      }

      if (busy) return;
      setBusy(true);

      const nextState = !isWishlisted;

      // Optimistic state update
      setIsWishlisted(nextState);
      if (cachedWishlistIds) {
        if (nextState) cachedWishlistIds.add(assetId);
        else cachedWishlistIds.delete(assetId);
      }

      try {
        if (nextState) {
          await addToWishlist(assetId);
        } else {
          await removeAssetFromWishlist(assetId);
        }
        onWishlistChange?.(nextState);
      } catch {
        // Rollback on failure
        setIsWishlisted(!nextState);
        if (cachedWishlistIds) {
          if (!nextState) cachedWishlistIds.add(assetId);
          else cachedWishlistIds.delete(assetId);
        }
      } finally {
        setBusy(false);
      }
    },
    [assetId, busy, isWishlisted, onWishlistChange, pathname, router]
  );

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={toggleWishlist}
        disabled={busy}
        aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
        title={isWishlisted ? "In your wishlist (click to remove)" : "Save to wishlist"}
        className={`group relative flex h-8 w-8 items-center justify-center rounded-full backdrop-blur-md transition-all duration-200 active:scale-90 ${
          isWishlisted
            ? "border border-rose-500/60 bg-black/75 text-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.4)] hover:bg-black/90"
            : "border border-white/20 bg-black/55 text-slate-300 hover:border-rose-500/40 hover:bg-black/80 hover:text-rose-400"
        } ${className}`}
      >
        {busy ? (
          <Loader2 size={14} className="animate-spin text-slate-300" />
        ) : (
          <Heart
            size={15}
            className={`transition-all duration-300 ${
              isWishlisted
                ? "fill-rose-500 text-rose-500 scale-110 drop-shadow-[0_0_6px_rgba(244,63,94,0.6)]"
                : "text-slate-300 group-hover:scale-110 group-hover:text-rose-400"
            }`}
          />
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleWishlist}
      disabled={busy}
      className={`group flex items-center gap-2 rounded-xl border px-5 py-3 font-semibold transition-all duration-200 disabled:opacity-60 active:scale-95 ${
        isWishlisted
          ? "border-rose-500/60 bg-rose-500/15 text-rose-200 shadow-[0_0_20px_rgba(244,63,94,0.25)] hover:bg-rose-500/25"
          : "border-white/15 bg-white/5 text-slate-200 hover:border-rose-500/40 hover:bg-white/10 hover:text-white"
      } ${className}`}
    >
      {busy ? (
        <Loader2 size={18} className="animate-spin text-rose-400" />
      ) : (
        <Heart
          size={18}
          className={`transition-all duration-300 ${
            isWishlisted
              ? "fill-rose-500 text-rose-500 scale-110 drop-shadow-[0_0_8px_rgba(244,63,94,0.6)]"
              : "text-slate-400 group-hover:scale-110 group-hover:text-rose-400"
          }`}
        />
      )}
      <span>{isWishlisted ? "In Wishlist" : "Wishlist"}</span>
    </button>
  );
}


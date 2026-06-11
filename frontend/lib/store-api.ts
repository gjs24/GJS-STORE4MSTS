"use client";

import { API_URL, clearAuth, type Asset } from "@/lib/api";

export type StoreOrder = {
  id: number;
  asset: Asset;
  amount: string;
  currency: string;
  status: "PENDING" | "PAID" | "FAILED" | "REFUNDED";
  provider_order_id?: string;
  created_at: string;
};

export type DownloadLog = {
  id: number;
  asset: Asset;
  ip_address?: string | null;
  downloaded_at: string;
};

export type WishlistItem = {
  id: number;
  asset: Asset;
  created_at: string;
};

function token() {
  return typeof window === "undefined" ? "" : localStorage.getItem("accessToken") || "";
}

export function isLoggedIn() {
  return Boolean(token());
}

export function authHeaders(): Record<string, string> {
  const accessToken = token();
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
}

async function parseError(res: Response, fallback: string) {
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) {
    clearAuth();
    return "Please login again to continue.";
  }
  return data.detail || data.non_field_errors?.[0] || fallback;
}

export async function userGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, { headers: authHeaders(), cache: "no-store" });
  if (!res.ok) throw new Error(await parseError(res, "Could not load your account data."));
  return res.json();
}

export async function createOrder(assetId: number): Promise<StoreOrder> {
  const res = await fetch(`${API_URL}/orders/create/`, {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ asset_id: assetId })
  });
  if (!res.ok) throw new Error(await parseError(res, "Could not create order."));
  return res.json();
}

export async function verifyDebugPayment(
  orderId: number,
  payment?: { provider: "RAZORPAY" | "MANUAL"; provider_payment_id?: string; provider_signature?: string }
): Promise<StoreOrder> {
  const res = await fetch(`${API_URL}/payments/verify/`, {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({
      order_id: orderId,
      provider: payment?.provider || "MANUAL",
      provider_payment_id: payment?.provider_payment_id || `dev-${orderId}`,
      provider_signature: payment?.provider_signature || ""
    })
  });
  if (!res.ok) throw new Error(await parseError(res, "Payment verification failed."));
  return res.json();
}

export async function downloadAsset(assetId: number): Promise<string> {
  const res = await fetch(`${API_URL}/assets/${assetId}/download/`, {
    method: "POST",
    headers: authHeaders()
  });
  if (!res.ok) throw new Error(await parseError(res, "Download is not available."));
  const data = await res.json();
  return data.download_url;
}

export async function addToWishlist(assetId: number): Promise<WishlistItem> {
  const res = await fetch(`${API_URL}/wishlist/`, {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ asset_id: assetId })
  });
  if (!res.ok) throw new Error(await parseError(res, "Could not save this asset."));
  return res.json();
}

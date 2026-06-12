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

export type DownloadResult = {
  url: string;
  filename?: string;
  revoke?: () => void;
};

function token() {
  return typeof window === "undefined" ? "" : localStorage.getItem("accessToken") || "";
}

function refreshToken() {
  return typeof window === "undefined" ? "" : localStorage.getItem("refreshToken") || "";
}

function tokenExpiresSoon(accessToken: string) {
  try {
    const base64 = accessToken.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(base64.padEnd(base64.length + (4 - base64.length % 4) % 4, "=")));
    return typeof payload.exp === "number" && payload.exp * 1000 < Date.now() + 60000;
  } catch {
    return true;
  }
}

async function refreshAccessToken() {
  const refresh = refreshToken();
  if (!refresh) return "";
  const res = await fetch(`${API_URL}/auth/refresh/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh })
  });
  if (!res.ok) {
    clearAuth();
    return "";
  }
  const data = await res.json();
  localStorage.setItem("accessToken", data.access);
  return data.access as string;
}

async function validAccessToken() {
  const accessToken = token();
  if (!accessToken) return "";
  if (!tokenExpiresSoon(accessToken)) return accessToken;
  return refreshAccessToken();
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

function filenameFromDisposition(disposition: string | null) {
  const match = disposition?.match(/filename\*?=(?:UTF-8''|")?([^";]+)/i);
  return match ? decodeURIComponent(match[1].replace(/"/g, "")) : undefined;
}

export async function userGet<T>(path: string): Promise<T> {
  await validAccessToken();
  let res = await fetch(`${API_URL}${path}`, { headers: authHeaders(), cache: "no-store" });
  if (res.status === 401 && await refreshAccessToken()) {
    res = await fetch(`${API_URL}${path}`, { headers: authHeaders(), cache: "no-store" });
  }
  if (!res.ok) throw new Error(await parseError(res, "Could not load your account data."));
  return res.json();
}

export async function userPatch<T>(path: string, body: Record<string, unknown>): Promise<T> {
  await validAccessToken();
  let res = await fetch(`${API_URL}${path}`, {
    method: "PATCH",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (res.status === 401 && await refreshAccessToken()) {
    res = await fetch(`${API_URL}${path}`, {
      method: "PATCH",
      headers: { ...authHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
  }
  if (!res.ok) throw new Error(await parseError(res, "Could not update your account data."));
  return res.json();
}

export async function createOrder(assetId: number): Promise<StoreOrder> {
  await validAccessToken();
  let res = await fetch(`${API_URL}/orders/create/`, {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ asset_id: assetId })
  });
  if (res.status === 401 && await refreshAccessToken()) {
    res = await fetch(`${API_URL}/orders/create/`, {
      method: "POST",
      headers: { ...authHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ asset_id: assetId })
    });
  }
  if (!res.ok) throw new Error(await parseError(res, "Could not create order."));
  return res.json();
}

export async function verifyDebugPayment(
  orderId: number,
  payment?: { provider: "RAZORPAY" | "MANUAL"; provider_payment_id?: string; provider_signature?: string }
): Promise<StoreOrder> {
  await validAccessToken();
  let res = await fetch(`${API_URL}/payments/verify/`, {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({
      order_id: orderId,
      provider: payment?.provider || "MANUAL",
      provider_payment_id: payment?.provider_payment_id || `dev-${orderId}`,
      provider_signature: payment?.provider_signature || ""
    })
  });
  if (res.status === 401 && await refreshAccessToken()) {
    res = await fetch(`${API_URL}/payments/verify/`, {
      method: "POST",
      headers: { ...authHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({
        order_id: orderId,
        provider: payment?.provider || "MANUAL",
        provider_payment_id: payment?.provider_payment_id || `dev-${orderId}`,
        provider_signature: payment?.provider_signature || ""
      })
    });
  }
  if (!res.ok) throw new Error(await parseError(res, "Payment verification failed."));
  return res.json();
}

export async function downloadAsset(assetId: number): Promise<DownloadResult> {
  await validAccessToken();
  let res = await fetch(`${API_URL}/assets/${assetId}/download/`, {
    method: "POST",
    headers: authHeaders()
  });
  if (res.status === 401 && await refreshAccessToken()) {
    res = await fetch(`${API_URL}/assets/${assetId}/download/`, {
      method: "POST",
      headers: authHeaders()
    });
  }
  if (!res.ok) throw new Error(await parseError(res, "Download is not available."));
  const contentType = res.headers.get("Content-Type") || "";
  if (!contentType.includes("application/json")) {
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    return {
      url,
      filename: filenameFromDisposition(res.headers.get("Content-Disposition")),
      revoke: () => URL.revokeObjectURL(url)
    };
  }
  const data = await res.json();
  return { url: data.download_url };
}

export async function addToWishlist(assetId: number): Promise<WishlistItem> {
  await validAccessToken();
  let res = await fetch(`${API_URL}/wishlist/`, {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ asset_id: assetId })
  });
  if (res.status === 401 && await refreshAccessToken()) {
    res = await fetch(`${API_URL}/wishlist/`, {
      method: "POST",
      headers: { ...authHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ asset_id: assetId })
    });
  }
  if (!res.ok) throw new Error(await parseError(res, "Could not save this asset."));
  return res.json();
}

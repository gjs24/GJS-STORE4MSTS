"use client";

import { API_URL, type Asset, type SiteSettings } from "./api";

export type AdminStats = {
  total_users: number;
  total_downloads: number;
  total_sales: string | number;
  latest_orders: AdminOrder[];
  asset_count: number;
  review_count: number;
  pending_orders: number;
  featured_assets: number;
  free_assets: number;
  premium_assets: number;
};

export type AdminUser = {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  is_staff: boolean;
  is_active: boolean;
  date_joined: string;
};

export type AdminOrder = {
  id: number;
  user?: AdminUser;
  asset?: Asset;
  amount: string;
  currency: string;
  status: "PENDING" | "VERIFICATION_PENDING" | "APPROVED" | "PAID" | "REJECTED" | "FAILED" | "REFUNDED";
  order_id?: string;
  provider_order_id?: string;
  utr?: string;
  payer_name?: string;
  payment_submitted_at?: string | null;
  created_at: string;
};

export type AdminReview = {
  id: number;
  asset: number;
  user?: AdminUser;
  rating: number;
  comment: string;
  is_approved: boolean;
  created_at: string;
};

export type AdminNotifyRequest = {
  id: number;
  email: string;
  created_at: string;
  user?: AdminUser;
  asset?: Asset;
};

export type AdminActivityLog = {
  id: number;
  actor?: AdminUser | null;
  action: string;
  target_type: string;
  target_id: string;
  message: string;
  created_at: string;
};

export type AdminSettings = {
  api_status: string;
  payments: { cashfree_configured: boolean; cashfree_environment?: string; manual_upi_configured?: boolean; stripe_configured: boolean };
  storage: { cloudinary_configured: boolean; media_url: string };
  security: { debug: boolean; allowed_hosts: string[]; download_rate_limit: string };
  site: SiteSettings;
};

function storedAccessToken() {
  return typeof window !== "undefined" ? localStorage.getItem("accessToken") || "" : "";
}

function storedRefreshToken() {
  return typeof window !== "undefined" ? localStorage.getItem("refreshToken") || "" : "";
}

function tokenExpiresSoon(token: string) {
  try {
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(base64.padEnd(base64.length + (4 - base64.length % 4) % 4, "=")));
    return typeof payload.exp === "number" && payload.exp * 1000 < Date.now() + 60000;
  } catch {
    return true;
  }
}

async function refreshAccessToken() {
  const refresh = storedRefreshToken();
  if (!refresh) return "";
  const res = await fetch(`${API_URL}/auth/refresh/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh })
  });
  if (!res.ok) {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("currentUser");
    return "";
  }
  const data = await res.json();
  localStorage.setItem("accessToken", data.access);
  return data.access as string;
}

async function validAccessToken() {
  const token = storedAccessToken();
  if (!token) return "";
  if (!tokenExpiresSoon(token)) return token;
  return refreshAccessToken();
}

export function adminHeaders(): Record<string, string> {
  const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : "";
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function hasAdminToken() {
  return typeof window !== "undefined" && Boolean(localStorage.getItem("accessToken"));
}

export async function adminGet<T>(path: string, fallback: T): Promise<T> {
  if (!hasAdminToken()) return fallback;
  try {
    const token = await validAccessToken();
    let res = await fetch(`${API_URL}${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {}, cache: "no-store" });
    if (res.status === 401 && await refreshAccessToken()) {
      res = await fetch(`${API_URL}${path}`, { headers: adminHeaders(), cache: "no-store" });
    }
    if (!res.ok) throw new Error("Admin request failed");
    return res.json();
  } catch {
    return fallback;
  }
}

export async function adminGetRequired<T>(path: string): Promise<T> {
  if (!hasAdminToken()) throw new Error("Admin login required.");
  const token = await validAccessToken();
  let res = await fetch(`${API_URL}${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {}, cache: "no-store" });
  if (res.status === 401 && await refreshAccessToken()) {
    res = await fetch(`${API_URL}${path}`, { headers: adminHeaders(), cache: "no-store" });
  }
  if (res.status === 404) throw new Error("Asset was not found. It may have been deleted or the URL is wrong.");
  if (!res.ok) throw new Error(await parseAdminError(res, "Admin request failed"));
  return res.json();
}

export async function adminPatch<T>(path: string, body: unknown): Promise<T> {
  if (!hasAdminToken()) throw new Error("Admin login required.");
  await validAccessToken();
  let res = await fetch(`${API_URL}${path}`, {
    method: "PATCH",
    headers: { ...adminHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (res.status === 401 && await refreshAccessToken()) {
    res = await fetch(`${API_URL}${path}`, {
      method: "PATCH",
      headers: { ...adminHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
  }
  if (!res.ok) throw new Error(await parseAdminError(res, "Update failed"));
  return res.json();
}

export async function adminPost<T>(path: string, body?: unknown): Promise<T> {
  if (!hasAdminToken()) throw new Error("Admin login required.");
  await validAccessToken();
  let res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { ...adminHeaders(), "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined
  });
  if (res.status === 401 && await refreshAccessToken()) {
    res = await fetch(`${API_URL}${path}`, {
      method: "POST",
      headers: { ...adminHeaders(), "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined
    });
  }
  if (!res.ok) throw new Error("Action failed");
  return res.json();
}

async function parseAdminError(res: Response, fallback: string) {
  const data = await res.json().catch(() => null);
  if (!data || typeof data !== "object") return fallback;
  if ("detail" in data && typeof data.detail === "string") return data.detail;
  const messages = Object.entries(data)
    .map(([field, value]) => `${field}: ${Array.isArray(value) ? value.join(", ") : String(value)}`)
    .join(" ");
  return messages || fallback;
}

export async function adminPostForm<T>(path: string, body: FormData): Promise<T> {
  if (!hasAdminToken()) throw new Error("Admin login required.");
  await validAccessToken();
  let res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: adminHeaders(),
    body
  });
  if (res.status === 401 && await refreshAccessToken()) {
    res = await fetch(`${API_URL}${path}`, {
      method: "POST",
      headers: adminHeaders(),
      body
    });
  }
  if (!res.ok) throw new Error(await parseAdminError(res, "Upload failed"));
  return res.json();
}

export async function adminPatchForm<T>(path: string, body: FormData): Promise<T> {
  if (!hasAdminToken()) throw new Error("Admin login required.");
  await validAccessToken();
  let res = await fetch(`${API_URL}${path}`, {
    method: "PATCH",
    headers: adminHeaders(),
    body
  });
  if (res.status === 401 && await refreshAccessToken()) {
    res = await fetch(`${API_URL}${path}`, {
      method: "PATCH",
      headers: adminHeaders(),
      body
    });
  }
  if (!res.ok) throw new Error(await parseAdminError(res, "Upload failed"));
  return res.json();
}

export async function adminDelete(path: string): Promise<void> {
  if (!hasAdminToken()) throw new Error("Admin login required.");
  await validAccessToken();
  let res = await fetch(`${API_URL}${path}`, {
    method: "DELETE",
    headers: adminHeaders()
  });
  if (res.status === 401 && await refreshAccessToken()) {
    res = await fetch(`${API_URL}${path}`, {
      method: "DELETE",
      headers: adminHeaders()
    });
  }
  if (!res.ok) throw new Error("Delete failed");
}

export const fallbackStats: AdminStats = {
  total_users: 0,
  total_downloads: 0,
  total_sales: 0,
  latest_orders: [],
  asset_count: 0,
  review_count: 0,
  pending_orders: 0,
  featured_assets: 0,
  free_assets: 0,
  premium_assets: 0
};

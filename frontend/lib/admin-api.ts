"use client";

import { API_URL, clearAuth, type Asset, type SiteSettings } from "./api";

export type AdminStats = {
  total_users: number;
  total_downloads: number;
  total_sales: string | number;
  latest_orders: AdminOrder[];
  asset_count: number;
  review_count: number;
  pending_orders: number;
  verification_pending_orders?: number;
  featured_assets: number;
  free_assets: number;
  premium_assets: number;
  monthly_sales?: { month: string; sales: number; revenue: number }[];
};

export type SpecialAccessEmailStatus = {
  sent: boolean;
  recipient?: string | null;
  message?: string;
  error?: string;
};

export type SpecialAccess = {
  id?: number;
  is_all_access_free: boolean;
  admin_note?: string;
  expires_at?: string | null;
  granted_assets?: number[];
  granted_asset_titles?: string[];
  granted_board_templates?: string[];
  granted_board_template_names?: string[];
  created_at?: string;
  updated_at?: string;
  email_status?: SpecialAccessEmailStatus;
};

export type AdminUser = {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  phone_number?: string;
  is_staff: boolean;
  is_active: boolean;
  date_joined: string;
  paid_orders_count?: number;
  special_access?: SpecialAccess | null;
};

export type AdminOrder = {
  id: number;
  user?: AdminUser;
  asset?: Asset;
  board_template?: {
    id: string;
    name: string;
    category?: string;
    price?: number | string;
    background_image_url?: string;
  };
  amount: string;
  currency: string;
  status: "PENDING" | "VERIFICATION_PENDING" | "APPROVED" | "PAID" | "REJECTED" | "FAILED" | "REFUNDED" | "BLOCKED";
  order_id?: string;
  provider_order_id?: string;
  utr?: string;
  payer_name?: string;
  payment_submitted_at?: string | null;
  download_enabled?: boolean;
  block_reason?: string;
  admin_notes?: string;
  blocked_at?: string | null;
  created_at: string;
  updated_at?: string;
};

export type AdminReview = {
  id: number;
  asset: number;
  asset_title?: string;
  asset_slug?: string;
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
    clearAuth();
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
  if (!res.ok) throw new Error(await parseAdminError(res, "Action failed"));
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

export async function adminDelete<T = void>(path: string, body?: unknown): Promise<T> {
  if (!hasAdminToken()) throw new Error("Admin login required.");
  await validAccessToken();
  const headers: Record<string, string> = { ...adminHeaders() };
  if (body) {
    headers["Content-Type"] = "application/json";
  }
  let res = await fetch(`${API_URL}${path}`, {
    method: "DELETE",
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
  if (res.status === 401 && await refreshAccessToken()) {
    res = await fetch(`${API_URL}${path}`, {
      method: "DELETE",
      headers: { ...adminHeaders(), ...(body ? { "Content-Type": "application/json" } : {}) },
      body: body ? JSON.stringify(body) : undefined
    });
  }
  if (!res.ok) throw new Error(await parseAdminError(res, "Delete failed"));
  const contentType = res.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    return res.json();
  }
  return undefined as T;
}

export async function deleteAdminOrder(orderId: number): Promise<{ message?: string } | void> {
  return adminDelete<{ message?: string }>(`/admin/orders/${orderId}/`);
}

export async function downloadAdminInvoice(orderId: number): Promise<{ url: string; filename: string; revoke: () => void }> {
  if (!hasAdminToken()) throw new Error("Admin login required.");
  await validAccessToken();
  let res = await fetch(`${API_URL}/orders/${orderId}/invoice/`, { headers: adminHeaders() });
  if (res.status === 401 && await refreshAccessToken()) {
    res = await fetch(`${API_URL}/orders/${orderId}/invoice/`, { headers: adminHeaders() });
  }
  if (!res.ok) throw new Error(await parseAdminError(res, "Could not download invoice."));
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  return {
    url,
    filename: `GJS-${orderId}-invoice.pdf`,
    revoke: () => URL.revokeObjectURL(url)
  };
}

export async function adminGetSpecialAccess(userId: number): Promise<SpecialAccess> {
  return adminGet<SpecialAccess>(`/admin/users/${userId}/special-access/`, { is_all_access_free: false });
}

export async function adminUpdateSpecialAccess(
  userId: number,
  payload: {
    is_all_access_free?: boolean;
    admin_note?: string;
    expires_at?: string | null;
    granted_asset_ids?: number[];
    granted_board_template_ids?: string[];
    send_email_notification?: boolean;
    custom_email_subject?: string;
    custom_email_body?: string;
  }
): Promise<SpecialAccess> {
  return adminPatch<SpecialAccess>(`/admin/users/${userId}/special-access/`, payload);
}

export async function adminSendSpecialAccessEmail(
  userId: number,
  payload?: {
    custom_subject?: string;
    custom_body?: string;
  }
): Promise<{ success: boolean; message?: string; detail?: string }> {
  return adminPost<{ success: boolean; message?: string; detail?: string }>(
    `/admin/users/${userId}/send-special-access-email/`,
    payload || {}
  );
}

export type SpecialAccessInviteLink = {
  id: number;
  token: string;
  title: string;
  mode: "APPROVAL" | "AUTO_GRANT";
  is_all_access_free: boolean;
  granted_assets?: number[];
  granted_asset_titles?: string[];
  granted_board_templates?: string[];
  granted_board_template_names?: string[];
  max_uses: number;
  uses_count: number;
  access_expires_at?: string | null;
  link_expires_at?: string | null;
  admin_note?: string;
  is_active: boolean;
  is_valid?: boolean;
  is_expired?: boolean;
  is_exhausted?: boolean;
  pending_requests_count?: number;
  approved_requests_count?: number;
  created_at: string;
  updated_at?: string;
};

export type SpecialAccessClaimRequest = {
  id: number;
  invite_link: number;
  invite_link_title: string;
  invite_link_token: string;
  invite_link_mode: "APPROVAL" | "AUTO_GRANT";
  invite_is_all_access: boolean;
  invite_granted_asset_ids?: number[];
  invite_granted_asset_titles?: string[];
  invite_granted_board_template_ids?: string[];
  invite_granted_board_template_names?: string[];
  invite_access_expires_at?: string | null;
  user: AdminUser;
  user_note?: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  admin_note?: string;
  reviewed_at?: string | null;
  created_at: string;
  updated_at?: string;
  email_status?: SpecialAccessEmailStatus;
};

export async function adminGetSpecialAccessLinks(): Promise<SpecialAccessInviteLink[]> {
  const data = await adminGet<any>("/admin/special-access-links/", []);
  return Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];
}

export async function adminCreateSpecialAccessLink(payload: {
  title: string;
  mode: "APPROVAL" | "AUTO_GRANT";
  is_all_access_free: boolean;
  granted_asset_ids?: number[];
  granted_board_template_ids?: string[];
  max_uses: number;
  access_expires_at?: string | null;
  link_expires_at?: string | null;
  admin_note?: string;
}): Promise<SpecialAccessInviteLink> {
  return adminPost<SpecialAccessInviteLink>("/admin/special-access-links/", payload);
}

export async function adminUpdateSpecialAccessLink(
  id: number,
  payload: Partial<{
    title: string;
    mode: "APPROVAL" | "AUTO_GRANT";
    is_all_access_free: boolean;
    granted_asset_ids: number[];
    granted_board_template_ids: string[];
    max_uses: number;
    access_expires_at: string | null;
    link_expires_at: string | null;
    admin_note: string;
    is_active: boolean;
  }>
): Promise<SpecialAccessInviteLink> {
  return adminPatch<SpecialAccessInviteLink>(`/admin/special-access-links/${id}/`, payload);
}

export async function adminDeleteSpecialAccessLink(id: number): Promise<void> {
  return adminDelete(`/admin/special-access-links/${id}/`);
}

export async function adminGetSpecialAccessRequests(status?: string): Promise<SpecialAccessClaimRequest[]> {
  const path = status ? `/admin/special-access-requests/?status=${encodeURIComponent(status)}` : "/admin/special-access-requests/";
  const data = await adminGet<any>(path, []);
  return Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];
}

export async function adminApproveSpecialAccessRequest(
  requestId: number,
  payload?: {
    is_all_access_free?: boolean;
    granted_asset_ids?: number[];
    granted_board_template_ids?: string[];
    expires_at?: string | null;
    admin_note?: string;
    send_email_notification?: boolean;
  }
): Promise<SpecialAccessClaimRequest> {
  return adminPost<SpecialAccessClaimRequest>(`/admin/special-access-requests/${requestId}/approve/`, payload || {});
}

export async function adminRejectSpecialAccessRequest(
  requestId: number,
  adminNote?: string
): Promise<SpecialAccessClaimRequest> {
  return adminPost<SpecialAccessClaimRequest>(`/admin/special-access-requests/${requestId}/reject/`, {
    admin_note: adminNote || ""
  });
}

export async function setAdminOrderAccess(
  orderId: number,
  payload: {
    status?: AdminOrder["status"];
    download_enabled?: boolean;
    block_reason?: string;
    admin_notes?: string;
  }
): Promise<AdminOrder> {
  return adminPost<AdminOrder>(`/admin/orders/${orderId}/set-access/`, payload);
}

export const fallbackStats: AdminStats = {
  total_users: 0,
  total_downloads: 0,
  total_sales: 0,
  latest_orders: [],
  asset_count: 0,
  review_count: 0,
  pending_orders: 0,
  verification_pending_orders: 0,
  featured_assets: 0,
  free_assets: 0,
  premium_assets: 0,
  monthly_sales: []
};


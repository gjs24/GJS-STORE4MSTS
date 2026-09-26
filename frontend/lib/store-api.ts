import { API_URL, clearAuth, type Asset } from "@/lib/api";

export type StoreOrder = {
  id: number;
  asset?: Asset | null;
  board_template?: {
    id: string;
    name: string;
    category?: string;
    price?: number | string;
    is_paid?: boolean;
    background_image_url?: string;
    is_unlocked?: boolean;
  } | null;
  board_template_id?: string | null;
  amount: string;
  currency: string;
  status: "PENDING" | "VERIFICATION_PENDING" | "APPROVED" | "REJECTED" | "PAID" | "FAILED" | "REFUNDED";
  order_id?: string;
  provider_order_id?: string;
  utr?: string;
  payer_name?: string;
  payment_submitted_at?: string | null;
  download_enabled?: boolean;
  payment_session_id?: string;
  payment_provider?: "CASHFREE" | "MANUAL" | "";
  cashfree_mode?: "production" | "sandbox";
  manual_payment?: {
    upi_id: string;
    payee_name: string;
    amount: string;
    currency: string;
    upi_uri: string;
    instructions: string;
  } | null;
  created_at: string;
};

export type DownloadLog = {
  id: number;
  asset: Asset;
  user?: { id: number; username: string; email: string };
  ip_address?: string | null;
  downloaded_at: string;
};

export type WishlistItem = {
  id: number;
  asset: Asset;
  download_enabled?: boolean;
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

export async function createOrder(assetId: number, customerPhone?: string): Promise<StoreOrder> {
  await validAccessToken();
  const payload: Record<string, any> = { asset_id: assetId };
  if (customerPhone) payload.customer_phone = customerPhone;
  let res = await fetch(`${API_URL}/orders/create/`, {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (res.status === 401 && await refreshAccessToken()) {
    res = await fetch(`${API_URL}/orders/create/`, {
      method: "POST",
      headers: { ...authHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
  }
  if (!res.ok) throw new Error(await parseError(res, "Could not create order."));
  return res.json();
}

export async function createBoardTemplateOrder(templateId: string, customerPhone?: string): Promise<StoreOrder> {
  await validAccessToken();
  const payload: Record<string, any> = { board_template_id: templateId };
  if (customerPhone) payload.customer_phone = customerPhone;
  let res = await fetch(`${API_URL}/orders/create/`, {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (res.status === 401 && await refreshAccessToken()) {
    res = await fetch(`${API_URL}/orders/create/`, {
      method: "POST",
      headers: { ...authHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
  }
  if (!res.ok) throw new Error(await parseError(res, "Could not create order for this board template."));
  return res.json();
}

export async function verifyPayment(
  orderId: number | string,
  payment?: {
    utr: string;
    payer_name?: string;
  }
): Promise<StoreOrder> {
  await validAccessToken();
  const payload = {
    order_id: String(orderId).trim(),
    utr: payment?.utr || "",
    payer_name: payment?.payer_name || ""
  };
  let res = await fetch(`${API_URL}/payments/verify/`, {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (res.status === 401 && await refreshAccessToken()) {
    res = await fetch(`${API_URL}/payments/verify/`, {
      method: "POST",
      headers: { ...authHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify(payload)
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

export async function downloadInvoice(orderId: number): Promise<DownloadResult> {
  await validAccessToken();
  let res = await fetch(`${API_URL}/orders/${orderId}/invoice/`, { headers: authHeaders() });
  if (res.status === 401 && await refreshAccessToken()) {
    res = await fetch(`${API_URL}/orders/${orderId}/invoice/`, { headers: authHeaders() });
  }
  if (!res.ok) throw new Error(await parseError(res, "Could not download invoice."));
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  return {
    url,
    filename: filenameFromDisposition(res.headers.get("Content-Disposition")) || `GJS-${orderId}-invoice.pdf`,
    revoke: () => URL.revokeObjectURL(url)
  };
}

export const WISHLIST_CHANGE_EVENT = "gjs_wishlist_change";

export function emitWishlistChange(assetId: number, isWishlisted: boolean) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(WISHLIST_CHANGE_EVENT, {
        detail: { assetId, isWishlisted }
      })
    );
  }
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
  const data = await res.json();
  emitWishlistChange(assetId, true);
  return data;
}

export async function removeAssetFromWishlist(assetId: number): Promise<void> {
  await validAccessToken();
  let res = await fetch(`${API_URL}/wishlist/?asset_id=${assetId}`, {
    method: "DELETE",
    headers: authHeaders()
  });
  if (res.status === 401 && await refreshAccessToken()) {
    res = await fetch(`${API_URL}/wishlist/?asset_id=${assetId}`, {
      method: "DELETE",
      headers: authHeaders()
    });
  }
  if (!res.ok && res.status !== 204) throw new Error(await parseError(res, "Could not remove from wishlist."));
  emitWishlistChange(assetId, false);
}

export async function removeFromWishlist(wishlistId: number, assetId?: number): Promise<void> {
  await validAccessToken();
  let res = await fetch(`${API_URL}/wishlist/${wishlistId}/`, {
    method: "DELETE",
    headers: authHeaders()
  });
  if (res.status === 401 && await refreshAccessToken()) {
    res = await fetch(`${API_URL}/wishlist/${wishlistId}/`, {
      method: "DELETE",
      headers: authHeaders()
    });
  }
  if (!res.ok && res.status !== 204) throw new Error(await parseError(res, "Could not remove from wishlist."));
  if (assetId) emitWishlistChange(assetId, false);
}

export async function submitReview(assetId: number, rating: number, comment: string): Promise<any> {
  await validAccessToken();
  const payload = { asset: assetId, rating, comment };
  let res = await fetch(`${API_URL}/reviews/`, {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (res.status === 401 && await refreshAccessToken()) {
    res = await fetch(`${API_URL}/reviews/`, {
      method: "POST",
      headers: { ...authHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
  }
  if (!res.ok) throw new Error(await parseError(res, "Could not submit review."));
  return res.json();
}

export async function notifyMe(assetSlug: string): Promise<{ detail: string; created: boolean }> {
  await validAccessToken();
  let res = await fetch(`${API_URL}/assets/${assetSlug}/notify/`, {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" }
  });
  if (res.status === 401 && await refreshAccessToken()) {
    res = await fetch(`${API_URL}/assets/${assetSlug}/notify/`, {
      method: "POST",
      headers: { ...authHeaders(), "Content-Type": "application/json" }
    });
  }
  if (!res.ok) throw new Error(await parseError(res, "Could not save notification request."));
  return res.json();
}

export type PublicSpecialAccessLink = {
  id: number;
  token: string;
  title: string;
  mode: "APPROVAL" | "AUTO_GRANT";
  is_all_access_free: boolean;
  granted_asset_titles: string[];
  granted_board_template_ids?: string[];
  granted_board_template_names?: string[];
  access_expires_at?: string | null;
  link_expires_at?: string | null;
  max_uses: number;
  uses_count: number;
  is_valid: boolean;
  invalid_reason?: string | null;
  my_request?: {
    id: number;
    status: "PENDING" | "APPROVED" | "REJECTED";
    user_note?: string;
    created_at: string;
    reviewed_at?: string | null;
  } | null;
  user_has_active_special_access?: boolean;
};

export async function getSpecialAccessLink(tokenStr: string): Promise<PublicSpecialAccessLink> {
  if (isLoggedIn()) {
    await validAccessToken();
  }
  const res = await fetch(`${API_URL}/special-access/link/${encodeURIComponent(tokenStr)}/`, {
    headers: authHeaders(),
    cache: "no-store"
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || "This Special Access invite link is invalid or expired.");
  }
  return res.json();
}

export async function claimSpecialAccessLink(
  tokenStr: string,
  userNote?: string
): Promise<{
  status: "PENDING" | "APPROVED" | "REJECTED";
  detail: string;
  my_request: NonNullable<PublicSpecialAccessLink["my_request"]>;
}> {
  await validAccessToken();
  let res = await fetch(`${API_URL}/special-access/link/${encodeURIComponent(tokenStr)}/claim/`, {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ user_note: userNote || "" })
  });
  if (res.status === 401 && await refreshAccessToken()) {
    res = await fetch(`${API_URL}/special-access/link/${encodeURIComponent(tokenStr)}/claim/`, {
      method: "POST",
      headers: { ...authHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ user_note: userNote || "" })
    });
  }
  if (!res.ok) throw new Error(await parseError(res, "Could not submit Special Access request."));
  return res.json();
}


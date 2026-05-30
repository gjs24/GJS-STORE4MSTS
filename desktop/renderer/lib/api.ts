import { Asset, sampleAssets } from "./types";

export async function getApiUrl() {
  if (typeof window !== "undefined" && window.railforge) {
    const settings = await window.railforge.getSettings();
    return settings.apiUrl;
  }
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
}

export async function fetchAssets(): Promise<Asset[]> {
  try {
    const apiUrl = await getApiUrl();
    const res = await fetch(`${apiUrl}/assets/`);
    if (!res.ok) throw new Error("Asset request failed");
    return res.json();
  } catch {
    return sampleAssets;
  }
}

export async function login(username: string, password: string) {
  const apiUrl = await getApiUrl();
  const res = await fetch(`${apiUrl}/auth/login/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Login failed");
  localStorage.setItem("railforgeAccessToken", data.access);
  return data;
}

export async function register(username: string, email: string, password: string) {
  const apiUrl = await getApiUrl();
  const res = await fetch(`${apiUrl}/auth/register/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, email, password })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Registration failed");
  return data;
}

export async function requestAssetDownloadUrl(assetId: number) {
  const apiUrl = await getApiUrl();
  const token = localStorage.getItem("railforgeAccessToken");
  const res = await fetch(`${apiUrl}/assets/${assetId}/download/`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Download is not available for this account.");
  return data.download_url as string;
}

export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

export type Category = {
  id: number;
  name: string;
  slug: string;
  description: string;
  icon: string;
  asset_count?: number;
};

export type Asset = {
  id: number;
  title: string;
  slug: string;
  category: Category;
  short_description: string;
  description?: string;
  simulator_type: "MSTS" | "OPEN_RAILS" | "BOTH";
  version: string;
  file_size: string;
  price: string;
  is_free: boolean;
  is_published?: boolean;
  is_featured: boolean;
  is_upcoming?: boolean;
  thumbnail?: string;
  has_file?: boolean;
  download_file?: string | null;
  external_download_url?: string;
  preview_video_url?: string;
  requirements?: string;
  installation_steps?: string;
  changelog?: string;
  download_count: number;
  average_rating: number;
  review_count: number;
  can_download?: boolean;
  updates?: Array<{ id: number; version: string; changelog: string; created_at: string }>;
  reviews?: Array<{ id: number; rating: number; comment: string; created_at: string; user?: { username: string } }>;
};

export type CurrentUser = {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  is_staff: boolean;
  is_active: boolean;
  date_joined?: string;
};

export function getStoredUser(): CurrentUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("currentUser");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as CurrentUser;
  } catch {
    localStorage.removeItem("currentUser");
    return null;
  }
}

export function clearAuth() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("currentUser");
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, { next: { revalidate: 60 } });
  if (!res.ok) throw new Error(`API request failed: ${path}`);
  return res.json();
}

export const fallbackCategories: Category[] = [
  { id: 1, name: "Trains", slug: "trains", description: "Locomotives, coaches, and consists", icon: "Train" },
  { id: 2, name: "Routes", slug: "routes", description: "Playable route packs", icon: "Map" },
  { id: 3, name: "Sounds", slug: "sounds", description: "Horn, engine, and rail audio", icon: "AudioLines" },
  { id: 4, name: "Cab Views", slug: "cab-views", description: "Cab panels and driving views", icon: "PanelTop" },
  { id: 5, name: "Textures", slug: "textures", description: "Liveries and scenery textures", icon: "Palette" },
  { id: 6, name: "Free Downloads", slug: "free-downloads", description: "Free assets for logged-in users", icon: "Download" },
  { id: 7, name: "Premium Downloads", slug: "premium-downloads", description: "Paid GJS Production packs", icon: "BadgeIndianRupee" }
];

export const fallbackAssets: Asset[] = [
  {
    id: 1,
    title: "GJS WDM-3A Diesel Locomotive Pack",
    slug: "gjs-wdm-3a-diesel-locomotive-pack",
    category: fallbackCategories[0],
    short_description: "Premium Indian diesel locomotive with detailed textures and Open Rails tuning.",
    description: "A cinematic locomotive asset pack for MSTS and Open Rails with multiple liveries, tuned physics, cab references, and activities.",
    simulator_type: "BOTH",
    version: "2.1.0",
    file_size: "485 MB",
    price: "349.00",
    is_free: false,
    is_published: true,
    is_featured: true,
    is_upcoming: false,
    download_count: 1240,
    average_rating: 4.8,
    review_count: 42,
    requirements: "MSTS Bin recommended. Open Rails latest stable build for OR physics.",
    installation_steps: "Extract the archive into your simulator folder and follow the included install notes.",
    changelog: "Improved cab alignment, updated textures, and refined engine physics."
  },
  {
    id: 2,
    title: "Konkan Coastal Route Demo",
    slug: "konkan-coastal-route-demo",
    category: fallbackCategories[1],
    short_description: "Free route demo with coastal scenery, tunnels, and monsoon ambience.",
    description: "A compact route demo with tunnels, bridges, scenic coastal sections, and starter activities.",
    simulator_type: "OPEN_RAILS",
    version: "1.0.0",
    file_size: "720 MB",
    price: "0.00",
    is_free: true,
    is_published: true,
    is_featured: true,
    is_upcoming: false,
    download_count: 3580,
    average_rating: 4.6,
    review_count: 87
  },
  {
    id: 3,
    title: "Indian Rail Horn and Track Sound Suite",
    slug: "indian-rail-horn-and-track-sound-suite",
    category: fallbackCategories[2],
    short_description: "Layered horn, engine idle, brake, flange, and track ambience sound pack.",
    simulator_type: "BOTH",
    version: "1.4.2",
    file_size: "160 MB",
    price: "149.00",
    is_free: false,
    is_published: true,
    is_featured: false,
    is_upcoming: false,
    download_count: 860,
    average_rating: 4.5,
    review_count: 25
  }
];

function filterFallbackAssets(path: string) {
  const [, queryString = ""] = path.split("?");
  const params = new URLSearchParams(queryString);
  const search = params.get("search")?.trim().toLowerCase();
  const category = params.get("category")?.trim();
  const simulator = params.get("simulator_type")?.trim();
  const price = params.get("price")?.trim();
  const version = params.get("version")?.trim().toLowerCase();

  return fallbackAssets.filter((asset) => {
    const matchesSearch = !search || [
      asset.title,
      asset.short_description,
      asset.description,
      asset.category?.name,
      asset.category?.slug,
      asset.simulator_type
    ].filter(Boolean).join(" ").toLowerCase().includes(search);
    const matchesCategory = !category || asset.category?.slug === category;
    const matchesSimulator = !simulator || asset.simulator_type === simulator || asset.simulator_type === "BOTH";
    const matchesPrice = !price || (price === "free" ? asset.is_free : price === "premium" ? !asset.is_free : true);
    const matchesVersion = !version || asset.version.toLowerCase().includes(version);

    return matchesSearch && matchesCategory && matchesSimulator && matchesPrice && matchesVersion;
  });
}

export async function getAssets(path = "/assets/") {
  try {
    return await apiGet<Asset[]>(path);
  } catch {
    return filterFallbackAssets(path);
  }
}

export async function getCategories() {
  try {
    return await apiGet<Category[]>("/categories/");
  } catch {
    return fallbackCategories;
  }
}

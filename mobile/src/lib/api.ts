export const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8000/api";

export type Asset = {
  id: number;
  title: string;
  slug: string;
  short_description: string;
  description?: string;
  file_size: string;
  version: string;
  price: string;
  is_free: boolean;
  download_count: number;
  average_rating: number;
  simulator_type: string;
  category?: { name: string };
};

export const sampleAssets: Asset[] = [
  {
    id: 1,
    title: "GJS WDM-3A Diesel Locomotive Pack",
    slug: "gjs-wdm-3a-diesel-locomotive-pack",
    short_description: "Premium Indian diesel locomotive with detailed textures.",
    file_size: "485 MB",
    version: "2.1.0",
    price: "349.00",
    is_free: false,
    download_count: 1240,
    average_rating: 4.8,
    simulator_type: "BOTH",
    category: { name: "Trains" }
  },
  {
    id: 2,
    title: "Konkan Coastal Route Demo",
    slug: "konkan-coastal-route-demo",
    short_description: "Free route demo with coastal scenery and monsoon ambience.",
    file_size: "720 MB",
    version: "1.0.0",
    price: "0.00",
    is_free: true,
    download_count: 3580,
    average_rating: 4.6,
    simulator_type: "OPEN_RAILS",
    category: { name: "Routes" }
  }
];

export async function fetchAssets() {
  try {
    const res = await fetch(`${API_URL}/assets/`);
    if (!res.ok) throw new Error("failed");
    return (await res.json()) as Asset[];
  } catch {
    return sampleAssets;
  }
}

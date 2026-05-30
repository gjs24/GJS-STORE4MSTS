export type Asset = {
  id: number;
  title: string;
  slug: string;
  category?: { name: string; slug: string };
  short_description: string;
  description?: string;
  simulator_type: "MSTS" | "OPEN_RAILS" | "BOTH";
  version: string;
  file_size: string;
  price: string;
  is_free: boolean;
  is_featured: boolean;
  thumbnail?: string;
  download_count: number;
  average_rating: number;
  can_download?: boolean;
};

export type LauncherSettings = {
  apiUrl: string;
  mstsPath: string;
  openRailsPath: string;
  installDirectory: string;
  downloadCacheDirectory: string;
  autoInstallDependencies: boolean;
};

export type DownloadState = {
  id: string;
  assetId: number;
  title: string;
  filePath: string;
  receivedBytes: number;
  totalBytes: number;
  percent: number;
  status: "queued" | "downloading" | "paused" | "completed" | "failed" | "installing";
  error?: string;
  sha256?: string;
};

export type InstalledAsset = {
  assetId: number;
  title: string;
  version: string;
  installedAt: string;
  installPath: string;
  files: string[];
  sha256?: string;
};

export const sampleAssets: Asset[] = [
  {
    id: 1,
    title: "GJS WDM-3A Diesel Locomotive Pack",
    slug: "gjs-wdm-3a-diesel-locomotive-pack",
    category: { name: "Trains", slug: "trains" },
    short_description: "Premium diesel locomotive pack with tuned physics and cinematic textures.",
    description: "Built for MSTS and Open Rails with liveries, consist files, cab references, and release notes.",
    simulator_type: "BOTH",
    version: "2.1.0",
    file_size: "485 MB",
    price: "349.00",
    is_free: false,
    is_featured: true,
    download_count: 1240,
    average_rating: 4.8
  },
  {
    id: 2,
    title: "Konkan Coastal Route Demo",
    slug: "konkan-coastal-route-demo",
    category: { name: "Routes", slug: "routes" },
    short_description: "Free route demo with tunnels, bridges, coastal terrain, and monsoon ambience.",
    simulator_type: "OPEN_RAILS",
    version: "1.0.0",
    file_size: "720 MB",
    price: "0.00",
    is_free: true,
    is_featured: true,
    download_count: 3580,
    average_rating: 4.6
  },
  {
    id: 3,
    title: "Indian Rail Horn and Track Sound Suite",
    slug: "indian-rail-horn-and-track-sound-suite",
    category: { name: "Sounds", slug: "sounds" },
    short_description: "Horn, brake, track, flange, idle, and ambience audio for route builders.",
    simulator_type: "BOTH",
    version: "1.4.2",
    file_size: "160 MB",
    price: "149.00",
    is_free: false,
    is_featured: false,
    download_count: 860,
    average_rating: 4.5
  }
];

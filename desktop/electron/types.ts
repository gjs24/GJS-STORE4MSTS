export type LauncherSettings = {
  apiUrl: string;
  mstsPath: string;
  openRailsPath: string;
  installDirectory: string;
  downloadCacheDirectory: string;
  autoInstallDependencies: boolean;
};

export type DownloadRequest = {
  assetId: number;
  title: string;
  url: string;
  expectedSha256?: string;
  fileName?: string;
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

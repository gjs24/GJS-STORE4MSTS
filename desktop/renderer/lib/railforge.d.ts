import type { DownloadState, InstalledAsset, LauncherSettings } from "./types";

declare global {
  interface Window {
    railforge?: {
      getSettings: () => Promise<LauncherSettings>;
      updateSettings: (patch: Partial<LauncherSettings>) => Promise<LauncherSettings>;
      detectInstallPaths: () => Promise<{ mstsPath: string; openRailsPath: string }>;
      chooseDirectory: (title: string) => Promise<string>;
      listInstalled: () => Promise<InstalledAsset[]>;
      installAsset: (payload: { assetId: number; title: string; version: string; archivePath: string }) => Promise<InstalledAsset>;
      uninstallAsset: (assetId: number) => Promise<InstalledAsset[]>;
      openFolder: (targetPath: string) => Promise<void>;
      listDownloads: () => Promise<DownloadState[]>;
      startDownload: (request: { assetId: number; title: string; url: string; expectedSha256?: string; fileName?: string }) => Promise<DownloadState>;
      verifyFile: (filePath: string) => Promise<string>;
      checkForUpdates: () => Promise<unknown>;
      onDownloadProgress: (callback: (state: DownloadState) => void) => () => void;
      onUpdaterEvent: (callback: (event: unknown) => void) => () => void;
    };
  }
}

export {};

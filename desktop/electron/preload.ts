import { contextBridge, ipcRenderer } from "electron";
import type { DownloadRequest, LauncherSettings } from "./types";

contextBridge.exposeInMainWorld("railforge", {
  getSettings: () => ipcRenderer.invoke("settings:get"),
  updateSettings: (patch: Partial<LauncherSettings>) => ipcRenderer.invoke("settings:update", patch),
  detectInstallPaths: () => ipcRenderer.invoke("paths:detect"),
  chooseDirectory: (title: string) => ipcRenderer.invoke("paths:choose", title),
  listInstalled: () => ipcRenderer.invoke("installed:list"),
  installAsset: (payload: { assetId: number; title: string; version: string; archivePath: string }) => ipcRenderer.invoke("installed:install", payload),
  uninstallAsset: (assetId: number) => ipcRenderer.invoke("installed:uninstall", assetId),
  openFolder: (targetPath: string) => ipcRenderer.invoke("folder:open", targetPath),
  listDownloads: () => ipcRenderer.invoke("downloads:list"),
  startDownload: (request: DownloadRequest) => ipcRenderer.invoke("downloads:start", request),
  verifyFile: (filePath: string) => ipcRenderer.invoke("file:verify", filePath),
  checkForUpdates: () => ipcRenderer.invoke("app:checkForUpdates"),
  onDownloadProgress: (callback: (state: unknown) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, state: unknown) => callback(state);
    ipcRenderer.on("downloads:progress", listener);
    return () => ipcRenderer.removeListener("downloads:progress", listener);
  },
  onUpdaterEvent: (callback: (event: unknown) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, payload: unknown) => callback(payload);
    ipcRenderer.on("updater:event", listener);
    return () => ipcRenderer.removeListener("updater:event", listener);
  }
});

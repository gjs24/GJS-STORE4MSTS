import fs from "node:fs";
import path from "node:path";
import { app } from "electron";
import type { InstalledAsset, LauncherSettings } from "./types";

type LauncherStore = {
  settings: LauncherSettings;
  installedAssets: InstalledAsset[];
};

const defaultSettings = (): LauncherSettings => {
  const userData = app.getPath("userData");
  return {
    apiUrl: process.env.GJS_RAILFORGE_API_URL || "http://localhost:8000/api",
    mstsPath: "",
    openRailsPath: "",
    installDirectory: path.join(userData, "InstalledAssets"),
    downloadCacheDirectory: path.join(userData, "DownloadCache"),
    autoInstallDependencies: true
  };
};

const storePath = () => path.join(app.getPath("userData"), "railforge-store.json");

function ensureStore(): LauncherStore {
  const file = storePath();
  if (!fs.existsSync(file)) {
    const data = { settings: defaultSettings(), installedAssets: [] };
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf-8");
    return data;
  }
  const parsed = JSON.parse(fs.readFileSync(file, "utf-8")) as Partial<LauncherStore>;
  return {
    settings: { ...defaultSettings(), ...(parsed.settings || {}) },
    installedAssets: parsed.installedAssets || []
  };
}

function writeStore(data: LauncherStore) {
  fs.mkdirSync(path.dirname(storePath()), { recursive: true });
  fs.writeFileSync(storePath(), JSON.stringify(data, null, 2), "utf-8");
}

export function getSettings() {
  return ensureStore().settings;
}

export function updateSettings(patch: Partial<LauncherSettings>) {
  const data = ensureStore();
  data.settings = { ...data.settings, ...patch };
  writeStore(data);
  return data.settings;
}

export function getInstalledAssets() {
  return ensureStore().installedAssets;
}

export function saveInstalledAsset(asset: InstalledAsset) {
  const data = ensureStore();
  data.installedAssets = [asset, ...data.installedAssets.filter((item) => item.assetId !== asset.assetId)];
  writeStore(data);
  return data.installedAssets;
}

export function removeInstalledAsset(assetId: number) {
  const data = ensureStore();
  data.installedAssets = data.installedAssets.filter((item) => item.assetId !== assetId);
  writeStore(data);
  return data.installedAssets;
}

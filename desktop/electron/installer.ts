import fs from "node:fs";
import path from "node:path";
import { shell } from "electron";
import type { InstalledAsset } from "./types";
import { removeInstalledAsset, saveInstalledAsset } from "./store";
import { sha256File } from "./download-manager";

function copyFileIntoFolder(sourceFile: string, targetFolder: string) {
  fs.mkdirSync(targetFolder, { recursive: true });
  const targetFile = path.join(targetFolder, path.basename(sourceFile));
  fs.copyFileSync(sourceFile, targetFile);
  return targetFile;
}

export async function installAsset(params: {
  assetId: number;
  title: string;
  version: string;
  archivePath: string;
  installDirectory: string;
  autoInstallDependencies: boolean;
}) {
  const assetFolder = path.join(params.installDirectory, String(params.assetId));
  const installedArchive = copyFileIntoFolder(params.archivePath, assetFolder);
  const marker = path.join(assetFolder, "railforge-install.json");
  const sha256 = await sha256File(installedArchive);
  const installedAsset: InstalledAsset = {
    assetId: params.assetId,
    title: params.title,
    version: params.version,
    installedAt: new Date().toISOString(),
    installPath: assetFolder,
    files: [installedArchive, marker],
    sha256
  };
  fs.writeFileSync(marker, JSON.stringify({ ...installedAsset, autoInstallDependencies: params.autoInstallDependencies }, null, 2));
  saveInstalledAsset(installedAsset);
  return installedAsset;
}

export function uninstallAsset(asset: InstalledAsset) {
  if (asset.installPath && fs.existsSync(asset.installPath)) {
    fs.rmSync(asset.installPath, { recursive: true, force: true });
  }
  return removeInstalledAsset(asset.assetId);
}

export async function openFolder(targetPath: string) {
  if (targetPath && fs.existsSync(targetPath)) {
    await shell.openPath(targetPath);
  }
}

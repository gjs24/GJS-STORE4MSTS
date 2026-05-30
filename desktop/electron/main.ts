import path from "node:path";
import fs from "node:fs";
import { app, BrowserWindow, ipcMain, Notification, protocol } from "electron";
import { autoUpdater } from "electron-updater";
import { startDownload, listDownloads, sha256File } from "./download-manager";
import { chooseDirectory, detectInstallPaths } from "./path-detection";
import { getInstalledAssets, getSettings, updateSettings } from "./store";
import { installAsset, openFolder, uninstallAsset } from "./installer";

let mainWindow: BrowserWindow | null = null;

const isDev = Boolean(process.env.ELECTRON_RENDERER_URL);

protocol.registerSchemesAsPrivileged([
  { scheme: "app", privileges: { standard: true, secure: true, supportFetchAPI: true } }
]);

function rendererUrl() {
  if (isDev) return process.env.ELECTRON_RENDERER_URL!;
  return "app://railforge/index.html";
}

function registerAppProtocol() {
  protocol.registerFileProtocol("app", (request, callback) => {
    const url = new URL(request.url);
    let pathname = decodeURIComponent(url.pathname);
    if (pathname === "/" || pathname === "") pathname = "/index.html";
    const root = path.join(__dirname, "../renderer/out");
    let filePath = path.join(root, pathname);
    if (!path.extname(filePath)) filePath = path.join(filePath, "index.html");
    if (!fs.existsSync(filePath) && !filePath.endsWith("index.html")) {
      filePath = path.join(filePath, "index.html");
    }
    callback({ path: filePath });
  });
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 780,
    minWidth: 1080,
    minHeight: 680,
    title: "GJS RailForge Launcher",
    backgroundColor: "#05070b",
    titleBarStyle: "hidden",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  await mainWindow.loadURL(rendererUrl());
  if (isDev) mainWindow.webContents.openDevTools({ mode: "detach" });
}

function sendUpdaterEvent(payload: Record<string, unknown>) {
  mainWindow?.webContents.send("updater:event", payload);
}

function registerIpc() {
  ipcMain.handle("settings:get", () => getSettings());
  ipcMain.handle("settings:update", (_event, patch) => updateSettings(patch));
  ipcMain.handle("paths:detect", () => detectInstallPaths());
  ipcMain.handle("paths:choose", (_event, title: string) => chooseDirectory(title));
  ipcMain.handle("installed:list", () => getInstalledAssets());
  ipcMain.handle("installed:install", async (_event, payload) => {
    const settings = getSettings();
    return installAsset({ ...payload, installDirectory: settings.installDirectory, autoInstallDependencies: settings.autoInstallDependencies });
  });
  ipcMain.handle("installed:uninstall", (_event, assetId: number) => {
    const asset = getInstalledAssets().find((item) => item.assetId === assetId);
    if (!asset) return getInstalledAssets();
    return uninstallAsset(asset);
  });
  ipcMain.handle("folder:open", (_event, targetPath: string) => openFolder(targetPath));
  ipcMain.handle("downloads:list", () => listDownloads());
  ipcMain.handle("downloads:start", (_event, request) => {
    const settings = getSettings();
    return startDownload(request, settings.downloadCacheDirectory, (state) => {
      mainWindow?.webContents.send("downloads:progress", state);
    });
  });
  ipcMain.handle("file:verify", (_event, filePath: string) => sha256File(filePath));
  ipcMain.handle("app:checkForUpdates", async () => {
    if (isDev) {
      sendUpdaterEvent({ type: "dev", message: "Auto updater runs in packaged builds." });
      return { dev: true };
    }
    return autoUpdater.checkForUpdatesAndNotify();
  });
}

function registerUpdater() {
  autoUpdater.on("checking-for-update", () => sendUpdaterEvent({ type: "checking" }));
  autoUpdater.on("update-available", (info) => sendUpdaterEvent({ type: "available", info }));
  autoUpdater.on("update-not-available", () => sendUpdaterEvent({ type: "none" }));
  autoUpdater.on("download-progress", (progress) => sendUpdaterEvent({ type: "progress", progress }));
  autoUpdater.on("update-downloaded", () => {
    sendUpdaterEvent({ type: "downloaded" });
    if (Notification.isSupported()) {
      new Notification({ title: "GJS RailForge", body: "Launcher update downloaded. Restart to install." }).show();
    }
  });
  autoUpdater.on("error", (error) => sendUpdaterEvent({ type: "error", message: error.message }));
}

app.whenReady().then(async () => {
  registerAppProtocol();
  registerIpc();
  registerUpdater();
  await createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) void createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

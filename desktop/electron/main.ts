import { app, BrowserWindow, shell } from "electron";
import path from "node:path";
import fs from "node:fs";

const STORE_URL = process.env.STORE_URL || "https://gjs-store-4-msts.vercel.app";
const isDev = Boolean(process.env.ELECTRON_RENDERER_URL);
const ALLOWED_APP_HOSTS = new Set(["gjspro.store", "www.gjspro.store", "gjs-store-4-msts.vercel.app"]);

function isAllowedAppUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    if (isDev && (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1")) {
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    }
    return parsed.protocol === "https:" && ALLOWED_APP_HOSTS.has(parsed.hostname.toLowerCase());
  } catch {
    return false;
  }
}

function isSafeExternalUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    return parsed.protocol === "https:" || parsed.protocol === "http:" || parsed.protocol === "mailto:";
  } catch {
    return false;
  }
}

function createWindow() {
  const iconPath = path.join(__dirname, "../build/icon.png");

  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: "MSTS-GJS Production Store",
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    autoHideMenuBar: true,
    backgroundColor: "#05070b",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  });

  win.setMenuBarVisibility(false);

  const targetUrl = isDev ? process.env.ELECTRON_RENDERER_URL! : STORE_URL;

  win.loadURL(targetUrl).catch((err) => {
    console.error("Failed to load live store URL, loading local fallback:", err);
    win.loadFile(path.join(__dirname, "../renderer/out/index.html"));
  });

  // Prevent navigation to untrusted external domains inside the Electron window
  win.webContents.on("will-navigate", (event, url) => {
    if (!isAllowedAppUrl(url) && !url.startsWith("file://")) {
      event.preventDefault();
      if (isSafeExternalUrl(url)) {
        shell.openExternal(url);
      }
    }
  });

  // Open external links (e.g. WhatsApp support, mailto) safely in default OS browser
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (!isAllowedAppUrl(url)) {
      if (isSafeExternalUrl(url)) {
        shell.openExternal(url);
      }
      return { action: "deny" };
    }
    return { action: "allow" };
  });
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
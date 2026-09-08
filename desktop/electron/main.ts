import { app, BrowserWindow, shell } from "electron";
import path from "node:path";
import fs from "node:fs";

const STORE_URL = process.env.STORE_URL || "https://gjs-store-4-msts.vercel.app";
const isDev = Boolean(process.env.ELECTRON_RENDERER_URL);

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
    },
  });

  win.setMenuBarVisibility(false);

  const targetUrl = isDev ? process.env.ELECTRON_RENDERER_URL! : STORE_URL;

  win.loadURL(targetUrl).catch((err) => {
    console.error("Failed to load live store URL, loading local fallback:", err);
    win.loadFile(path.join(__dirname, "../renderer/out/index.html"));
  });

  // Open external links (e.g. WhatsApp support, mailto) in default web browser
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https://wa.me") || url.startsWith("mailto:") || !url.includes("gjs-store-4-msts.vercel.app")) {
      shell.openExternal(url);
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
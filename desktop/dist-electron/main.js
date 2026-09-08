"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const node_path_1 = __importDefault(require("node:path"));
const node_fs_1 = __importDefault(require("node:fs"));
const STORE_URL = process.env.STORE_URL || "https://gjs-store-4-msts.vercel.app";
const isDev = Boolean(process.env.ELECTRON_RENDERER_URL);
function createWindow() {
    const iconPath = node_path_1.default.join(__dirname, "../build/icon.png");
    const win = new electron_1.BrowserWindow({
        width: 1440,
        height: 900,
        minWidth: 1024,
        minHeight: 700,
        title: "MSTS-GJS Production Store",
        icon: node_fs_1.default.existsSync(iconPath) ? iconPath : undefined,
        autoHideMenuBar: true,
        backgroundColor: "#05070b",
        webPreferences: {
            preload: node_path_1.default.join(__dirname, "preload.js"),
            contextIsolation: true,
            nodeIntegration: false,
        },
    });
    win.setMenuBarVisibility(false);
    const targetUrl = isDev ? process.env.ELECTRON_RENDERER_URL : STORE_URL;
    win.loadURL(targetUrl).catch((err) => {
        console.error("Failed to load live store URL, loading local fallback:", err);
        win.loadFile(node_path_1.default.join(__dirname, "../renderer/out/index.html"));
    });
    // Open external links (e.g. WhatsApp support, mailto) in default web browser
    win.webContents.setWindowOpenHandler(({ url }) => {
        if (url.startsWith("https://wa.me") || url.startsWith("mailto:") || !url.includes("gjs-store-4-msts.vercel.app")) {
            electron_1.shell.openExternal(url);
            return { action: "deny" };
        }
        return { action: "allow" };
    });
}
electron_1.app.whenReady().then(createWindow);
electron_1.app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        electron_1.app.quit();
    }
});

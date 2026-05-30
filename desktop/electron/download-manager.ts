import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import https from "node:https";
import path from "node:path";
import { Notification } from "electron";
import type { DownloadRequest, DownloadState } from "./types";

type ProgressHandler = (state: DownloadState) => void;

const downloads = new Map<string, DownloadState>();

function requestClient(url: string) {
  return url.startsWith("https:") ? https : http;
}

function safeFileName(input: string) {
  return input.replace(/[^a-z0-9._-]+/gi, "-").replace(/^-+|-+$/g, "").slice(0, 120);
}

export function listDownloads() {
  return Array.from(downloads.values());
}

export function sha256File(filePath: string) {
  return new Promise<string>((resolve, reject) => {
    const hash = crypto.createHash("sha256");
    const stream = fs.createReadStream(filePath);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(hash.digest("hex")));
  });
}

export function startDownload(request: DownloadRequest, cacheDirectory: string, onProgress: ProgressHandler) {
  fs.mkdirSync(cacheDirectory, { recursive: true });
  const id = String(request.assetId);
  const fileName = safeFileName(request.fileName || `${request.title}.zip`);
  const filePath = path.join(cacheDirectory, fileName);
  const existingBytes = fs.existsSync(filePath) ? fs.statSync(filePath).size : 0;

  const state: DownloadState = {
    id,
    assetId: request.assetId,
    title: request.title,
    filePath,
    receivedBytes: existingBytes,
    totalBytes: 0,
    percent: 0,
    status: "downloading"
  };
  downloads.set(id, state);
  onProgress(state);

  const options = existingBytes > 0 ? { headers: { Range: `bytes=${existingBytes}-` } } : {};
  const req = requestClient(request.url).get(request.url, options, (res) => {
    if (res.statusCode && res.statusCode >= 400) {
      state.status = "failed";
      state.error = `HTTP ${res.statusCode}`;
      onProgress(state);
      return;
    }

    const canResume = existingBytes > 0 && res.statusCode === 206;
    if (existingBytes > 0 && !canResume) {
      state.receivedBytes = 0;
    }
    const contentLength = Number(res.headers["content-length"] || 0);
    state.totalBytes = contentLength + (canResume ? existingBytes : 0);
    const stream = fs.createWriteStream(filePath, { flags: canResume ? "a" : "w" });

    res.on("data", (chunk: Buffer) => {
      state.receivedBytes += chunk.length;
      state.percent = state.totalBytes ? Math.round((state.receivedBytes / state.totalBytes) * 100) : 0;
      onProgress({ ...state });
    });

    res.pipe(stream);
    stream.on("finish", async () => {
      stream.close();
      state.status = "completed";
      state.percent = 100;
      state.sha256 = await sha256File(filePath);
      if (request.expectedSha256 && state.sha256 !== request.expectedSha256) {
        state.status = "failed";
        state.error = "Integrity verification failed";
      }
      onProgress({ ...state });
      if (Notification.isSupported()) {
        new Notification({ title: "GJS RailForge", body: `${request.title} download ${state.status}.` }).show();
      }
    });
  });

  req.on("error", (error) => {
    state.status = "failed";
    state.error = error.message;
    onProgress({ ...state });
  });

  return state;
}

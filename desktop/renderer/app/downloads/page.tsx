"use client";

import { useEffect, useState } from "react";
import { FolderOpen, PackageCheck } from "lucide-react";
import type { DownloadState } from "@/lib/types";

export default function DownloadsPage() {
  const [downloads, setDownloads] = useState<DownloadState[]>([]);

  useEffect(() => {
    window.railforge?.listDownloads().then(setDownloads);
    const off = window.railforge?.onDownloadProgress((state) => {
      setDownloads((current) => [state, ...current.filter((item) => item.id !== state.id)]);
    });
    return () => off?.();
  }, []);

  async function install(download: DownloadState) {
    await window.railforge?.installAsset({ assetId: download.assetId, title: download.title, version: "latest", archivePath: download.filePath });
  }

  return (
    <section className="p-6">
      <p className="text-sm font-bold uppercase text-forge-amber">Download manager</p>
      <h1 className="text-3xl font-black">Downloads</h1>
      <div className="mt-6 space-y-3">
        {downloads.length === 0 ? <div className="launcher-panel rounded-lg p-6 text-slate-300">No downloads yet. Start one from the asset store.</div> : null}
        {downloads.map((download) => (
          <div key={download.id} className="launcher-panel rounded-lg p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-bold">{download.title}</h2>
                <p className="text-sm text-slate-400">{download.status} • {download.filePath}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => window.railforge?.openFolder(download.filePath)} className="rounded border border-white/10 p-2" title="Open file location"><FolderOpen size={18} /></button>
                {download.status === "completed" ? <button onClick={() => install(download)} className="rounded bg-forge-red px-3 py-2 text-sm font-bold"><PackageCheck className="mr-1 inline" size={16} /> Install</button> : null}
              </div>
            </div>
            <div className="mt-4 h-3 overflow-hidden rounded bg-black/50">
              <div className="h-full bg-forge-red" style={{ width: `${download.percent}%` }} />
            </div>
            <p className="mt-2 text-xs text-slate-400">{download.percent}% {download.error ? `• ${download.error}` : ""}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

"use client";

import { useEffect, useState } from "react";
import { FolderOpen, Trash2 } from "lucide-react";
import type { InstalledAsset } from "@/lib/types";

export default function InstalledPage() {
  const [assets, setAssets] = useState<InstalledAsset[]>([]);

  async function refresh() {
    setAssets((await window.railforge?.listInstalled()) || []);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function uninstall(assetId: number) {
    const next = await window.railforge?.uninstallAsset(assetId);
    setAssets(next || []);
  }

  return (
    <section className="p-6">
      <p className="text-sm font-bold uppercase text-forge-amber">Installed assets manager</p>
      <h1 className="text-3xl font-black">Installed Assets</h1>
      <div className="mt-6 grid gap-4">
        {assets.length === 0 ? <div className="launcher-panel rounded-lg p-6 text-slate-300">No assets installed yet. Completed downloads can be installed from the Downloads page.</div> : null}
        {assets.map((asset) => (
          <div key={asset.assetId} className="launcher-panel flex items-center justify-between rounded-lg p-5">
            <div>
              <h2 className="font-bold">{asset.title}</h2>
              <p className="text-sm text-slate-400">v{asset.version} • Installed {new Date(asset.installedAt).toLocaleString()}</p>
              <p className="mt-1 text-xs text-slate-500">{asset.installPath}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => window.railforge?.openFolder(asset.installPath)} className="rounded border border-white/10 p-2" title="Open installed folder"><FolderOpen size={18} /></button>
              <button onClick={() => uninstall(asset.assetId)} className="rounded border border-red-500/40 p-2 text-red-300" title="Uninstall asset"><Trash2 size={18} /></button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

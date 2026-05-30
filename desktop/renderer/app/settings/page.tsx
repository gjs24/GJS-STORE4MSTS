"use client";

import { useEffect, useState } from "react";
import { FolderSearch, Save, SearchCheck } from "lucide-react";
import type { LauncherSettings } from "@/lib/types";

const emptySettings: LauncherSettings = {
  apiUrl: "http://localhost:8000/api",
  mstsPath: "",
  openRailsPath: "",
  installDirectory: "",
  downloadCacheDirectory: "",
  autoInstallDependencies: true
};

const directoryFields: Array<{
  key: "mstsPath" | "openRailsPath" | "installDirectory" | "downloadCacheDirectory";
  label: string;
  title: string;
}> = [
  { key: "mstsPath", label: "MSTS installation path", title: "Choose MSTS folder" },
  { key: "openRailsPath", label: "Open Rails installation path", title: "Choose Open Rails folder" },
  { key: "installDirectory", label: "Asset install directory", title: "Choose asset install folder" },
  { key: "downloadCacheDirectory", label: "Download cache directory", title: "Choose download cache folder" }
];

export default function SettingsPage() {
  const [settings, setSettings] = useState<LauncherSettings>(emptySettings);
  const [message, setMessage] = useState("");

  useEffect(() => {
    window.railforge?.getSettings().then(setSettings);
  }, []);

  function patch(key: keyof LauncherSettings, value: string | boolean) {
    setSettings((current) => ({ ...current, [key]: value }));
  }

  async function choose(key: "mstsPath" | "openRailsPath" | "installDirectory" | "downloadCacheDirectory", title: string) {
    const directory = await window.railforge?.chooseDirectory(title);
    if (directory) patch(key, directory);
  }

  async function detect() {
    const detected = await window.railforge?.detectInstallPaths();
    setSettings((current) => ({
      ...current,
      mstsPath: detected?.mstsPath || current.mstsPath,
      openRailsPath: detected?.openRailsPath || current.openRailsPath
    }));
    setMessage("Detection complete. Review paths before saving.");
  }

  async function save() {
    const updated = await window.railforge?.updateSettings(settings);
    if (updated) setSettings(updated);
    setMessage("Settings saved.");
  }

  return (
    <section className="p-6">
      <p className="text-sm font-bold uppercase text-forge-amber">Launcher configuration</p>
      <h1 className="text-3xl font-black">Settings</h1>
      <div className="mt-6 grid gap-5 xl:grid-cols-[1fr_.8fr]">
        <div className="launcher-panel space-y-4 rounded-lg p-5">
          <label className="block">
            <span className="text-sm text-slate-300">API connection</span>
            <input value={settings.apiUrl} onChange={(event) => patch("apiUrl", event.target.value)} className="mt-2 w-full rounded border border-white/10 bg-black/35 px-3 py-3 outline-none" />
          </label>
          {directoryFields.map(({ key, label, title }) => (
            <label key={key} className="block">
              <span className="text-sm text-slate-300">{label}</span>
              <div className="mt-2 flex gap-2">
                <input value={settings[key]} onChange={(event) => patch(key, event.target.value)} className="min-w-0 flex-1 rounded border border-white/10 bg-black/35 px-3 py-3 outline-none" />
                <button type="button" onClick={() => choose(key, title)} className="rounded border border-white/10 px-3" title={title}><FolderSearch size={18} /></button>
              </div>
            </label>
          ))}
          <label className="flex items-center justify-between rounded border border-white/10 bg-white/[0.03] p-4">
            <span>
              <span className="block font-semibold">Automatic dependency install</span>
              <span className="text-sm text-slate-400">Allow dependency packages to be staged with compatible assets.</span>
            </span>
            <input type="checkbox" checked={settings.autoInstallDependencies} onChange={(event) => patch("autoInstallDependencies", event.target.checked)} />
          </label>
          <div className="flex gap-3">
            <button onClick={save} className="rounded bg-forge-red px-5 py-3 font-bold"><Save className="mr-2 inline" size={18} /> Save settings</button>
            <button onClick={detect} className="rounded border border-white/10 px-5 py-3 font-bold"><SearchCheck className="mr-2 inline" size={18} /> Auto-detect simulators</button>
          </div>
          {message ? <p className="text-sm text-slate-300">{message}</p> : null}
        </div>
        <div className="launcher-panel rounded-lg p-5">
          <h2 className="text-xl font-black">Admin-configurable API</h2>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            The launcher stores its API URL locally, so production builds can target the live GJS Production backend while development builds can use `http://localhost:8000/api`.
          </p>
          <h2 className="mt-6 text-xl font-black">Path detection</h2>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            The detector checks common Windows MSTS and Open Rails folders. Users can override every path and keep downloads in a separate cache.
          </p>
        </div>
      </div>
    </section>
  );
}

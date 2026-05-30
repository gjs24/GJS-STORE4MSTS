"use client";

import { Bell, Minimize2, RefreshCw, Search } from "lucide-react";
import { useState } from "react";

export function Topbar() {
  const [message, setMessage] = useState("");

  async function checkUpdates() {
    setMessage("Checking...");
    const result = await window.railforge?.checkForUpdates();
    setMessage(result ? "Updater contacted" : "Updater unavailable");
  }

  return (
    <header className="drag-region flex h-16 items-center justify-between border-b border-white/10 bg-forge-black/80 px-5">
      <div className="no-drag flex w-[420px] items-center gap-2 rounded border border-white/10 bg-white/[0.04] px-3 py-2">
        <Search size={17} className="text-slate-400" />
        <input placeholder="Search assets, routes, locomotives" className="w-full bg-transparent text-sm outline-none placeholder:text-slate-500" />
      </div>
      <div className="no-drag flex items-center gap-2 text-sm text-slate-300">
        {message ? <span>{message}</span> : null}
        <button onClick={checkUpdates} className="rounded border border-white/10 p-2 hover:bg-white/10" title="Check launcher updates">
          <RefreshCw size={17} />
        </button>
        <button className="rounded border border-white/10 p-2 hover:bg-white/10" title="Notifications">
          <Bell size={17} />
        </button>
        <span className="rounded border border-white/10 p-2 text-slate-500" title="Window controls are native">
          <Minimize2 size={17} />
        </span>
      </div>
    </header>
  );
}

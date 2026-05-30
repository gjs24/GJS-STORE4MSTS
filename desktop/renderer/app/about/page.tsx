"use client";

import { useEffect, useState } from "react";
import { Bell, RefreshCw, ShieldCheck, TrainFront } from "lucide-react";

export default function AboutPage() {
  const [updaterMessage, setUpdaterMessage] = useState("Idle");

  useEffect(() => {
    const off = window.railforge?.onUpdaterEvent((event) => {
      const payload = event as { type?: string; message?: string };
      setUpdaterMessage(payload.message || payload.type || "Updater event received");
    });
    return () => off?.();
  }, []);

  return (
    <section className="p-6">
      <div className="launcher-panel rounded-lg p-8 shadow-forge">
        <TrainFront className="h-16 w-16 text-forge-red" />
        <p className="mt-5 text-sm font-bold uppercase text-forge-amber">GJS Production</p>
        <h1 className="mt-2 text-4xl font-black">GJS RailForge Launcher</h1>
        <p className="mt-4 max-w-3xl text-slate-300">
          A desktop EXE launcher and store for MSTS and Open Rails assets with downloads, install management, update checks, asset verification, and production-ready packaging.
        </p>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="launcher-panel rounded-lg p-5"><RefreshCw className="text-forge-amber" /><h2 className="mt-4 font-bold">Auto updater</h2><p className="mt-2 text-sm text-slate-400">{updaterMessage}</p></div>
        <div className="launcher-panel rounded-lg p-5"><Bell className="text-forge-amber" /><h2 className="mt-4 font-bold">Notifications</h2><p className="mt-2 text-sm text-slate-400">Desktop notifications fire when downloads or updates finish.</p></div>
        <div className="launcher-panel rounded-lg p-5"><ShieldCheck className="text-forge-amber" /><h2 className="mt-4 font-bold">Integrity</h2><p className="mt-2 text-sm text-slate-400">Downloaded files can be verified with SHA-256 before install.</p></div>
      </div>
    </section>
  );
}

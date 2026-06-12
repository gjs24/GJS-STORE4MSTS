import { TrainFront } from "lucide-react";

export default function Loading() {
  return (
    <section className="rail-grid flex min-h-[70vh] items-center justify-center px-4">
      <div className="cinematic-panel w-full max-w-md rounded-lg p-8 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-rail-red text-white shadow-glow loading-pulse">
          <TrainFront size={36} />
        </div>
        <h1 className="mt-6 text-2xl font-black text-white">Loading MSTS-GJS Store</h1>
        <p className="mt-2 text-sm text-slate-400">Preparing railway assets and secure downloads.</p>
        <div className="mt-6 h-2 overflow-hidden rounded-full bg-white/10">
          <div className="loading-bar h-full rounded-full bg-rail-red" />
        </div>
      </div>
    </section>
  );
}

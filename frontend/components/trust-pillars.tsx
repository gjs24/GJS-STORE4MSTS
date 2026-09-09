import { Flame, Gauge, Headphones, ShieldCheck, Sparkles, Zap } from "lucide-react";

export function TrustPillars() {
  return (
    <section className="relative mx-auto max-w-7xl px-4 py-16 sm:py-20">
      <div className="text-center max-w-3xl mx-auto mb-12">
        <div className="inline-flex items-center gap-2 rounded-full border border-rail-amber/30 bg-rail-amber/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-rail-amber mb-3">
          <Sparkles size={14} />
          The GJS Quality Standard
        </div>
        <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
          Why Indian Simmers Choose GJS Production Store
        </h2>
        <p className="mt-3 text-sm sm:text-base text-slate-300">
          Engineered by passionate train simmers for the Indian railway simulation community.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* Pillar 1 */}
        <div className="group relative rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.01] p-6 shadow-xl transition-all duration-300 hover:-translate-y-1.5 hover:border-rail-amber/40 hover:bg-white/[0.07]">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-rail-amber/15 text-rail-amber ring-1 ring-rail-amber/30 group-hover:scale-110 transition-transform">
            <Headphones size={24} />
          </div>
          <h3 className="text-lg font-bold text-white group-hover:text-rail-amber transition-colors">
            Authentic Sound & Horns
          </h3>
          <p className="mt-2 text-xs sm:text-sm leading-relaxed text-slate-400">
            Real 3-Phase AC motor hums, realistic air brake releases, and crisp dual-tone Indian electric/diesel horns sampled from actual locomotives.
          </p>
        </div>

        {/* Pillar 2 */}
        <div className="group relative rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.01] p-6 shadow-xl transition-all duration-300 hover:-translate-y-1.5 hover:border-rail-red/40 hover:bg-white/[0.07]">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-rail-red/15 text-rail-red ring-1 ring-rail-red/30 group-hover:scale-110 transition-transform">
            <Gauge size={24} />
          </div>
          <h3 className="text-lg font-bold text-white group-hover:text-rail-red transition-colors">
            Realistic 3D Cabviews
          </h3>
          <p className="mt-2 text-xs sm:text-sm leading-relaxed text-slate-400">
            Functional brake cylinder & train pipe gauges, working speedometers, realistic throttle notches, and immersive night illuminated cockpits.
          </p>
        </div>

        {/* Pillar 3 */}
        <div className="group relative rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.01] p-6 shadow-xl transition-all duration-300 hover:-translate-y-1.5 hover:border-emerald-400/40 hover:bg-white/[0.07]">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-400/15 text-emerald-400 ring-1 ring-emerald-400/30 group-hover:scale-110 transition-transform">
            <Zap size={24} />
          </div>
          <h3 className="text-lg font-bold text-white group-hover:text-emerald-300 transition-colors">
            Instant Direct Cloud Access
          </h3>
          <p className="mt-2 text-xs sm:text-sm leading-relaxed text-slate-400">
            No waiting screens or shady link shorteners. Downloads unlock instantly right in your account with high-speed Google Drive and Cloudinary delivery.
          </p>
        </div>

        {/* Pillar 4 */}
        <div className="group relative rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.01] p-6 shadow-xl transition-all duration-300 hover:-translate-y-1.5 hover:border-purple-400/40 hover:bg-white/[0.07]">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-purple-400/15 text-purple-400 ring-1 ring-purple-400/30 group-hover:scale-110 transition-transform">
            <Flame size={24} />
          </div>
          <h3 className="text-lg font-bold text-white group-hover:text-purple-300 transition-colors">
            VIP Early Access & Rewards
          </h3>
          <p className="mt-2 text-xs sm:text-sm leading-relaxed text-slate-400">
            Loyal buyers who own previous products unlock exclusive VIP early access and loyalty discounts before public general release dates.
          </p>
        </div>
      </div>
    </section>
  );
}

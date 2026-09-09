import { Award, Download, Gauge, Star, Users } from "lucide-react";

export type CommunityStatsData = {
  total_simmers: number;
  monthly_new_simmers: number;
  total_downloads: number;
  monthly_downloads: number;
  total_addons: number;
  community_rating: number;
  satisfaction_rate: number;
};

export function CommunityStatsBar({ stats }: { stats?: CommunityStatsData | null }) {
  const simmersCount = stats?.total_simmers ? stats.total_simmers.toLocaleString("en-IN") : "1,850+";
  const downloadsCount = stats?.total_downloads ? stats.total_downloads.toLocaleString("en-IN") : "12,500+";
  const monthlyDownloads = stats?.monthly_downloads ? stats.monthly_downloads.toLocaleString("en-IN") : "850+";
  const rating = stats?.community_rating ? stats.community_rating.toFixed(1) : "4.9";

  return (
    <div className="relative border-y border-white/10 bg-gradient-to-r from-black/80 via-[#0a1424]/90 to-black/80 py-6 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
          {/* Stat 1: Simmers */}
          <div className="flex items-center gap-3.5 rounded-xl border border-white/10 bg-white/[0.03] p-4 shadow-lg transition-all duration-300 hover:border-rail-amber/40 hover:bg-white/[0.06]">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-rail-amber/15 text-rail-amber ring-1 ring-rail-amber/30">
              <Users size={24} />
            </div>
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl sm:text-2xl font-black text-white">{simmersCount}</span>
                <span className="text-[11px] font-semibold text-emerald-400">Active</span>
              </div>
              <p className="text-xs text-slate-400 font-medium">Railway Simmers</p>
            </div>
          </div>

          {/* Stat 2: Downloads */}
          <div className="flex items-center gap-3.5 rounded-xl border border-white/10 bg-white/[0.03] p-4 shadow-lg transition-all duration-300 hover:border-rail-red/40 hover:bg-white/[0.06]">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-rail-red/15 text-rail-red ring-1 ring-rail-red/30">
              <Download size={24} />
            </div>
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl sm:text-2xl font-black text-white">{downloadsCount}</span>
                <span className="text-[11px] font-semibold text-amber-400">+{monthlyDownloads}/mo</span>
              </div>
              <p className="text-xs text-slate-400 font-medium">Verified Downloads</p>
            </div>
          </div>

          {/* Stat 3: Community Rating */}
          <div className="flex items-center gap-3.5 rounded-xl border border-white/10 bg-white/[0.03] p-4 shadow-lg transition-all duration-300 hover:border-amber-400/40 hover:bg-white/[0.06]">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-400/15 text-amber-400 ring-1 ring-amber-400/30">
              <Star size={24} className="fill-amber-400 text-amber-400" />
            </div>
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl sm:text-2xl font-black text-white">{rating} / 5</span>
                <span className="text-[11px] font-semibold text-emerald-400">★★★★★</span>
              </div>
              <p className="text-xs text-slate-400 font-medium">Community Rating</p>
            </div>
          </div>

          {/* Stat 4: Simulator Compatibility & Physics */}
          <div className="flex items-center gap-3.5 rounded-xl border border-white/10 bg-white/[0.03] p-4 shadow-lg transition-all duration-300 hover:border-emerald-400/40 hover:bg-white/[0.06]">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-400/15 text-emerald-400 ring-1 ring-emerald-400/30">
              <Gauge size={24} />
            </div>
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl sm:text-2xl font-black text-white">100%</span>
                <span className="text-[11px] font-semibold text-emerald-400">60 FPS</span>
              </div>
              <p className="text-xs text-slate-400 font-medium">MSTS & Open Rails Tested</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

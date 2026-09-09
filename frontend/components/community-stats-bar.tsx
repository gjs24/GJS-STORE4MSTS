import { Download, Gauge, Star, Users } from "lucide-react";

export type CommunityStatsData = {
  total_simmers: number;
  monthly_new_simmers: number;
  total_downloads: number;
  monthly_downloads: number;
  total_addons: number;
  review_count?: number;
  community_rating: number;
  satisfaction_rate: number;
};

export function CommunityStatsBar({ stats }: { stats?: CommunityStatsData | null }) {
  const simmersCount = Number(stats?.total_simmers ?? 0).toLocaleString("en-IN");
  const monthlyNew = Number(stats?.monthly_new_simmers ?? 0).toLocaleString("en-IN");
  const downloadsCount = Number(stats?.total_downloads ?? 0).toLocaleString("en-IN");
  const monthlyDownloads = Number(stats?.monthly_downloads ?? 0).toLocaleString("en-IN");
  const rating = stats?.community_rating ? Number(stats.community_rating).toFixed(1) : "5.0";
  const reviewCount = stats?.review_count ?? 0;
  const addonsCount = Number(stats?.total_addons ?? 0).toLocaleString("en-IN");

  return (
    <div className="relative border-y border-white/10 bg-gradient-to-r from-black/90 via-[#0a1424]/90 to-black/90 py-5 sm:py-6 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4 md:gap-6">
          {/* Stat 1: Simmers & New this month */}
          <div className="flex items-center gap-3 sm:gap-3.5 rounded-xl border border-white/10 bg-white/[0.03] p-3.5 sm:p-4 shadow-lg transition-all duration-300 hover:border-rail-amber/40 hover:bg-white/[0.06]">
            <div className="flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl bg-rail-amber/15 text-rail-amber ring-1 ring-rail-amber/30">
              <Users size={22} className="sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline gap-1.5">
                <span className="text-xl sm:text-2xl font-black text-white">{simmersCount}</span>
                <span className="rounded bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.5 text-[10px] sm:text-[11px] font-bold text-emerald-300">
                  +{monthlyNew} this month
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium truncate">Registered Simmers</p>
            </div>
          </div>

          {/* Stat 2: Real Downloads & This month count */}
          <div className="flex items-center gap-3 sm:gap-3.5 rounded-xl border border-white/10 bg-white/[0.03] p-3.5 sm:p-4 shadow-lg transition-all duration-300 hover:border-rail-red/40 hover:bg-white/[0.06]">
            <div className="flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl bg-rail-red/15 text-rail-red ring-1 ring-rail-red/30">
              <Download size={22} className="sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline gap-1.5">
                <span className="text-xl sm:text-2xl font-black text-white">{downloadsCount}</span>
                <span className="rounded bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 text-[10px] sm:text-[11px] font-bold text-amber-300">
                  +{monthlyDownloads} this month
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium truncate">Verified Downloads</p>
            </div>
          </div>

          {/* Stat 3: Community Rating */}
          <div className="flex items-center gap-3 sm:gap-3.5 rounded-xl border border-white/10 bg-white/[0.03] p-3.5 sm:p-4 shadow-lg transition-all duration-300 hover:border-amber-400/40 hover:bg-white/[0.06]">
            <div className="flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl bg-amber-400/15 text-amber-400 ring-1 ring-amber-400/30">
              <Star size={22} className="fill-amber-400 text-amber-400 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline gap-1.5">
                <span className="text-xl sm:text-2xl font-black text-white">{rating} / 5</span>
                <span className="text-[10px] sm:text-[11px] font-semibold text-emerald-400">
                  {reviewCount > 0 ? `(${reviewCount} reviews)` : "★★★★★"}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium truncate">Community Rating</p>
            </div>
          </div>

          {/* Stat 4: Simulator Compatibility & Addon count */}
          <div className="flex items-center gap-3 sm:gap-3.5 rounded-xl border border-white/10 bg-white/[0.03] p-3.5 sm:p-4 shadow-lg transition-all duration-300 hover:border-emerald-400/40 hover:bg-white/[0.06]">
            <div className="flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-400/15 text-emerald-400 ring-1 ring-emerald-400/30">
              <Gauge size={22} className="sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline gap-1.5">
                <span className="text-xl sm:text-2xl font-black text-white">100%</span>
                <span className="rounded bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.5 text-[10px] sm:text-[11px] font-bold text-emerald-300">
                  {addonsCount} Addons
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium truncate">MSTS & Open Rails Tested</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

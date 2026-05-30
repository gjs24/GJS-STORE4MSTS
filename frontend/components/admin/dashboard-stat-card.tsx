"use client";

import { motion } from "framer-motion";
import type { DashboardMetric } from "@/lib/admin-dashboard-data";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const toneClasses = {
  red: "from-rail-red/24 text-red-100 ring-rail-red/35",
  amber: "from-rail-amber/24 text-amber-100 ring-rail-amber/35",
  cyan: "from-cyan-400/20 text-cyan-100 ring-cyan-400/25",
  emerald: "from-emerald-400/18 text-emerald-100 ring-emerald-400/25"
};

export function DashboardStatCard({ metric, index }: { metric: DashboardMetric; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: index * 0.05 }}
      whileHover={{ y: -4, scale: 1.01 }}
    >
      <Card className="group relative overflow-hidden">
        <div className={cn("absolute inset-x-0 top-0 h-24 bg-gradient-to-b to-transparent opacity-80", toneClasses[metric.tone])} />
        <CardContent className="relative p-5">
          <div className="flex items-center justify-between">
            <div className={cn("flex h-12 w-12 items-center justify-center rounded-lg bg-white/8 ring-1", toneClasses[metric.tone])}>
              <metric.icon size={22} />
            </div>
            <span className="rounded-full bg-white/8 px-2.5 py-1 text-xs text-slate-300">{metric.change}</span>
          </div>
          <p className="mt-5 text-sm text-slate-400">{metric.label}</p>
          <div className="mt-2 flex items-end gap-2">
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.35, delay: index * 0.07 + 0.15 }}
              className="text-3xl font-black tracking-tight"
            >
              {metric.displayValue}
            </motion.p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

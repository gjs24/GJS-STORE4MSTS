"use client";

import { motion } from "framer-motion";
import { Download, TrainFront } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { railwayCards } from "@/lib/admin-dashboard-data";
import { cn } from "@/lib/utils";

export function RailwayAssetCards() {
  return (
    <div className="grid gap-4 xl:grid-cols-3">
      {railwayCards.map((asset, index) => (
        <motion.div
          key={asset.title}
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: index * 0.08 }}
          whileHover={{ y: -5 }}
          className="glass-card overflow-hidden rounded-lg"
        >
          <div className={cn("relative flex aspect-[16/8] items-center justify-center bg-gradient-to-br", asset.accent)}>
            <div className="absolute inset-0 admin-grid-bg opacity-25" />
            <TrainFront className="relative h-16 w-16 text-white/80" />
            <Badge className="absolute left-4 top-4" variant="warning">{asset.category}</Badge>
          </div>
          <div className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-black">{asset.title}</h3>
                <p className="mt-1 text-sm text-slate-400">{asset.downloads} downloads</p>
              </div>
              <p className="text-lg font-black text-rail-amber">{asset.price}</p>
            </div>
            <Button className="mt-4 w-full">
              <Download size={16} /> Manage Download
            </Button>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

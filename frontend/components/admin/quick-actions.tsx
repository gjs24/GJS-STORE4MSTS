"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { quickActions } from "@/lib/admin-dashboard-data";

export function QuickActions() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {quickActions.map((action, index) => (
        <motion.div
          key={action.label}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 + index * 0.05 }}
          whileHover={{ y: -3 }}
        >
          <Link
            href={action.href || "/admin-dashboard"}
            className="glass-card flex items-center gap-3 rounded-lg p-4 text-left transition hover:border-rail-red/40"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded bg-rail-red/18 text-red-100 ring-1 ring-rail-red/30">
              <action.icon size={18} />
            </span>
            <span className="font-semibold text-white">{action.label}</span>
          </Link>
        </motion.div>
      ))}
    </div>
  );
}

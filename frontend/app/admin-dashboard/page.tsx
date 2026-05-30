"use client";

import { motion } from "framer-motion";
import { AdminLoginNote } from "@/components/admin-login-note";
import { AdminLayout } from "@/components/admin-table";
import {
  DownloadsAnalyticsChart,
  MonthlyRevenueChart,
  OrdersDonutChart,
  SalesOverviewChart
} from "@/components/admin/dashboard-charts";
import { DashboardStatCard } from "@/components/admin/dashboard-stat-card";
import { LatestOrdersTable, RecentUsersTable, TopDownloadedAssetsTable } from "@/components/admin/dashboard-tables";
import { QuickActions } from "@/components/admin/quick-actions";
import { RailwayAssetCards } from "@/components/admin/railway-asset-cards";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { metrics } from "@/lib/admin-dashboard-data";

export default function AdminDashboardPage() {
  return (
    <AdminLayout title="Dashboard">
      <AdminLoginNote />

      <div className="space-y-6">
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="glass-card relative overflow-hidden rounded-lg p-6 md:p-8"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_18%,rgba(239,59,45,.30),transparent_32%),linear-gradient(120deg,rgba(255,138,31,.12),transparent_42%)]" />
          <div className="absolute inset-0 admin-grid-bg opacity-20" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <Badge variant="warning">Premium Admin Console</Badge>
              <h2 className="mt-4 max-w-4xl text-3xl font-black tracking-tight md:text-5xl">
                GJS PRODUCTION - MSTS-GJS Store Admin
              </h2>
              <p className="mt-4 max-w-2xl text-slate-300">
                Monitor railway asset sales, downloads, users, orders, and marketplace growth from one cinematic command center.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button>Upload New Asset</Button>
              <Button variant="secondary">View Reports</Button>
            </div>
          </div>
        </motion.section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
          {metrics.map((metric, index) => (
            <DashboardStatCard key={metric.label} metric={metric} index={index} />
          ))}
        </section>

        <QuickActions />

        <section>
          <div className="mb-4 flex items-end justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-rail-amber">Featured Railway Assets</p>
              <h2 className="text-2xl font-black">Marketplace highlights</h2>
            </div>
            <Button variant="ghost">Manage featured</Button>
          </div>
          <RailwayAssetCards />
        </section>

        <section className="grid gap-5 xl:grid-cols-[1.45fr_.85fr]">
          <SalesOverviewChart />
          <OrdersDonutChart />
        </section>

        <section className="grid gap-5 xl:grid-cols-2">
          <DownloadsAnalyticsChart />
          <MonthlyRevenueChart />
        </section>

        <section className="grid gap-5 xl:grid-cols-[1.35fr_.8fr]">
          <LatestOrdersTable />
          <RecentUsersTable />
        </section>

        <TopDownloadedAssetsTable />
      </div>
    </AdminLayout>
  );
}

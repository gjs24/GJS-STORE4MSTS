"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { BadgeIndianRupee, Boxes, Download, Eye, ShoppingCart, Users } from "lucide-react";
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
import { adminGet, fallbackStats, type AdminOrder, type AdminStats, type AdminUser } from "@/lib/admin-api";
import { salesOverview, type AdminOrderRow, type DashboardMetric, type RailwayCard, type SalesPoint, type TopAsset, type UserRow } from "@/lib/admin-dashboard-data";
import type { Asset } from "@/lib/api";

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-IN").format(value);
}

function formatMoney(value: string | number) {
  return `INR ${new Intl.NumberFormat("en-IN").format(Number(value) || 0)}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short" }).format(new Date(value));
}

function orderStatusLabel(status: AdminOrder["status"]): AdminOrderRow["status"] {
  if (status === "PAID") return "Paid";
  if (status === "PENDING") return "Pending";
  return "Failed";
}

function monthIndex(value: string) {
  return new Date(value).getMonth();
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats>(fallbackStats);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [orderCount, setOrderCount] = useState(0);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);

  useEffect(() => {
    Promise.all([
      adminGet<AdminStats>("/admin/stats/", fallbackStats),
      adminGet<any>("/admin/orders/", {
        count: 0,
        next: null,
        previous: null,
        results: [],
      }),
      adminGet<AdminUser[]>("/admin/users/", []),
      adminGet<Asset[]>("/admin/assets/", [])
    ]).then(([nextStats, nextOrders, nextUsers, nextAssets]) => {
      setStats(nextStats);
      setOrders(nextOrders.results || []);
      setOrderCount(typeof nextOrders.count === "number" ? nextOrders.count : (nextOrders.results?.length || 0));
      setUsers(nextUsers);
      setAssets(nextAssets);
    });
  }, []);

  const metrics = useMemo<DashboardMetric[]>(() => [
    { label: "Total Users", value: stats.total_users, displayValue: formatNumber(stats.total_users), change: stats.total_users ? "Live user count" : "Start phase", tone: "cyan", icon: Users },
    { label: "Total Orders", value: orderCount, displayValue: formatNumber(orderCount), change: orderCount ? "Live orders" : "No orders yet", tone: "amber", icon: ShoppingCart },
    { label: "Total Sales", value: Number(stats.total_sales) || 0, displayValue: formatMoney(stats.total_sales), change: Number(stats.total_sales) ? "Paid revenue" : "No revenue yet", tone: "red", icon: BadgeIndianRupee },
    { label: "Total Downloads", value: stats.total_downloads, displayValue: formatNumber(stats.total_downloads), change: stats.total_downloads ? "Live downloads" : "No downloads yet", tone: "emerald", icon: Download },
    { label: "Total Assets", value: stats.asset_count, displayValue: formatNumber(stats.asset_count), change: stats.asset_count ? `${stats.featured_assets} featured` : "No assets yet", tone: "amber", icon: Boxes },
    { label: "Page Views", value: 0, displayValue: "0", change: "Not tracked", tone: "cyan", icon: Eye }
  ], [orderCount, stats]);

  const monthlyData = useMemo<SalesPoint[]>(() => {
    const months = salesOverview.map((point) => ({ ...point }));
    orders.forEach((order) => {
      const index = monthIndex(order.created_at);
      if (index >= 0 && months[index]) {
        months[index].sales += 1;
        if (order.status === "PAID") {
          months[index].revenue += Number(order.amount) || 0;
        }
      }
    });
    if (stats.total_downloads && months[new Date().getMonth()]) {
      months[new Date().getMonth()].downloads = stats.total_downloads;
    }
    return months;
  }, [orders, stats.total_downloads]);

  const statusData = useMemo(() => {
    const paid = orders.filter((order) => order.status === "PAID").length;
    const pending = orders.filter((order) => order.status === "PENDING").length;
    const failed = orders.filter((order) => order.status === "FAILED" || order.status === "REFUNDED").length;
    const total = paid + pending + failed;
    const pct = (value: number) => (total ? Math.round((value / total) * 100) : 0);
    return [
      { name: "Paid", value: pct(paid), color: "#22c55e" },
      { name: "Pending", value: pct(pending), color: "#ff8a1f" },
      { name: "Failed", value: pct(failed), color: "#ef3b2d" }
    ];
  }, [orders]);

  const latestOrderRows = useMemo(() => orders.slice(0, 5).map((order) => ({
    id: `#${order.id}`,
    user: order.user?.username || "User",
    asset: order.asset?.title || "Asset",
    amount: `${order.currency} ${order.amount}`,
    status: orderStatusLabel(order.status),
    date: formatDate(order.created_at)
  })), [orders]);

  const recentUserRows = useMemo<UserRow[]>(() => users.slice(0, 4).map((user) => ({
    name: `${user.first_name} ${user.last_name}`.trim() || user.username,
    email: user.email,
    city: "Registered",
    purchases: orders.filter((order) => order.user?.id === user.id && order.status === "PAID").length,
    joined: formatDate(user.date_joined)
  })), [orders, users]);

  const topAssetRows = useMemo<TopAsset[]>(() => [...assets]
    .sort((a, b) => b.download_count - a.download_count)
    .slice(0, 5)
    .map((asset) => ({
      name: asset.title,
      category: asset.category?.name || "Asset",
      simulator: asset.simulator_type.replace("_", " "),
      downloads: asset.download_count,
      revenue: formatMoney(orders.filter((order) => order.asset?.id === asset.id && order.status === "PAID").reduce((sum, order) => sum + (Number(order.amount) || 0), 0)),
      status: asset.is_featured ? "Featured" : asset.is_free ? "Free" : "Premium"
    })), [assets, orders]);

  const featuredCards = useMemo<RailwayCard[]>(() => assets
    .filter((asset) => asset.is_featured)
    .slice(0, 3)
    .map((asset) => ({
      title: asset.title,
      category: asset.category?.name || "Asset",
      price: asset.is_free ? "Free" : `INR ${asset.price}`,
      downloads: formatNumber(asset.download_count),
      accent: "from-red-500/35 to-orange-400/10"
    })), [assets]);

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
          <RailwayAssetCards assets={featuredCards} />
        </section>

        <section className="grid gap-5 xl:grid-cols-[1.45fr_.85fr]">
          <SalesOverviewChart data={monthlyData} />
          <OrdersDonutChart data={statusData} />
        </section>

        <section className="grid gap-5 xl:grid-cols-2">
          <DownloadsAnalyticsChart data={monthlyData} />
          <MonthlyRevenueChart data={monthlyData} />
        </section>

        <section className="grid gap-5 xl:grid-cols-[1.35fr_.8fr]">
          <LatestOrdersTable orders={latestOrderRows} />
          <RecentUsersTable users={recentUserRows} />
        </section>

        <TopDownloadedAssetsTable assets={topAssetRows} />
      </div>
    </AdminLayout>
  );
}

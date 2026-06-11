"use client";

import { Download, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  latestOrders,
  recentUsers,
  topAssets,
  type AdminOrderRow,
  type TopAsset,
  type UserRow
} from "@/lib/admin-dashboard-data";

type BadgeTone = "default" | "success" | "warning" | "muted";

function statusVariant(status: string): BadgeTone {
  if (status === "Paid" || status === "Featured") return "success";
  if (status === "Pending" || status === "Premium") return "warning";
  if (status === "Failed") return "default";
  return "muted";
}

export function LatestOrdersTable({ orders = latestOrders }: { orders?: AdminOrderRow[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Latest Orders</CardTitle>
        <Button variant="ghost" size="sm">View all <ExternalLink size={14} /></Button>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full min-w-[620px] text-left text-sm">
          <thead className="text-xs uppercase text-slate-500">
            <tr>
              <th className="py-3">Order</th>
              <th>User</th>
              <th>Asset</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {orders.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-500">
                  No orders yet. Paid orders will appear here after checkout.
                </td>
              </tr>
            ) : null}
            {orders.map((order) => (
              <tr key={order.id} className="text-slate-300 hover:bg-white/[0.03]">
                <td className="py-3 font-semibold text-white">{order.id}</td>
                <td>{order.user}</td>
                <td>{order.asset}</td>
                <td>{order.amount}</td>
                <td><Badge variant={statusVariant(order.status)}>{order.status}</Badge></td>
                <td>{order.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

export function RecentUsersTable({ users = recentUsers }: { users?: UserRow[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Users</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {users.length === 0 ? (
          <div className="rounded border border-white/10 bg-white/[0.03] p-5 text-sm text-slate-500">
            No registered users yet.
          </div>
        ) : null}
        {users.map((user) => (
          <div key={user.email || user.name} className="flex items-center justify-between gap-3 rounded border border-white/10 bg-white/[0.03] p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded bg-gradient-to-br from-rail-red to-rail-amber text-sm font-black">
                {user.name.split(" ").map((part) => part[0]).join("").slice(0, 2)}
              </div>
              <div>
                <p className="font-semibold">{user.name}</p>
                <p className="text-xs text-slate-500">{user.city} / {user.joined}</p>
              </div>
            </div>
            <Badge variant="muted">{user.purchases} purchases</Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function TopDownloadedAssetsTable({ assets = topAssets }: { assets?: TopAsset[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Downloaded Assets</CardTitle>
        <Button variant="secondary" size="sm"><Download size={14} /> Export</Button>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="text-xs uppercase text-slate-500">
            <tr>
              <th className="py-3">Asset</th>
              <th>Category</th>
              <th>Simulator</th>
              <th>Downloads</th>
              <th>Revenue</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {assets.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-500">
                  No asset downloads yet. Upload assets to start tracking downloads.
                </td>
              </tr>
            ) : null}
            {assets.map((asset) => (
              <tr key={asset.name} className="text-slate-300 hover:bg-white/[0.03]">
                <td className="py-3 font-semibold text-white">{asset.name}</td>
                <td>{asset.category}</td>
                <td>{asset.simulator}</td>
                <td>{asset.downloads.toLocaleString("en-IN")}</td>
                <td>{asset.revenue}</td>
                <td><Badge variant={statusVariant(asset.status)}>{asset.status}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

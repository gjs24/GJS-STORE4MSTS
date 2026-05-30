"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { orderStatus, salesOverview } from "@/lib/admin-dashboard-data";

const tooltipStyle = {
  background: "rgba(5,7,11,.94)",
  border: "1px solid rgba(255,255,255,.12)",
  borderRadius: 8,
  color: "#fff"
};

export function SalesOverviewChart() {
  return (
    <Card className="min-h-[390px]">
      <CardHeader>
        <div>
          <CardTitle>Sales Overview</CardTitle>
          <p className="mt-1 text-sm text-slate-400">Premium asset revenue and order momentum</p>
        </div>
      </CardHeader>
      <CardContent className="h-[310px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={salesOverview}>
            <CartesianGrid stroke="rgba(255,255,255,.07)" vertical={false} />
            <XAxis dataKey="month" stroke="#64748b" tickLine={false} axisLine={false} />
            <YAxis stroke="#64748b" tickLine={false} axisLine={false} />
            <Tooltip contentStyle={tooltipStyle} />
            <Line type="monotone" dataKey="sales" stroke="#ef3b2d" strokeWidth={3} dot={false} />
            <Line type="monotone" dataKey="revenue" stroke="#ff8a1f" strokeWidth={3} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function OrdersDonutChart() {
  return (
    <Card className="min-h-[390px]">
      <CardHeader>
        <div>
          <CardTitle>Orders</CardTitle>
          <p className="mt-1 text-sm text-slate-400">Payment status split</p>
        </div>
      </CardHeader>
      <CardContent className="h-[310px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={orderStatus} dataKey="value" nameKey="name" innerRadius={72} outerRadius={112} paddingAngle={4}>
              {orderStatus.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} />
          </PieChart>
        </ResponsiveContainer>
        <div className="-mt-10 grid grid-cols-3 gap-2 text-center text-xs text-slate-400">
          {orderStatus.map((item) => (
            <div key={item.name}>
              <span className="mx-auto mb-1 block h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
              {item.name} {item.value}%
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function DownloadsAnalyticsChart() {
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Downloads Analytics</CardTitle>
          <p className="mt-1 text-sm text-slate-400">Asset downloads across the year</p>
        </div>
      </CardHeader>
      <CardContent className="h-[270px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={salesOverview}>
            <defs>
              <linearGradient id="downloadsGradient" x1="0" x2="0" y1="0" y2="1">
                <stop offset="5%" stopColor="#39c7ff" stopOpacity={0.45} />
                <stop offset="95%" stopColor="#39c7ff" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(255,255,255,.07)" vertical={false} />
            <XAxis dataKey="month" stroke="#64748b" tickLine={false} axisLine={false} />
            <YAxis stroke="#64748b" tickLine={false} axisLine={false} />
            <Tooltip contentStyle={tooltipStyle} />
            <Area type="monotone" dataKey="downloads" stroke="#39c7ff" fill="url(#downloadsGradient)" strokeWidth={3} />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function MonthlyRevenueChart() {
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Monthly Revenue</CardTitle>
          <p className="mt-1 text-sm text-slate-400">Revenue graph for premium assets</p>
        </div>
      </CardHeader>
      <CardContent className="h-[270px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={salesOverview}>
            <CartesianGrid stroke="rgba(255,255,255,.07)" vertical={false} />
            <XAxis dataKey="month" stroke="#64748b" tickLine={false} axisLine={false} />
            <YAxis stroke="#64748b" tickLine={false} axisLine={false} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="revenue" radius={[6, 6, 0, 0]} fill="#ff8a1f" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

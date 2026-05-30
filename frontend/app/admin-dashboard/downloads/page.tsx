"use client";

import { Download, Gauge, HardDrive, ShieldCheck, type LucideIcon } from "lucide-react";
import { AdminLoginNote } from "@/components/admin-login-note";
import { AdminLayout } from "@/components/admin-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const downloadStats: Array<[string, string, LucideIcon]> = [
  ["Active Downloads", "128", Download],
  ["Bandwidth Today", "842 GB", Gauge],
  ["Cache Stored", "2.8 TB", HardDrive],
  ["Verified Files", "98.7%", ShieldCheck]
];

const downloadRows = [
  { asset: "WAP-7 Locomotive", user: "Aarav Sharma", size: "485 MB", progress: 100, status: "Completed" },
  { asset: "Bhopal-Jabalpur Route", user: "Rohan Verma", size: "1.8 GB", progress: 64, status: "Downloading" },
  { asset: "ICF Coach Pack", user: "Meera Nair", size: "340 MB", progress: 100, status: "Verified" },
  { asset: "Premium Horn Sounds", user: "Kabir Singh", size: "160 MB", progress: 41, status: "Paused" }
];

export default function AdminDownloadsPage() {
  return (
    <AdminLayout title="Downloads">
      <AdminLoginNote />
      <div className="grid gap-4 md:grid-cols-4">
        {downloadStats.map(([label, value, Icon]) => (
          <Card key={label}>
            <CardContent className="p-5">
              <Icon className="text-rail-amber" />
              <p className="mt-4 text-sm text-slate-400">{label}</p>
              <p className="mt-1 text-2xl font-black">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card className="mt-5">
        <CardHeader>
          <CardTitle>Download Queue</CardTitle>
          <Button variant="secondary" size="sm">Export logs</Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {downloadRows.map((row) => (
            <div key={`${row.asset}-${row.user}`} className="rounded border border-white/10 bg-white/[0.03] p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-bold">{row.asset}</p>
                  <p className="text-sm text-slate-400">{row.user} / {row.size}</p>
                </div>
                <Badge variant={row.status === "Completed" || row.status === "Verified" ? "success" : row.status === "Paused" ? "warning" : "default"}>
                  {row.status}
                </Badge>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded bg-black/45">
                <div className="h-full rounded bg-gradient-to-r from-rail-red to-rail-amber" style={{ width: `${row.progress}%` }} />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </AdminLayout>
  );
}

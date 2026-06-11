"use client";

import { Download, Gauge, HardDrive, ShieldCheck, type LucideIcon } from "lucide-react";
import { AdminLoginNote } from "@/components/admin-login-note";
import { AdminLayout } from "@/components/admin-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const downloadStats: Array<[string, string, LucideIcon]> = [
  ["Active Downloads", "0", Download],
  ["Bandwidth Today", "0 GB", Gauge],
  ["Cache Stored", "0 GB", HardDrive],
  ["Verified Files", "0", ShieldCheck]
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
        <CardContent>
          <div className="rounded border border-white/10 bg-white/[0.03] p-5 text-sm text-slate-500">
            No download activity yet. Customer download logs will appear after users download assets.
          </div>
        </CardContent>
      </Card>
    </AdminLayout>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Download, FileDown, Globe, HardDrive, ShieldCheck, Users } from "lucide-react";
import { AdminLoginNote } from "@/components/admin-login-note";
import { AdminLayout } from "@/components/admin-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { adminGet } from "@/lib/admin-api";
import type { DownloadLog } from "@/lib/store-api";

export default function AdminDownloadsPage() {
  const [logs, setLogs] = useState<DownloadLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminGet<DownloadLog[]>("/admin/download-history/", [])
      .then(setLogs)
      .finally(() => setLoading(false));
  }, []);

  const totalDownloads = logs.length;
  const uniqueUsers = new Set(logs.map((log) => log.user?.id || log.user?.username).filter(Boolean)).size;
  const uniqueAssets = new Set(logs.map((log) => log.asset?.id).filter(Boolean)).size;

  const todayStr = new Date().toDateString();
  const downloadsToday = logs.filter((log) => new Date(log.downloaded_at).toDateString() === todayStr).length;

  function exportCSV() {
    if (!logs.length) return;
    const headers = ["Log ID", "Asset Title", "Asset Slug", "Customer", "Email", "IP Address", "Downloaded At"];
    const rows = logs.map((log) => [
      log.id,
      `"${(log.asset?.title || "").replace(/"/g, '""')}"`,
      log.asset?.slug || "",
      log.user?.username || "Anonymous",
      log.user?.email || "",
      log.ip_address || "N/A",
      log.downloaded_at,
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `gjs_download_logs_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  return (
    <AdminLayout title="Downloads">
      <AdminLoginNote />
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <Download className="text-rail-amber" size={24} />
            <p className="mt-3 text-sm text-slate-400">Total Recorded Downloads</p>
            <p className="mt-1 text-2xl font-black text-white">{totalDownloads}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <HardDrive className="text-emerald-400" size={24} />
            <p className="mt-3 text-sm text-slate-400">Downloads Today</p>
            <p className="mt-1 text-2xl font-black text-white">{downloadsToday}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <Users className="text-cyan-400" size={24} />
            <p className="mt-3 text-sm text-slate-400">Unique Users</p>
            <p className="mt-1 text-2xl font-black text-white">{uniqueUsers}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <ShieldCheck className="text-rail-red" size={24} />
            <p className="mt-3 text-sm text-slate-400">Assets Downloaded</p>
            <p className="mt-1 text-2xl font-black text-white">{uniqueAssets}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Download Activity Logs</CardTitle>
          <Button variant="secondary" size="sm" onClick={exportCSV} disabled={logs.length === 0} className="gap-2">
            <FileDown size={15} /> Export logs (CSV)
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="p-6 text-center text-sm text-slate-400">Loading download logs...</div>
          ) : logs.length === 0 ? (
            <div className="rounded border border-white/10 bg-white/[0.03] p-5 text-sm text-slate-500">
              No download activity recorded yet. Logs will appear after users download assets.
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-white/10">
              <div className="grid gap-2 bg-white/10 p-3 text-xs uppercase tracking-wider text-slate-400 md:grid-cols-[60px_1.5fr_1.2fr_120px_140px]">
                <span>ID</span>
                <span>Asset</span>
                <span>User</span>
                <span>IP Address</span>
                <span>Timestamp</span>
              </div>
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="grid items-center gap-2 border-t border-white/10 bg-white/[0.02] p-3 text-sm hover:bg-white/[0.04] md:grid-cols-[60px_1.5fr_1.2fr_120px_140px]"
                >
                  <span className="font-mono text-xs text-slate-400">#{log.id}</span>
                  <div>
                    <span className="block font-semibold text-white">{log.asset?.title || "Asset"}</span>
                    <span className="text-xs text-rail-amber">{log.asset?.simulator_type || ""}</span>
                  </div>
                  <div>
                    <span className="block text-slate-200">{log.user?.username || "User"}</span>
                    <span className="text-xs text-slate-500">{log.user?.email || "No email"}</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-mono text-xs text-slate-400">
                    <Globe size={13} className="text-slate-500" />
                    {log.ip_address || "N/A"}
                  </div>
                  <span className="text-xs text-slate-400">
                    {new Date(log.downloaded_at).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </AdminLayout>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, FileDown, Globe, HardDrive, Search, ShieldCheck, Users, X } from "lucide-react";
import { AdminLoginNote } from "@/components/admin-login-note";
import { AdminLayout } from "@/components/admin-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { adminGet } from "@/lib/admin-api";
import type { DownloadLog } from "@/lib/store-api";

export default function AdminDownloadsPage() {
  const [logs, setLogs] = useState<DownloadLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [page, setPage] = useState(1);
  const itemsPerPage = 15;

  useEffect(() => {
    adminGet<DownloadLog[]>("/admin/download-history/", [])
      .then(setLogs)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search, sortOrder]);

  const totalDownloads = logs.length;
  const uniqueUsers = new Set(logs.map((log) => log.user?.id || log.user?.username).filter(Boolean)).size;
  const uniqueAssets = new Set(logs.map((log) => log.asset?.id).filter(Boolean)).size;

  const todayStr = new Date().toDateString();
  const downloadsToday = logs.filter((log) => new Date(log.downloaded_at).toDateString() === todayStr).length;

  const filteredLogs = useMemo(() => {
    let result = [...logs];
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (log) =>
          (log.asset?.title || "").toLowerCase().includes(q) ||
          (log.user?.username || "").toLowerCase().includes(q) ||
          (log.user?.email || "").toLowerCase().includes(q) ||
          (log.ip_address || "").toLowerCase().includes(q) ||
          String(log.id).includes(q)
      );
    }
    if (sortOrder === "oldest") {
      result.sort((a, b) => new Date(a.downloaded_at).getTime() - new Date(b.downloaded_at).getTime());
    } else {
      result.sort((a, b) => new Date(b.downloaded_at).getTime() - new Date(a.downloaded_at).getTime());
    }
    return result;
  }, [logs, search, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / itemsPerPage));
  const currentPage = Math.min(page, totalPages);
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredLogs.slice(start, start + itemsPerPage);
  }, [filteredLogs, currentPage, itemsPerPage]);

  function exportCSV() {
    if (!filteredLogs.length) return;
    const headers = ["Log ID", "Asset Title", "Asset Slug", "Customer", "Email", "IP Address", "Downloaded At"];
    const rows = filteredLogs.map((log) => [
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
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Download Activity Logs</CardTitle>
            <p className="mt-1 text-xs text-slate-400">
              Complete chronological audit of user file access & delivery
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={exportCSV} disabled={filteredLogs.length === 0} className="gap-2 self-start sm:self-auto">
            <FileDown size={15} /> Export logs ({filteredLogs.length})
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search & Sort Bar */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 sm:max-w-md">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by asset, user, email, or IP..."
                className="w-full rounded-lg border border-white/10 bg-black/40 py-2 pl-9 pr-8 text-sm text-white outline-none focus:border-rail-red"
              />
              {search ? (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                >
                  <X size={14} />
                </button>
              ) : null}
            </div>

            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as "newest" | "oldest")}
              className="rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-xs font-semibold text-white outline-none focus:border-rail-red self-start sm:self-auto"
            >
              <option value="newest">Sort: Newest First</option>
              <option value="oldest">Sort: Oldest First</option>
            </select>
          </div>

          {loading ? (
            <div className="p-6 text-center text-sm text-slate-400">Loading download logs...</div>
          ) : filteredLogs.length === 0 ? (
            <div className="rounded border border-white/10 bg-white/[0.03] p-5 text-sm text-slate-500">
              {search ? "No download logs match your search term." : "No download activity recorded yet. Logs will appear after users download assets."}
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
              {paginatedLogs.map((log) => (
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

          {/* Pagination Controls */}
          {!loading && filteredLogs.length > 0 ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-t border-white/10 pt-4">
              <p className="text-xs text-slate-400">
                Showing <span className="font-semibold text-white">{(currentPage - 1) * itemsPerPage + 1}</span>–
                <span className="font-semibold text-white">{Math.min(currentPage * itemsPerPage, filteredLogs.length)}</span> of{" "}
                <span className="font-semibold text-white">{filteredLogs.length}</span> download events
              </p>

              {totalPages > 1 ? (
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={currentPage <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="h-8 px-3 text-xs"
                  >
                    Previous
                  </Button>
                  <div className="flex items-center gap-1 text-xs text-slate-300">
                    <span className="rounded bg-white/10 px-2.5 py-1 font-bold text-white">
                      {currentPage}
                    </span>
                    <span className="text-slate-500">/</span>
                    <span className="px-1 text-slate-400">{totalPages}</span>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={currentPage >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="h-8 px-3 text-xs"
                  >
                    Next
                  </Button>
                </div>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </AdminLayout>
  );
}

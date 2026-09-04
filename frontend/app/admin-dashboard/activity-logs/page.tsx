"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Activity,
  History,
  Package,
  Search,
  Settings,
  ShoppingCart,
  User,
  X
} from "lucide-react";
import { AdminLoginNote } from "@/components/admin-login-note";
import { AdminLayout } from "@/components/admin-table";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { adminGet, type AdminActivityLog } from "@/lib/admin-api";

function getActionTone(action: string) {
  const lower = action.toLowerCase();
  if (lower.includes("approved") || lower.includes("created") || lower.includes("activated") || lower.includes("granted")) {
    return { bg: "bg-emerald-500/15", text: "text-emerald-300", border: "border-emerald-500/30" };
  }
  if (lower.includes("rejected") || lower.includes("deleted") || lower.includes("deactivated") || lower.includes("revoked") || lower.includes("failed")) {
    return { bg: "bg-rose-500/15", text: "text-rose-300", border: "border-rose-500/30" };
  }
  if (lower.includes("price") || lower.includes("settings") || lower.includes("deal") || lower.includes("edited")) {
    return { bg: "bg-amber-500/15", text: "text-amber-300", border: "border-amber-500/30" };
  }
  return { bg: "bg-cyan-500/15", text: "text-cyan-300", border: "border-cyan-500/30" };
}

function getActionIcon(action: string) {
  const lower = action.toLowerCase();
  if (lower.includes("order")) return ShoppingCart;
  if (lower.includes("product") || lower.includes("price") || lower.includes("file") || lower.includes("deal")) return Package;
  if (lower.includes("user") || lower.includes("staff")) return User;
  if (lower.includes("setting") || lower.includes("popup")) return Settings;
  return Activity;
}

function ActivityLogsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [logs, setLogs] = useState<AdminActivityLog[]>([]);
  const [query, setQuery] = useState(searchParams.get("search") || "");
  const [filterAction, setFilterAction] = useState(searchParams.get("action") || "all");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [page, setPage] = useState(1);
  const itemsPerPage = 15;
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setPage(1);
  }, [query, filterAction, sortOrder]);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    const queryParts: string[] = [];
    if (filterAction !== "all") queryParts.push(`action=${encodeURIComponent(filterAction)}`);
    if (query.trim()) queryParts.push(`search=${encodeURIComponent(query.trim())}`);
    if (sortOrder !== "newest") queryParts.push(`ordering=${sortOrder}`);

    const path = queryParts.length ? `/admin/activity-logs/?${queryParts.join("&")}` : "/admin/activity-logs/";
    try {
      const data = await adminGet<any>(path, []);
      const logList = Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];
      setLogs(logList);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [query, filterAction, sortOrder]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const stats = useMemo(() => {
    const total = logs.length;
    const orders = logs.filter((l) => l.action.toLowerCase().includes("order")).length;
    const products = logs.filter((l) => l.action.toLowerCase().includes("product") || l.action.toLowerCase().includes("price")).length;
    const users = logs.filter((l) => l.action.toLowerCase().includes("user") || l.action.toLowerCase().includes("staff")).length;
    return { total, orders, products, users };
  }, [logs]);

  const sortedLogs = useMemo(() => {
    const list = [...logs];
    if (sortOrder === "oldest") {
      list.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    } else {
      list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    return list;
  }, [logs, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(sortedLogs.length / itemsPerPage));
  const currentPage = Math.min(page, totalPages);
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedLogs.slice(start, start + itemsPerPage);
  }, [sortedLogs, currentPage, itemsPerPage]);

  return (
    <div className="space-y-6">
      <AdminLoginNote />

      {/* Summary KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card className="glass-card">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Audit Logs</span>
              <History size={20} className="text-cyan-400" />
            </div>
            <p className="mt-3 text-3xl font-black text-white">{stats.total}</p>
            <p className="mt-1 text-xs text-slate-400">Tracked admin actions</p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Order Actions</span>
              <ShoppingCart size={20} className="text-emerald-400" />
            </div>
            <p className="mt-3 text-3xl font-black text-white">{stats.orders}</p>
            <p className="mt-1 text-xs text-slate-400">Approvals & rejections</p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Catalog Actions</span>
              <Package size={20} className="text-rail-amber" />
            </div>
            <p className="mt-3 text-3xl font-black text-white">{stats.products}</p>
            <p className="mt-1 text-xs text-slate-400">Asset creations & price edits</p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Account Actions</span>
              <User size={20} className="text-rail-red" />
            </div>
            <p className="mt-3 text-3xl font-black text-white">{stats.users}</p>
            <p className="mt-1 text-xs text-slate-400">User & staff changes</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: "all", label: "All Logs" },
            { id: "order", label: "Orders" },
            { id: "product", label: "Products" },
            { id: "user", label: "Users" },
            { id: "review", label: "Reviews" },
            { id: "settings", label: "Settings" },
          ].map((tab) => {
            const isActive = filterAction === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterAction(tab.id)}
                className={`rounded-lg px-3.5 py-2 text-xs font-bold uppercase tracking-wider transition ${
                  isActive
                    ? "bg-rail-red text-white red-glow"
                    : "border border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/10 hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as "newest" | "oldest")}
            className="rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-xs font-semibold text-white outline-none focus:border-rail-red"
          >
            <option value="newest">Sort: Newest First</option>
            <option value="oldest">Sort: Oldest First</option>
          </select>

          <div className="relative w-full sm:w-72">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search action or message..."
              className="w-full rounded-lg border border-white/10 bg-black/40 py-2 pl-9 pr-8 text-sm text-white outline-none focus:border-rail-red"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
              >
                <X size={14} />
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {/* Activity Log List */}
      <div className="overflow-hidden rounded-lg border border-white/10 bg-white/[0.02]">
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-400">Loading audit history...</div>
        ) : sortedLogs.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-400">
            {query || filterAction !== "all"
              ? "No activity logs match your search or filter."
              : "No administrative activity recorded yet."}
          </div>
        ) : (
          paginatedLogs.map((log) => {
            const tone = getActionTone(log.action);
            const ActionIcon = getActionIcon(log.action);
            return (
              <div
                key={log.id}
                className="flex items-start gap-4 border-t border-white/10 p-4 transition hover:bg-white/[0.03] first:border-t-0"
              >
                <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${tone.bg} ${tone.border} ${tone.text}`}>
                  <ActionIcon size={18} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm">{log.action}</span>
                      {log.target_type ? (
                        <span className="rounded bg-white/10 px-2 py-0.5 text-[10px] font-mono text-slate-300">
                          {log.target_type} {log.target_id ? `#${log.target_id}` : ""}
                        </span>
                      ) : null}
                    </div>

                    <span className="text-xs text-slate-400">
                      {new Date(log.created_at).toLocaleString("en-IN", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </span>
                  </div>

                  <p className="mt-1 text-sm text-slate-300">{log.message}</p>

                  <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                    <span>Performed by:</span>
                    <span className="font-semibold text-slate-300">
                      {log.actor?.username || "System Automation"}
                    </span>
                    {log.actor?.email ? (
                      <span>({log.actor.email})</span>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination Controls */}
      {!loading && sortedLogs.length > 0 ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-t border-white/10 pt-4">
          <p className="text-xs text-slate-400">
            Showing <span className="font-semibold text-white">{(currentPage - 1) * itemsPerPage + 1}</span>–
            <span className="font-semibold text-white">{Math.min(currentPage * itemsPerPage, sortedLogs.length)}</span> of{" "}
            <span className="font-semibold text-white">{sortedLogs.length}</span> audit logs
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
    </div>
  );
}

export default function AdminActivityLogsPage() {
  return (
    <AdminLayout title="Activity Logs & Audit">
      <Suspense fallback={<div className="p-8 text-center text-slate-400">Loading audit console...</div>}>
        <ActivityLogsContent />
      </Suspense>
    </AdminLayout>
  );
}

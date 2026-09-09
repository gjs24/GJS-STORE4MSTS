"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Activity,
  AlertCircle,
  Calendar,
  Check,
  CheckSquare,
  Clock,
  Download,
  FileSpreadsheet,
  History,
  Package,
  RotateCcw,
  Search,
  Settings,
  ShoppingCart,
  Square,
  Trash2,
  User,
  X
} from "lucide-react";
import { AdminLoginNote } from "@/components/admin-login-note";
import { AdminLayout } from "@/components/admin-table";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { adminDelete, adminGet, type AdminActivityLog } from "@/lib/admin-api";

function getActionTone(action: string) {
  const lower = action.toLowerCase();
  if (lower.includes("approved") || lower.includes("created") || lower.includes("activated") || lower.includes("granted")) {
    return { bg: "bg-emerald-500/15", text: "text-emerald-300", border: "border-emerald-500/30" };
  }
  if (lower.includes("rejected") || lower.includes("deleted") || lower.includes("deactivated") || lower.includes("revoked") || lower.includes("failed") || lower.includes("purged")) {
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

function exportLogsToCsv(logs: AdminActivityLog[], timeframeLabel: string) {
  if (!logs || logs.length === 0) {
    alert("No activity logs available to export.");
    return;
  }

  const headers = [
    "Log ID",
    "Timestamp (UTC)",
    "Local Date & Time",
    "Action",
    "Target Type",
    "Target ID",
    "Message",
    "Actor Username",
    "Actor Email",
    "Actor Staff"
  ];

  const escapeCsv = (val: string | number | boolean | null | undefined) => {
    if (val === null || val === undefined) return '""';
    const s = String(val).replace(/"/g, '""');
    return `"${s}"`;
  };

  const rows = logs.map((log) => [
    escapeCsv(log.id),
    escapeCsv(log.created_at),
    escapeCsv(new Date(log.created_at).toLocaleString("en-IN")),
    escapeCsv(log.action),
    escapeCsv(log.target_type || ""),
    escapeCsv(log.target_id || ""),
    escapeCsv(log.message || ""),
    escapeCsv(log.actor?.username || "System Automation"),
    escapeCsv(log.actor?.email || ""),
    escapeCsv(log.actor?.is_staff ? "Yes" : "No")
  ]);

  const csvContent = [headers.map((h) => `"${h}"`).join(","), ...rows.map((r) => r.join(","))].join("\r\n");

  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const dateStr = new Date().toISOString().slice(0, 10);
  link.setAttribute("href", url);
  link.setAttribute("download", `msts_gjs_activity_logs_${timeframeLabel.replace(/\s+/g, "_").toLowerCase()}_${dateStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function ActivityLogsContent() {
  const searchParams = useSearchParams();

  const [logs, setLogs] = useState<AdminActivityLog[]>([]);
  const [query, setQuery] = useState(searchParams.get("search") || "");
  const [filterAction, setFilterAction] = useState(searchParams.get("action") || "all");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [timeframe, setTimeframe] = useState<"30" | "60" | "90" | "all">("30");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [page, setPage] = useState(1);
  const itemsPerPage = 15;
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    setPage(1);
    setSelectedIds([]);
  }, [query, filterAction, sortOrder, timeframe]);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    const queryParts: string[] = [];
    if (timeframe !== "all") {
      queryParts.push(`days=${timeframe}`);
    } else {
      queryParts.push("days=all");
    }
    if (filterAction !== "all") queryParts.push(`action=${encodeURIComponent(filterAction)}`);
    if (query.trim()) queryParts.push(`search=${encodeURIComponent(query.trim())}`);
    if (sortOrder !== "newest") queryParts.push(`ordering=${sortOrder}`);

    const path = `/admin/activity-logs/?${queryParts.join("&")}`;
    try {
      const data = await adminGet<any>(path, []);
      const logList = Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];
      setLogs(logList);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [query, filterAction, sortOrder, timeframe]);

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

  const allPaginatedSelected = paginatedLogs.length > 0 && paginatedLogs.every((l) => selectedIds.includes(l.id));

  const toggleSelectAllPage = () => {
    if (allPaginatedSelected) {
      setSelectedIds((prev) => prev.filter((id) => !paginatedLogs.some((l) => l.id === id)));
    } else {
      const pageIds = paginatedLogs.map((l) => l.id);
      setSelectedIds((prev) => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  const toggleSelectOne = (id: number) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  // Delete selected logs
  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Permanently delete ${selectedIds.length} selected activity log(s)? This cannot be undone.`)) {
      return;
    }
    setIsDeleting(true);
    setFeedback(null);
    try {
      const res = await adminDelete<{ detail: string; deleted_count: number }>("/admin/activity-logs/", { ids: selectedIds });
      setFeedback({
        type: "success",
        message: res?.detail || `Successfully deleted ${selectedIds.length} activity log(s).`
      });
      setSelectedIds([]);
      await loadLogs();
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: err.message || "Failed to delete selected logs."
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Purge logs older than X days
  const handlePurgeOlderThan = async (daysCount: number) => {
    const confirmed = window.confirm(
      `Are you sure you want to permanently delete all activity logs older than ${daysCount} days?\n\nTip: You can click "Export CSV" first to back up your logs before deleting.\n\nThis will free up database storage immediately.`
    );
    if (!confirmed) return;

    setIsDeleting(true);
    setFeedback(null);
    try {
      const res = await adminDelete<{ detail: string; deleted_count: number }>(`/admin/activity-logs/?older_than_days=${daysCount}`);
      setFeedback({
        type: "success",
        message: res?.detail || `Purged logs older than ${daysCount} days.`
      });
      setSelectedIds([]);
      await loadLogs();
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: err.message || "Failed to purge activity logs."
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Delete single log
  const handleDeleteSingle = async (id: number) => {
    if (!window.confirm(`Permanently delete activity log #${id}?`)) return;
    setIsDeleting(true);
    setFeedback(null);
    try {
      const res = await adminDelete<{ detail: string; deleted_count: number }>("/admin/activity-logs/", { ids: [id] });
      setFeedback({
        type: "success",
        message: res?.detail || `Deleted log #${id}.`
      });
      setSelectedIds((prev) => prev.filter((item) => item !== id));
      await loadLogs();
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: err.message || "Failed to delete log."
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Purge all logs
  const handlePurgeAll = async () => {
    const code = window.prompt("CAUTION: This will permanently delete ALL activity logs in the database.\n\nType DELETE to confirm:");
    if (code !== "DELETE") {
      if (code !== null) alert("Confirmation text did not match. Action cancelled.");
      return;
    }
    setIsDeleting(true);
    setFeedback(null);
    try {
      const res = await adminDelete<{ detail: string; deleted_count: number }>("/admin/activity-logs/?all=true");
      setFeedback({
        type: "success",
        message: res?.detail || "All activity logs have been permanently purged."
      });
      setSelectedIds([]);
      await loadLogs();
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: err.message || "Failed to purge all logs."
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const timeframeLabel =
    timeframe === "30" ? "Last 30 Days" : timeframe === "60" ? "Last 60 Days" : timeframe === "90" ? "Last 90 Days" : "All Time";

  return (
    <div className="space-y-6">
      <AdminLoginNote />

      {/* Storage Management & Actions Header */}
      <div className="flex flex-col gap-4 rounded-xl border border-white/10 bg-gradient-to-r from-slate-900/90 via-black/80 to-slate-900/90 p-5 backdrop-blur-md lg:flex-row lg:items-center lg:justify-between shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <History size={20} className="text-cyan-400" />
              Audit Log & Storage Controls
            </h2>
            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-bold text-emerald-300">
              {timeframeLabel}
            </span>
          </div>
          <p className="text-xs text-slate-400 max-w-2xl">
            Showing <strong className="text-slate-200">{timeframeLabel}</strong> data by default to prevent database storage bloat.
            You can export audit archives to CSV and purge older records at any time.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Export CSV Button */}
          <Button
            type="button"
            variant="secondary"
            onClick={() => exportLogsToCsv(sortedLogs, timeframeLabel)}
            disabled={sortedLogs.length === 0 || loading}
            className="border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 hover:text-emerald-200 text-xs font-semibold gap-2 h-9"
          >
            <Download size={15} />
            Export CSV ({sortedLogs.length})
          </Button>

          {/* Purge > 30 Days Button */}
          <Button
            type="button"
            variant="secondary"
            onClick={() => handlePurgeOlderThan(30)}
            disabled={isDeleting || loading}
            className="border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 hover:text-amber-200 text-xs font-semibold gap-2 h-9"
            title="Permanently remove logs older than 30 days to free storage"
          >
            <Trash2 size={15} />
            Purge &gt;30 Days Old
          </Button>

          {/* Purge All Emergency */}
          <Button
            type="button"
            variant="secondary"
            onClick={handlePurgeAll}
            disabled={isDeleting || loading || logs.length === 0}
            className="border-rose-500/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 hover:text-rose-200 text-xs font-semibold gap-1.5 h-9"
            title="Danger: Permanently delete all activity records"
          >
            Purge All
          </Button>

          {/* Refresh */}
          <Button
            type="button"
            variant="ghost"
            onClick={() => loadLogs()}
            disabled={loading}
            className="border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white h-9 px-3"
            title="Refresh logs"
          >
            <RotateCcw size={15} className={loading ? "animate-spin" : ""} />
          </Button>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback ? (
        <div
          className={`flex items-center justify-between rounded-lg border p-4 text-xs font-semibold transition ${
            feedback.type === "success"
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
              : "border-rose-500/40 bg-rose-500/10 text-rose-200"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === "success" ? <Check size={16} /> : <AlertCircle size={16} />}
            <span>{feedback.message}</span>
          </div>
          <button type="button" onClick={() => setFeedback(null)} className="text-slate-400 hover:text-white">
            <X size={14} />
          </button>
        </div>
      ) : null}

      {/* Summary KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card className="glass-card">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Audit Logs</span>
              <History size={20} className="text-cyan-400" />
            </div>
            <p className="mt-3 text-3xl font-black text-white">{stats.total}</p>
            <p className="mt-1 text-xs text-slate-400">In {timeframeLabel.toLowerCase()}</p>
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

      {/* Timeframe & Action Filters */}
      <div className="flex flex-col gap-4">
        {/* Row 1: Timeframe & Action Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
          {/* Timeframe Selector */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400 mr-1">
              <Clock size={14} className="text-cyan-400" />
              <span>Timeframe:</span>
            </div>
            <div className="inline-flex rounded-lg border border-white/10 bg-black/40 p-1">
              {[
                { id: "30", label: "30 Days (Default)", tip: "Recommended for storage efficiency" },
                { id: "60", label: "60 Days", tip: "Last 2 months" },
                { id: "90", label: "90 Days", tip: "Last quarter" },
                { id: "all", label: "All Time", tip: "All unpurged logs" }
              ].map((tf) => {
                const isActive = timeframe === tf.id;
                return (
                  <button
                    key={tf.id}
                    type="button"
                    title={tf.tip}
                    onClick={() => setTimeframe(tf.id as any)}
                    className={`rounded-md px-3 py-1.5 text-xs font-bold transition ${
                      isActive
                        ? "bg-cyan-500 text-slate-950 shadow-sm"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {tf.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sort Order & Search */}
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as "newest" | "oldest")}
              className="rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-xs font-semibold text-white outline-none focus:border-cyan-500"
            >
              <option value="newest">Sort: Newest First</option>
              <option value="oldest">Sort: Oldest First</option>
            </select>

            <div className="relative w-full sm:w-64">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search action, message, actor..."
                className="w-full rounded-lg border border-white/10 bg-black/40 py-2 pl-9 pr-8 text-xs text-white outline-none focus:border-cyan-500"
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

        {/* Row 2: Action Category Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: "all", label: "All Actions" },
            { id: "order", label: "Orders" },
            { id: "product", label: "Products" },
            { id: "user", label: "Users" },
            { id: "review", label: "Reviews" },
            { id: "settings", label: "Settings" }
          ].map((tab) => {
            const isActive = filterAction === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterAction(tab.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition ${
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
      </div>

      {/* Batch Selection Action Bar (when 1 or more items selected) */}
      {selectedIds.length > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-3 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <CheckSquare size={18} className="text-rose-400" />
            <span className="text-xs font-bold text-white">
              {selectedIds.length} log(s) selected
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setSelectedIds([])}
              className="border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white h-8 text-xs"
            >
              Deselect All
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleDeleteSelected}
              disabled={isDeleting}
              className="bg-rose-600 hover:bg-rose-500 text-white font-bold h-8 text-xs gap-1.5"
            >
              <Trash2 size={14} />
              Delete Selected ({selectedIds.length})
            </Button>
          </div>
        </div>
      ) : null}

      {/* Activity Log List Header & Items */}
      <div className="overflow-hidden rounded-lg border border-white/10 bg-white/[0.02]">
        {/* Table Controls Header */}
        <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.04] px-4 py-3 text-xs font-bold text-slate-400">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleSelectAllPage}
              title={allPaginatedSelected ? "Deselect page" : "Select entire page"}
              className="text-slate-400 hover:text-white"
            >
              {allPaginatedSelected ? (
                <CheckSquare size={17} className="text-rose-400" />
              ) : (
                <Square size={17} />
              )}
            </button>
            <span className="uppercase tracking-wider">Log Details & Actions</span>
          </div>

          <div className="flex items-center gap-4">
            <span className="uppercase tracking-wider hidden sm:inline">Actor</span>
            <span className="uppercase tracking-wider">Timestamp</span>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-sm text-slate-400">Loading audit history...</div>
        ) : sortedLogs.length === 0 ? (
          <div className="p-12 text-center text-sm text-slate-400 space-y-2">
            <p>
              {query || filterAction !== "all"
                ? "No activity logs match your search or filter."
                : `No administrative activity recorded in the ${timeframeLabel.toLowerCase()}.`}
            </p>
            {timeframe !== "all" ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setTimeframe("all")}
                className="text-cyan-400 hover:underline text-xs"
              >
                Switch to &quot;All Time&quot; to inspect older history
              </Button>
            ) : null}
          </div>
        ) : (
          paginatedLogs.map((log) => {
            const tone = getActionTone(log.action);
            const ActionIcon = getActionIcon(log.action);
            const isSelected = selectedIds.includes(log.id);

            return (
              <div
                key={log.id}
                className={`flex items-start gap-3.5 border-t border-white/10 p-4 transition first:border-t-0 ${
                  isSelected ? "bg-rose-500/[0.08]" : "hover:bg-white/[0.03]"
                }`}
              >
                {/* Row Checkbox */}
                <button
                  type="button"
                  onClick={() => toggleSelectOne(log.id)}
                  className="mt-1 text-slate-400 hover:text-white"
                >
                  {isSelected ? (
                    <CheckSquare size={17} className="text-rose-400" />
                  ) : (
                    <Square size={17} />
                  )}
                </button>

                {/* Action Icon Badge */}
                <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${tone.bg} ${tone.border} ${tone.text}`}>
                  <ActionIcon size={18} />
                </div>

                {/* Body */}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-white text-sm">{log.action}</span>
                      {log.target_type ? (
                        <span className="rounded bg-white/10 px-2 py-0.5 text-[10px] font-mono text-slate-300">
                          {log.target_type} {log.target_id ? `#${log.target_id}` : ""}
                        </span>
                      ) : null}
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-400">
                        {new Date(log.created_at).toLocaleString("en-IN", {
                          dateStyle: "medium",
                          timeStyle: "short"
                        })}
                      </span>
                      {/* Delete Single Button */}
                      <button
                        type="button"
                        onClick={() => handleDeleteSingle(log.id)}
                        disabled={isDeleting}
                        title={`Delete log #${log.id}`}
                        className="rounded p-1 text-slate-500 hover:bg-rose-500/20 hover:text-rose-300 transition"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <p className="mt-1 text-sm text-slate-300 break-words">{log.message}</p>

                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span>Performed by:</span>
                    <span className="font-semibold text-slate-300">
                      {log.actor?.username || "System Automation"}
                    </span>
                    {log.actor?.email ? (
                      <span>({log.actor.email})</span>
                    ) : null}
                    <span className="text-slate-600">•</span>
                    <span className="font-mono text-[11px] text-slate-600">ID #{log.id}</span>
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
            <span className="font-semibold text-white">{sortedLogs.length}</span> audit logs ({timeframeLabel})
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
    <AdminLayout title="Activity Logs & Storage Audit">
      <Suspense fallback={<div className="p-8 text-center text-slate-400">Loading audit console...</div>}>
        <ActivityLogsContent />
      </Suspense>
    </AdminLayout>
  );
}

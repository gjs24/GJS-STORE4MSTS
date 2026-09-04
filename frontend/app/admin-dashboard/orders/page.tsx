"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Copy,
  FileText,
  Search,
  ShoppingCart,
  X
} from "lucide-react";
import { AdminLoginNote } from "@/components/admin-login-note";
import { AdminLayout } from "@/components/admin-table";
import { Button } from "@/components/ui/button";
import { adminGet, adminPatch, downloadAdminInvoice, type AdminOrder } from "@/lib/admin-api";

type PaginatedOrders = {
  count: number;
  next: string | null;
  previous: string | null;
  results: AdminOrder[];
};

type StatusFilter =
  | "ALL"
  | "VERIFICATION_PENDING"
  | "PAID"
  | "APPROVED"
  | "PENDING"
  | "REJECTED"
  | "FAILED"
  | "REFUNDED";

type OrderSort = "newest" | "oldest" | "amount_high" | "amount_low";

function OrdersContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(
    ((searchParams.get("status") || "ALL").toUpperCase() as StatusFilter) || "ALL"
  );
  const [sortOrder, setSortOrder] = useState<OrderSort>(
    (searchParams.get("sort") as OrderSort) || "newest"
  );
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
  const [activeSearch, setActiveSearch] = useState(searchParams.get("search") || "");
  const [copiedUtr, setCopiedUtr] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [downloadingInvoiceId, setDownloadingInvoiceId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const s = (searchParams.get("status") || "ALL").toUpperCase() as StatusFilter;
    const q = searchParams.get("search") || "";
    const sort = (searchParams.get("sort") as OrderSort) || "newest";
    setStatusFilter(s);
    setSearchQuery(q);
    setActiveSearch(q);
    setSortOrder(sort);
    setPage(1);
  }, [searchParams]);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    const queryParts = [`page=${page}`];
    if (statusFilter !== "ALL") {
      queryParts.push(`status=${statusFilter}`);
    }
    if (activeSearch.trim()) {
      queryParts.push(`search=${encodeURIComponent(activeSearch.trim())}`);
    }
    if (sortOrder !== "newest") {
      queryParts.push(`ordering=${sortOrder}`);
    }

    try {
      const data = await adminGet<PaginatedOrders>(
        `/admin/orders/?${queryParts.join("&")}`,
        {
          count: 0,
          next: null,
          previous: null,
          results: [],
        }
      );
      setOrders(data.results);
      setCount(data.count);
    } catch {
      setFeedback({ type: "error", message: "Failed to load orders." });
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, activeSearch, sortOrder]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  function handleFilterChange(newStatus: StatusFilter) {
    setStatusFilter(newStatus);
    setPage(1);
    const params = new URLSearchParams(searchParams.toString());
    if (newStatus === "ALL") {
      params.delete("status");
    } else {
      params.set("status", newStatus);
    }
    router.push(`/admin-dashboard/orders?${params.toString()}`);
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setActiveSearch(searchQuery);
    setPage(1);
    const params = new URLSearchParams(searchParams.toString());
    if (searchQuery.trim()) {
      params.set("search", searchQuery.trim());
    } else {
      params.delete("search");
    }
    router.push(`/admin-dashboard/orders?${params.toString()}`);
  }

  function clearSearch() {
    setSearchQuery("");
    setActiveSearch("");
    setPage(1);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("search");
    router.push(`/admin-dashboard/orders?${params.toString()}`);
  }

  async function updateStatus(order: AdminOrder, status: AdminOrder["status"]) {
    setUpdatingId(order.id);
    setFeedback(null);
    try {
      const updated = await adminPatch<AdminOrder>(`/admin/orders/${order.id}/`, { status });
      setOrders((current) => current.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)));
      setFeedback({
        type: "success",
        message: `Order #${order.id} status successfully changed to ${status}. ${
          status === "PAID" || status === "APPROVED" ? "Customer download access is now unlocked." : ""
        }`,
      });
    } catch (error) {
      setFeedback({
        type: "error",
        message: error instanceof Error ? error.message : `Failed to update Order #${order.id}.`,
      });
    } finally {
      setUpdatingId(null);
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    setCopiedUtr(text);
    setTimeout(() => setCopiedUtr(null), 2000);
  }

  async function handleAdminInvoice(orderId: number) {
    setDownloadingInvoiceId(orderId);
    try {
      const invoice = await downloadAdminInvoice(orderId);
      const link = document.createElement("a");
      link.href = invoice.url;
      link.download = invoice.filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      if (invoice.revoke) setTimeout(invoice.revoke, 1000);
    } catch (error) {
      setFeedback({
        type: "error",
        message: error instanceof Error ? error.message : `Failed to download invoice for order #${orderId}.`,
      });
    } finally {
      setDownloadingInvoiceId(null);
    }
  }

  const totalPages = Math.ceil(count / 10);

  function statusBadge(status: AdminOrder["status"]) {
    switch (status) {
      case "PAID":
        return <span className="rounded bg-emerald-500/20 px-2.5 py-1 text-xs font-semibold text-emerald-300 border border-emerald-500/30">Paid</span>;
      case "VERIFICATION_PENDING":
        return <span className="rounded bg-amber-500/20 px-2.5 py-1 text-xs font-bold text-amber-300 border border-amber-500/40 animate-pulse">Verify UTR</span>;
      case "APPROVED":
        return <span className="rounded bg-cyan-500/20 px-2.5 py-1 text-xs font-semibold text-cyan-300 border border-cyan-500/30">Approved</span>;
      case "REJECTED":
        return <span className="rounded bg-rose-500/20 px-2.5 py-1 text-xs font-semibold text-rose-300 border border-rose-500/30">Rejected</span>;
      case "FAILED":
        return <span className="rounded bg-red-500/20 px-2.5 py-1 text-xs font-semibold text-red-300 border border-red-500/30">Failed</span>;
      case "REFUNDED":
        return <span className="rounded bg-purple-500/20 px-2.5 py-1 text-xs font-semibold text-purple-300 border border-purple-500/30">Refunded</span>;
      default:
        return <span className="rounded bg-slate-500/20 px-2.5 py-1 text-xs font-semibold text-slate-300 border border-white/10">Pending</span>;
    }
  }

  return (
    <div className="space-y-6">
      <AdminLoginNote />

      {feedback ? (
        <div
          className={`flex items-center justify-between gap-3 rounded-lg border p-4 text-sm ${
            feedback.type === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
              : "border-red-500/30 bg-red-500/10 text-red-300"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="rounded p-1 hover:bg-white/10">
            <X size={14} />
          </button>
        </div>
      ) : null}

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              { id: "ALL", label: "All Orders" },
              { id: "VERIFICATION_PENDING", label: "Verify UTR" },
              { id: "PAID", label: "Paid" },
              { id: "APPROVED", label: "Approved" },
              { id: "PENDING", label: "Pending" },
              { id: "REJECTED", label: "Rejected" },
              { id: "FAILED", label: "Failed" },
            ] as const
          ).map((tab) => {
            const isActive = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleFilterChange(tab.id)}
                className={`rounded-lg px-3.5 py-2 text-xs font-bold uppercase tracking-wider transition ${
                  isActive
                    ? tab.id === "VERIFICATION_PENDING"
                      ? "bg-amber-500 text-black shadow-lg shadow-amber-500/20"
                      : "bg-rail-red text-white red-glow"
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
            onChange={(e) => {
              const val = e.target.value as OrderSort;
              setSortOrder(val);
              setPage(1);
            }}
            className="rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-xs font-semibold text-white outline-none focus:border-rail-red"
          >
            <option value="newest">Sort: Newest First</option>
            <option value="oldest">Sort: Oldest First</option>
            <option value="amount_high">Amount: High to Low</option>
            <option value="amount_low">Amount: Low to High</option>
          </select>

          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-72">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search UTR, order ID, customer..."
                className="w-full rounded-lg border border-white/10 bg-black/40 py-2 pl-9 pr-8 text-sm text-white outline-none focus:border-rail-red"
              />
              {searchQuery ? (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                >
                  <X size={14} />
                </button>
              ) : null}
            </div>
            <Button type="submit" size="sm" variant="secondary" className="gap-1.5 font-semibold">
              Search
            </Button>
          </form>
        </div>
      </div>

      {/* Orders Table */}
      <div className="overflow-hidden rounded-lg border border-white/10 bg-white/[0.02]">
        <div className="grid gap-2 bg-white/10 p-3 text-xs uppercase tracking-wider text-slate-400 md:grid-cols-[80px_1.5fr_1.3fr_110px_130px_180px]">
          <span>ID</span>
          <span>Asset / Customer</span>
          <span>Payment Details</span>
          <span>Amount</span>
          <span>Status</span>
          <span>Actions</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-slate-400">Loading orders...</div>
        ) : orders.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-400">
            {activeSearch || statusFilter !== "ALL"
              ? "No orders match the current search or status filter."
              : "No orders placed yet."}
          </div>
        ) : (
          orders.map((order) => (
            <div
              key={order.id}
              className={`grid items-center gap-3 border-t border-white/10 p-4 text-sm transition md:grid-cols-[80px_1.5fr_1.3fr_110px_130px_180px] ${
                order.status === "VERIFICATION_PENDING"
                  ? "bg-amber-500/[0.06] hover:bg-amber-500/[0.09]"
                  : "bg-transparent hover:bg-white/[0.04]"
              }`}
            >
              <div>
                <span className="font-mono text-sm font-bold text-white">#{order.id}</span>
                {order.order_id || order.provider_order_id ? (
                  <span className="block truncate font-mono text-[10px] text-slate-500" title={order.order_id || order.provider_order_id}>
                    {order.order_id || order.provider_order_id}
                  </span>
                ) : null}
              </div>

              <div>
                <span className="block font-bold text-white">{order.asset?.title || "Asset"}</span>
                <span className="text-xs text-slate-300">
                  {order.user?.username || "User"}{" "}
                  {order.user?.email ? (
                    <span className="text-slate-500">({order.user.email})</span>
                  ) : null}
                </span>
                <span className="block text-[11px] text-slate-500">
                  {new Date(order.created_at).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}
                </span>
              </div>

              <div>
                {order.utr ? (
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs font-black tracking-wide text-amber-300">
                        {order.utr}
                      </span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(order.utr!)}
                        title="Copy UTR reference"
                        className="rounded p-1 text-slate-400 hover:bg-white/10 hover:text-white"
                      >
                        {copiedUtr === order.utr ? (
                          <Check size={13} className="text-emerald-400" />
                        ) : (
                          <Copy size={13} />
                        )}
                      </button>
                    </div>
                    {order.payer_name ? (
                      <span className="block text-xs text-slate-300">
                        <span className="text-slate-500">Payer:</span> {order.payer_name}
                      </span>
                    ) : null}
                    {order.payment_submitted_at ? (
                      <span className="block text-[10px] text-slate-500">
                        Submitted: {new Date(order.payment_submitted_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    ) : null}
                  </div>
                ) : (
                  <span className="text-xs text-slate-400">Cashfree Gateway</span>
                )}
              </div>

              <div>
                <span className="font-bold text-white">
                  {order.currency} {order.amount}
                </span>
              </div>

              <div>{statusBadge(order.status)}</div>

              <div className="flex flex-col gap-2">
                {order.status === "VERIFICATION_PENDING" ? (
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      disabled={updatingId === order.id}
                      onClick={() => updateStatus(order, "PAID")}
                      className="flex-1 rounded bg-emerald-600 px-2.5 py-1.5 text-xs font-black uppercase text-white hover:bg-emerald-500 disabled:opacity-50 transition shadow"
                      title="Approve manual payment and unlock download"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      disabled={updatingId === order.id}
                      onClick={() => updateStatus(order, "REJECTED")}
                      className="flex-1 rounded bg-rose-600 px-2.5 py-1.5 text-xs font-black uppercase text-white hover:bg-rose-500 disabled:opacity-50 transition shadow"
                      title="Reject invalid payment"
                    >
                      Reject
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <select
                      value={order.status}
                      disabled={updatingId === order.id}
                      onChange={(e) => updateStatus(order, e.target.value as AdminOrder["status"])}
                      className="w-full rounded border border-white/10 bg-black/50 px-2 py-1.5 text-xs outline-none text-slate-200"
                    >
                      <option value="PENDING">Pending</option>
                      <option value="VERIFICATION_PENDING">Verification Pending</option>
                      <option value="APPROVED">Approved</option>
                      <option value="PAID">Paid</option>
                      <option value="REJECTED">Rejected</option>
                      <option value="FAILED">Failed</option>
                      <option value="REFUNDED">Refunded</option>
                    </select>
                    {order.status === "PAID" || order.status === "APPROVED" ? (
                      <button
                        type="button"
                        disabled={downloadingInvoiceId === order.id}
                        onClick={() => handleAdminInvoice(order.id)}
                        className="rounded border border-white/10 p-1.5 text-slate-400 hover:bg-white/10 hover:text-white disabled:opacity-40"
                        title="Download official PDF invoice"
                      >
                        <FileText size={14} />
                      </button>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {count > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-t border-white/10 pt-4">
          <p className="text-xs text-slate-400">
            Showing <span className="font-semibold text-white">{(page - 1) * 10 + 1}</span>–
            <span className="font-semibold text-white">{Math.min(page * 10, count)}</span> of{" "}
            <span className="font-semibold text-white">{count}</span> total orders
          </p>

          {totalPages > 1 ? (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="h-8 px-3 text-xs"
              >
                Previous
              </Button>
              <div className="flex items-center gap-1 text-xs text-slate-300">
                <span className="rounded bg-white/10 px-2.5 py-1 font-bold text-white">{page}</span>
                <span className="text-slate-500">/</span>
                <span className="px-1 text-slate-400">{totalPages}</span>
              </div>
              <Button
                size="sm"
                variant="secondary"
                disabled={page === totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="h-8 px-3 text-xs"
              >
                Next
              </Button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

export default function AdminOrdersPage() {
  return (
    <AdminLayout title="Orders & Payments">
      <Suspense fallback={<div className="p-8 text-center text-slate-400">Loading orders console...</div>}>
        <OrdersContent />
      </Suspense>
    </AdminLayout>
  );
}

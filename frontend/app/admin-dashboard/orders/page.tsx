"use client";

import { useEffect, useState } from "react";
import { Check, CheckCircle2, Copy } from "lucide-react";
import { AdminLoginNote } from "@/components/admin-login-note";
import { AdminLayout } from "@/components/admin-table";
import { adminGet, adminPatch, type AdminOrder } from "@/lib/admin-api";

type PaginatedOrders = {
  count: number;
  next: string | null;
  previous: string | null;
  results: AdminOrder[];
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [page, setPage] = useState(1);
  const [count, setCount] = useState(0);
  const [copiedUtr, setCopiedUtr] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    adminGet<PaginatedOrders>(
      `/admin/orders/?page=${page}`,
      {
        count: 0,
        next: null,
        previous: null,
        results: [],
      }
    ).then((data) => {
      setOrders(data.results);
      setCount(data.count);
    });
  }, [page]);

  async function updateStatus(order: AdminOrder, status: AdminOrder["status"]) {
    setUpdatingId(order.id);
    setFeedback("");
    try {
      const updated = await adminPatch<AdminOrder>(`/admin/orders/${order.id}/`, { status });
      setOrders((current) => current.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)));
      setFeedback(`Order #${order.id} status updated to ${status}.`);
    } catch {
      setFeedback(`Failed to update Order #${order.id}.`);
    } finally {
      setUpdatingId(null);
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    setCopiedUtr(text);
    setTimeout(() => setCopiedUtr(null), 2000);
  }

  const totalPages = Math.ceil(count / 10);

  function statusBadge(status: AdminOrder["status"]) {
    switch (status) {
      case "PAID":
        return <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-xs font-semibold text-emerald-300 border border-emerald-500/30">Paid</span>;
      case "VERIFICATION_PENDING":
        return <span className="rounded bg-amber-500/20 px-2 py-0.5 text-xs font-semibold text-amber-300 border border-amber-500/30 animate-pulse">Verify UTR</span>;
      case "APPROVED":
        return <span className="rounded bg-cyan-500/20 px-2 py-0.5 text-xs font-semibold text-cyan-300 border border-cyan-500/30">Approved</span>;
      case "REJECTED":
        return <span className="rounded bg-rose-500/20 px-2 py-0.5 text-xs font-semibold text-rose-300 border border-rose-500/30">Rejected</span>;
      case "FAILED":
        return <span className="rounded bg-red-500/20 px-2 py-0.5 text-xs font-semibold text-red-300 border border-red-500/30">Failed</span>;
      case "REFUNDED":
        return <span className="rounded bg-purple-500/20 px-2 py-0.5 text-xs font-semibold text-purple-300 border border-purple-500/30">Refunded</span>;
      default:
        return <span className="rounded bg-slate-500/20 px-2 py-0.5 text-xs font-semibold text-slate-300 border border-white/10">Pending</span>;
    }
  }

  return (
    <AdminLayout title="Orders & Payments">
      <AdminLoginNote />
      {feedback ? (
        <div className="mb-4 flex items-center gap-2 rounded border border-white/10 bg-white/[0.04] p-3 text-sm text-rail-amber">
          <CheckCircle2 size={16} /> {feedback}
        </div>
      ) : null}
      <div className="overflow-hidden rounded-lg border border-white/10">
        <div className="grid gap-2 bg-white/10 p-3 text-xs uppercase tracking-wider text-slate-400 md:grid-cols-[70px_1.4fr_1.2fr_100px_130px_170px]">
          <span>ID</span>
          <span>Asset / Customer</span>
          <span>Payment Details</span>
          <span>Amount</span>
          <span>Status</span>
          <span>Manage</span>
        </div>
        {orders.length === 0 ? <div className="p-6 text-sm text-slate-400">No orders found.</div> : null}
        {orders.map((order) => (
          <div
            key={order.id}
            className={`grid items-center gap-2 border-t border-white/10 p-4 text-sm transition md:grid-cols-[70px_1.4fr_1.2fr_100px_130px_170px] ${
              order.status === "VERIFICATION_PENDING" ? "bg-amber-500/[0.04]" : "bg-white/[0.02] hover:bg-white/[0.04]"
            }`}
          >
            <div>
              <span className="font-mono text-xs font-bold text-slate-300">#{order.id}</span>
              {order.order_id || order.provider_order_id ? (
                <span className="block font-mono text-[10px] text-slate-500">{order.order_id || order.provider_order_id}</span>
              ) : null}
            </div>
            <div>
              <span className="block font-semibold text-white">{order.asset?.title || "Asset"}</span>
              <span className="text-xs text-slate-400">
                {order.user?.username || "User"} {order.user?.email ? `(${order.user.email})` : ""}
              </span>
              <span className="block text-[11px] text-slate-500">
                {new Date(order.created_at).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}
              </span>
            </div>
            <div>
              {order.utr ? (
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-xs font-semibold text-rail-amber">{order.utr}</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(order.utr!)}
                      title="Copy UTR"
                      className="rounded p-1 text-slate-400 hover:bg-white/10 hover:text-white"
                    >
                      {copiedUtr === order.utr ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                    </button>
                  </div>
                  {order.payer_name ? (
                    <span className="block text-xs text-slate-300">Payer: {order.payer_name}</span>
                  ) : null}
                  {order.payment_submitted_at ? (
                    <span className="block text-[10px] text-slate-500">
                      Submitted {new Date(order.payment_submitted_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  ) : null}
                </div>
              ) : (
                <span className="text-xs text-slate-500">Gateway / Automated</span>
              )}
            </div>
            <div>
              <span className="font-semibold text-white">
                {order.currency} {order.amount}
              </span>
            </div>
            <div>{statusBadge(order.status)}</div>
            <div className="flex flex-col gap-1.5">
              {order.status === "VERIFICATION_PENDING" ? (
                <div className="flex gap-1">
                  <button
                    disabled={updatingId === order.id}
                    onClick={() => updateStatus(order, "PAID")}
                    className="flex-1 rounded bg-emerald-600 px-2 py-1 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                    title="Approve manual payment and grant download"
                  >
                    Approve
                  </button>
                  <button
                    disabled={updatingId === order.id}
                    onClick={() => updateStatus(order, "REJECTED")}
                    className="flex-1 rounded bg-rose-600/80 px-2 py-1 text-xs font-semibold text-white hover:bg-rose-500 disabled:opacity-50"
                    title="Reject invalid payment"
                  >
                    Reject
                  </button>
                </div>
              ) : null}
              <select
                disabled={updatingId === order.id}
                value={order.status}
                onChange={(event) => updateStatus(order, event.target.value as AdminOrder["status"])}
                className="w-full rounded border border-white/10 bg-black/50 px-2 py-1.5 text-xs outline-none"
              >
                <option value="PENDING">Pending</option>
                <option value="VERIFICATION_PENDING">Verification Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="PAID">Paid</option>
                <option value="REJECTED">Rejected</option>
                <option value="FAILED">Failed</option>
                <option value="REFUNDED">Refunded</option>
              </select>
            </div>
          </div>
        ))}
      </div>
      {count > 0 && (
        <div className="flex items-center justify-between border-t border-white/10 p-4">
          <button
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
            className="rounded bg-white/10 px-4 py-2 text-sm disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-sm text-slate-400">
            Page {page} of {totalPages} ({count} total orders)
          </span>
          <button
            disabled={page === totalPages}
            onClick={() => setPage(page + 1)}
            className="rounded bg-white/10 px-4 py-2 text-sm disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </AdminLayout>
  );
}

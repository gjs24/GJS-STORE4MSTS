"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  AlertCircle,
  AlertTriangle,
  Ban,
  Check,
  CheckCircle2,
  Copy,
  FileText,
  Lock,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Unlock,
  X
} from "lucide-react";
import { AdminLoginNote } from "@/components/admin-login-note";
import { AdminLayout } from "@/components/admin-table";
import { Button } from "@/components/ui/button";
import {
  adminGet,
  downloadAdminInvoice,
  setAdminOrderAccess,
  type AdminOrder
} from "@/lib/admin-api";

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
  | "BLOCKED"
  | "PENDING"
  | "REJECTED"
  | "FAILED"
  | "REFUNDED";

type OrderSort = "newest" | "oldest" | "amount_high" | "amount_low";

type OrderAccessModalProps = {
  order: AdminOrder;
  initialMode?: "MANAGE" | "APPROVE" | "BLOCK";
  onClose: () => void;
  onSave: (updated: AdminOrder) => void;
};

function OrderAccessModal({ order, initialMode = "MANAGE", onClose, onSave }: OrderAccessModalProps) {
  const [status, setStatus] = useState<AdminOrder["status"]>(
    initialMode === "APPROVE"
      ? "PAID"
      : initialMode === "BLOCK"
      ? "BLOCKED"
      : order.status
  );
  const [downloadEnabled, setDownloadEnabled] = useState<boolean>(
    initialMode === "APPROVE"
      ? true
      : initialMode === "BLOCK"
      ? false
      : order.download_enabled ?? (order.status === "PAID" || order.status === "APPROVED")
  );
  const [blockReason, setBlockReason] = useState<string>(order.block_reason || "");
  const [adminNotes, setAdminNotes] = useState<string>(order.admin_notes || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const quickReasons = [
    "Unauthorized file sharing / leaked package",
    "Fake / invalid payment proof (UTR)",
    "Payment chargeback or payment disputed",
    "Abusive automated download activity",
    "Customer policy / terms violation",
  ];

  function applyPreset(preset: "APPROVE" | "BLOCK" | "REFUND" | "REJECT") {
    if (preset === "APPROVE") {
      setStatus("PAID");
      setDownloadEnabled(true);
    } else if (preset === "BLOCK") {
      setStatus("BLOCKED");
      setDownloadEnabled(false);
      if (!blockReason) {
        setBlockReason("Unauthorized file sharing / leaked package");
      }
    } else if (preset === "REFUND") {
      setStatus("REFUNDED");
      setDownloadEnabled(false);
    } else if (preset === "REJECT") {
      setStatus("REJECTED");
      setDownloadEnabled(false);
      if (!blockReason) {
        setBlockReason("Fake / invalid payment proof (UTR)");
      }
    }
  }

  async function handleConfirm() {
    setSaving(true);
    setError(null);
    try {
      const updated = await setAdminOrderAccess(order.id, {
        status,
        download_enabled: downloadEnabled,
        block_reason: blockReason,
        admin_notes: adminNotes,
      });
      onSave(updated);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update order access.");
    } finally {
      setSaving(false);
    }
  }

  const isBlocking = status === "BLOCKED" || downloadEnabled === false;
  const isApproving = (status === "PAID" || status === "APPROVED") && downloadEnabled === true;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-2xl border border-white/10 bg-[#0e131f] shadow-2xl p-6 text-white space-y-6 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-white/10 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded bg-rail-red/20 px-2.5 py-0.5 text-xs font-mono font-bold text-rail-red border border-rail-red/30">
                Order #{order.id}
              </span>
              <h2 className="text-lg font-bold text-white">Manage Status & Download Access</h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Grant download access, approve verified payments, or immediately block customers who misuse store assets.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition"
          >
            <X size={18} />
          </button>
        </div>

        {error ? (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300 flex items-center gap-2">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        ) : null}

        {/* Customer & Asset Summary Card */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-xs">
          <div className="space-y-1">
            <span className="text-slate-500 font-semibold uppercase tracking-wider block text-[10px]">Product / Asset</span>
            <p className="font-bold text-sm text-white">{order.asset?.title || "Asset"}</p>
            <span className="text-slate-400 font-mono text-[11px] block">{order.asset?.category?.name || "Locomotive / Route"}</span>
          </div>

          <div className="space-y-1">
            <span className="text-slate-500 font-semibold uppercase tracking-wider block text-[10px]">Customer</span>
            <p className="font-bold text-white">{order.user?.username || "Anonymous"}</p>
            <span className="text-slate-400 block truncate">{order.user?.email || "No email on file"}</span>
          </div>

          <div className="space-y-1 pt-2 border-t border-white/5">
            <span className="text-slate-500 font-semibold uppercase tracking-wider block text-[10px]">Payment Amount</span>
            <p className="font-mono font-black text-amber-300 text-sm">
              {order.currency} {order.amount}
            </p>
            {order.utr ? (
              <span className="font-mono text-[11px] text-amber-200/80 block">
                UTR: {order.utr} {order.payer_name ? `(${order.payer_name})` : ""}
              </span>
            ) : (
              <span className="text-slate-500 text-[11px] block">Gateway Checkout</span>
            )}
          </div>

          <div className="space-y-1 pt-2 border-t border-white/5">
            <span className="text-slate-500 font-semibold uppercase tracking-wider block text-[10px]">Current Access State</span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="rounded bg-white/10 px-2 py-0.5 font-bold text-[11px] text-slate-200 border border-white/10">
                {order.status}
              </span>
              {order.status === "BLOCKED" || order.download_enabled === false ? (
                <span className="rounded bg-red-500/20 px-2 py-0.5 font-bold text-[11px] text-red-300 border border-red-500/30 flex items-center gap-1">
                  <Lock size={10} /> Downloads Blocked
                </span>
              ) : (
                <span className="rounded bg-emerald-500/20 px-2 py-0.5 font-bold text-[11px] text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <Unlock size={10} /> Downloads Active
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Quick Action Presets */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Quick Action Presets
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => applyPreset("APPROVE")}
              className={`rounded-xl border p-2.5 text-left transition flex flex-col justify-between ${
                isApproving
                  ? "border-emerald-500 bg-emerald-500/20 shadow-lg shadow-emerald-500/10"
                  : "border-white/10 bg-white/[0.02] hover:bg-emerald-500/10 hover:border-emerald-500/30 text-slate-300 hover:text-white"
              }`}
            >
              <div className="flex items-center justify-between w-full mb-1">
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                  <ShieldCheck size={14} /> Approve & Grant
                </span>
              </div>
              <p className="text-[10px] text-slate-400">Mark Paid & unlock instant download</p>
            </button>

            <button
              type="button"
              onClick={() => applyPreset("BLOCK")}
              className={`rounded-xl border p-2.5 text-left transition flex flex-col justify-between ${
                isBlocking
                  ? "border-red-500 bg-red-500/20 shadow-lg shadow-red-500/10"
                  : "border-white/10 bg-white/[0.02] hover:bg-red-500/10 hover:border-red-500/30 text-slate-300 hover:text-white"
              }`}
            >
              <div className="flex items-center justify-between w-full mb-1">
                <span className="text-xs font-bold text-red-400 flex items-center gap-1">
                  <Ban size={14} /> Block & Revoke
                </span>
              </div>
              <p className="text-[10px] text-slate-400">Misuse ban: cut download access immediately</p>
            </button>

            <button
              type="button"
              onClick={() => applyPreset("REJECT")}
              className={`rounded-xl border p-2.5 text-left transition flex flex-col justify-between ${
                status === "REJECTED"
                  ? "border-rose-500 bg-rose-500/20"
                  : "border-white/10 bg-white/[0.02] hover:bg-rose-500/10 hover:border-rose-500/30 text-slate-300 hover:text-white"
              }`}
            >
              <div className="flex items-center justify-between w-full mb-1">
                <span className="text-xs font-bold text-rose-400 flex items-center gap-1">
                  <AlertCircle size={14} /> Reject UTR
                </span>
              </div>
              <p className="text-[10px] text-slate-400">Invalid or unpaid manual transfer</p>
            </button>

            <button
              type="button"
              onClick={() => applyPreset("REFUND")}
              className={`rounded-xl border p-2.5 text-left transition flex flex-col justify-between ${
                status === "REFUNDED"
                  ? "border-purple-500 bg-purple-500/20"
                  : "border-white/10 bg-white/[0.02] hover:bg-purple-500/10 hover:border-purple-500/30 text-slate-300 hover:text-white"
              }`}
            >
              <div className="flex items-center justify-between w-full mb-1">
                <span className="text-xs font-bold text-purple-400 flex items-center gap-1">
                  <FileText size={14} /> Refunded
                </span>
              </div>
              <p className="text-[10px] text-slate-400">Revoke access and record refund</p>
            </button>
          </div>
        </div>

        {/* Granular Controls */}
        <div className="space-y-4 pt-2 border-t border-white/10">
          {/* Download Access Master Switch */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/40 p-3.5">
            <div>
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                {downloadEnabled ? <Unlock size={14} className="text-emerald-400" /> : <Lock size={14} className="text-red-400" />}
                Customer Download Access
              </span>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {downloadEnabled
                  ? "Customer CAN download the product package normally from the store."
                  : "Customer CANNOT download. Downloads are blocked with HTTP 403."}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setDownloadEnabled(!downloadEnabled)}
              className={`rounded-lg px-3.5 py-2 text-xs font-black uppercase tracking-wider transition ${
                downloadEnabled
                  ? "bg-emerald-600 text-white hover:bg-emerald-500 shadow-md shadow-emerald-600/20"
                  : "bg-red-600 text-white hover:bg-red-500 shadow-md shadow-red-600/20"
              }`}
            >
              {downloadEnabled ? "Unlocked (Active)" : "Blocked (Revoked)"}
            </button>
          </div>

          {/* Status Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Order Status</label>
            <select
              value={status}
              onChange={(e) => {
                const s = e.target.value as AdminOrder["status"];
                setStatus(s);
                if (s === "BLOCKED" || s === "REJECTED" || s === "REFUNDED" || s === "FAILED") {
                  setDownloadEnabled(false);
                } else if (s === "PAID" || s === "APPROVED") {
                  setDownloadEnabled(true);
                }
              }}
              className="w-full rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-xs font-semibold text-white outline-none focus:border-rail-red"
            >
              <option value="PAID">PAID (Verified & Active Access)</option>
              <option value="APPROVED">APPROVED (Complimentary / Admin Free Access)</option>
              <option value="BLOCKED">🛑 BLOCKED (Revoked due to misuse / ban)</option>
              <option value="VERIFICATION_PENDING">VERIFICATION_PENDING (Awaiting UTR check)</option>
              <option value="PENDING">PENDING (Checkout in progress)</option>
              <option value="REJECTED">REJECTED (Invalid payment)</option>
              <option value="REFUNDED">REFUNDED (Payment returned)</option>
              <option value="FAILED">FAILED (Transaction unsuccessful)</option>
            </select>
          </div>

          {/* Misuse / Block Reason */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <ShieldAlert size={14} className="text-amber-400" />
                Misuse / Revocation Reason (Shown to customer if blocked)
              </label>
            </div>

            {/* Quick Reason Chips */}
            <div className="flex flex-wrap gap-1.5">
              {quickReasons.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setBlockReason(r)}
                  className={`rounded-full border px-2.5 py-1 text-[10px] font-medium transition ${
                    blockReason === r
                      ? "border-red-500 bg-red-500/20 text-red-200"
                      : "border-white/10 bg-white/[0.02] text-slate-400 hover:border-white/20 hover:text-white"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>

            <input
              value={blockReason}
              onChange={(e) => setBlockReason(e.target.value)}
              placeholder="e.g. Unauthorized file leak, invalid payment proof, terms violation..."
              className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-xs text-white outline-none focus:border-rail-red"
            />
          </div>

          {/* Internal Admin Note */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">
              Private Admin Note (Store staff only)
            </label>
            <textarea
              rows={2}
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="Internal record: proof link, conversation details, Telegram handle..."
              className="w-full rounded-lg border border-white/10 bg-black/50 p-2.5 text-xs text-white outline-none focus:border-rail-red"
            />
          </div>

          {/* Safety Alert */}
          {isBlocking ? (
            <div className="rounded-xl border border-red-500/30 bg-red-950/20 p-3.5 text-xs text-red-200 flex items-start gap-2.5">
              <AlertTriangle size={18} className="text-red-400 shrink-0 mt-0.5" />
              <div>
                <strong className="block text-red-300 font-bold">Access Revocation Notice:</strong>
                Saving these changes will immediately block <strong>{order.user?.username || "this customer"}</strong> from downloading <strong>{order.asset?.title}</strong>. If they attempt to download, the store API will return an access denied error.
              </div>
            </div>
          ) : null}
        </div>

        {/* Modal Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={saving}
            className="text-xs font-semibold text-slate-400 hover:text-white"
          >
            Cancel
          </Button>

          <Button
            type="button"
            onClick={handleConfirm}
            disabled={saving}
            className={`font-black text-xs uppercase tracking-wider px-5 py-2 transition shadow-lg ${
              isBlocking
                ? "bg-red-600 hover:bg-red-500 text-white shadow-red-600/20"
                : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20"
            }`}
          >
            {saving ? (
              "Saving Changes..."
            ) : isBlocking ? (
              <span className="flex items-center gap-1.5">
                <Ban size={14} /> Confirm & Block Access
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <Check size={14} /> Confirm & Save Access
              </span>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

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
  const [downloadingInvoiceId, setDownloadingInvoiceId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [loading, setLoading] = useState(true);

  // Access Modal State
  const [modalOrder, setModalOrder] = useState<AdminOrder | null>(null);
  const [modalMode, setModalMode] = useState<"MANAGE" | "APPROVE" | "BLOCK">("MANAGE");

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

  function openAccessModal(order: AdminOrder, mode: "MANAGE" | "APPROVE" | "BLOCK" = "MANAGE") {
    setModalOrder(order);
    setModalMode(mode);
  }

  function handleModalSave(updated: AdminOrder) {
    setOrders((current) => current.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)));
    const isBlocked = updated.status === "BLOCKED" || updated.download_enabled === false;
    setFeedback({
      type: "success",
      message: `Order #${updated.id} successfully updated: Status=${updated.status} | Downloads=${
        isBlocked ? "BLOCKED / REVOKED" : "UNLOCKED / ACTIVE"
      }${updated.block_reason ? ` (Reason: ${updated.block_reason})` : ""}.`,
    });
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
      case "BLOCKED":
        return (
          <span className="inline-flex items-center gap-1 rounded bg-red-600/25 px-2.5 py-1 text-xs font-bold text-red-300 border border-red-500/40">
            <ShieldAlert size={12} className="text-red-400" />
            Blocked
          </span>
        );
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

  function accessPill(order: AdminOrder) {
    const isBlocked = order.status === "BLOCKED" || order.download_enabled === false;
    if (isBlocked) {
      return (
        <span
          className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-bold text-red-300 border border-red-500/30"
          title={order.block_reason ? `Blocked: ${order.block_reason}` : "Customer download access is revoked"}
        >
          <Lock size={10} className="text-red-400" /> Blocked
        </span>
      );
    }
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-500/30"
        title="Customer download access is unlocked"
      >
        <Unlock size={10} className="text-emerald-400" /> Unlocked
      </span>
    );
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
              { id: "BLOCKED", label: "🛑 Blocked / Misuse" },
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
                      : tab.id === "BLOCKED"
                      ? "bg-red-600 text-white shadow-lg shadow-red-600/30"
                      : "bg-rail-red text-white red-glow"
                    : tab.id === "BLOCKED"
                    ? "border border-red-500/30 bg-red-950/20 text-red-300 hover:bg-red-900/30 hover:text-white"
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
        <div className="grid gap-2 bg-white/10 p-3 text-xs uppercase tracking-wider text-slate-400 md:grid-cols-[80px_1.5fr_1.3fr_110px_150px_190px]">
          <span>ID</span>
          <span>Asset / Customer</span>
          <span>Payment Details</span>
          <span>Amount</span>
          <span>Status & Access</span>
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
          orders.map((order) => {
            const isBlocked = order.status === "BLOCKED" || order.download_enabled === false;
            return (
              <div
                key={order.id}
                className={`grid items-center gap-3 border-t border-white/10 p-4 text-sm transition md:grid-cols-[80px_1.5fr_1.3fr_110px_150px_190px] ${
                  order.status === "VERIFICATION_PENDING"
                    ? "bg-amber-500/[0.06] hover:bg-amber-500/[0.09]"
                    : order.status === "BLOCKED"
                    ? "bg-red-950/[0.15] hover:bg-red-950/[0.25]"
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

                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {statusBadge(order.status)}
                    {accessPill(order)}
                  </div>
                  {order.block_reason ? (
                    <span className="block truncate text-[10px] text-red-300 max-w-[140px]" title={`Block reason: ${order.block_reason}`}>
                      ⚠️ {order.block_reason}
                    </span>
                  ) : null}
                </div>

                <div className="flex items-center gap-1.5">
                  {order.status === "VERIFICATION_PENDING" ? (
                    <button
                      type="button"
                      onClick={() => openAccessModal(order, "APPROVE")}
                      className="rounded bg-amber-500 px-2.5 py-1.5 text-xs font-black uppercase text-black hover:bg-amber-400 transition shadow"
                      title="Review UTR and verify payment"
                    >
                      Verify UTR
                    </button>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => openAccessModal(order, isBlocked ? "APPROVE" : "MANAGE")}
                    className={`rounded border px-2.5 py-1.5 text-xs font-bold transition flex items-center gap-1.5 ${
                      isBlocked
                        ? "border-red-500/40 bg-red-500/10 text-red-300 hover:bg-red-500/20"
                        : "border-white/10 bg-white/[0.04] text-slate-200 hover:bg-white/10 hover:text-white"
                    }`}
                    title="Open status and download access dialog"
                  >
                    <Shield size={13} className={isBlocked ? "text-red-400" : "text-slate-400"} />
                    <span>Manage Access</span>
                  </button>

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
              </div>
            );
          })
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

      {/* Interactive Confirmation & Access Management Modal */}
      {modalOrder ? (
        <OrderAccessModal
          order={modalOrder}
          initialMode={modalMode}
          onClose={() => setModalOrder(null)}
          onSave={handleModalSave}
        />
      ) : null}
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

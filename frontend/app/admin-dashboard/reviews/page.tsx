"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  MessageSquare,
  Search,
  Star,
  Trash2,
  XCircle,
  X
} from "lucide-react";
import { AdminLoginNote } from "@/components/admin-login-note";
import { AdminLayout } from "@/components/admin-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { adminDelete, adminGet, adminPost, type AdminReview } from "@/lib/admin-api";

type ReviewStatusFilter = "all" | "pending" | "approved";

function ReviewsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [statusFilter, setStatusFilter] = useState<ReviewStatusFilter>(
    (searchParams.get("status") as ReviewStatusFilter) || "all"
  );
  const [query, setQuery] = useState(searchParams.get("search") || "");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<number | null>(null);

  const loadReviews = useCallback(async () => {
    setLoading(true);
    const queryParts: string[] = [];
    if (statusFilter !== "all") queryParts.push(`status=${statusFilter}`);
    if (query.trim()) queryParts.push(`search=${encodeURIComponent(query.trim())}`);

    const path = queryParts.length ? `/admin/reviews/?${queryParts.join("&")}` : "/admin/reviews/";
    try {
      const data = await adminGet<AdminReview[]>(path, []);
      setReviews(data);
    } catch {
      setFeedback({ type: "error", message: "Failed to load reviews." });
    } finally {
      setLoading(false);
    }
  }, [query, statusFilter]);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  const stats = useMemo(() => {
    const total = reviews.length;
    const pending = reviews.filter((r) => !r.is_approved).length;
    const approved = reviews.filter((r) => r.is_approved).length;
    return { total, pending, approved };
  }, [reviews]);

  async function approve(review: AdminReview) {
    setActionId(review.id);
    setFeedback(null);
    try {
      const updated = await adminPost<AdminReview>(`/admin/reviews/${review.id}/approve/`);
      setReviews((current) => current.map((item) => (item.id === updated.id ? { ...item, is_approved: true } : item)));
      setFeedback({ type: "success", message: `Review #${review.id} approved and is now live on the store.` });
    } catch {
      setFeedback({ type: "error", message: "Failed to approve review." });
    } finally {
      setActionId(null);
    }
  }

  async function reject(review: AdminReview) {
    setActionId(review.id);
    setFeedback(null);
    try {
      const updated = await adminPost<AdminReview>(`/admin/reviews/${review.id}/reject/`);
      setReviews((current) => current.map((item) => (item.id === updated.id ? { ...item, is_approved: false } : item)));
      setFeedback({ type: "success", message: `Review #${review.id} unapproved and hidden from the store.` });
    } catch {
      setFeedback({ type: "error", message: "Failed to unapprove review." });
    } finally {
      setActionId(null);
    }
  }

  async function remove(review: AdminReview) {
    if (!window.confirm(`Permanently delete review #${review.id} by ${review.user?.username || "User"}? This cannot be undone.`)) {
      return;
    }
    setActionId(review.id);
    setFeedback(null);
    try {
      await adminDelete(`/admin/reviews/${review.id}/`);
      setReviews((current) => current.filter((item) => item.id !== review.id));
      setFeedback({ type: "success", message: `Review #${review.id} deleted permanently.` });
    } catch {
      setFeedback({ type: "error", message: "Failed to delete review." });
    } finally {
      setActionId(null);
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

      {/* Summary KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="glass-card">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Reviews</span>
              <MessageSquare size={20} className="text-cyan-400" />
            </div>
            <p className="mt-3 text-3xl font-black text-white">{stats.total}</p>
            <p className="mt-1 text-xs text-slate-400">All submitted feedback</p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Pending Moderation</span>
              <AlertCircle size={20} className="text-amber-400" />
            </div>
            <p className="mt-3 text-3xl font-black text-white">{stats.pending}</p>
            <p className="mt-1 text-xs text-slate-400">Awaiting staff approval</p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Approved Live</span>
              <CheckCircle2 size={20} className="text-emerald-400" />
            </div>
            <p className="mt-3 text-3xl font-black text-white">{stats.approved}</p>
            <p className="mt-1 text-xs text-slate-400">Visible to public store</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              { id: "all", label: "All Reviews" },
              { id: "pending", label: `Pending (${stats.pending})` },
              { id: "approved", label: `Approved (${stats.approved})` },
            ] as const
          ).map((tab) => {
            const isActive = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`rounded-lg px-3.5 py-2 text-xs font-bold uppercase tracking-wider transition ${
                  isActive
                    ? tab.id === "pending" && stats.pending > 0
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

        <div className="relative sm:w-80">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by username or comment..."
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

      {/* Reviews List */}
      <div className="space-y-3">
        {loading ? (
          <div className="rounded-lg border border-white/10 p-8 text-center text-sm text-slate-400">Loading reviews...</div>
        ) : reviews.length === 0 ? (
          <div className="rounded-lg border border-white/10 p-8 text-center text-sm text-slate-400">
            {query || statusFilter !== "all" ? "No reviews match the current filter." : "No reviews submitted yet."}
          </div>
        ) : (
          reviews.map((review) => (
            <div
              key={review.id}
              className={`flex flex-col gap-4 rounded-lg border p-5 transition sm:flex-row sm:items-start sm:justify-between ${
                !review.is_approved
                  ? "border-amber-500/30 bg-amber-500/[0.04]"
                  : "border-white/10 bg-white/[0.02] hover:bg-white/[0.04]"
              }`}
            >
              <div className="space-y-3 min-w-0 flex-1">
                {/* Header: User & Rating */}
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-bold text-white">{review.user?.username || "Anonymous Customer"}</span>
                  <div className="flex items-center gap-1 text-amber-400">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        size={14}
                        className={star <= review.rating ? "fill-amber-400 text-amber-400" : "text-slate-600"}
                      />
                    ))}
                    <span className="ml-1 text-xs font-bold text-slate-300">({review.rating}/5)</span>
                  </div>
                  <Badge variant={review.is_approved ? "success" : "warning"}>
                    {review.is_approved ? "Live" : "Pending Approval"}
                  </Badge>
                </div>

                {/* Asset reference */}
                {review.asset_title ? (
                  <div className="text-xs text-slate-400">
                    <span>On Asset: </span>
                    {review.asset_slug ? (
                      <Link
                        href={`/assets/${review.asset_slug}`}
                        target="_blank"
                        className="inline-flex items-center gap-1 font-bold text-rail-amber hover:underline"
                      >
                        {review.asset_title}
                        <ExternalLink size={12} />
                      </Link>
                    ) : (
                      <span className="font-bold text-white">{review.asset_title}</span>
                    )}
                  </div>
                ) : null}

                {/* Comment */}
                <p className="text-sm leading-relaxed text-slate-200">{review.comment}</p>

                <p className="text-[11px] text-slate-500">
                  Posted on {new Date(review.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 self-end sm:self-auto">
                {!review.is_approved ? (
                  <Button
                    size="sm"
                    disabled={actionId === review.id}
                    onClick={() => approve(review)}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold gap-1.5"
                  >
                    <CheckCircle2 size={14} /> Approve
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={actionId === review.id}
                    onClick={() => reject(review)}
                    className="border-amber-500/40 text-amber-300 hover:bg-amber-500/10 text-xs font-semibold gap-1.5"
                  >
                    <XCircle size={14} /> Unapprove
                  </Button>
                )}

                <Button
                  size="sm"
                  variant="ghost"
                  disabled={actionId === review.id}
                  onClick={() => remove(review)}
                  className="border border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300 text-xs font-semibold gap-1.5"
                >
                  <Trash2 size={14} /> Delete
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default function AdminReviewsPage() {
  return (
    <AdminLayout title="Moderate Reviews">
      <Suspense fallback={<div className="p-8 text-center text-slate-400">Loading reviews console...</div>}>
        <ReviewsContent />
      </Suspense>
    </AdminLayout>
  );
}

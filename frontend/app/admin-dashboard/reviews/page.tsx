"use client";

import { useEffect, useState } from "react";
import { CheckCircle, Trash2 } from "lucide-react";
import { AdminLoginNote } from "@/components/admin-login-note";
import { AdminLayout } from "@/components/admin-table";
import { API_URL } from "@/lib/api";
import { adminGet, adminHeaders, adminPost, type AdminReview } from "@/lib/admin-api";

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<AdminReview[]>([]);

  useEffect(() => {
    adminGet<AdminReview[]>("/admin/reviews/", []).then(setReviews);
  }, []);

  async function approve(review: AdminReview) {
    const updated = await adminPost<AdminReview>(`/admin/reviews/${review.id}/approve/`);
    setReviews((current) => current.map((item) => item.id === updated.id ? updated : item));
  }

  async function remove(review: AdminReview) {
    const res = await fetch(`${API_URL}/admin/reviews/${review.id}/`, { method: "DELETE", headers: adminHeaders() });
    if (res.ok) setReviews((current) => current.filter((item) => item.id !== review.id));
  }

  return (
    <AdminLayout title="Manage Reviews">
      <AdminLoginNote />
      <div className="space-y-3">
        {reviews.length === 0 ? <div className="rounded border border-white/10 bg-white/[0.03] p-5 text-sm text-slate-400">No reviews loaded.</div> : null}
        {reviews.map((review) => (
          <div key={review.id} className="rounded border border-white/10 bg-white/[0.03] p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-semibold">{review.rating}/5 stars by {review.user?.username || "User"}</p>
                <p className="mt-2 text-sm text-slate-300">{review.comment}</p>
                <p className="mt-2 text-xs text-slate-500">{review.is_approved ? "Approved" : "Waiting approval"}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => approve(review)} className="rounded border border-white/10 p-2 text-emerald-300" title="Approve"><CheckCircle size={18} /></button>
                <button onClick={() => remove(review)} className="rounded border border-red-500/40 p-2 text-red-300" title="Delete"><Trash2 size={18} /></button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </AdminLayout>
  );
}

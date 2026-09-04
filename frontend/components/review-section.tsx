"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, MessageSquare, Star, User } from "lucide-react";
import { isLoggedIn, submitReview } from "@/lib/store-api";

type Review = {
  id: number;
  rating: number;
  comment: string;
  created_at: string;
  user?: {
    username: string;
  };
};

type ReviewSectionProps = {
  assetId: number;
  initialReviews?: Review[];
};

export function ReviewSection({ assetId, initialReviews = [] }: ReviewSectionProps) {
  const [reviews, setReviews] = useState<Review[]>(initialReviews);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState("");

  const loggedIn = isLoggedIn();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!comment.trim()) {
      setFeedback("Please write a short comment about your experience.");
      return;
    }
    setSubmitting(true);
    setFeedback("");
    try {
      const created = await submitReview(assetId, rating, comment.trim());
      setReviews((prev) => [created, ...prev.filter((r) => r.id !== created.id)]);
      setComment("");
      setFeedback("Thank you! Your review has been submitted successfully.");
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : "Failed to submit review.");
    } finally {
      setSubmitting(false);
    }
  }

  const averageRating =
    reviews.length > 0
      ? (reviews.reduce((acc, curr) => acc + curr.rating, 0) / reviews.length).toFixed(1)
      : null;

  return (
    <div className="mx-auto mt-12 max-w-7xl">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Customer Reviews</h2>
          <p className="mt-1 text-sm text-slate-400">
            {reviews.length === 0
              ? "No reviews yet. Be the first to share your feedback!"
              : `${reviews.length} customer review${reviews.length === 1 ? "" : "s"}${
                  averageRating ? ` - Average ${averageRating} / 5 stars` : ""
                }`}
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-4">
          {reviews.length === 0 ? (
            <div className="rounded-lg border border-white/10 bg-white/[0.02] p-8 text-center text-slate-400">
              <MessageSquare className="mx-auto mb-2 text-slate-500" size={32} />
              <p>No customer reviews have been published for this release yet.</p>
            </div>
          ) : (
            reviews.map((rev) => (
              <div key={rev.id} className="rounded-lg border border-white/10 bg-white/[0.03] p-5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-rail-red/20 text-rail-red">
                      <User size={16} />
                    </div>
                    <div>
                      <span className="font-semibold text-white">
                        {rev.user?.username || "Verified Customer"}
                      </span>
                      <span className="ml-2 text-xs text-slate-500">
                        {new Date(rev.created_at).toLocaleDateString("en-IN", {
                          dateStyle: "medium",
                        })}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-rail-amber">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        size={14}
                        className={i < rev.rating ? "fill-rail-amber text-rail-amber" : "text-slate-600"}
                      />
                    ))}
                  </div>
                </div>
                <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-300">
                  {rev.comment}
                </p>
              </div>
            ))
          )}
        </div>

        <div>
          <div className="rounded-lg border border-white/10 bg-white/[0.03] p-6">
            <h3 className="text-lg font-bold text-white">Write a Review</h3>
            <p className="mt-1 text-xs text-slate-400">
              Share your simulator impressions, sounds, cab alignment, and physics feedback.
            </p>

            {loggedIn ? (
              <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-300">
                    Your Rating
                  </label>
                  <div className="mt-2 flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        className="rounded p-1 transition hover:scale-110"
                      >
                        <Star
                          size={22}
                          className={
                            star <= rating
                              ? "fill-rail-amber text-rail-amber"
                              : "text-slate-600 hover:text-slate-400"
                          }
                        />
                      </button>
                    ))}
                    <span className="ml-2 text-sm font-semibold text-slate-300">
                      {rating} / 5 stars
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-300">
                    Review Details
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="How does this asset perform in your simulator? Any specific highlights?"
                    className="mt-2 w-full rounded border border-white/10 bg-black/40 p-3 text-sm text-white placeholder-slate-500 outline-none focus:border-rail-amber"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded bg-rail-red py-2.5 text-sm font-semibold text-white shadow-glow transition hover:opacity-90 disabled:opacity-50"
                >
                  {submitting ? "Submitting review..." : "Submit Review"}
                </button>

                {feedback ? (
                  <div className="flex items-center gap-2 rounded border border-white/10 bg-white/[0.04] p-3 text-xs text-slate-200">
                    <CheckCircle2 size={15} className="text-rail-amber" />
                    <span>{feedback}</span>
                  </div>
                ) : null}
              </form>
            ) : (
              <div className="mt-4 rounded border border-white/10 bg-black/20 p-4 text-center">
                <p className="text-sm text-slate-300">
                  Please log in to submit a rating and review for this product.
                </p>
                <Link
                  href="/login"
                  className="mt-3 inline-block rounded bg-rail-red px-4 py-2 text-xs font-semibold text-white"
                >
                  Log In
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


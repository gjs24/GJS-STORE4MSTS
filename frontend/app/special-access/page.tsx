"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Gift,
  KeyRound,
  Lock,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  TrainFront,
  UserCheck
} from "lucide-react";
import { getStoredUser, type CurrentUser } from "@/lib/api";
import {
  claimSpecialAccessLink,
  getSpecialAccessLink,
  isLoggedIn,
  type PublicSpecialAccessLink
} from "@/lib/store-api";

function extractToken(rawInput: string): string {
  const trimmed = rawInput.trim();
  if (!trimmed) return "";
  try {
    if (trimmed.includes("token=")) {
      const url = new URL(trimmed.startsWith("http") ? trimmed : `https://example.com/${trimmed}`);
      const tok = url.searchParams.get("token");
      if (tok) return tok.trim();
    }
  } catch {
    // fallback
  }
  return trimmed;
}

function SpecialAccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tokenParam = searchParams.get("token") || "";

  const [manualToken, setManualToken] = useState("");
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loggedIn, setLoggedIn] = useState(false);
  const [linkData, setLinkData] = useState<PublicSpecialAccessLink | null>(null);
  const [loading, setLoading] = useState(Boolean(tokenParam));
  const [error, setError] = useState("");
  const [userNote, setUserNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "info" | "error"; message: string } | null>(null);

  useEffect(() => {
    setLoggedIn(isLoggedIn());
    setUser(getStoredUser());
  }, []);

  const loadLink = useCallback(async (tok: string) => {
    if (!tok) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const data = await getSpecialAccessLink(tok);
      setLinkData(data);
      if (data.my_request?.user_note) {
        setUserNote(data.my_request.user_note);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load Special Access link.");
      setLinkData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tokenParam) {
      loadLink(tokenParam);
    } else {
      setLinkData(null);
      setLoading(false);
    }
  }, [tokenParam, loadLink]);

  async function handleClaimOrRequest() {
    if (!linkData) return;
    setSubmitting(true);
    setFeedback(null);
    try {
      const res = await claimSpecialAccessLink(linkData.token, userNote.trim());
      setFeedback({
        type: res.status === "APPROVED" ? "success" : "info",
        message: res.detail
      });
      setLinkData((prev) =>
        prev
          ? {
              ...prev,
              my_request: res.my_request,
              user_has_active_special_access:
                res.status === "APPROVED" ? true : prev.user_has_active_special_access
            }
          : prev
      );
    } catch (err) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Could not process your request."
      });
    } finally {
      setSubmitting(false);
    }
  }

  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    const extracted = extractToken(manualToken);
    if (!extracted) return;
    router.push(`/special-access?token=${encodeURIComponent(extracted)}`);
  }

  const redirectPath = tokenParam
    ? `/special-access?token=${encodeURIComponent(tokenParam)}`
    : "/special-access";

  return (
    <section className="rail-grid min-h-screen px-4 py-12">
      <div className="mx-auto max-w-2xl">
        <div className="overflow-hidden rounded-2xl border border-amber-400/30 bg-gradient-to-b from-[#131d31] via-[#0b1322] to-[#060911] shadow-[0_20px_50px_rgba(0,0,0,0.7)]">
          <div className="border-b border-white/10 bg-gradient-to-r from-amber-500/15 via-purple-500/10 to-cyan-500/15 px-6 py-6">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-amber-400/40 bg-amber-500/20 text-amber-300 shadow-lg">
                <Gift size={24} />
              </div>
              <div>
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider text-amber-300">
                  <Sparkles size={11} /> VIP Special Access Portal
                </span>
                <h1 className="mt-1 text-2xl font-black text-white sm:text-3xl">
                  MSTS-GJS Special Access
                </h1>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {!tokenParam ? (
              <div className="space-y-4">
                <p className="text-sm leading-relaxed text-slate-300">
                  Have a VIP Special Access invite link or code from the administrator? Paste it below to request or unlock your complimentary access.
                </p>
                <form onSubmit={handleManualSubmit} className="space-y-3">
                  <label className="block">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Invite Link or Access Token
                    </span>
                    <input
                      type="text"
                      value={manualToken}
                      onChange={(e) => setManualToken(e.target.value)}
                      placeholder="Paste link or token (e.g. gjs-vip-...)"
                      className="mt-1.5 w-full rounded-xl border border-white/15 bg-black/50 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-amber-400 focus:outline-none"
                    />
                  </label>
                  <button
                    type="submit"
                    disabled={!manualToken.trim()}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-5 py-3 text-sm font-black text-black shadow-lg transition hover:from-amber-400 hover:to-amber-500 disabled:opacity-50"
                  >
                    <KeyRound size={17} />
                    <span>Continue with Invite Link</span>
                  </button>
                </form>
              </div>
            ) : loading ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <RefreshCw className="h-8 w-8 animate-spin text-amber-400" />
                <p className="mt-3 text-sm text-slate-300">Verifying Special Access invite link...</p>
              </div>
            ) : error ? (
              <div className="space-y-4">
                <div className="rounded-xl border border-red-500/40 bg-red-950/30 p-4 text-sm text-red-200 flex items-start gap-3">
                  <AlertCircle className="mt-0.5 shrink-0 text-red-400" size={20} />
                  <div>
                    <p className="font-bold text-red-100">Invalid or Expired Link</p>
                    <p className="mt-1 text-xs text-red-300">{error}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => router.push("/special-access")}
                  className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-white/10"
                >
                  Enter a Different Invite Link
                </button>
              </div>
            ) : linkData ? (
              <div className="space-y-6">
                <div className="rounded-xl border border-amber-400/25 bg-black/40 p-5 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="rounded-md bg-amber-500/20 border border-amber-400/40 px-2.5 py-1 text-xs font-bold text-amber-300">
                      {linkData.mode === "AUTO_GRANT"
                        ? "⚡ Instant VIP Access Pass"
                        : "🛡️ VIP Access Request Link"}
                    </span>
                    {linkData.access_expires_at ? (
                      <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                        <Clock size={13} className="text-amber-400" />
                        Access valid until{" "}
                        {new Date(linkData.access_expires_at).toLocaleDateString("en-IN", {
                          dateStyle: "medium"
                        })}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-400 font-medium">
                        <ShieldCheck size={14} /> Lifetime / Permanent Access
                      </span>
                    )}
                  </div>

                  <div>
                    <h2 className="text-xl font-black text-white">{linkData.title}</h2>
                    <p className="mt-1 text-xs text-slate-400">
                      {linkData.mode === "AUTO_GRANT"
                        ? "Claim this invitation to immediately unlock complimentary VIP access on your account."
                        : "Submit your request below. Once the administrator approves your request, VIP access will be activated on your account."}
                    </p>
                  </div>

                  <div className="rounded-lg border border-white/10 bg-slate-900/70 p-3.5">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-amber-300">
                      Included VIP Privileges
                    </p>
                    {linkData.is_all_access_free ? (
                      <p className="mt-1.5 flex items-center gap-2 text-sm font-bold text-emerald-300">
                        <Sparkles size={16} className="shrink-0 text-amber-400" />
                        <span>Storewide Free All-Access Pass (All Premium Train Packs &amp; Nameboards)</span>
                      </p>
                    ) : (linkData.granted_asset_titles && linkData.granted_asset_titles.length > 0) ||
                      (linkData.granted_board_template_names && linkData.granted_board_template_names.length > 0) ? (
                      <div className="mt-2 space-y-2">
                        <p className="text-xs text-slate-300">Complimentary access to selected items:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {(linkData.granted_asset_titles || []).map((title) => (
                            <span
                              key={title}
                              className="inline-flex items-center gap-1 rounded-md border border-cyan-400/30 bg-cyan-950/50 px-2.5 py-1 text-xs font-semibold text-cyan-200"
                            >
                              <TrainFront size={12} /> {title}
                            </span>
                          ))}
                          {(linkData.granted_board_template_names || []).map((name) => (
                            <span
                              key={name}
                              className="inline-flex items-center gap-1 rounded-md border border-amber-400/30 bg-amber-950/50 px-2.5 py-1 text-xs font-semibold text-amber-200"
                            >
                              🎨 Nameboard: {name}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="mt-1 text-xs text-slate-300">
                        Administrator will assign your complimentary train packs &amp; nameboards upon approval.
                      </p>
                    )}
                  </div>
                </div>

                {feedback ? (
                  <div
                    className={`rounded-xl border p-4 text-sm flex items-start gap-3 ${
                      feedback.type === "success"
                        ? "border-emerald-400/40 bg-emerald-950/40 text-emerald-200"
                        : feedback.type === "info"
                        ? "border-cyan-400/40 bg-cyan-950/40 text-cyan-200"
                        : "border-red-400/40 bg-red-950/40 text-red-200"
                    }`}
                  >
                    <CheckCircle2 className="mt-0.5 shrink-0" size={18} />
                    <p className="leading-relaxed">{feedback.message}</p>
                  </div>
                ) : null}

                {!loggedIn ? (
                  <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-5 space-y-4">
                    <div className="flex items-start gap-3">
                      <Lock className="mt-0.5 shrink-0 text-amber-400" size={20} />
                      <div>
                        <p className="font-bold text-white text-sm">
                          Login Required to {linkData.mode === "AUTO_GRANT" ? "Claim" : "Request"} Special Access
                        </p>
                        <p className="mt-1 text-xs text-slate-300 leading-relaxed">
                          Please sign in to your MSTS-GJS Production Store account (or create a free account) so we can link VIP Special Access to your profile.
                        </p>
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Link
                        href={`/login?redirect=${encodeURIComponent(redirectPath)}`}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 py-3 text-sm font-black text-black transition hover:bg-amber-300"
                      >
                        <span>Login to My Account</span>
                        <ArrowRight size={16} />
                      </Link>
                      <Link
                        href={`/register?redirect=${encodeURIComponent(redirectPath)}`}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-sm font-bold text-white transition hover:bg-white/10"
                      >
                        <span>Create New Account</span>
                      </Link>
                    </div>
                  </div>
                ) : linkData.my_request?.status === "APPROVED" ? (
                  <div className="rounded-xl border border-emerald-400/40 bg-emerald-950/30 p-5 space-y-4">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-400" size={24} />
                      <div>
                        <p className="text-base font-black text-emerald-200">
                          🎉 VIP Special Access Active on Your Account!
                        </p>
                        <p className="mt-1 text-xs text-slate-300 leading-relaxed">
                          Your account (<strong className="text-white">{user?.username || user?.email}</strong>) has been granted Special Access. You can now download your unlocked train packs or customize your Nameboard Templates!
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <Link
                        href="/assets"
                        className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-black text-black transition hover:bg-emerald-400"
                      >
                        <TrainFront size={16} />
                        <span>Browse &amp; Download Addons</span>
                      </Link>
                      <Link
                        href="/board-studio"
                        className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-5 py-2.5 text-sm font-black text-black transition hover:bg-amber-300"
                      >
                        <Sparkles size={16} />
                        <span>Open Railway Board Studio</span>
                      </Link>
                      <Link
                        href="/dashboard"
                        className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
                      >
                        <span>Open My Dashboard</span>
                      </Link>
                    </div>
                  </div>
                ) : linkData.my_request?.status === "PENDING" ? (
                  <div className="rounded-xl border border-cyan-400/40 bg-cyan-950/30 p-5 space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <Clock className="mt-0.5 shrink-0 text-cyan-400 animate-pulse" size={22} />
                        <div>
                          <p className="text-base font-black text-cyan-200">
                            ⏳ Request Sent — Waiting for Admin Approval
                          </p>
                          <p className="mt-1 text-xs text-slate-300 leading-relaxed">
                            Your request for <strong className="text-white">{linkData.title}</strong> has been received. As soon as the admin approves it, you will receive an email notification and your VIP downloads will unlock automatically!
                          </p>
                          {linkData.my_request.user_note ? (
                            <p className="mt-2 rounded bg-black/40 px-3 py-1.5 text-xs text-slate-300 border border-white/10">
                              <span className="text-slate-400">Your note:</span> &ldquo;{linkData.my_request.user_note}&rdquo;
                            </p>
                          ) : null}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => loadLink(linkData.token)}
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-cyan-400/30 bg-cyan-500/10 px-3 py-1.5 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/20"
                      >
                        <RefreshCw size={13} />
                        <span>Check Status</span>
                      </button>
                    </div>
                  </div>
                ) : !linkData.is_valid ? (
                  <div className="rounded-xl border border-red-400/40 bg-red-950/30 p-4 text-sm text-red-200 flex items-start gap-3">
                    <AlertCircle className="mt-0.5 shrink-0 text-red-400" size={20} />
                    <div>
                      <p className="font-bold">Link No Longer Available</p>
                      <p className="mt-1 text-xs text-red-300">
                        {linkData.invalid_reason || "This invite link has expired or reached its maximum number of uses."}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-white/15 bg-black/30 p-5 space-y-4">
                    <div className="flex items-center justify-between text-xs text-slate-300">
                      <span className="flex items-center gap-1.5">
                        <UserCheck size={15} className="text-emerald-400" />
                        Signed in as <strong className="text-white">{user?.username || user?.email || "Member"}</strong>
                      </span>
                      {user?.email ? <span className="text-slate-400">{user.email}</span> : null}
                    </div>

                    <label className="block">
                      <span className="text-xs font-semibold text-slate-300">
                        {linkData.mode === "APPROVAL"
                          ? "Your Name / Message for Admin (helps Admin recognize your request)"
                          : "Optional Note (e.g. your Name or Discord/WhatsApp)"}
                      </span>
                      <input
                        type="text"
                        maxLength={300}
                        value={userNote}
                        onChange={(e) => setUserNote(e.target.value)}
                        placeholder="e.g. Hi, I am Rahul from WhatsApp requesting Vande Bharat special access"
                        className="mt-1.5 w-full rounded-xl border border-white/15 bg-black/50 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-amber-400 focus:outline-none"
                      />
                    </label>

                    <button
                      type="button"
                      disabled={submitting}
                      onClick={handleClaimOrRequest}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 px-5 py-3.5 text-sm font-black text-black shadow-lg transition hover:brightness-110 disabled:opacity-50"
                    >
                      {submitting ? (
                        <>
                          <RefreshCw size={17} className="animate-spin" />
                          <span>Processing...</span>
                        </>
                      ) : linkData.mode === "AUTO_GRANT" ? (
                        <>
                          <Gift size={18} />
                          <span>🎁 Claim VIP Special Access Now</span>
                        </>
                      ) : (
                        <>
                          <Send size={17} />
                          <span>🚀 Submit Special Access Request</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

export default function SpecialAccessPage() {
  return (
    <Suspense
      fallback={
        <div className="rail-grid flex min-h-screen items-center justify-center text-sm text-slate-400">
          Loading Special Access portal...
        </div>
      }
    >
      <SpecialAccessContent />
    </Suspense>
  );
}

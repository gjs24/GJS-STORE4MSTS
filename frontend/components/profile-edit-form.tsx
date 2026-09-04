"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CheckCircle2, KeyRound, Mail, RefreshCw, Save, ShieldAlert, ShieldCheck, UserCircle } from "lucide-react";
import { API_URL, clearAuth, getStoredUser, setStoredUser, type CurrentUser } from "@/lib/api";
import { authHeaders, userGet, userPatch } from "@/lib/store-api";

export function ProfileEditForm() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");

  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [timer, setTimer] = useState(0);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("Loading profile...");
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    const storedUser = getStoredUser();
    if (storedUser) {
      setUser(storedUser);
      setFirstName(storedUser.first_name || "");
      setLastName(storedUser.last_name || "");
      setEmail(storedUser.email || "");
    }

    userGet<CurrentUser>("/auth/me/")
      .then((freshUser) => {
        setStoredUser(freshUser);
        setUser(freshUser);
        setFirstName(freshUser.first_name || "");
        setLastName(freshUser.last_name || "");
        setEmail(freshUser.email || "");
        setMessage("");
      })
      .catch((error) => {
        if (!storedUser) clearAuth();
        setMessage(error instanceof Error ? error.message : "Please login to edit your profile.");
      });
  }, []);

  useEffect(() => {
    if (timer <= 0) return;
    const interval = setInterval(() => {
      setTimer((t) => (t > 1 ? t - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [timer]);

  async function handleSendOtp() {
    const targetEmail = (email || user?.email || "").trim().toLowerCase();
    if (!targetEmail || !targetEmail.includes("@")) {
      setMessage("Please enter a valid email address.");
      setIsSuccess(false);
      return;
    }

    setSendingOtp(true);
    setMessage(`Sending verification code to ${targetEmail}...`);
    setIsSuccess(false);

    try {
      const res = await fetch(`${API_URL}/auth/send-otp/`, {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ email: targetEmail, purpose: "profile_edit" }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const errorMsg =
          typeof data.detail === "string"
            ? data.detail
            : typeof data.message === "string"
              ? data.message
              : typeof data.purpose === "object" && data.purpose?.[0]
                ? String(data.purpose[0])
                : typeof data.email === "object" && data.email?.[0]
                  ? String(data.email[0])
                  : "Failed to send verification code.";
        setMessage(errorMsg);
        setIsSuccess(false);
        return;
      }

      setOtpSent(true);
      setTimer(60);
      setIsSuccess(true);
      setMessage(data.message || `Verification code sent to ${targetEmail}. Check your inbox!`);
    } catch {
      setMessage("Could not connect to backend. Please make sure the server is reachable.");
      setIsSuccess(false);
    } finally {
      setSendingOtp(false);
    }
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();

    if (!otpCode || otpCode.trim().length !== 6) {
      setMessage("Please enter the 6-digit verification code sent to your email.");
      setIsSuccess(false);
      return;
    }

    setSaving(true);
    setMessage("Verifying code and updating profile...");
    setIsSuccess(false);

    try {
      const updated = await userPatch<CurrentUser>("/auth/me/", {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim().toLowerCase(),
        otp: otpCode.trim(),
      });

      setStoredUser(updated);
      setUser(updated);
      setOtpCode("");
      setOtpSent(false);
      setIsSuccess(true);
      setMessage("Profile updated successfully!");
    } catch (error) {
      setIsSuccess(false);
      setMessage(error instanceof Error ? error.message : "Could not update profile.");
    } finally {
      setSaving(false);
    }
  }

  if (!user) {
    return (
      <div className="glass-panel mx-auto max-w-xl rounded-2xl border border-white/10 p-8 text-slate-300 shadow-xl">
        <p>{message}</p>
        <Link
          href="/login"
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-rail-red px-5 py-2.5 text-sm font-bold text-white shadow-glow"
        >
          Login
        </Link>
      </div>
    );
  }

  return (
    <div className="glass-panel mx-auto max-w-2xl overflow-hidden rounded-2xl border border-white/10 shadow-2xl">
      {/* Header Banner */}
      <div className="border-b border-white/10 bg-gradient-to-r from-rail-navy/80 to-rail-black/80 px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rail-red text-white shadow-glow">
            <UserCircle size={24} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Account Details & Security</h2>
            <p className="text-xs text-slate-400">
              Changes to your name or email require OTP authentication
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSaveProfile} className="space-y-5 p-6">
        {/* Username (Locked) */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
            Username
          </label>
          <div className="mt-1.5 flex items-center justify-between rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm font-medium text-slate-300">
            <span>{user.username}</span>
            <span className="rounded-full bg-white/[0.06] px-2.5 py-0.5 text-[11px] font-semibold text-slate-400">
              Fixed
            </span>
          </div>
        </div>

        {/* Name Fields */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
              First Name
            </label>
            <input
              name="first_name"
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="e.g. John"
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-rail-red focus:outline-none focus:ring-1 focus:ring-rail-red transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Last Name
            </label>
            <input
              name="last_name"
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="e.g. Doe"
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-rail-red focus:outline-none focus:ring-1 focus:ring-rail-red transition-all"
            />
          </div>
        </div>

        {/* Email Field */}
        <div>
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Email Address
            </label>
            <span className="text-[11px] text-rail-amber">OTP will be sent to this email</span>
          </div>
          <div className="relative mt-1.5">
            <Mail size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="w-full rounded-xl border border-white/10 bg-black/40 pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-rail-red focus:outline-none focus:ring-1 focus:ring-rail-red transition-all"
            />
          </div>
        </div>

        {/* OTP Security Verification Section */}
        <div className="rounded-xl border border-rail-amber/20 bg-rail-amber/[0.04] p-4.5 space-y-3.5">
          <div className="flex items-start gap-2.5">
            <ShieldCheck size={18} className="text-rail-amber shrink-0 mt-0.5" />
            <div className="text-xs leading-relaxed text-slate-300">
              <strong className="text-white">Email OTP Authentication:</strong> Click below to receive a 6-digit verification code to confirm ownership and apply your changes.
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={handleSendOtp}
              disabled={sendingOtp || timer > 0}
              className="flex items-center justify-center gap-2 rounded-xl border border-rail-amber/40 bg-rail-amber/15 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-rail-amber transition-all hover:bg-rail-amber/25 disabled:opacity-50"
            >
              {sendingOtp ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Sending...</span>
                </>
              ) : timer > 0 ? (
                <span>Resend in {timer}s</span>
              ) : (
                <>
                  <Mail size={14} />
                  <span>{otpSent ? "Resend Code" : "Send Verification Code"}</span>
                </>
              )}
            </button>

            {otpSent && (
              <div className="relative flex-1">
                <KeyRound size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="Enter 6-digit code"
                  className="w-full rounded-xl border border-white/15 bg-black/60 pl-10 pr-4 py-2.5 text-sm tracking-widest text-white placeholder:text-slate-500 placeholder:tracking-normal focus:border-rail-red focus:outline-none focus:ring-1 focus:ring-rail-red transition-all"
                />
              </div>
            )}
          </div>
        </div>

        {/* Status Message Alert */}
        {message && (
          <div
            className={`flex items-start gap-2.5 rounded-xl border p-3.5 text-xs leading-relaxed ${
              isSuccess
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                : "border-red-500/30 bg-red-500/10 text-red-200"
            }`}
          >
            {isSuccess ? (
              <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <ShieldAlert size={16} className="text-red-400 shrink-0 mt-0.5" />
            )}
            <span>{message}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            type="submit"
            disabled={saving || !otpSent || otpCode.trim().length !== 6}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-rail-red px-6 py-3 text-sm font-bold text-white shadow-glow transition-all hover:bg-rail-red/90 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <RefreshCw size={16} className="animate-spin" />
                <span>Verifying & Saving...</span>
              </>
            ) : (
              <>
                <Save size={16} />
                <span>Verify & Save Profile</span>
              </>
            )}
          </button>

          <Link
            href="/dashboard"
            className="flex items-center justify-center rounded-xl border border-white/10 px-5 py-3 text-sm font-semibold text-slate-300 transition-colors hover:border-white/20 hover:text-white"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}


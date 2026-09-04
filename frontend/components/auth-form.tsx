"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { GoogleLogin } from "@react-oauth/google";
import { KeyRound, Mail, RefreshCw, ShieldCheck } from "lucide-react";
import { API_URL, clearAuth } from "@/lib/api";

type AuthFormProps = {
  mode: "login" | "register";
  portal?: "user" | "admin";
};

export function AuthForm({ mode, portal = "user" }: AuthFormProps) {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [loginMethod, setLoginMethod] = useState<"password" | "otp">("password");

  // OTP state
  const [otpSent, setOtpSent] = useState(false);
  const [otpEmail, setOtpEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [timer, setTimer] = useState(0);

  // Register form state
  const [regUsername, setRegUsername] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");

  const googleEnabled = Boolean(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);
  const router = useRouter();

  // Resend cooldown timer
  useEffect(() => {
    if (timer <= 0) return;
    const interval = setInterval(() => {
      setTimer((t) => (t > 1 ? t - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [timer]);

  function finishLogin(data: { access: string; refresh: string; user?: { is_staff?: boolean } }) {
    localStorage.setItem("accessToken", data.access);
    localStorage.setItem("refreshToken", data.refresh);
    localStorage.setItem("currentUser", JSON.stringify(data.user));

    if (portal === "admin" && !data.user?.is_staff) {
      clearAuth();
      setMessage("This is a user account. Admin login requires a staff or superuser account.");
      return;
    }

    if (portal === "user" && data.user?.is_staff) {
      setMessage("Admin account detected. Opening admin dashboard...");
      router.push("/admin-dashboard");
      return;
    }

    if (portal === "admin") {
      setMessage("Admin login successful. Opening admin dashboard...");
      router.push("/admin-dashboard");
    } else {
      setMessage("Login successful. Opening user dashboard...");
      router.push("/dashboard");
    }
  }

  async function googleLogin(credential?: string) {
    if (!credential) {
      setMessage("Google login did not return a credential.");
      return;
    }

    setLoading(true);
    setMessage("Connecting with Google...");
    clearAuth();

    try {
      const res = await fetch(`${API_URL}/auth/google/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setMessage(data.detail || "Google login failed.");
        return;
      }

      finishLogin(data);
    } catch {
      setMessage("Could not connect to backend. Make sure Django is running on http://127.0.0.1:8000.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSendOtp(purpose: "login" | "signup", targetEmail: string) {
    const emailToUse = targetEmail.trim().toLowerCase();
    if (!emailToUse || !emailToUse.includes("@")) {
      setMessage("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    setMessage("Sending verification code to your email...");

    try {
      const res = await fetch(`${API_URL}/auth/send-otp/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailToUse, purpose }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setMessage(data.detail || "Could not send verification code.");
        return;
      }

      setOtpSent(true);
      setTimer(60);
      setMessage(data.message || `Verification code sent to ${emailToUse}. Check your inbox!`);
    } catch {
      setMessage("Could not connect to backend. Make sure Django is running on http://127.0.0.1:8000.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtpLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!otpCode || otpCode.trim().length !== 6) {
      setMessage("Please enter the 6-digit verification code.");
      return;
    }

    setLoading(true);
    setMessage("Verifying code...");
    clearAuth();

    try {
      const res = await fetch(`${API_URL}/auth/verify-otp/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: otpEmail.trim().toLowerCase(),
          otp: otpCode.trim(),
          purpose: "login",
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setMessage(data.detail || "Invalid verification code.");
        return;
      }

      finishLogin(data);
    } catch {
      setMessage("Could not connect to backend.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtpRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!otpCode || otpCode.trim().length !== 6) {
      setMessage("Please enter the 6-digit verification code.");
      return;
    }

    setLoading(true);
    setMessage("Creating verified account...");
    clearAuth();

    try {
      const res = await fetch(`${API_URL}/auth/verify-otp/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: regEmail.trim().toLowerCase(),
          otp: otpCode.trim(),
          purpose: "signup",
          username: regUsername.trim(),
          password: regPassword,
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setMessage(data.detail || "Registration failed. Please check your details.");
        return;
      }

      finishLogin(data);
    } catch {
      setMessage("Could not connect to backend.");
    } finally {
      setLoading(false);
    }
  }

  async function handlePasswordLogin(formData: FormData) {
    setLoading(true);
    setMessage("Connecting...");
    clearAuth();
    const body = Object.fromEntries(formData.entries());

    try {
      const res = await fetch(`${API_URL}/auth/login/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setMessage(data.detail || data.username?.[0] || data.password?.[0] || "Please check your details.");
        return;
      }

      finishLogin(data);
    } catch {
      setMessage("Could not connect to backend. Make sure Django is running on http://127.0.0.1:8000.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="cinematic-panel mx-auto max-w-md space-y-5 rounded-xl border border-white/10 bg-rail-black/90 p-6 shadow-2xl backdrop-blur-xl">
      {/* Login Method Toggle (User Portal) */}
      {mode === "login" && portal === "user" && (
        <div className="flex rounded-lg border border-white/10 bg-black/40 p-1">
          <button
            type="button"
            onClick={() => {
              setLoginMethod("password");
              setMessage("");
            }}
            className={`flex flex-1 items-center justify-center gap-2 rounded-md py-2 text-xs font-semibold uppercase tracking-wider transition-colors ${
              loginMethod === "password" ? "bg-rail-red text-white shadow-glow" : "text-slate-400 hover:text-white"
            }`}
          >
            <KeyRound size={14} />
            Password
          </button>
          <button
            type="button"
            onClick={() => {
              setLoginMethod("otp");
              setMessage("");
            }}
            className={`flex flex-1 items-center justify-center gap-2 rounded-md py-2 text-xs font-semibold uppercase tracking-wider transition-colors ${
              loginMethod === "otp" ? "bg-rail-red text-white shadow-glow" : "text-slate-400 hover:text-white"
            }`}
          >
            <Mail size={14} />
            Email OTP
          </button>
        </div>
      )}

      {/* LOGIN: Email OTP Flow */}
      {mode === "login" && loginMethod === "otp" && portal === "user" && (
        <div className="space-y-4">
          {!otpSent ? (
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-400">Account Email</label>
                <input
                  type="email"
                  required
                  placeholder="Enter your registered email"
                  value={otpEmail}
                  onChange={(e) => setOtpEmail(e.target.value)}
                  className="w-full rounded border border-white/10 bg-black/40 px-3 py-3 text-sm text-white placeholder-slate-500 focus:border-rail-red focus:outline-none"
                />
              </div>
              <button
                type="button"
                disabled={loading || !otpEmail}
                onClick={() => handleSendOtp("login", otpEmail)}
                className="w-full rounded bg-rail-red px-4 py-3 text-sm font-semibold text-white shadow-glow hover:bg-rail-red/90 disabled:opacity-50"
              >
                {loading ? "Sending Code..." : "Send Verification Code"}
              </button>
            </div>
          ) : (
            <form onSubmit={handleVerifyOtpLogin} className="space-y-3">
              <div className="rounded border border-white/10 bg-white/5 p-3 text-xs text-slate-300">
                Code sent to <span className="font-semibold text-white">{otpEmail}</span>.{" "}
                <button
                  type="button"
                  onClick={() => setOtpSent(false)}
                  className="text-rail-amber underline hover:text-rail-amber/80"
                >
                  Change
                </button>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-400">6-Digit Code</label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  placeholder="123456"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                  className="w-full rounded border border-white/10 bg-black/40 px-3 py-3 text-center text-xl font-bold tracking-widest text-white focus:border-rail-red focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={loading || otpCode.length !== 6}
                className="w-full rounded bg-rail-red px-4 py-3 text-sm font-semibold text-white shadow-glow hover:bg-rail-red/90 disabled:opacity-50"
              >
                {loading ? "Verifying..." : "Verify & Sign In"}
              </button>
              <div className="text-center">
                <button
                  type="button"
                  disabled={loading || timer > 0}
                  onClick={() => handleSendOtp("login", otpEmail)}
                  className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white disabled:opacity-50"
                >
                  <RefreshCw size={12} className={timer > 0 ? "animate-spin" : ""} />
                  {timer > 0 ? `Resend code in ${timer}s` : "Resend code"}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* LOGIN: Standard Password Flow */}
      {mode === "login" && (loginMethod === "password" || portal === "admin") && (
        <form action={handlePasswordLogin} className="space-y-4">
          <input
            name="username"
            required
            placeholder="Username"
            className="w-full rounded border border-white/10 bg-black/40 px-3 py-3 text-sm text-white placeholder-slate-500 focus:border-rail-red focus:outline-none"
          />
          <input
            name="password"
            required
            type="password"
            placeholder="Password"
            className="w-full rounded border border-white/10 bg-black/40 px-3 py-3 text-sm text-white placeholder-slate-500 focus:border-rail-red focus:outline-none"
          />
          <button
            disabled={loading}
            className="w-full rounded bg-rail-red px-4 py-3 font-semibold text-white shadow-glow hover:bg-rail-red/90 disabled:opacity-60"
          >
            {loading ? "Please wait..." : portal === "admin" ? "Admin Login" : "User Login"}
          </button>
        </form>
      )}

      {/* REGISTER: Email Verified Registration */}
      {mode === "register" && (
        <div className="space-y-4">
          {!otpSent ? (
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-400">Choose Username</label>
                <input
                  required
                  placeholder="Username"
                  value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value)}
                  className="w-full rounded border border-white/10 bg-black/40 px-3 py-3 text-sm text-white placeholder-slate-500 focus:border-rail-red focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-400">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="your.email@example.com"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  className="w-full rounded border border-white/10 bg-black/40 px-3 py-3 text-sm text-white placeholder-slate-500 focus:border-rail-red focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-400">Password</label>
                <input
                  required
                  type="password"
                  minLength={8}
                  placeholder="Password (minimum 8 characters)"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  className="w-full rounded border border-white/10 bg-black/40 px-3 py-3 text-sm text-white placeholder-slate-500 focus:border-rail-red focus:outline-none"
                />
              </div>
              <button
                type="button"
                disabled={loading || !regUsername || !regEmail || regPassword.length < 8}
                onClick={() => handleSendOtp("signup", regEmail)}
                className="flex w-full items-center justify-center gap-2 rounded bg-rail-red px-4 py-3 font-semibold text-white shadow-glow hover:bg-rail-red/90 disabled:opacity-50"
              >
                <ShieldCheck size={18} />
                {loading ? "Sending Code..." : "Send Verification Code"}
              </button>
            </div>
          ) : (
            <form onSubmit={handleVerifyOtpRegister} className="space-y-3">
              <div className="rounded border border-white/10 bg-white/5 p-3 text-xs text-slate-300">
                Verification code sent to <span className="font-semibold text-white">{regEmail}</span>.{" "}
                <button
                  type="button"
                  onClick={() => setOtpSent(false)}
                  className="text-rail-amber underline hover:text-rail-amber/80"
                >
                  Edit details
                </button>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-400">Enter 6-Digit Verification Code</label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  placeholder="123456"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                  className="w-full rounded border border-white/10 bg-black/40 px-3 py-3 text-center text-xl font-bold tracking-widest text-white focus:border-rail-red focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={loading || otpCode.length !== 6}
                className="flex w-full items-center justify-center gap-2 rounded bg-rail-red px-4 py-3 font-semibold text-white shadow-glow hover:bg-rail-red/90 disabled:opacity-50"
              >
                <ShieldCheck size={18} />
                {loading ? "Verifying..." : "Verify & Complete Signup"}
              </button>
              <div className="text-center">
                <button
                  type="button"
                  disabled={loading || timer > 0}
                  onClick={() => handleSendOtp("signup", regEmail)}
                  className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white disabled:opacity-50"
                >
                  <RefreshCw size={12} className={timer > 0 ? "animate-spin" : ""} />
                  {timer > 0 ? `Resend code in ${timer}s` : "Resend code"}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Google OAuth Option */}
      {portal === "user" && googleEnabled ? (
        <div className="space-y-3">
          <div className="flex items-center gap-3 text-xs uppercase tracking-[0.2em] text-slate-500">
            <span className="h-px flex-1 bg-white/10" />
            or
            <span className="h-px flex-1 bg-white/10" />
          </div>
          <GoogleLogin
            onSuccess={(credentialResponse) => googleLogin(credentialResponse.credential)}
            onError={() => setMessage("Google login failed.")}
            text={mode === "register" ? "signup_with" : "signin_with"}
            width="100%"
          />
        </div>
      ) : null}

      {/* Status Message */}
      {message ? (
        <div className="rounded border border-white/10 bg-black/60 p-3 text-center text-xs text-slate-300">
          {message}
        </div>
      ) : null}
    </div>
  );
}

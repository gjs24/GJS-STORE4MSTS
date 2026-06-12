"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GoogleLogin } from "@react-oauth/google";
import { API_URL, clearAuth } from "@/lib/api";

type AuthFormProps = {
  mode: "login" | "register";
  portal?: "user" | "admin";
};

export function AuthForm({ mode, portal = "user" }: AuthFormProps) {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const googleEnabled = Boolean(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);
  const router = useRouter();

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
      setMessage("User login successful. Opening user dashboard...");
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
        body: JSON.stringify({ credential })
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

  async function submit(formData: FormData) {
    setLoading(true);
    setMessage("Connecting...");
    if (mode === "login") clearAuth();
    const body = Object.fromEntries(formData.entries());
    const endpoint = mode === "login" ? "/auth/login/" : "/auth/register/";
    try {
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setMessage(data.detail || data.username?.[0] || data.password?.[0] || "Please check your details.");
        return;
      }

      if (mode === "register") {
        setMessage("Account created successfully. Please login with your username and password.");
        router.push("/login");
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
    <form action={submit} className="cinematic-panel mx-auto max-w-md space-y-4 rounded-lg p-6">
      <input name="username" required placeholder="Username" className="w-full rounded border border-white/10 bg-black/40 px-3 py-3" />
      {mode === "register" ? <input name="email" type="email" required placeholder="Email" className="w-full rounded border border-white/10 bg-black/40 px-3 py-3" /> : null}
      <input name="password" required type="password" placeholder="Password" className="w-full rounded border border-white/10 bg-black/40 px-3 py-3" />
      <button disabled={loading} className="w-full rounded bg-rail-red px-4 py-3 font-semibold disabled:opacity-60">
        {loading ? "Please wait..." : mode === "login" ? portal === "admin" ? "Admin Login" : "User Login" : "Create account"}
      </button>
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
      {message ? <p className="text-sm text-slate-300">{message}</p> : null}
    </form>
  );
}

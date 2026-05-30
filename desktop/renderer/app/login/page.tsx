"use client";

import { useState } from "react";
import { login, register } from "@/lib/api";

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [message, setMessage] = useState("");

  async function submit(formData: FormData) {
    setMessage("Connecting to GJS account...");
    try {
      const username = String(formData.get("username") || "");
      const email = String(formData.get("email") || "");
      const password = String(formData.get("password") || "");
      if (mode === "login") await login(username, password);
      else await register(username, email, password);
      setMessage(mode === "login" ? "Logged in successfully." : "Account created. You can log in now.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Authentication failed.");
    }
  }

  return (
    <section className="grid min-h-full place-items-center p-6">
      <form action={submit} className="launcher-panel w-full max-w-md rounded-lg p-6 shadow-forge">
        <p className="text-sm font-bold uppercase text-forge-amber">GJS account</p>
        <h1 className="mt-2 text-3xl font-black">{mode === "login" ? "Login" : "Register"}</h1>
        <div className="mt-6 space-y-3">
          <input name="username" required placeholder="Username" className="w-full rounded border border-white/10 bg-black/35 px-3 py-3 outline-none" />
          {mode === "register" ? <input name="email" type="email" required placeholder="Email" className="w-full rounded border border-white/10 bg-black/35 px-3 py-3 outline-none" /> : null}
          <input name="password" required type="password" placeholder="Password" className="w-full rounded border border-white/10 bg-black/35 px-3 py-3 outline-none" />
        </div>
        <button className="mt-5 w-full rounded bg-forge-red px-4 py-3 font-bold">{mode === "login" ? "Login" : "Create account"}</button>
        <button type="button" onClick={() => setMode(mode === "login" ? "register" : "login")} className="mt-3 w-full rounded border border-white/10 px-4 py-3 text-sm font-bold">
          {mode === "login" ? "Need an account?" : "Already have an account?"}
        </button>
        {message ? <p className="mt-4 text-sm text-slate-300">{message}</p> : null}
      </form>
    </section>
  );
}

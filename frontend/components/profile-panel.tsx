"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { clearAuth, getStoredUser, type CurrentUser } from "@/lib/api";
import { userGet } from "@/lib/store-api";

function displayName(user: CurrentUser) {
  return `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.username;
}

export function ProfilePanel() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [message, setMessage] = useState("Loading profile...");

  useEffect(() => {
    const storedUser = getStoredUser();
    if (storedUser) setUser(storedUser);

    userGet<CurrentUser>("/auth/me/")
      .then((freshUser) => {
        localStorage.setItem("currentUser", JSON.stringify(freshUser));
        setUser(freshUser);
        setMessage("");
      })
      .catch((error) => {
        if (!storedUser) {
          clearAuth();
          setMessage(error instanceof Error ? error.message : "Please login to view your profile.");
        } else {
          setMessage("Showing saved profile. Login again if this looks outdated.");
        }
      });
  }, []);

  if (!user) {
    return (
      <div className="mb-6 rounded border border-white/10 bg-white/[0.03] p-5 text-sm text-slate-300">
        <p>{message}</p>
        <Link href="/login" className="mt-4 inline-flex rounded bg-rail-red px-4 py-2 font-semibold text-white">
          Login
        </Link>
      </div>
    );
  }

  return (
    <section className="mb-6 rounded border border-white/10 bg-white/[0.03] p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rail-amber">Profile</p>
          <h2 className="mt-2 text-2xl font-black text-white">{displayName(user)}</h2>
          <p className="mt-1 text-sm text-slate-400">{user.email || "No email saved"}</p>
        </div>
        <span className="rounded border border-white/10 px-3 py-2 text-xs font-semibold text-slate-300">
          {user.is_staff ? "Admin account" : "Customer account"}
        </span>
      </div>
      <div className="mt-5 grid gap-3 text-sm md:grid-cols-3">
        <div className="rounded border border-white/10 bg-black/20 p-3">
          <p className="text-slate-500">Username</p>
          <p className="mt-1 font-semibold text-slate-100">{user.username}</p>
        </div>
        <div className="rounded border border-white/10 bg-black/20 p-3">
          <p className="text-slate-500">Status</p>
          <p className="mt-1 font-semibold text-slate-100">{user.is_active ? "Active" : "Disabled"}</p>
        </div>
        <div className="rounded border border-white/10 bg-black/20 p-3">
          <p className="text-slate-500">Joined</p>
          <p className="mt-1 font-semibold text-slate-100">{user.date_joined ? new Date(user.date_joined).toLocaleDateString("en-IN") : "Not available"}</p>
        </div>
      </div>
      {message ? <p className="mt-4 text-sm text-slate-400">{message}</p> : null}
    </section>
  );
}

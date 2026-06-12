"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { clearAuth, getStoredUser, type CurrentUser } from "@/lib/api";
import { userGet, userPatch } from "@/lib/store-api";

export function ProfileEditForm() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [message, setMessage] = useState("Loading profile...");
  const [saving, setSaving] = useState(false);

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
        if (!storedUser) clearAuth();
        setMessage(error instanceof Error ? error.message : "Please login to edit your profile.");
      });
  }, []);

  async function saveProfile(formData: FormData) {
    setSaving(true);
    setMessage("Saving profile...");
    try {
      const updated = await userPatch<CurrentUser>("/auth/me/", {
        first_name: formData.get("first_name"),
        last_name: formData.get("last_name"),
        email: formData.get("email")
      });
      localStorage.setItem("currentUser", JSON.stringify(updated));
      setUser(updated);
      setMessage("Profile updated successfully.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update profile.");
    } finally {
      setSaving(false);
    }
  }

  if (!user) {
    return (
      <div className="rounded border border-white/10 bg-white/[0.03] p-6 text-slate-300">
        <p>{message}</p>
        <Link href="/login" className="mt-4 inline-flex rounded bg-rail-red px-4 py-2 text-sm font-semibold text-white">
          Login
        </Link>
      </div>
    );
  }

  return (
    <form action={saveProfile} className="mx-auto max-w-2xl space-y-4 rounded border border-white/10 bg-white/[0.03] p-5">
      <label className="block">
        <span className="text-sm text-slate-300">First name</span>
        <input name="first_name" defaultValue={user.first_name || ""} className="mt-2 w-full rounded border border-white/10 bg-black/40 px-3 py-3" />
      </label>
      <label className="block">
        <span className="text-sm text-slate-300">Last name</span>
        <input name="last_name" defaultValue={user.last_name || ""} className="mt-2 w-full rounded border border-white/10 bg-black/40 px-3 py-3" />
      </label>
      <label className="block">
        <span className="text-sm text-slate-300">Email</span>
        <input name="email" type="email" defaultValue={user.email || ""} className="mt-2 w-full rounded border border-white/10 bg-black/40 px-3 py-3" />
      </label>
      <div className="rounded border border-white/10 bg-black/20 p-3 text-sm text-slate-400">
        Username: <span className="font-semibold text-slate-200">{user.username}</span>
      </div>
      <div className="flex flex-wrap gap-3">
        <button disabled={saving} className="rounded bg-rail-red px-5 py-3 font-semibold text-white disabled:opacity-60">
          <Save className="mr-2 inline" size={18} />
          {saving ? "Saving..." : "Save profile"}
        </button>
        <Link href="/dashboard" className="rounded border border-white/10 px-5 py-3 font-semibold">
          Back to dashboard
        </Link>
      </div>
      {message ? <p className="text-sm text-slate-300">{message}</p> : null}
    </form>
  );
}

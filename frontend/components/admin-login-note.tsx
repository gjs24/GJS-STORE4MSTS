"use client";

import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { getStoredUser } from "@/lib/api";

export function AdminLoginNote() {
  const hasToken = typeof window !== "undefined" && Boolean(localStorage.getItem("accessToken"));
  const parsedUser = getStoredUser();
  if (hasToken && parsedUser?.is_staff) return null;

  if (hasToken && parsedUser && !parsedUser.is_staff) {
    return (
      <div className="mb-5 rounded border border-red-500/30 bg-red-500/10 p-4 text-sm text-slate-200">
        <ShieldAlert className="mr-2 inline text-red-300" size={18} />
        You are logged in as <span className="font-semibold">{parsedUser.username}</span>, but this user is not staff. Logout and use <Link className="font-semibold text-red-200 underline" href="/admin-login">Admin Login</Link>, or run <span className="font-semibold">python manage.py make_staff {parsedUser.username}</span>.
      </div>
    );
  }

  return (
    <div className="mb-5 rounded border border-rail-amber/30 bg-rail-amber/10 p-4 text-sm text-slate-200">
      <ShieldAlert className="mr-2 inline text-rail-amber" size={18} />
      Login with a staff/admin account first, then return here. <Link className="font-semibold text-rail-amber" href="/admin-login">Open admin login</Link>
    </div>
  );
}

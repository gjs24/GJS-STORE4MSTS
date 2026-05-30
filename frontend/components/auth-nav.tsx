"use client";

import Link from "next/link";
import { Gauge, LogOut, ShieldCheck, UserCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { clearAuth, getStoredUser, type CurrentUser } from "@/lib/api";

export function AuthNav() {
  const [user, setUser] = useState<CurrentUser | null>(null);

  useEffect(() => {
    setUser(getStoredUser());
  }, []);

  function logout() {
    clearAuth();
    setUser(null);
    window.location.href = "/login";
  }

  if (!user) {
    return (
      <Link href="/login" className="rounded bg-rail-red px-3 py-2 text-sm font-semibold text-white">
        <Gauge className="mr-1 inline" size={16} /> Login
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Link
        href={user.is_staff ? "/admin-dashboard" : "/dashboard"}
        className="hidden items-center gap-2 rounded border border-white/10 px-3 py-2 text-sm font-semibold text-slate-200 sm:flex"
      >
        {user.is_staff ? <ShieldCheck size={16} className="text-rail-amber" /> : <UserCircle size={16} className="text-rail-amber" />}
        {user.username}
      </Link>
      <button onClick={logout} className="rounded border border-white/10 p-2 text-slate-300 hover:text-white" title="Logout">
        <LogOut size={17} />
      </button>
    </div>
  );
}

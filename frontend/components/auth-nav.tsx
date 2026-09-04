"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Gauge, LogOut, ShieldCheck, UserCircle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { AUTH_CHANGE_EVENT, clearAuth, getStoredUser, type CurrentUser } from "@/lib/api";

export function AuthNav() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const pathname = usePathname();

  const syncUser = useCallback(() => {
    setUser(getStoredUser());
  }, []);

  useEffect(() => {
    syncUser();

    window.addEventListener(AUTH_CHANGE_EVENT, syncUser);
    window.addEventListener("storage", syncUser);

    return () => {
      window.removeEventListener(AUTH_CHANGE_EVENT, syncUser);
      window.removeEventListener("storage", syncUser);
    };
  }, [syncUser, pathname]);

  function logout() {
    clearAuth();
    setUser(null);
    window.location.href = "/login";
  }

  if (!user) {
    return (
      <Link href="/login" className="rounded bg-rail-red px-3 py-2 text-sm font-semibold text-white shadow-glow hover:bg-rail-red/90 transition-colors">
        <Gauge className="mr-1 inline" size={16} /> Login
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Link
        href={user.is_staff ? "/admin-dashboard" : "/dashboard"}
        className="flex items-center gap-2 rounded border border-white/10 px-3 py-2 text-sm font-semibold text-slate-200 hover:text-white hover:border-white/20 transition-colors"
      >
        {user.is_staff ? <ShieldCheck size={16} className="text-rail-amber" /> : <UserCircle size={16} className="text-rail-amber" />}
        <span>{user.username}</span>
      </Link>
      <button
        type="button"
        onClick={logout}
        className="rounded border border-white/10 p-2 text-slate-300 hover:text-white hover:border-white/20 transition-colors"
        title="Logout"
        aria-label="Logout"
      >
        <LogOut size={17} />
      </button>
    </div>
  );
}


"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, Shield } from "lucide-react";
import { getStoredUser, verifyMaintenanceBypass, type SiteSettings } from "@/lib/api";
import { MaintenanceScreen } from "./maintenance-screen";

type MaintenanceGuardProps = {
  children: ReactNode;
  initialSettings: SiteSettings;
};

export function MaintenanceGuard({ children, initialSettings }: MaintenanceGuardProps) {
  const [settings, setSettings] = useState<SiteSettings>(initialSettings);
  const [isStaff, setIsStaff] = useState(false);
  const [isBypassed, setIsBypassed] = useState(false);
  const [mounted, setMounted] = useState(false);

  const pathname = usePathname() || "/";
  const searchParams = useSearchParams();

  useEffect(() => {
    setMounted(true);

    // Clean up any legacy static boolean flags from previous sessions
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("gjs_maint_bypass_valid");
      sessionStorage.removeItem("gjs_maint_bypass");
    }

    // Check staff status from local storage
    const user = getStoredUser();
    if (user?.is_staff) {
      setIsStaff(true);
      return;
    }

    // Token from URL parameter or stored token from current session
    const urlBypass = searchParams?.get("bypass")?.trim();
    const storedToken = typeof window !== "undefined" ? sessionStorage.getItem("gjs_maint_bypass_token")?.trim() : null;

    // Prioritize URL parameter if provided, otherwise check stored token
    const tokenToVerify = urlBypass || storedToken;

    if (tokenToVerify) {
      verifyMaintenanceBypass(tokenToVerify).then((isValid) => {
        if (isValid) {
          if (typeof window !== "undefined") {
            sessionStorage.setItem("gjs_maint_bypass_token", tokenToVerify);
          }
          setIsBypassed(true);
        } else {
          // Token is revoked, changed by admin, or invalid!
          if (typeof window !== "undefined") {
            sessionStorage.removeItem("gjs_maint_bypass_token");
          }
          setIsBypassed(false);
        }
      });
    } else {
      setIsBypassed(false);
    }
  }, [searchParams]);

  const isMaintenanceActive = Boolean(settings.maintenance_mode);

  // Admin dashboard requires staff privileges when maintenance is active.
  // /admin-login and /maintenance are always permitted.
  const isExemptRoute =
    pathname.startsWith("/admin-login") ||
    pathname.startsWith("/maintenance") ||
    (pathname.startsWith("/admin-dashboard") && isStaff);

  if (!isMaintenanceActive || isExemptRoute) {
    return (
      <>
        {isMaintenanceActive && isStaff && (
          <div className="sticky top-0 z-50 flex flex-wrap items-center justify-between gap-3 border-b border-rail-amber/40 bg-rail-amber/90 px-4 py-2 text-xs font-bold text-black shadow-lg">
            <div className="flex items-center gap-2">
              <Shield size={16} />
              <span>
                MAINTENANCE MODE IS ACTIVE — Normal visitors cannot view the store. As an Administrator, you have full access.
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/admin-dashboard/settings"
                className="rounded bg-black px-3 py-1 text-[11px] font-semibold text-white transition hover:bg-black/80"
              >
                Manage Settings
              </Link>
            </div>
          </div>
        )}
        {children}
      </>
    );
  }

  // If client has not mounted yet, render server-safe maintenance screen immediately to avoid flicker
  if (!mounted) {
    return (
      <MaintenanceScreen
        title={settings.maintenance_title}
        message={settings.maintenance_message}
        estimatedEnd={settings.maintenance_estimated_end}
      />
    );
  }

  // If visitor is staff or provided a verified bypass token, let them view the store
  if (isStaff || isBypassed) {
    return (
      <>
        {isStaff ? (
          <div className="sticky top-0 z-50 flex flex-wrap items-center justify-between gap-3 border-b border-rail-amber/40 bg-rail-amber/90 px-4 py-2 text-xs font-bold text-black shadow-lg">
            <div className="flex items-center gap-2">
              <Shield size={16} />
              <span>
                MAINTENANCE MODE IS ACTIVE — You are viewing the store with Administrator privileges.
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/admin-dashboard/settings"
                className="rounded bg-black px-3 py-1 text-[11px] font-semibold text-white transition hover:bg-black/80"
              >
                Manage Settings
              </Link>
            </div>
          </div>
        ) : (
          <div className="sticky top-0 z-50 flex items-center justify-center gap-2 border-b border-rail-amber/40 bg-rail-amber/90 px-4 py-1.5 text-xs font-bold text-black shadow-lg">
            <AlertTriangle size={14} />
            <span>Store Preview Access Active</span>
          </div>
        )}
        {children}
      </>
    );
  }

  // Regular public visitor: display the Maintenance Screen
  return (
    <MaintenanceScreen
      title={settings.maintenance_title}
      message={settings.maintenance_message}
      estimatedEnd={settings.maintenance_estimated_end}
    />
  );
}

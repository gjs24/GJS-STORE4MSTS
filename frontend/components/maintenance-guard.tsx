"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, ExternalLink, Shield } from "lucide-react";
import { getStoredUser, type SiteSettings } from "@/lib/api";
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

  // Admin and maintenance routes are ALWAYS exempt from maintenance blocking
  const isAdminRoute =
    pathname.startsWith("/admin-dashboard") ||
    pathname.startsWith("/admin-login") ||
    pathname.startsWith("/maintenance");

  useEffect(() => {
    setMounted(true);

    // Check staff status from local storage
    const user = getStoredUser();
    if (user?.is_staff) {
      setIsStaff(true);
    }

    // Check bypass token in URL or sessionStorage
    const urlBypass = searchParams?.get("bypass");
    const storedBypass = typeof window !== "undefined" ? sessionStorage.getItem("gjs_maint_bypass") : null;
    const validToken = settings.maintenance_bypass_token?.trim();

    if (validToken) {
      if (urlBypass === validToken) {
        sessionStorage.setItem("gjs_maint_bypass", urlBypass);
        setIsBypassed(true);
      } else if (storedBypass === validToken) {
        setIsBypassed(true);
      }
    }
  }, [searchParams, settings.maintenance_bypass_token]);

  // When maintenance is active and user is staff, show top notification banner while allowing full access
  const isMaintenanceActive = Boolean(settings.maintenance_mode);

  if (!isMaintenanceActive || isAdminRoute) {
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
                href="/maintenance?preview=true"
                className="inline-flex items-center gap-1 rounded bg-black/20 px-2.5 py-1 text-[11px] font-semibold text-black transition hover:bg-black/30"
              >
                <ExternalLink size={12} />
                Preview Maintenance Screen
              </Link>
              <Link
                href="/admin-dashboard/settings"
                className="rounded bg-black px-3 py-1 text-[11px] font-semibold text-white transition hover:bg-black/80"
              >
                Manage in Settings
              </Link>
            </div>
          </div>
        )}
        {children}
      </>
    );
  }

  // If client has not mounted yet, render normal children on server or fallback
  if (!mounted) {
    // If maintenance is on, render server-safe maintenance screen immediately to avoid flicker
    return (
      <MaintenanceScreen
        title={settings.maintenance_title}
        message={settings.maintenance_message}
        estimatedEnd={settings.maintenance_estimated_end}
      />
    );
  }

  // If visitor is staff or provided a valid bypass token, let them view the store
  if (isStaff || isBypassed) {
    return (
      <>
        <div className="sticky top-0 z-50 flex flex-wrap items-center justify-between gap-3 border-b border-rail-amber/40 bg-rail-amber/90 px-4 py-2 text-xs font-bold text-black shadow-lg">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} />
            <span>
              {isStaff
                ? "MAINTENANCE MODE IS ACTIVE — You are viewing the store with Administrator privileges."
                : "MAINTENANCE MODE IS ACTIVE — You are viewing with a Testing Bypass Key."}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/maintenance?preview=true"
              className="inline-flex items-center gap-1 rounded bg-black/20 px-2.5 py-1 text-[11px] font-semibold text-black transition hover:bg-black/30"
            >
              <ExternalLink size={12} />
              Preview Screen
            </Link>
            {isStaff && (
              <Link
                href="/admin-dashboard/settings"
                className="rounded bg-black px-3 py-1 text-[11px] font-semibold text-white transition hover:bg-black/80"
              >
                Manage Settings
              </Link>
            )}
          </div>
        </div>
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

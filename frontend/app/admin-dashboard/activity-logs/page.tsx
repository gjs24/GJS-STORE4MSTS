"use client";

import { useEffect, useState } from "react";
import { AdminLoginNote } from "@/components/admin-login-note";
import { AdminLayout } from "@/components/admin-table";
import { adminGet, type AdminActivityLog } from "@/lib/admin-api";

export default function AdminActivityLogsPage() {
  const [logs, setLogs] = useState<AdminActivityLog[]>([]);

  useEffect(() => {
    adminGet<AdminActivityLog[]>("/admin/activity-logs/", []).then(setLogs);
  }, []);

  return (
    <AdminLayout title="Activity Logs">
      <AdminLoginNote />
      <div className="rounded border border-white/10 bg-white/[0.03]">
        {logs.length ? logs.map((log) => (
          <div key={log.id} className="border-b border-white/10 p-4 text-sm last:border-b-0">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="font-semibold text-white">{log.action}</p>
              <p className="text-xs text-slate-500">{new Date(log.created_at).toLocaleString("en-IN")}</p>
            </div>
            <p className="mt-1 text-slate-300">{log.message}</p>
            <p className="mt-2 text-xs text-slate-500">
              {log.actor?.username || "System"} / {log.target_type || "Store"} {log.target_id ? `#${log.target_id}` : ""}
            </p>
          </div>
        )) : (
          <div className="p-5 text-sm text-slate-400">No admin activity recorded yet.</div>
        )}
      </div>
    </AdminLayout>
  );
}

"use client";

import { useEffect, useState } from "react";
import { AdminLoginNote } from "@/components/admin-login-note";
import { AdminLayout } from "@/components/admin-table";
import { adminGet, adminPatch, type AdminUser } from "@/lib/admin-api";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);

  useEffect(() => {
    adminGet<AdminUser[]>("/admin/users/", []).then(setUsers);
  }, []);

  async function toggleActive(user: AdminUser) {
    const updated = await adminPatch<AdminUser>(`/admin/users/${user.id}/`, { is_active: !user.is_active });
    setUsers((current) => current.map((item) => item.id === updated.id ? updated : item));
  }

  return (
    <AdminLayout title="Manage Users">
      <AdminLoginNote />
      <div className="overflow-hidden rounded border border-white/10">
        <div className="grid gap-2 bg-white/10 p-3 text-xs uppercase text-slate-400 md:grid-cols-[1fr_1fr_100px_120px_120px]">
          <span>User</span><span>Email</span><span>Role</span><span>Status</span><span>Action</span>
        </div>
        {users.length === 0 ? <div className="p-5 text-sm text-slate-400">No users loaded. Login with staff JWT to load users.</div> : null}
        {users.map((user) => (
          <div key={user.id} className="grid items-center gap-2 border-t border-white/10 bg-white/[0.03] p-4 text-sm md:grid-cols-[1fr_1fr_100px_120px_120px]">
            <span>
              <span className="block font-semibold">{user.username}</span>
              <span className="text-xs text-slate-400">Joined {new Date(user.date_joined).toLocaleDateString()}</span>
            </span>
            <span>{user.email || "No email"}</span>
            <span>{user.is_staff ? "Admin" : "User"}</span>
            <span>{user.is_active ? "Active" : "Disabled"}</span>
            <button onClick={() => toggleActive(user)} className="rounded border border-white/10 px-3 py-2 text-sm">
              {user.is_active ? "Disable" : "Activate"}
            </button>
          </div>
        ))}
      </div>
    </AdminLayout>
  );
}

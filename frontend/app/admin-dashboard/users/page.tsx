"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  Search,
  ShieldCheck,
  ShoppingBag,
  UserCheck,
  Users,
  X
} from "lucide-react";
import { AdminLoginNote } from "@/components/admin-login-note";
import { AdminLayout } from "@/components/admin-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { adminGet, adminPatch, type AdminUser } from "@/lib/admin-api";
import { getStoredUser, type CurrentUser } from "@/lib/api";

type RoleFilter = "all" | "staff" | "user";
type StatusFilter = "all" | "active" | "disabled";
type UserSort = "newest" | "oldest" | "purchases_desc" | "username_asc";

function UsersManagementContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [query, setQuery] = useState(searchParams.get("search") || "");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>((searchParams.get("role") as RoleFilter) || "all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>((searchParams.get("status") as StatusFilter) || "all");
  const [sortOrder, setSortOrder] = useState<UserSort>((searchParams.get("sort") as UserSort) || "newest");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    setCurrentUser(getStoredUser());
  }, []);

  useEffect(() => {
    setPage(1);
  }, [query, roleFilter, statusFilter, sortOrder]);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    const queryParts: string[] = [];
    if (roleFilter !== "all") queryParts.push(`role=${roleFilter}`);
    if (statusFilter !== "all") queryParts.push(`status=${statusFilter}`);
    if (query.trim()) queryParts.push(`search=${encodeURIComponent(query.trim())}`);
    if (sortOrder !== "newest") queryParts.push(`ordering=${sortOrder}`);

    const path = queryParts.length ? `/admin/users/?${queryParts.join("&")}` : "/admin/users/";
    try {
      const data = await adminGet<any>(path, []);
      const userList = Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];
      setUsers(userList);
    } catch {
      setFeedback({ type: "error", message: "Failed to load user accounts." });
    } finally {
      setLoading(false);
    }
  }, [query, roleFilter, statusFilter, sortOrder]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const stats = useMemo(() => {
    const total = users.length;
    const staffCount = users.filter((u) => u.is_staff).length;
    const activeCount = users.filter((u) => u.is_active).length;
    const buyersCount = users.filter((u) => (u.paid_orders_count || 0) > 0).length;
    return { total, staffCount, activeCount, buyersCount };
  }, [users]);

  const sortedUsers = useMemo(() => {
    const list = [...users];
    if (sortOrder === "oldest") {
      list.sort((a, b) => new Date(a.date_joined).getTime() - new Date(b.date_joined).getTime());
    } else if (sortOrder === "purchases_desc") {
      list.sort((a, b) => (b.paid_orders_count || 0) - (a.paid_orders_count || 0));
    } else if (sortOrder === "username_asc") {
      list.sort((a, b) => a.username.localeCompare(b.username));
    } else {
      list.sort((a, b) => new Date(b.date_joined).getTime() - new Date(a.date_joined).getTime());
    }
    return list;
  }, [users, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(sortedUsers.length / itemsPerPage));
  const currentPage = Math.min(page, totalPages);
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedUsers.slice(start, start + itemsPerPage);
  }, [sortedUsers, currentPage, itemsPerPage]);

  async function toggleActive(user: AdminUser) {
    if (currentUser && currentUser.username === user.username && user.is_active) {
      setFeedback({ type: "error", message: "Safety restriction: You cannot deactivate your own active admin account." });
      return;
    }

    const actionName = user.is_active ? "disable" : "activate";
    if (!window.confirm(`Are you sure you want to ${actionName} account "${user.username}"?`)) {
      return;
    }

    setProcessingId(user.id);
    setFeedback(null);
    try {
      const updated = await adminPatch<AdminUser>(`/admin/users/${user.id}/`, { is_active: !user.is_active });
      setUsers((current) => current.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)));
      setFeedback({
        type: "success",
        message: `Account "${user.username}" has been ${updated.is_active ? "activated" : "disabled"}.`,
      });
    } catch (error) {
      setFeedback({
        type: "error",
        message: error instanceof Error ? error.message : "Failed to update account status.",
      });
    } finally {
      setProcessingId(null);
    }
  }

  async function toggleStaff(user: AdminUser) {
    if (currentUser && currentUser.username === user.username && user.is_staff) {
      setFeedback({ type: "error", message: "Safety restriction: You cannot remove staff administrator privileges from your own account." });
      return;
    }

    const nextStaff = !user.is_staff;
    const message = nextStaff
      ? `Grant staff/admin permissions to "${user.username}"? This user will have access to all store management controls.`
      : `Revoke staff permissions from "${user.username}"?`;

    if (!window.confirm(message)) return;

    setProcessingId(user.id);
    setFeedback(null);
    try {
      const updated = await adminPatch<AdminUser>(`/admin/users/${user.id}/`, { is_staff: nextStaff });
      setUsers((current) => current.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)));
      setFeedback({
        type: "success",
        message: `Staff permissions ${nextStaff ? "granted to" : "revoked from"} "${user.username}".`,
      });
    } catch (error) {
      setFeedback({
        type: "error",
        message: error instanceof Error ? error.message : "Failed to update staff permissions.",
      });
    } finally {
      setProcessingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <AdminLoginNote />

      {feedback ? (
        <div
          className={`flex items-center justify-between gap-3 rounded-lg border p-4 text-sm ${
            feedback.type === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
              : "border-red-500/30 bg-red-500/10 text-red-300"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="rounded p-1 hover:bg-white/10">
            <X size={14} />
          </button>
        </div>
      ) : null}

      {/* Summary KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="glass-card">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Registered</span>
              <Users size={20} className="text-cyan-400" />
            </div>
            <p className="mt-3 text-3xl font-black text-white">{stats.total}</p>
            <p className="mt-1 text-xs text-slate-400">Store user accounts</p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Staff / Admins</span>
              <ShieldCheck size={20} className="text-rail-amber" />
            </div>
            <p className="mt-3 text-3xl font-black text-white">{stats.staffCount}</p>
            <p className="mt-1 text-xs text-slate-400">Admin privilege holders</p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Active Accounts</span>
              <UserCheck size={20} className="text-emerald-400" />
            </div>
            <p className="mt-3 text-3xl font-black text-white">{stats.activeCount}</p>
            <p className="mt-1 text-xs text-slate-400">Enabled accounts</p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Paying Customers</span>
              <ShoppingBag size={20} className="text-rail-red" />
            </div>
            <p className="mt-3 text-3xl font-black text-white">{stats.buyersCount}</p>
            <p className="mt-1 text-xs text-slate-400">Completed at least 1 paid order</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_160px_160px_180px]">
        <div className="relative sm:col-span-2 lg:col-span-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by username, email, or name..."
            className="w-full rounded-lg border border-white/10 bg-black/40 py-2.5 pl-9 pr-8 text-sm text-white outline-none focus:border-rail-red"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
            >
              <X size={14} />
            </button>
          ) : null}
        </div>

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as RoleFilter)}
          className="rounded-lg border border-white/10 bg-black/50 px-3 py-2.5 text-sm text-white outline-none focus:border-rail-red"
        >
          <option value="all">All Roles</option>
          <option value="staff">Staff / Admins</option>
          <option value="user">Regular Customers</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="rounded-lg border border-white/10 bg-black/50 px-3 py-2.5 text-sm text-white outline-none focus:border-rail-red"
        >
          <option value="all">All Statuses</option>
          <option value="active">Active Only</option>
          <option value="disabled">Disabled Only</option>
        </select>

        <select
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value as UserSort)}
          className="rounded-lg border border-white/10 bg-black/50 px-3 py-2.5 text-sm text-white outline-none focus:border-rail-red"
        >
          <option value="newest">Sort: Newest Joined</option>
          <option value="oldest">Sort: Oldest Joined</option>
          <option value="purchases_desc">Most Purchases</option>
          <option value="username_asc">Username (A–Z)</option>
        </select>
      </div>

      {/* Users Table */}
      <div className="overflow-hidden rounded-lg border border-white/10 bg-white/[0.02]">
        <div className="grid gap-2 bg-white/10 p-3 text-xs uppercase tracking-wider text-slate-400 md:grid-cols-[1.5fr_1.3fr_110px_110px_110px_180px]">
          <span>User Details</span>
          <span>Contact Email</span>
          <span>Role</span>
          <span>Purchases</span>
          <span>Status</span>
          <span>Actions</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-slate-400">Loading user accounts...</div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-400">
            {query || roleFilter !== "all" || statusFilter !== "all"
              ? "No users match the active filters or search term."
              : "No user accounts found."}
          </div>
        ) : (
          paginatedUsers.map((user) => {
            const isSelf = currentUser?.username === user.username;
            return (
              <div
                key={user.id}
                className={`grid items-center gap-3 border-t border-white/10 p-4 text-sm transition md:grid-cols-[1.5fr_1.3fr_110px_110px_110px_180px] ${
                  isSelf ? "bg-rail-red/[0.05]" : "hover:bg-white/[0.03]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/10 font-bold text-white uppercase">
                    {(user.username || "U").slice(0, 2)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white truncate">{user.username}</span>
                      {isSelf ? <span className="rounded bg-rail-red px-1.5 py-0.2 text-[10px] font-bold text-white">YOU</span> : null}
                    </div>
                    <span className="block text-xs text-slate-400">
                      {user.first_name || user.last_name
                        ? `${user.first_name} ${user.last_name}`.trim()
                        : "No full name"}
                    </span>
                    <span className="block text-[11px] text-slate-500">
                      Joined {new Date(user.date_joined).toLocaleDateString("en-IN", { dateStyle: "medium" })}
                    </span>
                  </div>
                </div>

                <div className="truncate">
                  <span className="text-slate-200">{user.email || "No email on file"}</span>
                </div>

                <div>
                  <Badge variant={user.is_staff ? "warning" : "default"}>
                    {user.is_staff ? "Staff Admin" : "Customer"}
                  </Badge>
                </div>

                <div>
                  <span className="font-semibold text-white">
                    {user.paid_orders_count || 0}{" "}
                    <span className="text-xs font-normal text-slate-400">orders</span>
                  </span>
                </div>

                <div>
                  <Badge variant={user.is_active ? "success" : "muted"}>
                    {user.is_active ? "Active" : "Disabled"}
                  </Badge>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    variant={user.is_active ? "ghost" : "secondary"}
                    disabled={processingId === user.id || (isSelf && user.is_active)}
                    onClick={() => toggleActive(user)}
                    className="h-8 text-xs font-semibold"
                    title={isSelf && user.is_active ? "Cannot deactivate own account" : undefined}
                  >
                    {user.is_active ? "Disable" : "Activate"}
                  </Button>

                  <Button
                    size="sm"
                    variant={user.is_staff ? "ghost" : "secondary"}
                    disabled={processingId === user.id || (isSelf && user.is_staff)}
                    onClick={() => toggleStaff(user)}
                    className="h-8 text-xs font-semibold"
                    title={isSelf && user.is_staff ? "Cannot demote own account" : undefined}
                  >
                    {user.is_staff ? "Revoke Staff" : "Make Staff"}
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination Controls */}
      {!loading && users.length > 0 ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-t border-white/10 pt-4">
          <p className="text-xs text-slate-400">
            Showing <span className="font-semibold text-white">{(currentPage - 1) * itemsPerPage + 1}</span>–
            <span className="font-semibold text-white">{Math.min(currentPage * itemsPerPage, users.length)}</span> of{" "}
            <span className="font-semibold text-white">{users.length}</span> user accounts
          </p>

          {totalPages > 1 ? (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                disabled={currentPage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="h-8 px-3 text-xs"
              >
                Previous
              </Button>
              <div className="flex items-center gap-1 text-xs text-slate-300">
                <span className="rounded bg-white/10 px-2.5 py-1 font-bold text-white">
                  {currentPage}
                </span>
                <span className="text-slate-500">/</span>
                <span className="px-1 text-slate-400">{totalPages}</span>
              </div>
              <Button
                size="sm"
                variant="secondary"
                disabled={currentPage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="h-8 px-3 text-xs"
              >
                Next
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export default function AdminUsersPage() {
  return (
    <AdminLayout title="Manage Users">
      <Suspense fallback={<div className="p-8 text-center text-slate-400">Loading users console...</div>}>
        <UsersManagementContent />
      </Suspense>
    </AdminLayout>
  );
}

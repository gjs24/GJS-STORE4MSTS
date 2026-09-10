"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  Gift,
  Lock,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  UserCheck,
  Users,
  X
} from "lucide-react";
import { AdminLoginNote } from "@/components/admin-login-note";
import { AdminLayout } from "@/components/admin-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { adminGet, adminPatch, adminGetSpecialAccess, adminUpdateSpecialAccess, type AdminUser } from "@/lib/admin-api";
import { getStoredUser, type Asset, type CurrentUser } from "@/lib/api";

type RoleFilter = "all" | "special" | "staff" | "user";
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

  // Special Free Access Modal State
  const [specialUser, setSpecialUser] = useState<AdminUser | null>(null);
  const [specialAllAccess, setSpecialAllAccess] = useState(false);
  const [specialNote, setSpecialNote] = useState("");
  const [specialExpiresAt, setSpecialExpiresAt] = useState("");
  const [specialGrantedAssets, setSpecialGrantedAssets] = useState<number[]>([]);
  const [availableAssets, setAvailableAssets] = useState<Asset[]>([]);
  const [savingSpecial, setSavingSpecial] = useState(false);
  const [specialFeedback, setSpecialFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

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
    const specialCount = users.filter((u) => Boolean(u.special_access?.is_all_access_free || (u.special_access?.granted_assets && u.special_access.granted_assets.length > 0))).length;
    return { total, staffCount, activeCount, buyersCount, specialCount };
  }, [users]);

  const sortedUsers = useMemo(() => {
    let list = [...users];
    if (roleFilter === "special") {
      list = list.filter((u) => Boolean(u.special_access?.is_all_access_free || (u.special_access?.granted_assets && u.special_access.granted_assets.length > 0)));
    }
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
  }, [users, sortOrder, roleFilter]);

  const totalPages = Math.max(1, Math.ceil(sortedUsers.length / itemsPerPage));
  const currentPage = Math.min(page, totalPages);
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedUsers.slice(start, start + itemsPerPage);
  }, [sortedUsers, currentPage, itemsPerPage]);

  async function openSpecialModal(user: AdminUser) {
    setSpecialUser(user);
    setSpecialFeedback(null);
    setSpecialAllAccess(Boolean(user.special_access?.is_all_access_free));
    setSpecialNote(user.special_access?.admin_note || "");
    setSpecialExpiresAt(user.special_access?.expires_at ? user.special_access.expires_at.slice(0, 16) : "");
    setSpecialGrantedAssets(user.special_access?.granted_assets || []);

    if (availableAssets.length === 0) {
      try {
        const data = await adminGet<any>("/admin/assets/?page_size=100", []);
        const list = Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];
        setAvailableAssets(list);
      } catch {
        // ignore
      }
    }

    try {
      const fresh = await adminGetSpecialAccess(user.id);
      if (fresh) {
        setSpecialAllAccess(Boolean(fresh.is_all_access_free));
        setSpecialNote(fresh.admin_note || "");
        setSpecialExpiresAt(fresh.expires_at ? fresh.expires_at.slice(0, 16) : "");
        setSpecialGrantedAssets(fresh.granted_assets || []);
      }
    } catch {
      // ignore
    }
  }

  async function handleSaveSpecialAccess() {
    if (!specialUser) return;
    setSavingSpecial(true);
    setSpecialFeedback(null);
    try {
      const updated = await adminUpdateSpecialAccess(specialUser.id, {
        is_all_access_free: specialAllAccess,
        admin_note: specialNote.trim(),
        expires_at: specialExpiresAt ? new Date(specialExpiresAt).toISOString() : null,
        granted_asset_ids: specialGrantedAssets,
      });

      setUsers((prev) =>
        prev.map((u) =>
          u.id === specialUser.id
            ? { ...u, special_access: updated }
            : u
        )
      );

      setSpecialFeedback({
        type: "success",
        message: specialAllAccess
          ? `🎉 Storewide Free All-Access Pass successfully granted to ${specialUser.username}!`
          : `Special access permissions updated for ${specialUser.username}.`,
      });

      setFeedback({
        type: "success",
        message: `Special access permissions updated for ${specialUser.username}.`,
      });

      setTimeout(() => {
        setSpecialUser(null);
      }, 1200);
    } catch (error: any) {
      setSpecialFeedback({
        type: "error",
        message: error?.message || "Failed to save special access permissions.",
      });
    } finally {
      setSavingSpecial(false);
    }
  }

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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
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

        <Card className="glass-card border-purple-500/30 bg-purple-950/10">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-purple-300">VIP Free Passes</span>
              <Gift size={20} className="text-purple-400" />
            </div>
            <p className="mt-3 text-3xl font-black text-purple-200">{stats.specialCount}</p>
            <p className="mt-1 text-xs text-purple-300/70">Special friends / testers</p>
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
          <option value="special">⭐ VIP Free Pass Only</option>
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
        <div className="grid gap-2 bg-white/10 p-3 text-xs uppercase tracking-wider text-slate-400 md:grid-cols-[1.4fr_1.2fr_130px_90px_90px_240px]">
          <span>User Details</span>
          <span>Contact Email</span>
          <span>Role & VIP Pass</span>
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
            const hasSpecial = Boolean(user.special_access?.is_all_access_free);
            const grantedCount = user.special_access?.granted_assets?.length || 0;

            return (
              <div
                key={user.id}
                className={`grid items-center gap-3 border-t border-white/10 p-4 text-sm transition md:grid-cols-[1.4fr_1.2fr_130px_90px_90px_240px] ${
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

                <div className="space-y-1">
                  <Badge variant={user.is_staff ? "warning" : "default"}>
                    {user.is_staff ? "Staff Admin" : "Customer"}
                  </Badge>
                  {hasSpecial ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/20 border border-purple-400/40 px-2 py-0.5 text-[10px] font-bold text-purple-300 shadow-sm">
                      <Sparkles size={10} className="text-purple-300" />
                      Free All-Access
                    </span>
                  ) : grantedCount > 0 ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/20 border border-purple-400/40 px-2 py-0.5 text-[10px] font-bold text-purple-300">
                      <Gift size={10} />
                      {grantedCount} Free items
                    </span>
                  ) : null}
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

                <div className="flex flex-wrap items-center gap-1.5">
                  <Button
                    size="sm"
                    variant={hasSpecial ? "default" : "secondary"}
                    onClick={() => openSpecialModal(user)}
                    className={`h-8 text-xs font-semibold ${
                      hasSpecial
                        ? "bg-purple-600 hover:bg-purple-500 text-white border border-purple-400/40 shadow-sm"
                        : "hover:border-purple-400/50 hover:text-purple-300"
                    }`}
                    title="Grant or configure special free download permissions"
                  >
                    <Gift size={13} className="mr-1 text-purple-300" />
                    <span>{hasSpecial ? "VIP Pass" : "Special Access"}</span>
                  </Button>

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
                    {user.is_staff ? "Revoke" : "Staff"}
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

      {/* Special Access Management Modal Dialog */}
      {specialUser ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150">
          <div className="relative w-full max-w-lg rounded-2xl border border-purple-500/40 bg-gradient-to-b from-zinc-900 via-zinc-950 to-black p-6 shadow-2xl space-y-5">
            {/* Modal Close Button */}
            <button
              type="button"
              onClick={() => !savingSpecial && setSpecialUser(null)}
              disabled={savingSpecial}
              className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition"
            >
              <X size={18} />
            </button>

            {/* Header */}
            <div className="flex items-start gap-3.5 border-b border-white/10 pb-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-purple-600/20 border border-purple-500/30 text-purple-300">
                <Gift size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>Special Free Access Pass</span>
                  <span className="rounded bg-purple-500/20 border border-purple-400/40 px-2 py-0.5 text-[10px] font-black uppercase text-purple-300">
                    Admin Stealth
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Configure complimentary free download access for user{" "}
                  <strong className="text-white">{specialUser.username}</strong> ({specialUser.email || "no email"}).
                </p>
                <p className="text-[11px] text-purple-300/80 mt-1 flex items-center gap-1">
                  <Lock size={11} />
                  <span>Invisible to other users. Normal customers will never see this option anywhere.</span>
                </p>
              </div>
            </div>

            {/* Status Feedback in Modal */}
            {specialFeedback ? (
              <div
                className={`flex items-center gap-2 rounded-lg border p-3 text-xs font-semibold ${
                  specialFeedback.type === "success"
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                    : "border-red-500/40 bg-red-500/10 text-red-300"
                }`}
              >
                {specialFeedback.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                <span>{specialFeedback.message}</span>
              </div>
            ) : null}

            {/* Form Controls */}
            <div className="space-y-4 text-xs">
              {/* Master Toggle: Storewide All-Access */}
              <div
                onClick={() => setSpecialAllAccess(!specialAllAccess)}
                className={`cursor-pointer rounded-xl border p-4 transition-all duration-200 ${
                  specialAllAccess
                    ? "border-purple-500 bg-purple-500/[0.12] ring-1 ring-purple-500/50 shadow-lg shadow-purple-500/10"
                    : "border-white/10 bg-white/[0.02] hover:border-white/20"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="font-bold text-white text-sm flex items-center gap-1.5">
                      <Sparkles size={16} className={specialAllAccess ? "text-purple-400" : "text-slate-500"} />
                      Storewide All-Access Pass (Everything Free)
                    </span>
                    <p className="text-slate-400 text-xs max-w-md leading-relaxed">
                      When enabled, this user can download <strong className="text-white">ANY product</strong> across the entire store for free with standard 1-click downloads.
                    </p>
                  </div>
                  <div
                    className={`h-6 w-11 rounded-full p-0.5 transition-colors shrink-0 ${
                      specialAllAccess ? "bg-purple-600" : "bg-zinc-700"
                    }`}
                  >
                    <div
                      className={`h-5 w-5 rounded-full bg-white transition-transform ${
                        specialAllAccess ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Specific Products Selection (if all-access is false) */}
              {!specialAllAccess && availableAssets.length > 0 ? (
                <div className="space-y-2 rounded-xl border border-white/10 bg-black/40 p-3.5">
                  <label className="font-bold uppercase tracking-wider text-slate-300 text-[11px]">
                    Or Select Specific Free Products:
                  </label>
                  <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1 text-xs">
                    {availableAssets.map((asset) => {
                      const isSelected = specialGrantedAssets.includes(asset.id);
                      return (
                        <label
                          key={asset.id}
                          className={`flex items-center justify-between rounded-lg border p-2 cursor-pointer transition ${
                            isSelected
                              ? "border-purple-500/60 bg-purple-500/20 text-white font-medium"
                              : "border-white/5 bg-white/[0.02] text-slate-300 hover:bg-white/[0.05]"
                          }`}
                        >
                          <span className="truncate pr-2">{asset.title}</span>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSpecialGrantedAssets([...specialGrantedAssets, asset.id]);
                              } else {
                                setSpecialGrantedAssets(specialGrantedAssets.filter((id) => id !== asset.id));
                              }
                            }}
                            className="rounded accent-purple-500"
                          />
                        </label>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {/* Internal Admin Note */}
              <div className="space-y-1.5">
                <label className="font-bold uppercase tracking-wider text-slate-300 text-[11px]">
                  Private Admin Note / Friendship Reason
                </label>
                <input
                  type="text"
                  value={specialNote}
                  onChange={(e) => setSpecialNote(e.target.value)}
                  placeholder="e.g. Close friend / Beta Tester / YouTube Reviewer"
                  className="w-full rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-xs text-white outline-none focus:border-purple-400 placeholder:text-slate-600"
                />
                <p className="text-[10px] text-slate-500">
                  🔒 Strictly private for store admins. Never displayed to the user or anyone else.
                </p>
              </div>

              {/* Optional Expiration Date */}
              <div className="space-y-1.5">
                <label className="font-bold uppercase tracking-wider text-slate-300 text-[11px]">
                  Pass Duration / Expiration (Optional)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="datetime-local"
                    value={specialExpiresAt}
                    onChange={(e) => setSpecialExpiresAt(e.target.value)}
                    className="flex-1 rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-xs text-white outline-none focus:border-purple-400"
                  />
                  {specialExpiresAt ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setSpecialExpiresAt("")}
                      className="h-8 text-xs text-slate-400 hover:text-white"
                    >
                      Clear (Permanent)
                    </Button>
                  ) : (
                    <span className="text-emerald-400 text-xs font-semibold px-2">Permanent (No Expiry)</span>
                  )}
                </div>
              </div>
            </div>

            {/* Footer Controls */}
            <div className="flex items-center justify-end gap-3 border-t border-white/10 pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setSpecialUser(null)}
                disabled={savingSpecial}
                className="h-9 px-4 text-xs font-semibold text-slate-300 hover:text-white"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSaveSpecialAccess}
                disabled={savingSpecial}
                className="h-9 px-5 text-xs font-bold bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-500 hover:to-indigo-500 shadow-md shadow-purple-600/20"
              >
                {savingSpecial ? "Saving Permissions..." : "Save Special Access"}
              </Button>
            </div>
          </div>
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

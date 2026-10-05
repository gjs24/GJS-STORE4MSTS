"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Copy,
  Edit,
  Eye,
  EyeOff,
  Gift,
  KeyRound,
  Link2,
  Lock,
  Mail,
  Phone,
  Plus,
  Search,
  Send,
  Share2,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Trash2,
  User,
  UserCheck,
  Users,
  X
} from "lucide-react";
import { AdminLoginNote } from "@/components/admin-login-note";
import { AdminLayout } from "@/components/admin-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  adminGet,
  adminPatch,
  adminGetSpecialAccess,
  adminUpdateSpecialAccess,
  adminSendSpecialAccessEmail,
  adminGetSpecialAccessLinks,
  adminCreateSpecialAccessLink,
  adminUpdateSpecialAccessLink,
  adminDeleteSpecialAccessLink,
  adminGetSpecialAccessRequests,
  adminApproveSpecialAccessRequest,
  adminRejectSpecialAccessRequest,
  type AdminUser,
  type SpecialAccessInviteLink,
  type SpecialAccessClaimRequest
} from "@/lib/admin-api";
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
  const [specialGrantedBoards, setSpecialGrantedBoards] = useState<string[]>([]);
  const [availableAssets, setAvailableAssets] = useState<Asset[]>([]);
  const [availableBoardTemplates, setAvailableBoardTemplates] = useState<
    Array<{ id: string; name: string; category?: string; is_paid?: boolean; price?: string | number }>
  >([]);
  const [savingSpecial, setSavingSpecial] = useState(false);
  const [specialFeedback, setSpecialFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [sendEmailNotification, setSendEmailNotification] = useState(true);
  const [customEmailSubject, setCustomEmailSubject] = useState("");
  const [customEmailBody, setCustomEmailBody] = useState("");
  const [showEmailCustomizer, setShowEmailCustomizer] = useState(false);
  const [sendingEmailDirectly, setSendingEmailDirectly] = useState(false);
  const [emailDirectFeedback, setEmailDirectFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Special Access Link Generator & Requests State
  const [showLinkGenerator, setShowLinkGenerator] = useState(false);
  const [inviteLinks, setInviteLinks] = useState<SpecialAccessInviteLink[]>([]);
  const [claimRequests, setClaimRequests] = useState<SpecialAccessClaimRequest[]>([]);
  const [loadingLinks, setLoadingLinks] = useState(false);
  const [creatingLink, setCreatingLink] = useState(false);
  const [newLinkTitle, setNewLinkTitle] = useState("VIP Special Access Invite");
  const [newLinkMode, setNewLinkMode] = useState<"APPROVAL" | "AUTO_GRANT">("APPROVAL");
  const [newLinkAllAccess, setNewLinkAllAccess] = useState(true);
  const [newLinkAssetIds, setNewLinkAssetIds] = useState<number[]>([]);
  const [newLinkBoardIds, setNewLinkBoardIds] = useState<string[]>([]);
  const [newLinkMaxUses, setNewLinkMaxUses] = useState<number>(1);
  const [newLinkAccessExpiresAt, setNewLinkAccessExpiresAt] = useState("");
  const [newLinkExpiresAt, setNewLinkExpiresAt] = useState("");
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [processingRequestId, setProcessingRequestId] = useState<number | null>(null);

  // Edit User Details Modal State
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [editUsername, setEditUsername] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editIsActive, setEditIsActive] = useState(true);
  const [editIsStaff, setEditIsStaff] = useState(false);
  const [editNewPassword, setEditNewPassword] = useState("");
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editFeedback, setEditFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const loadLinksAndRequests = useCallback(async () => {
    setLoadingLinks(true);
    try {
      const [linksData, reqsData] = await Promise.all([
        adminGetSpecialAccessLinks(),
        adminGetSpecialAccessRequests()
      ]);
      setInviteLinks(linksData);
      setClaimRequests(reqsData);
    } catch {
      // ignore
    } finally {
      setLoadingLinks(false);
    }
  }, []);

  useEffect(() => {
    setCurrentUser(getStoredUser());
    loadLinksAndRequests();
  }, [loadLinksAndRequests]);

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

  const loadBoardTemplatesIfNeeded = useCallback(async () => {
    if (availableBoardTemplates.length > 0) return;
    try {
      const data = await adminGet<any>("/board-templates/?page_size=100", []);
      const list = Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];
      setAvailableBoardTemplates(list);
    } catch {
      // ignore
    }
  }, [availableBoardTemplates.length]);

  const stats = useMemo(() => {
    const total = users.length;
    const staffCount = users.filter((u) => u.is_staff).length;
    const activeCount = users.filter((u) => u.is_active).length;
    const buyersCount = users.filter((u) => (u.paid_orders_count || 0) > 0).length;
    const specialCount = users.filter((u) =>
      Boolean(
        u.special_access?.is_all_access_free ||
          (u.special_access?.granted_assets && u.special_access.granted_assets.length > 0) ||
          (u.special_access?.granted_board_templates && u.special_access.granted_board_templates.length > 0)
      )
    ).length;
    return { total, staffCount, activeCount, buyersCount, specialCount };
  }, [users]);

  const sortedUsers = useMemo(() => {
    let list = [...users];
    if (roleFilter === "special") {
      list = list.filter((u) =>
        Boolean(
          u.special_access?.is_all_access_free ||
            (u.special_access?.granted_assets && u.special_access.granted_assets.length > 0) ||
            (u.special_access?.granted_board_templates && u.special_access.granted_board_templates.length > 0)
        )
      );
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
    setEmailDirectFeedback(null);
    setSendEmailNotification(Boolean(user.email));
    setCustomEmailSubject("");
    setCustomEmailBody("");
    setShowEmailCustomizer(false);
    setSpecialAllAccess(Boolean(user.special_access?.is_all_access_free));
    setSpecialNote(user.special_access?.admin_note || "");
    setSpecialExpiresAt(user.special_access?.expires_at ? user.special_access.expires_at.slice(0, 16) : "");
    setSpecialGrantedAssets(user.special_access?.granted_assets || []);
    setSpecialGrantedBoards(user.special_access?.granted_board_templates || []);

    if (availableAssets.length === 0) {
      try {
        const data = await adminGet<any>("/admin/assets/?page_size=100", []);
        const list = Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];
        setAvailableAssets(list);
      } catch {
        // ignore
      }
    }
    loadBoardTemplatesIfNeeded();

    try {
      const fresh = await adminGetSpecialAccess(user.id);
      if (fresh) {
        setSpecialAllAccess(Boolean(fresh.is_all_access_free));
        setSpecialNote(fresh.admin_note || "");
        setSpecialExpiresAt(fresh.expires_at ? fresh.expires_at.slice(0, 16) : "");
        setSpecialGrantedAssets(fresh.granted_assets || []);
        setSpecialGrantedBoards(fresh.granted_board_templates || []);
      }
    } catch {
      // ignore
    }
  }

  async function handleSendEmailDirectly() {
    if (!specialUser) return;
    if (!specialUser.email) {
      setEmailDirectFeedback({
        type: "error",
        message: "This user does not have an email address on file.",
      });
      return;
    }

    setSendingEmailDirectly(true);
    setEmailDirectFeedback(null);
    try {
      const res = await adminSendSpecialAccessEmail(specialUser.id, {
        custom_subject: customEmailSubject.trim() || undefined,
        custom_body: customEmailBody.trim() || undefined,
      });
      setEmailDirectFeedback({
        type: "success",
        message: res.message || `Announcement email successfully sent to ${specialUser.email}!`,
      });
    } catch (error: any) {
      setEmailDirectFeedback({
        type: "error",
        message: error?.message || "Failed to deliver announcement email.",
      });
    } finally {
      setSendingEmailDirectly(false);
    }
  }

  async function handleSaveSpecialAccess() {
    if (!specialUser) return;
    setSavingSpecial(true);
    setSpecialFeedback(null);
    setEmailDirectFeedback(null);
    try {
      const updated = await adminUpdateSpecialAccess(specialUser.id, {
        is_all_access_free: specialAllAccess,
        admin_note: specialNote.trim(),
        expires_at: specialExpiresAt ? new Date(specialExpiresAt).toISOString() : null,
        granted_asset_ids: specialGrantedAssets,
        granted_board_template_ids: specialGrantedBoards,
        send_email_notification: sendEmailNotification && Boolean(specialUser.email),
        custom_email_subject: customEmailSubject.trim() || undefined,
        custom_email_body: customEmailBody.trim() || undefined,
      });

      setUsers((prev) =>
        prev.map((u) =>
          u.id === specialUser.id
            ? { ...u, special_access: updated }
            : u
        )
      );

      let msg = specialAllAccess
        ? `🎉 Storewide Free All-Access Pass successfully granted to ${specialUser.username}!`
        : `Special access permissions updated for ${specialUser.username}.`;

      if (updated.email_status) {
        if (updated.email_status.sent) {
          msg += ` ✉️ Announcement email delivered to ${updated.email_status.recipient}.`;
        } else if (updated.email_status.error) {
          msg += ` (Note: Email delivery failed: ${updated.email_status.error})`;
        }
      }

      setSpecialFeedback({
        type: "success",
        message: msg,
      });

      setFeedback({
        type: "success",
        message: msg,
      });

      setTimeout(() => {
        setSpecialUser(null);
      }, 1600);
    } catch (error: any) {
      setSpecialFeedback({
        type: "error",
        message: error?.message || "Failed to save special access permissions.",
      });
    } finally {
      setSavingSpecial(false);
    }
  }

  function openEditModal(user: AdminUser) {
    setEditingUser(user);
    setEditUsername(user.username || "");
    setEditEmail(user.email || "");
    setEditPhone(user.phone_number || "");
    setEditFirstName(user.first_name || "");
    setEditLastName(user.last_name || "");
    setEditIsActive(Boolean(user.is_active));
    setEditIsStaff(Boolean(user.is_staff));
    setEditNewPassword("");
    setShowEditPassword(false);
    setEditFeedback(null);
  }

  async function handleSaveUserEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingUser) return;

    if (!editUsername.trim()) {
      setEditFeedback({ type: "error", message: "Username cannot be empty." });
      return;
    }

    if (editPhone.trim() && editPhone.replace(/\D/g, "").length !== 10) {
      setEditFeedback({ type: "error", message: "Mobile number must be exactly 10 digits (or leave blank)." });
      return;
    }

    if (editNewPassword.trim() && editNewPassword.trim().length < 8) {
      setEditFeedback({ type: "error", message: "New password must be at least 8 characters long." });
      return;
    }

    if (currentUser && currentUser.username === editingUser.username) {
      if (!editIsActive) {
        setEditFeedback({ type: "error", message: "Safety restriction: You cannot deactivate your own admin account." });
        return;
      }
      if (!editIsStaff) {
        setEditFeedback({ type: "error", message: "Safety restriction: You cannot remove staff status from your own account." });
        return;
      }
    }

    setSavingEdit(true);
    setEditFeedback(null);

    const payload: Record<string, any> = {
      username: editUsername.trim(),
      email: editEmail.trim().toLowerCase(),
      first_name: editFirstName.trim(),
      last_name: editLastName.trim(),
      phone_number: editPhone.replace(/\D/g, "").slice(-10),
      is_active: editIsActive,
      is_staff: editIsStaff,
    };

    if (editNewPassword.trim()) {
      payload.new_password = editNewPassword.trim();
    }

    try {
      const updated = await adminPatch<AdminUser>(`/admin/users/${editingUser.id}/`, payload);
      setUsers((prev) => prev.map((u) => (u.id === editingUser.id ? { ...u, ...updated } : u)));
      setEditFeedback({ type: "success", message: `Account details for "${updated.username}" updated successfully!` });
      setFeedback({ type: "success", message: `User "${updated.username}" updated successfully.` });
      setEditingUser(updated);
      setEditNewPassword("");
    } catch (err: any) {
      setEditFeedback({ type: "error", message: err?.message || "Failed to update user details." });
    } finally {
      setSavingEdit(false);
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

  function buildShareableUrl(tokenStr: string) {
    const origin = typeof window !== "undefined" ? window.location.origin : "https://gjs-store.vercel.app";
    return `${origin}/special-access?token=${encodeURIComponent(tokenStr)}`;
  }

  async function openLinkGeneratorModal() {
    setShowLinkGenerator(true);
    loadLinksAndRequests();
    if (availableAssets.length === 0) {
      try {
        const data = await adminGet<any>("/admin/assets/?page_size=100", []);
        const list = Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];
        setAvailableAssets(list);
      } catch {
        // ignore
      }
    }
    loadBoardTemplatesIfNeeded();
  }

  async function handleCreateInviteLink(e: React.FormEvent) {
    e.preventDefault();
    if (!newLinkTitle.trim()) return;
    setCreatingLink(true);
    try {
      const created = await adminCreateSpecialAccessLink({
        title: newLinkTitle.trim(),
        mode: newLinkMode,
        is_all_access_free: newLinkAllAccess,
        granted_asset_ids: newLinkAllAccess ? [] : newLinkAssetIds,
        granted_board_template_ids: newLinkAllAccess ? [] : newLinkBoardIds,
        max_uses: Number(newLinkMaxUses) >= 0 ? Number(newLinkMaxUses) : 1,
        access_expires_at: newLinkAccessExpiresAt ? new Date(newLinkAccessExpiresAt).toISOString() : null,
        link_expires_at: newLinkExpiresAt ? new Date(newLinkExpiresAt).toISOString() : null,
      });
      setInviteLinks((prev) => [created, ...prev]);
      copyInviteLink(created.token);
      setFeedback({
        type: "success",
        message: `✨ Special Access link "${created.title}" generated and copied to clipboard!`,
      });
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: err?.message || "Failed to generate Special Access link.",
      });
    } finally {
      setCreatingLink(false);
    }
  }

  function copyInviteLink(tokenStr: string) {
    const url = buildShareableUrl(tokenStr);
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setCopiedToken(tokenStr);
      setTimeout(() => setCopiedToken((curr) => (curr === tokenStr ? null : curr)), 2500);
    }
  }

  function shareOnWhatsApp(link: SpecialAccessInviteLink) {
    const url = buildShareableUrl(link.token);
    const text =
      link.mode === "AUTO_GRANT"
        ? `🎉 You're invited to claim VIP Special Access on MSTS-GJS Production Store (${link.title})!\n\nClick the link below to unlock your complimentary access:\n${url}`
        : `🚀 Request your VIP Special Access on MSTS-GJS Production Store (${link.title})!\n\nOpen the link below and submit your request so I can approve your access:\n${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  }

  async function handleToggleLinkActive(link: SpecialAccessInviteLink) {
    try {
      const updated = await adminUpdateSpecialAccessLink(link.id, { is_active: !link.is_active });
      setInviteLinks((prev) => prev.map((item) => (item.id === link.id ? updated : item)));
    } catch (err: any) {
      setFeedback({ type: "error", message: err?.message || "Could not update link status." });
    }
  }

  async function handleDeleteLink(link: SpecialAccessInviteLink) {
    if (!window.confirm(`Delete Special Access link "${link.title}"?`)) return;
    try {
      await adminDeleteSpecialAccessLink(link.id);
      setInviteLinks((prev) => prev.filter((item) => item.id !== link.id));
    } catch (err: any) {
      setFeedback({ type: "error", message: err?.message || "Could not delete link." });
    }
  }

  async function handleApproveRequest(req: SpecialAccessClaimRequest) {
    setProcessingRequestId(req.id);
    try {
      const updated = await adminApproveSpecialAccessRequest(req.id, {
        send_email_notification: true,
      });
      setClaimRequests((prev) => prev.map((r) => (r.id === req.id ? updated : r)));
      loadUsers();
      loadLinksAndRequests();
      setFeedback({
        type: "success",
        message: `✅ Approved Special Access for ${req.user.username}! ${
          updated.email_status?.sent ? `Confirmation email sent to ${updated.email_status.recipient}.` : ""
        }`,
      });
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: err?.message || "Failed to approve Special Access request.",
      });
    } finally {
      setProcessingRequestId(null);
    }
  }

  async function handleRejectRequest(req: SpecialAccessClaimRequest) {
    setProcessingRequestId(req.id);
    try {
      const updated = await adminRejectSpecialAccessRequest(req.id);
      setClaimRequests((prev) => prev.map((r) => (r.id === req.id ? updated : r)));
      setFeedback({
        type: "success",
        message: `Rejected Special Access request from ${req.user.username}.`,
      });
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: err?.message || "Failed to reject request.",
      });
    } finally {
      setProcessingRequestId(null);
    }
  }

  const pendingRequests = useMemo(
    () => claimRequests.filter((r) => r.status === "PENDING"),
    [claimRequests]
  );

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

      {/* Special Access Link Generator Callout Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-amber-400/30 bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-cyan-500/10 p-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-sm font-black text-amber-300">
              <Link2 size={17} /> 🔗 Special Access Link Generator & Request Manager
            </span>
            {pendingRequests.length > 0 ? (
              <span className="animate-pulse rounded-full bg-amber-400 px-2.5 py-0.5 text-[11px] font-black text-black">
                {pendingRequests.length} Pending {pendingRequests.length === 1 ? "Request" : "Requests"}
              </span>
            ) : null}
          </div>
          <p className="text-xs text-slate-300">
            Generate a shareable link to send on WhatsApp/Discord. People can open your link to request Special Access (and you approve with 1 click) or claim instant VIP access!
          </p>
        </div>
        <Button
          type="button"
          onClick={openLinkGeneratorModal}
          className="shrink-0 bg-gradient-to-r from-amber-400 to-amber-500 text-black font-black hover:from-amber-300 hover:to-amber-400"
        >
          <Link2 size={16} className="mr-1.5" />
          Generate / Manage Links ({inviteLinks.length})
        </Button>
      </div>

      {/* Live Pending Special Access Requests Banner (if any) */}
      {pendingRequests.length > 0 ? (
        <div className="rounded-xl border border-cyan-400/40 bg-cyan-950/25 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-cyan-200 flex items-center gap-2">
              <Sparkles size={16} className="text-cyan-400" />
              <span>🔔 Pending Special Access Requests ({pendingRequests.length})</span>
            </h3>
            <button
              type="button"
              onClick={openLinkGeneratorModal}
              className="text-xs font-semibold text-cyan-300 hover:underline"
            >
              View All Links & History →
            </button>
          </div>
          <div className="grid gap-2.5">
            {pendingRequests.map((req) => (
              <div
                key={req.id}
                className="flex flex-col md:flex-row md:items-center justify-between gap-3 rounded-lg border border-white/10 bg-black/50 p-3"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-white text-sm">{req.user.username}</span>
                    {req.user.email ? (
                      <span className="text-xs text-slate-400">({req.user.email})</span>
                    ) : null}
                    <span className="rounded bg-purple-500/20 border border-purple-400/30 px-2 py-0.5 text-[11px] font-semibold text-purple-200">
                      Link: {req.invite_link_title}
                    </span>
                    <span className="rounded bg-emerald-500/15 border border-emerald-400/30 px-2 py-0.5 text-[11px] font-semibold text-emerald-300">
                      {req.invite_is_all_access
                        ? "Storewide Free Pass"
                        : [
                            req.invite_granted_asset_titles?.length
                              ? `${req.invite_granted_asset_titles.length} Product(s)`
                              : null,
                            req.invite_granted_board_template_names?.length
                              ? `${req.invite_granted_board_template_names.length} Nameboard(s)`
                              : null,
                          ]
                            .filter(Boolean)
                            .join(" + ") || "Custom VIP Access"}
                    </span>
                  </div>
                  {req.user_note ? (
                    <p className="text-xs text-amber-200">
                      💬 Note from user: &ldquo;{req.user_note}&rdquo;
                    </p>
                  ) : null}
                  <p className="text-[11px] text-slate-500">
                    Requested on{" "}
                    {new Date(req.created_at).toLocaleString("en-IN", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={processingRequestId === req.id}
                    onClick={() => handleApproveRequest(req)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-black text-black hover:bg-emerald-400 disabled:opacity-50"
                  >
                    <Check size={14} />
                    <span>
                      {processingRequestId === req.id ? "Approving..." : "Approve & Grant Access"}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => openSpecialModal(req.user)}
                    className="inline-flex items-center gap-1 rounded-lg border border-purple-400/40 bg-purple-500/15 px-2.5 py-1.5 text-xs font-semibold text-purple-200 hover:bg-purple-500/25"
                  >
                    <Gift size={13} />
                    <span>Customize</span>
                  </button>
                  <button
                    type="button"
                    disabled={processingRequestId === req.id}
                    onClick={() => handleRejectRequest(req)}
                    className="inline-flex items-center gap-1 rounded-lg border border-red-400/30 bg-red-500/10 px-2.5 py-1.5 text-xs font-semibold text-red-300 hover:bg-red-500/20 disabled:opacity-50"
                  >
                    <X size={13} />
                    <span>Reject</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

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
        <div className="grid gap-2 bg-white/10 p-3 text-xs uppercase tracking-wider text-slate-400 md:grid-cols-[1.4fr_1.3fr_130px_90px_90px_290px]">
          <span>User Details</span>
          <span>Contact & Phone</span>
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
            const grantedBoardsCount = user.special_access?.granted_board_templates?.length || 0;
            const hasAnySpecial = hasSpecial || grantedCount > 0 || grantedBoardsCount > 0;

            return (
              <div
                key={user.id}
                className={`grid items-center gap-3 border-t border-white/10 p-4 text-sm transition md:grid-cols-[1.4fr_1.3fr_130px_90px_90px_290px] ${
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
                    <span className="block text-xs text-slate-400 truncate">
                      {user.first_name || user.last_name
                        ? `${user.first_name} ${user.last_name}`.trim()
                        : "No full name"}
                    </span>
                    <span className="block text-[11px] text-slate-500">
                      Joined {new Date(user.date_joined).toLocaleDateString("en-IN", { dateStyle: "medium" })}
                    </span>
                  </div>
                </div>

                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-1.5 text-slate-200 truncate" title={user.email || "No email"}>
                    <Mail size={12} className="shrink-0 text-slate-400" />
                    <span className="truncate">{user.email || "No email on file"}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs">
                    <Phone size={11} className="shrink-0 text-rail-amber" />
                    {user.phone_number ? (
                      <span className="font-mono text-slate-300 font-semibold">+91 {user.phone_number}</span>
                    ) : (
                      <span className="text-slate-500 italic text-[11px]">No mobile on file</span>
                    )}
                  </div>
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
                  ) : grantedCount > 0 || grantedBoardsCount > 0 ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/20 border border-purple-400/40 px-2 py-0.5 text-[10px] font-bold text-purple-300">
                      <Gift size={10} />
                      {grantedCount + grantedBoardsCount} Free item{grantedCount + grantedBoardsCount > 1 ? "s" : ""}
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
                    variant="secondary"
                    onClick={() => openEditModal(user)}
                    className="h-8 text-xs font-semibold hover:border-rail-amber/60 hover:text-rail-amber transition-colors"
                    title="Edit user details (username, email, phone, status, password)"
                  >
                    <Edit size={13} className="mr-1 text-rail-amber" />
                    <span>Edit</span>
                  </Button>

                  <Button
                    size="sm"
                    variant={hasAnySpecial ? "default" : "secondary"}
                    onClick={() => openSpecialModal(user)}
                    className={`h-8 text-xs font-semibold ${
                      hasAnySpecial
                        ? "bg-purple-600 hover:bg-purple-500 text-white border border-purple-400/40 shadow-sm"
                        : "hover:border-purple-400/50 hover:text-purple-300"
                    }`}
                    title="Grant or configure special free download permissions"
                  >
                    <Gift size={13} className="mr-1 text-purple-300" />
                    <span>{hasAnySpecial ? "VIP Pass" : "Special Access"}</span>
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
          <div className="relative w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-2xl border border-purple-500/40 bg-gradient-to-b from-zinc-900 via-zinc-950 to-black p-6 shadow-2xl space-y-5">
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
                  Configure complimentary free download & nameboard access for user{" "}
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
                      When enabled, this user can download <strong className="text-white">ANY product</strong> and customize <strong className="text-white">ANY Nameboard Template</strong> across the entire store for free.
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
                    🚂 Select Specific Free Train Packs ({specialGrantedAssets.length} selected):
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

              {/* Specific Nameboard Templates Selection (if all-access is false) */}
              {!specialAllAccess && availableBoardTemplates.length > 0 ? (
                <div className="space-y-2 rounded-xl border border-amber-400/25 bg-black/40 p-3.5">
                  <label className="font-bold uppercase tracking-wider text-amber-200 text-[11px] flex items-center justify-between">
                    <span>🎨 Select Specific Nameboard Templates ({specialGrantedBoards.length} selected):</span>
                    <span className="text-[10px] text-amber-300/80 font-normal">Railway Board Studio</span>
                  </label>
                  <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1 text-xs">
                    {availableBoardTemplates.map((board) => {
                      const isSelected = specialGrantedBoards.includes(board.id);
                      return (
                        <label
                          key={board.id}
                          className={`flex items-center justify-between rounded-lg border p-2 cursor-pointer transition ${
                            isSelected
                              ? "border-amber-400/60 bg-amber-500/20 text-white font-medium"
                              : "border-white/5 bg-white/[0.02] text-slate-300 hover:bg-white/[0.05]"
                          }`}
                        >
                          <div className="truncate pr-2 flex items-center gap-2">
                            <span className="truncate">{board.name}</span>
                            {board.is_paid ? (
                              <span className="rounded bg-amber-400/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-300">
                                ₹{board.price}
                              </span>
                            ) : (
                              <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300">
                                Free
                              </span>
                            )}
                          </div>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSpecialGrantedBoards([...specialGrantedBoards, board.id]);
                              } else {
                                setSpecialGrantedBoards(specialGrantedBoards.filter((id) => id !== board.id));
                              }
                            }}
                            className="rounded accent-amber-400"
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

              {/* Email Notification Section */}
              <div className="rounded-xl border border-purple-500/25 bg-purple-950/25 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mail size={16} className="text-purple-400" />
                    <span className="font-bold text-white text-xs uppercase tracking-wider">
                      Announcement Email Notification
                    </span>
                  </div>
                  {specialUser.email ? (
                    <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-[10px] font-mono font-medium text-emerald-300">
                      {specialUser.email}
                    </span>
                  ) : (
                    <span className="rounded-full bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 text-[10px] font-medium text-amber-300">
                      No Email on File
                    </span>
                  )}
                </div>

                {specialUser.email ? (
                  <>
                    <label className="flex items-start gap-2.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={sendEmailNotification}
                        onChange={(e) => setSendEmailNotification(e.target.checked)}
                        className="mt-0.5 rounded accent-purple-500"
                      />
                      <span className="text-xs text-slate-300">
                        Automatically dispatch VIP announcement email to <strong className="text-white">{specialUser.email}</strong> upon saving.
                      </span>
                    </label>

                    {/* Email Customizer Collapsible */}
                    <div className="border-t border-purple-500/15 pt-2.5">
                      <button
                        type="button"
                        onClick={() => setShowEmailCustomizer(!showEmailCustomizer)}
                        className="flex items-center gap-1.5 text-[11px] font-semibold text-purple-300 hover:text-purple-200 transition"
                      >
                        {showEmailCustomizer ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                        <span>{showEmailCustomizer ? "Hide Custom Email Content" : "Customize Email Message Content (Optional)"}</span>
                      </button>

                      {showEmailCustomizer ? (
                        <div className="mt-3 space-y-3 pt-1 text-xs">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-300 mb-1">
                              Custom Subject (Optional, overrides common template)
                            </label>
                            <input
                              type="text"
                              value={customEmailSubject}
                              onChange={(e) => setCustomEmailSubject(e.target.value)}
                              placeholder="Leave blank to use common store template"
                              className="w-full rounded-lg border border-white/10 bg-black/60 px-3 py-1.5 text-xs text-white placeholder:text-slate-600 outline-none focus:border-purple-400"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-300 mb-1">
                              Custom Content Area (Optional, overrides common template)
                            </label>
                            <textarea
                              rows={5}
                              value={customEmailBody}
                              onChange={(e) => setCustomEmailBody(e.target.value)}
                              placeholder="Leave blank to send the common message content configured in Store Settings. You can use {username}, {access_type}, {granted_items}, {expiry_info}."
                              className="w-full rounded-lg border border-white/10 bg-black/60 px-3 py-1.5 text-xs text-white placeholder:text-slate-600 outline-none focus:border-purple-400 font-mono leading-relaxed"
                            />
                          </div>
                        </div>
                      ) : null}
                    </div>

                    {/* Direct Send / Resend Button (if user already has active special access) */}
                    {(specialUser.special_access?.is_all_access_free || (specialUser.special_access?.granted_assets?.length || 0) > 0) ? (
                      <div className="border-t border-purple-500/15 pt-2.5 flex items-center justify-between gap-2">
                        <span className="text-[11px] text-slate-400">
                          User already has active special access.
                        </span>
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          disabled={sendingEmailDirectly}
                          onClick={handleSendEmailDirectly}
                          className="h-7 text-[11px] border-purple-500/30 text-purple-200 hover:bg-purple-500/20 hover:text-white"
                        >
                          <Send size={11} className="mr-1" />
                          {sendingEmailDirectly ? "Sending Email..." : "Send Announcement Email Now"}
                        </Button>
                      </div>
                    ) : null}

                    {/* Direct Email Action Feedback */}
                    {emailDirectFeedback ? (
                      <div
                        className={`flex items-center gap-2 rounded-lg border p-2 text-xs font-semibold ${
                          emailDirectFeedback.type === "success"
                            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                            : "border-red-500/40 bg-red-500/10 text-red-300"
                        }`}
                      >
                        {emailDirectFeedback.type === "success" ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                        <span>{emailDirectFeedback.message}</span>
                      </div>
                    ) : null}
                  </>
                ) : (
                  <p className="text-xs text-amber-300/90 leading-relaxed">
                    This user account does not have an email address configured. They will receive immediate on-site special access, but an announcement email notification cannot be sent.
                  </p>
                )}
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

      {/* Edit User Account Modal */}
      {editingUser ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-xl rounded-2xl border border-white/15 bg-rail-black p-6 shadow-2xl space-y-5 my-8">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rail-red/20 text-rail-red border border-rail-red/30 shadow-inner">
                  <Edit size={22} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white">Edit User Account</h3>
                    <span className="rounded bg-white/10 px-2 py-0.5 text-[11px] font-mono font-bold text-slate-300">
                      ID: {editingUser.id}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Modify profile details, fix signup typos, or reset passwords directly for customer support.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Edit Feedback Message */}
            {editFeedback ? (
              <div
                className={`flex items-start gap-2.5 rounded-xl border p-3.5 text-xs leading-relaxed ${
                  editFeedback.type === "success"
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                    : "border-red-500/30 bg-red-500/10 text-red-200"
                }`}
              >
                {editFeedback.type === "success" ? (
                  <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
                )}
                <span>{editFeedback.message}</span>
              </div>
            ) : null}

            {/* Edit Form */}
            <form onSubmit={handleSaveUserEdit} className="space-y-4">
              {/* Username & Email */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                    Username <span className="text-rail-red">*</span>
                  </label>
                  <div className="relative flex items-center">
                    <User size={14} className="absolute left-3 text-slate-500" />
                    <input
                      type="text"
                      required
                      value={editUsername}
                      onChange={(e) => setEditUsername(e.target.value)}
                      placeholder="Username"
                      className="w-full rounded-lg border border-white/10 bg-black/60 pl-9 pr-3 py-2 text-xs text-white placeholder:text-slate-600 outline-none focus:border-rail-red"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                    Email Address
                  </label>
                  <div className="relative flex items-center">
                    <Mail size={14} className="absolute left-3 text-slate-500" />
                    <input
                      type="email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      placeholder="user@example.com"
                      className="w-full rounded-lg border border-white/10 bg-black/60 pl-9 pr-3 py-2 text-xs text-white placeholder:text-slate-600 outline-none focus:border-rail-red"
                    />
                  </div>
                </div>
              </div>

              {/* Mobile Number Field */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300">
                    Mobile Number (10 Digits)
                  </label>
                  <span className="text-[10px] text-emerald-400 font-medium">Cashfree Checkout & SMS Gateway</span>
                </div>
                <div className="relative flex items-center">
                  <div className="absolute left-3 flex items-center gap-1 text-slate-400 select-none">
                    <Phone size={13} className="text-rail-amber" />
                    <span className="text-xs font-bold">+91</span>
                  </div>
                  <input
                    type="tel"
                    maxLength={10}
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    placeholder="9876543210"
                    className="w-full rounded-lg border border-white/10 bg-black/60 pl-16 pr-3 py-2 text-xs text-white placeholder:text-slate-600 outline-none focus:border-rail-red font-mono"
                  />
                </div>
              </div>

              {/* First Name & Last Name */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={editFirstName}
                    onChange={(e) => setEditFirstName(e.target.value)}
                    placeholder="First Name"
                    className="w-full rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-xs text-white placeholder:text-slate-600 outline-none focus:border-rail-red"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={editLastName}
                    onChange={(e) => setEditLastName(e.target.value)}
                    placeholder="Last Name"
                    className="w-full rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-xs text-white placeholder:text-slate-600 outline-none focus:border-rail-red"
                  />
                </div>
              </div>

              {/* Status & Role Controls */}
              <div className="grid gap-3 sm:grid-cols-2 rounded-xl border border-white/10 bg-white/[0.03] p-3.5">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    Account Status
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setEditIsActive(true)}
                      className={`flex-1 rounded-lg py-1.5 text-xs font-bold transition ${
                        editIsActive
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/40"
                          : "bg-black/40 text-slate-400 border border-white/10 hover:text-white"
                      }`}
                    >
                      Active
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditIsActive(false)}
                      className={`flex-1 rounded-lg py-1.5 text-xs font-bold transition ${
                        !editIsActive
                          ? "bg-red-500/20 text-red-300 border border-red-400/40"
                          : "bg-black/40 text-slate-400 border border-white/10 hover:text-white"
                      }`}
                    >
                      Disabled
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    User Role
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setEditIsStaff(false)}
                      className={`flex-1 rounded-lg py-1.5 text-xs font-bold transition ${
                        !editIsStaff
                          ? "bg-sky-500/20 text-sky-300 border border-sky-400/40"
                          : "bg-black/40 text-slate-400 border border-white/10 hover:text-white"
                      }`}
                    >
                      Customer
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditIsStaff(true)}
                      className={`flex-1 rounded-lg py-1.5 text-xs font-bold transition ${
                        editIsStaff
                          ? "bg-rail-amber/20 text-rail-amber border border-rail-amber/40"
                          : "bg-black/40 text-slate-400 border border-white/10 hover:text-white"
                      }`}
                    >
                      Staff Admin
                    </button>
                  </div>
                </div>
              </div>

              {/* Set New Password (Optional) */}
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <KeyRound size={13} className="text-rail-amber" />
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
                      Reset Password (Optional)
                    </label>
                  </div>
                  <span className="text-[10px] text-slate-500">Leave blank to keep unchanged</span>
                </div>
                <div className="relative flex items-center">
                  <input
                    type={showEditPassword ? "text" : "password"}
                    minLength={8}
                    value={editNewPassword}
                    onChange={(e) => setEditNewPassword(e.target.value)}
                    placeholder="Enter new password (min. 8 characters)"
                    className="w-full rounded-lg border border-white/10 bg-black/60 pl-3 pr-10 py-2 text-xs text-white placeholder:text-slate-600 outline-none focus:border-rail-red"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditPassword(!showEditPassword)}
                    className="absolute right-3 text-slate-400 hover:text-white"
                  >
                    {showEditPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                <p className="text-[10px] text-slate-400">
                  💡 Useful if the customer mistyped or forgot their credentials and asks you for support.
                </p>
              </div>

              {/* Footer Controls */}
              <div className="flex items-center justify-end gap-3 border-t border-white/10 pt-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setEditingUser(null)}
                  disabled={savingEdit}
                  className="h-9 px-4 text-xs font-semibold text-slate-300 hover:text-white"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={savingEdit}
                  className="h-9 px-5 text-xs font-bold bg-rail-red text-white shadow-glow hover:bg-rail-red/90"
                >
                  {savingEdit ? "Saving Changes..." : "Save User Changes"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {/* Special Access Link Generator & Request Manager Modal */}
      {showLinkGenerator ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-amber-400/30 bg-[#0b1220] p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h2 className="text-lg font-black text-amber-300 flex items-center gap-2">
                  <Link2 size={20} />
                  <span>🔗 Special Access Link Generator & Request Manager</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Create shareable links to send to friends or customers. Choose whether they request access (and you approve) or get instant access!
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowLinkGenerator(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            {/* Create New Link Form */}
            <form
              onSubmit={handleCreateInviteLink}
              className="rounded-xl border border-amber-400/25 bg-amber-500/5 p-4 space-y-4"
            >
              <h3 className="text-sm font-bold text-amber-200 flex items-center gap-1.5">
                <Plus size={16} /> Create New Shareable Special Access Link
              </h3>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-xs font-semibold text-slate-300">Link Title / Label</span>
                  <input
                    type="text"
                    required
                    value={newLinkTitle}
                    onChange={(e) => setNewLinkTitle(e.target.value)}
                    placeholder="e.g. Vande Bharat Special Access Invite"
                    className="mt-1 w-full rounded-lg border border-white/15 bg-black/60 px-3 py-2 text-xs text-white outline-none focus:border-amber-400"
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-semibold text-slate-300">How Should This Link Work?</span>
                  <select
                    value={newLinkMode}
                    onChange={(e) => setNewLinkMode(e.target.value as "APPROVAL" | "AUTO_GRANT")}
                    className="mt-1 w-full rounded-lg border border-white/15 bg-black/60 px-3 py-2 text-xs text-white outline-none focus:border-amber-400"
                  >
                    <option value="APPROVAL">🛡️ Request Mode (They Request → You Approve)</option>
                    <option value="AUTO_GRANT">⚡ Instant Claim Mode (Auto-Grants Access on Click)</option>
                  </select>
                </label>
              </div>

              {/* Access Type Selection */}
              <div className="grid gap-3 sm:grid-cols-2">
                <label
                  className={`flex items-start gap-2.5 rounded-lg border p-3 cursor-pointer transition ${
                    newLinkAllAccess
                      ? "border-emerald-400/50 bg-emerald-950/30"
                      : "border-white/10 bg-black/40 hover:bg-white/5"
                  }`}
                >
                  <input
                    type="radio"
                    name="linkAccessType"
                    checked={newLinkAllAccess}
                    onChange={() => setNewLinkAllAccess(true)}
                    className="mt-0.5 accent-emerald-400"
                  />
                  <div>
                    <span className="block text-xs font-bold text-white">
                      🌟 Storewide Free All-Access Pass
                    </span>
                    <span className="block text-[11px] text-slate-400">
                      Grants complimentary access to all train packs &amp; nameboards.
                    </span>
                  </div>
                </label>

                <label
                  className={`flex items-start gap-2.5 rounded-lg border p-3 cursor-pointer transition ${
                    !newLinkAllAccess
                      ? "border-cyan-400/50 bg-cyan-950/30"
                      : "border-white/10 bg-black/40 hover:bg-white/5"
                  }`}
                >
                  <input
                    type="radio"
                    name="linkAccessType"
                    checked={!newLinkAllAccess}
                    onChange={() => setNewLinkAllAccess(false)}
                    className="mt-0.5 accent-cyan-400"
                  />
                  <div>
                    <span className="block text-xs font-bold text-white">
                      🚂🎨 Specific Train Packs &amp; Nameboards
                    </span>
                    <span className="block text-[11px] text-slate-400">
                      Choose exact products &amp; nameboards this link unlocks.
                    </span>
                  </div>
                </label>
              </div>

              {!newLinkAllAccess ? (
                <div className="space-y-3">
                  <div className="rounded-lg border border-white/10 bg-black/50 p-3 space-y-2">
                    <span className="text-xs font-semibold text-cyan-200">
                      🚂 Select Train Packs to Unlock ({newLinkAssetIds.length} selected):
                    </span>
                    <div className="max-h-36 overflow-y-auto grid gap-1.5 sm:grid-cols-2">
                      {availableAssets.map((asset) => {
                        const checked = newLinkAssetIds.includes(asset.id);
                        return (
                          <label
                            key={asset.id}
                            className={`flex items-center gap-2 rounded px-2.5 py-1.5 text-xs cursor-pointer ${
                              checked ? "bg-cyan-900/40 text-cyan-200 border border-cyan-500/40" : "text-slate-300 hover:bg-white/5"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setNewLinkAssetIds([...newLinkAssetIds, asset.id]);
                                } else {
                                  setNewLinkAssetIds(newLinkAssetIds.filter((id) => id !== asset.id));
                                }
                              }}
                              className="rounded accent-cyan-400"
                            />
                            <span className="truncate">{asset.title}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {availableBoardTemplates.length > 0 ? (
                    <div className="rounded-lg border border-amber-400/25 bg-black/50 p-3 space-y-2">
                      <span className="text-xs font-semibold text-amber-200">
                        🎨 Select Nameboard Templates to Unlock ({newLinkBoardIds.length} selected):
                      </span>
                      <div className="max-h-36 overflow-y-auto grid gap-1.5 sm:grid-cols-2">
                        {availableBoardTemplates.map((board) => {
                          const checked = newLinkBoardIds.includes(board.id);
                          return (
                            <label
                              key={board.id}
                              className={`flex items-center justify-between gap-2 rounded px-2.5 py-1.5 text-xs cursor-pointer ${
                                checked ? "bg-amber-900/40 text-amber-200 border border-amber-500/40" : "text-slate-300 hover:bg-white/5"
                              }`}
                            >
                              <span className="flex items-center gap-2 truncate">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setNewLinkBoardIds([...newLinkBoardIds, board.id]);
                                    } else {
                                      setNewLinkBoardIds(newLinkBoardIds.filter((id) => id !== board.id));
                                    }
                                  }}
                                  className="rounded accent-amber-400"
                                />
                                <span className="truncate">{board.name}</span>
                              </span>
                              <span className="shrink-0 text-[10px] font-bold text-amber-300">
                                {board.is_paid ? `₹${board.price}` : "Free"}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {/* Limits & Expirations */}
              <div className="grid gap-4 sm:grid-cols-3">
                <label className="block">
                  <span className="text-xs font-semibold text-slate-300">
                    Max People Allowed (0 = Unlimited)
                  </span>
                  <input
                    type="number"
                    min={0}
                    value={newLinkMaxUses}
                    onChange={(e) => setNewLinkMaxUses(Number(e.target.value))}
                    className="mt-1 w-full rounded-lg border border-white/15 bg-black/60 px-3 py-2 text-xs text-white outline-none focus:border-amber-400"
                  />
                  <span className="mt-0.5 block text-[10px] text-slate-500">
                    Set 1 for a single person, or 0 for a group link.
                  </span>
                </label>

                <label className="block">
                  <span className="text-xs font-semibold text-slate-300">
                    Link Expires At (Optional)
                  </span>
                  <input
                    type="datetime-local"
                    value={newLinkExpiresAt}
                    onChange={(e) => setNewLinkExpiresAt(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-white/15 bg-black/60 px-3 py-2 text-xs text-white outline-none focus:border-amber-400"
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-semibold text-slate-300">
                    User&apos;s VIP Access Expires At (Optional)
                  </span>
                  <input
                    type="datetime-local"
                    value={newLinkAccessExpiresAt}
                    onChange={(e) => setNewLinkAccessExpiresAt(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-white/15 bg-black/60 px-3 py-2 text-xs text-white outline-none focus:border-amber-400"
                  />
                </label>
              </div>

              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={creatingLink}
                  className="bg-amber-400 text-black font-black hover:bg-amber-300"
                >
                  <Link2 size={15} className="mr-1.5" />
                  {creatingLink ? "Generating Link..." : "✨ Generate & Copy Shareable Link"}
                </Button>
              </div>
            </form>

            {/* Generated Invite Links List */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-white flex items-center justify-between">
                <span>Generated Shareable Links ({inviteLinks.length})</span>
                {loadingLinks ? <span className="text-xs text-slate-400">Refreshing...</span> : null}
              </h3>

              {inviteLinks.length === 0 ? (
                <p className="rounded-xl border border-white/10 bg-black/40 p-4 text-center text-xs text-slate-400">
                  No Special Access links created yet. Generate one above to share with users!
                </p>
              ) : (
                <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                  {inviteLinks.map((link) => {
                    const fullUrl = buildShareableUrl(link.token);
                    const isCopied = copiedToken === link.token;
                    return (
                      <div
                        key={link.id}
                        className={`rounded-xl border p-3.5 space-y-2.5 ${
                          link.is_valid
                            ? "border-white/15 bg-black/50"
                            : "border-white/5 bg-black/25 opacity-70"
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-sm text-white">{link.title}</span>
                            <Badge variant={link.mode === "AUTO_GRANT" ? "warning" : "muted"}>
                              {link.mode === "AUTO_GRANT" ? "⚡ Instant Claim" : "🛡️ Request & Approve"}
                            </Badge>
                            <Badge variant={link.is_valid ? "success" : "muted"}>
                              {link.is_valid
                                ? "Active"
                                : !link.is_active
                                ? "Disabled"
                                : link.is_exhausted
                                ? "Max Uses Reached"
                                : "Expired"}
                            </Badge>
                            <span className="text-xs text-slate-400">
                              Uses: <strong className="text-white">{link.uses_count}</strong> /{" "}
                              {link.max_uses === 0 ? "∞" : link.max_uses}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => copyInviteLink(link.token)}
                              className="inline-flex items-center gap-1 rounded-lg bg-amber-400/20 border border-amber-400/40 px-2.5 py-1 text-xs font-bold text-amber-200 hover:bg-amber-400/30"
                            >
                              {isCopied ? <Check size={13} /> : <Copy size={13} />}
                              <span>{isCopied ? "Copied!" : "Copy Link"}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => shareOnWhatsApp(link)}
                              className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/20 border border-emerald-400/40 px-2.5 py-1 text-xs font-bold text-emerald-200 hover:bg-emerald-500/30"
                            >
                              <Share2 size={13} />
                              <span>WhatsApp</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleLinkActive(link)}
                              className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-slate-300 hover:bg-white/10"
                            >
                              {link.is_active ? "Disable" : "Enable"}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteLink(link)}
                              className="rounded-lg border border-red-500/30 bg-red-500/10 p-1 text-red-300 hover:bg-red-500/20"
                              title="Delete Link"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/60 px-3 py-1.5">
                          <span className="truncate font-mono text-[11px] text-amber-200 select-all flex-1">
                            {fullUrl}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
                          <span>
                            Grants:{" "}
                            <strong className="text-slate-200">
                              {link.is_all_access_free
                                ? "Storewide Free All-Access Pass"
                                : [
                                    ...(link.granted_asset_titles || []),
                                    ...(link.granted_board_template_names || []).map((n) => `🎨 ${n}`),
                                  ].join(", ") || "Custom Selected Access"}
                            </strong>
                          </span>
                          {link.pending_requests_count ? (
                            <span className="text-amber-300 font-bold">
                              • {link.pending_requests_count} Pending Request(s)
                            </span>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Requests History Section */}
            {claimRequests.length > 0 ? (
              <div className="space-y-3 border-t border-white/10 pt-4">
                <h3 className="text-sm font-bold text-white">
                  Recent Requests & Claims ({claimRequests.length})
                </h3>
                <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                  {claimRequests.map((req) => (
                    <div
                      key={req.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg border border-white/10 bg-black/40 p-3 text-xs"
                    >
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <strong className="text-white">{req.user.username}</strong>
                          <span className="text-slate-400">{req.user.email}</span>
                          <Badge
                            variant={
                              req.status === "APPROVED"
                                ? "success"
                                : req.status === "PENDING"
                                ? "warning"
                                : "default"
                            }
                          >
                            {req.status}
                          </Badge>
                          <span className="text-slate-400">via {req.invite_link_title}</span>
                        </div>
                        {req.user_note ? (
                          <p className="mt-1 text-amber-200">Note: &ldquo;{req.user_note}&rdquo;</p>
                        ) : null}
                      </div>

                      {req.status === "PENDING" ? (
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            disabled={processingRequestId === req.id}
                            onClick={() => handleApproveRequest(req)}
                            className="rounded-lg bg-emerald-500 px-3 py-1.5 font-black text-black hover:bg-emerald-400"
                          >
                            {processingRequestId === req.id ? "Approving..." : "Approve & Grant"}
                          </button>
                          <button
                            type="button"
                            disabled={processingRequestId === req.id}
                            onClick={() => handleRejectRequest(req)}
                            className="rounded-lg border border-red-400/40 bg-red-500/10 px-2.5 py-1.5 font-semibold text-red-300 hover:bg-red-500/20"
                          >
                            Reject
                          </button>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
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


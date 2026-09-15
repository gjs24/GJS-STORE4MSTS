"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Sparkles,
  Layers,
  FolderHeart,
  ShieldCheck,
  Download,
  Lock,
  ChevronRight,
  ExternalLink,
  Edit3,
  Trash2,
  Tv,
} from "lucide-react";
import { PageShell } from "@/components/page-shell";
import {
  type BoardTemplate,
  type UserCustomBoard,
  getBoardTemplates,
  getUserCustomBoards,
  deleteUserCustomBoard,
  createBoardOrder,
} from "@/lib/board-studio-api";
import { StudioEditor } from "@/components/board-studio/studio-editor";
import { AdminTemplateStudio } from "@/components/board-studio/admin-template-studio";
import { getStoredUser, isLoggedIn, type CurrentUser } from "@/lib/api";
import { exportCanvasAsDDS } from "@/lib/dds-generator";
import { load } from "@cashfreepayments/cashfree-js";

const cashfreeMode = process.env.NEXT_PUBLIC_CASHFREE_MODE === "production" ? "production" : "sandbox";

type ActiveTab = "store" | "editor" | "my-boards" | "admin";

export default function BoardStudioPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("store");
  const [templates, setTemplates] = useState<BoardTemplate[]>([]);
  const [userBoards, setUserBoards] = useState<UserCustomBoard[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<BoardTemplate | null>(null);

  // Editor states when editing a saved board
  const [editingBoard, setEditingBoard] = useState<UserCustomBoard | null>(null);

  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const user = getStoredUser();
      setCurrentUser(user);

      const [templatesData, userBoardsData] = await Promise.all([
        getBoardTemplates(),
        getUserCustomBoards().catch(() => []),
      ]);

      setTemplates(templatesData);
      setUserBoards(userBoardsData);

      if (!selectedTemplate && templatesData.length > 0) {
        setSelectedTemplate(templatesData[0]);
      } else if (selectedTemplate) {
        const refreshed = templatesData.find((t) => t.id === selectedTemplate.id);
        if (refreshed) setSelectedTemplate(refreshed);
      }
    } catch (err: any) {
      setError(err.message || "Could not load board studio data.");
    } finally {
      setLoading(false);
    }
  }, [selectedTemplate]);

  useEffect(() => {
    loadData();
  }, []);

  function handleOpenInEditor(template: BoardTemplate) {
    setSelectedTemplate(template);
    setEditingBoard(null);
    setActiveTab("editor");
  }

  function handleEditSavedBoard(board: UserCustomBoard) {
    const template = templates.find((t) => t.id === board.template);
    if (template) {
      setSelectedTemplate(template);
      setEditingBoard(board);
      setActiveTab("editor");
    }
  }

  async function handleDeleteSavedBoard(id: number) {
    if (!confirm("Are you sure you want to delete this custom board from your account?")) return;
    try {
      await deleteUserCustomBoard(id);
      setUserBoards((prev) => prev.filter((b) => b.id !== id));
    } catch (err: any) {
      alert(err.message || "Failed to delete board.");
    }
  }

  async function handleQuickUnlock(template: BoardTemplate) {
    if (!isLoggedIn()) {
      window.location.href = "/login?redirect=/board-studio";
      return;
    }
    try {
      const order = await createBoardOrder(template.id);
      if (order.status === "APPROVED" || order.download_enabled) {
        await loadData();
        handleOpenInEditor(template);
        return;
      }
      if (order.payment_session_id) {
        const cashfree = await load({ mode: cashfreeMode });
        await cashfree.checkout({
          paymentSessionId: order.payment_session_id,
          redirectTarget: "_self",
        });
      }
    } catch (err: any) {
      alert(err.message || "Payment initiation failed.");
    }
  }

  const categories = ["ALL", "LED_MATRIX", "ACRYLIC_METAL", "LOCO_HEADCODE"];

  const filteredTemplates = templates.filter((t) => {
    if (selectedCategory === "ALL") return true;
    return t.category === selectedCategory;
  });

  return (
    <PageShell title="Railway LED Name Board Studio" eyebrow="Interactive Train Simulator Studio">
      <div className="space-y-8">
        {/* Hero Header */}
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-slate-900 via-rail-black to-slate-950 p-6 sm:p-10 shadow-2xl">
          <div className="absolute right-0 top-0 -mr-20 -mt-20 h-72 w-72 rounded-full bg-rail-amber/10 blur-3xl pointer-events-none" />
          <div className="relative z-10 max-w-3xl space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-rail-amber/30 bg-rail-amber/10 px-3.5 py-1 text-xs font-bold text-rail-amber shadow-sm">
              <Tv size={14} /> GJS Railway LED Name Board Studio & DDS Generator
            </div>
            <h1 className="text-3xl sm:text-5xl font-black uppercase tracking-tight text-white">
              Railway LED Name Board Studio
            </h1>
            <p className="text-sm sm:text-base text-slate-300">
              Customize authentic Indian Railways glowing amber LED destination displays and acrylic rake boards in English & Hindi. Export direct 32-bit & DXT5 DDS texture sheets ready for Train Simulator TRS19/22 and Open Rails.
            </p>
          </div>

          {/* Tab Navigation */}
          <div className="relative z-10 mt-8 flex flex-wrap gap-2 border-b border-white/10 pb-3">
            <button
              type="button"
              onClick={() => setActiveTab("store")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-bold transition-all ${
                activeTab === "store"
                  ? "bg-rail-amber text-black shadow-glow"
                  : "bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Layers size={16} /> Board Sheets Store ({templates.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("editor")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-bold transition-all ${
                activeTab === "editor"
                  ? "bg-rail-amber text-black shadow-glow"
                  : "bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Sparkles size={16} /> Canvas Studio Editor
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("my-boards")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-bold transition-all ${
                activeTab === "my-boards"
                  ? "bg-rail-amber text-black shadow-glow"
                  : "bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              <FolderHeart size={16} /> My Saved Boards ({userBoards.length})
            </button>

            {currentUser?.is_staff && (
              <button
                type="button"
                onClick={() => setActiveTab("admin")}
                className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-bold transition-all ${
                  activeTab === "admin"
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                    : "bg-indigo-950/40 text-indigo-300 hover:bg-indigo-900/50 border border-indigo-500/30"
                }`}
              >
                <ShieldCheck size={16} /> Staff Admin Studio
              </button>
            )}
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-950/40 p-4 text-sm text-rose-300">
            {error}
          </div>
        )}

        {/* Tab 1: Board Sheets Store */}
        {activeTab === "store" && (
          <div className="space-y-6">
            {/* Category Filter Pills */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                      selectedCategory === cat
                        ? "bg-white/20 text-white shadow-sm"
                        : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    {cat === "ALL"
                      ? "All Templates"
                      : cat === "LED_MATRIX"
                      ? "LED Matrix Raillights"
                      : cat === "ACRYLIC_METAL"
                      ? "Acrylic & Metal Boards"
                      : "Loco Headcodes"}
                  </button>
                ))}
              </div>

              <div className="text-xs text-slate-400">
                Showing {filteredTemplates.length} texture sheet templates
              </div>
            </div>

            {/* Templates Grid */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredTemplates.map((template) => (
                <div
                  key={template.id}
                  className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-slate-900/60 p-5 backdrop-blur-xl transition-all hover:border-white/20 hover:shadow-2xl"
                >
                  <div className="space-y-3.5">
                    {/* Badges row */}
                    <div className="flex items-center justify-between">
                      <span className="rounded-md border border-white/10 bg-white/5 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-slate-300">
                        {template.category.replace("_", " ")}
                      </span>

                      {template.is_paid ? (
                        <span className="flex items-center gap-1 rounded-md bg-rail-amber/20 px-2 py-0.5 text-xs font-black text-rail-amber">
                          ₹{template.price}
                        </span>
                      ) : (
                        <span className="rounded-md bg-emerald-500/20 px-2 py-0.5 text-xs font-bold text-emerald-400">
                          FREE
                        </span>
                      )}
                    </div>

                    {/* Title & Description */}
                    <div>
                      <h3 className="text-lg font-bold text-white transition-colors group-hover:text-rail-amber">
                        {template.name}
                      </h3>
                      <p className="mt-1.5 text-xs text-slate-400 line-clamp-2">
                        {template.description}
                      </p>
                    </div>

                    {/* Metadata tags */}
                    <div className="flex flex-wrap gap-2 text-[10px] text-slate-500 font-mono">
                      <span>{template.base_width}x{template.base_height}px</span>
                      <span>•</span>
                      <span>{template.fields?.length || 0} LED slots</span>
                      <span>•</span>
                      <span>DDS & PNG</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-5 border-t border-white/10 pt-4 flex items-center justify-between gap-2">
                    {template.can_customize ? (
                      <button
                        type="button"
                        onClick={() => handleOpenInEditor(template)}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-rail-amber py-2 text-xs font-bold text-black shadow-glow transition-transform hover:scale-[1.02]"
                      >
                        <Sparkles size={14} /> Open in Studio
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleQuickUnlock(template)}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-rail-amber py-2 text-xs font-bold text-black shadow-glow transition-transform hover:scale-[1.02]"
                      >
                        <Lock size={14} /> Unlock (₹{template.price})
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleOpenInEditor(template)}
                      className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-300 hover:bg-white/10 hover:text-white"
                      title="Preview Template"
                    >
                      <ExternalLink size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 2: Studio Editor */}
        {activeTab === "editor" && selectedTemplate && (
          <StudioEditor
            template={selectedTemplate}
            initialValues={editingBoard?.custom_field_values}
            boardId={editingBoard?.id}
            initialTitle={editingBoard?.title}
            onSaved={() => loadData()}
            onUnlockSuccess={() => loadData()}
          />
        )}

        {/* Tab 3: My Saved Boards */}
        {activeTab === "my-boards" && (
          <div className="space-y-6">
            {!isLoggedIn() ? (
              <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-10 text-center backdrop-blur-xl">
                <FolderHeart className="mx-auto size-12 text-slate-500" />
                <h3 className="mt-3 text-lg font-bold text-white">Login to View Your Saved Boards</h3>
                <p className="mt-1 text-sm text-slate-400">
                  Sign in or create an account to save custom train rake boards and access them anywhere.
                </p>
                <Link
                  href="/login?redirect=/board-studio"
                  className="mt-5 inline-block rounded-xl bg-rail-red px-6 py-2.5 text-sm font-bold text-white shadow-glow hover:bg-rail-red/90"
                >
                  Login to Account
                </Link>
              </div>
            ) : userBoards.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-10 text-center backdrop-blur-xl">
                <FolderHeart className="mx-auto size-12 text-slate-500" />
                <h3 className="mt-3 text-lg font-bold text-white">No Saved Boards Yet</h3>
                <p className="mt-1 text-sm text-slate-400">
                  Open any board sheet in the Canvas Studio, customize your train rake details, and click "Save to My Boards".
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab("store")}
                  className="mt-5 rounded-xl bg-rail-amber px-6 py-2.5 text-sm font-bold text-black shadow-glow hover:bg-yellow-400"
                >
                  Browse Board Templates
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {userBoards.map((board) => (
                  <div
                    key={board.id}
                    className="flex flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-slate-900/60 p-5 backdrop-blur-xl transition-all hover:border-white/20"
                  >
                    <div className="space-y-3">
                      {board.preview_image_url && (
                        <div className="overflow-hidden rounded-lg border border-white/10 bg-black/60">
                          <img
                            src={board.preview_image_url}
                            alt={board.title}
                            className="h-36 w-full object-contain"
                          />
                        </div>
                      )}

                      <div>
                        <h4 className="text-base font-bold text-white">{board.title}</h4>
                        <p className="text-xs text-slate-400">
                          Template: {board.template_details?.name || board.template}
                        </p>
                        <p className="mt-1 text-[11px] text-slate-500">
                          Saved: {new Date(board.saved_at).toLocaleDateString("en-IN", { dateStyle: "medium" })}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-2 border-t border-white/10 pt-3">
                      <button
                        type="button"
                        onClick={() => handleEditSavedBoard(board)}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-white/10 py-1.5 text-xs font-semibold text-white hover:bg-white/15 transition-colors"
                      >
                        <Edit3 size={13} /> Edit in Studio
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteSavedBoard(board.id)}
                        className="rounded-lg border border-rose-500/20 p-1.5 text-rose-400 hover:bg-rose-950/40 hover:text-rose-300"
                        title="Delete Board"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Staff Admin Studio */}
        {activeTab === "admin" && currentUser?.is_staff && (
          <AdminTemplateStudio
            templates={templates}
            onRefresh={() => loadData()}
          />
        )}
      </div>
    </PageShell>
  );
}


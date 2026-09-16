"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  BadgeIndianRupee,
  CheckCircle2,
  Eye,
  EyeOff,
  Layers,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Sliders,
  TrainFront,
  Trash2,
  X,
  ArrowLeft,
  Lock,
  Unlock,
  Check
} from "lucide-react";
import { AdminLayout } from "@/components/admin-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { storageService } from "@/lib/board-studio/storage-service";
import { BoardTemplate, BoardCategory } from "@/lib/board-studio/types";
import { AdminTemplateStudio } from "@/components/board-studio/admin-template-studio";
import "@/styles/board-studio.css";

type TemplateFilter = "all" | "published" | "hidden" | "free" | "paid";

export default function AdminBoardTemplatesPage() {
  const [templates, setTemplates] = useState<BoardTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<TemplateFilter>("all");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Visual studio active template
  const [visualStudioTemplate, setVisualStudioTemplate] = useState<BoardTemplate | null>(null);

  // Create / Edit modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<BoardTemplate | null>(null);
  const [formId, setFormId] = useState("");
  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState<BoardCategory>("LED Texture Sheet");
  const [formDescription, setFormDescription] = useState("");
  const [formIsPaid, setFormIsPaid] = useState(false);
  const [formPrice, setFormPrice] = useState("0");
  const [formPublished, setFormPublished] = useState(true);
  const [formWidth, setFormWidth] = useState(1024);
  const [formHeight, setFormHeight] = useState(1024);
  const [formTargetTextureName, setFormTargetTextureName] = useState("");

  const loadData = async () => {
    setLoading(true);
    const local = storageService.getAllTemplates();
    setTemplates(local);

    try {
      const cloud = await storageService.fetchCloudTemplates();
      if (cloud && cloud.length > 0) {
        setTemplates(cloud);
        storageService.saveAllTemplates(cloud);
      }
    } catch (err) {
      console.warn("Cloud templates sync notice:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const stats = useMemo(() => {
    const total = templates.length;
    const published = templates.filter((t) => t.published !== false).length;
    const free = templates.filter((t) => !t.isPaid).length;
    const paid = templates.filter((t) => t.isPaid).length;
    return { total, published, free, paid };
  }, [templates]);

  const filteredTemplates = useMemo(() => {
    return templates.filter((t) => {
      const matchesSearch =
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.category.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesFilter =
        filter === "all" ||
        (filter === "published" && t.published !== false) ||
        (filter === "hidden" && t.published === false) ||
        (filter === "free" && !t.isPaid) ||
        (filter === "paid" && t.isPaid);

      return matchesSearch && matchesFilter;
    });
  }, [templates, searchQuery, filter]);

  const showFeedback = (type: "success" | "error", message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 3500);
  };

  // Toggle publish status
  const handleTogglePublish = async (tpl: BoardTemplate) => {
    const nextPublished = tpl.published === false;
    const updated = { ...tpl, published: nextPublished };
    storageService.saveTemplate(updated);
    await storageService.syncCloudTemplate(updated);
    setTemplates((prev) => prev.map((item) => (item.id === tpl.id ? updated : item)));
    showFeedback("success", `Template "${tpl.name}" is now ${nextPublished ? "Published" : "Hidden"}.`);
  };

  // Delete template
  const handleDelete = async (tpl: BoardTemplate) => {
    if (!window.confirm(`Are you sure you want to delete "${tpl.name}"?`)) return;
    storageService.deleteTemplate(tpl.id);
    await storageService.deleteCloudTemplate(tpl.id);
    setTemplates((prev) => prev.filter((item) => item.id !== tpl.id));
    showFeedback("success", `Deleted "${tpl.name}".`);
  };

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingTemplate(null);
    setFormId(`board_${Date.now()}`);
    setFormName("");
    setFormCategory("LED Texture Sheet");
    setFormDescription("");
    setFormIsPaid(false);
    setFormPrice("0");
    setFormPublished(true);
    setFormWidth(1024);
    setFormHeight(1024);
    setFormTargetTextureName("");
    setIsEditModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (tpl: BoardTemplate) => {
    setEditingTemplate(tpl);
    setFormId(tpl.id);
    setFormName(tpl.name);
    setFormCategory(tpl.category);
    setFormDescription(tpl.description || "");
    setFormIsPaid(!!tpl.isPaid);
    setFormPrice(String(tpl.price || 0));
    setFormPublished(tpl.published !== false);
    setFormWidth(tpl.baseWidth || 1024);
    setFormHeight(tpl.baseHeight || 1024);
    setFormTargetTextureName(tpl.targetTextureName || "");
    setIsEditModalOpen(true);
  };

  // Save Modal Form
  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      showFeedback("error", "Template Name is required.");
      return;
    }

    const cleanPrice = formIsPaid ? Math.max(0, parseFloat(formPrice) || 0) : 0;

    let targetTemplate: BoardTemplate;
    if (editingTemplate) {
      targetTemplate = {
        ...editingTemplate,
        name: formName.trim(),
        category: formCategory,
        description: formDescription.trim(),
        targetTextureName: formTargetTextureName.trim(),
        isPaid: formIsPaid,
        price: cleanPrice,
        published: formPublished,
        baseWidth: formWidth,
        baseHeight: formHeight,
        updatedAt: new Date().toISOString()
      };
    } else {
      targetTemplate = {
        id: formId.trim() || `board_tpl_${Date.now()}`,
        name: formName.trim(),
        category: formCategory,
        description: formDescription.trim(),
        targetTextureName: formTargetTextureName.trim(),
        aspectRatio: `${formWidth}:${formHeight}`,
        baseWidth: formWidth,
        baseHeight: formHeight,
        backgroundColor: "#0c0f12",
        backgroundType: "transparent",
        borderColor: "#ef3b2d",
        borderWidth: 2,
        borderRadius: 0,
        showBolts: false,
        isTextureSheet: true,
        textureResolution: 1024,
        allowUserCustomBackground: false,
        fixedGraphics: [],
        fields: [
          {
            id: "field_train_no",
            label: "Train Number Slot",
            defaultValue: "12627",
            placeholder: "12627",
            x: 50,
            y: 20,
            width: 80,
            height: 12,
            fontFamily: "'VT323', 'DotGothic16', monospace",
            fontSize: 72,
            fontWeight: 700,
            color: "#ff9f1c",
            align: "center",
            textTransform: "uppercase",
            ledGlow: true,
            glowColor: "#ff6200",
            glowRadius: 12,
            isDotMatrix: true
          },
          {
            id: "field_train_name",
            label: "Train Name Slot",
            defaultValue: "KARNATAKA EXPRESS",
            placeholder: "TRAIN NAME",
            x: 50,
            y: 40,
            width: 90,
            height: 12,
            fontFamily: "'VT323', 'DotGothic16', monospace",
            fontSize: 68,
            fontWeight: 700,
            color: "#ff9f1c",
            align: "center",
            textTransform: "uppercase",
            ledGlow: true,
            glowColor: "#ff6200",
            glowRadius: 14,
            isDotMatrix: true
          }
        ],
        published: formPublished,
        isPaid: formIsPaid,
        price: cleanPrice,
        currency: "INR",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        author: "Admin"
      };
    }

    storageService.saveTemplate(targetTemplate);
    await storageService.syncCloudTemplate(targetTemplate);
    await loadData();
    setIsEditModalOpen(false);
    showFeedback("success", `Successfully saved "${targetTemplate.name}".`);
  };

  // If Visual Studio is open, render visual studio view with Back to Admin Dashboard
  if (visualStudioTemplate) {
    return (
      <AdminLayout title={`Visual UV Studio · ${visualStudioTemplate.name}`}>
        <div style={{ marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Button
            variant="secondary"
            onClick={() => {
              setVisualStudioTemplate(null);
              loadData();
            }}
            className="flex items-center gap-2 border-white/10 bg-white/5 hover:bg-white/10 text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Templates List
          </Button>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Editing visual UV coordinates for:</span>
            <Badge variant="warning" className="text-rail-amber border-rail-amber/30">
              {visualStudioTemplate.name}
            </Badge>
          </div>
        </div>

        <div className="gjs-board-studio-root" style={{ background: "#0b1016", borderRadius: 12, overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)", height: "calc(100vh - 130px)", minHeight: "750px", display: "flex", flexDirection: "column" }}>
          <AdminTemplateStudio
            templates={templates}
            activeTemplate={visualStudioTemplate}
            onSaveTemplate={async (updated) => {
              storageService.saveTemplate(updated);
              await storageService.syncCloudTemplate(updated);
              setVisualStudioTemplate(updated);
              setTemplates((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
              showFeedback("success", `Saved UV layout for "${updated.name}".`);
            }}
            onSelectTemplate={(tpl) => setVisualStudioTemplate(tpl)}
            onDeleteTemplate={(id) => {
              storageService.deleteTemplate(id);
              storageService.deleteCloudTemplate(id);
              setVisualStudioTemplate(null);
              loadData();
            }}
            onCreateNewTemplate={handleOpenCreate}
          />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Railway Board Templates">
      <div className="space-y-6">
        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`p-4 rounded-lg flex items-center gap-3 border ${
              feedback.type === "success"
                ? "bg-emerald-950/40 border-emerald-500/30 text-emerald-300"
                : "bg-red-950/40 border-red-500/30 text-red-300"
            }`}
          >
            {feedback.type === "success" ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
            <span className="text-sm font-medium">{feedback.message}</span>
          </div>
        )}

        {/* Top Header & Actions */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
              <TrainFront className="h-7 w-7 text-rail-red" />
              Railway Board Templates
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Create, configure, and price Indian Railways LED matrix sheets and coach destination boards.
            </p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Link href="/board-studio" target="_blank" className="w-full sm:w-auto">
              <Button variant="secondary" className="w-full border-white/10 bg-white/5 hover:bg-white/10 text-white gap-2">
                <Eye className="h-4 w-4" /> Preview User Studio
              </Button>
            </Link>

            <Button
              onClick={handleOpenCreate}
              className="w-full sm:w-auto bg-gradient-to-r from-rail-red to-rail-amber hover:opacity-95 text-white font-semibold gap-2 shadow-lg shadow-rail-red/20"
            >
              <Plus className="h-4 w-4" /> Create Template
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-white/10 bg-slate-900/50 backdrop-blur-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Total Templates</p>
                <p className="text-2xl font-bold text-white mt-1">{stats.total}</p>
              </div>
              <div className="p-2.5 rounded-lg bg-white/5 text-muted-foreground">
                <Layers className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-slate-900/50 backdrop-blur-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Published</p>
                <p className="text-2xl font-bold text-emerald-400 mt-1">{stats.published}</p>
              </div>
              <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                <Eye className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-slate-900/50 backdrop-blur-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Free Templates</p>
                <p className="text-2xl font-bold text-cyan-400 mt-1">{stats.free}</p>
              </div>
              <div className="p-2.5 rounded-lg bg-cyan-500/10 text-cyan-400">
                <Unlock className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-slate-900/50 backdrop-blur-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Paid Templates</p>
                <p className="text-2xl font-bold text-rail-amber mt-1">{stats.paid}</p>
              </div>
              <div className="p-2.5 rounded-lg bg-rail-amber/10 text-rail-amber">
                <BadgeIndianRupee className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/40 p-3.5 rounded-xl border border-white/10">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by name, category, ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 rounded-lg bg-slate-950/60 border border-white/10 text-sm text-white focus:outline-none focus:border-rail-red/50"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            {(["all", "published", "hidden", "free", "paid"] as TemplateFilter[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize whitespace-nowrap transition-colors ${
                  filter === f
                    ? "bg-rail-red text-white shadow-sm"
                    : "text-muted-foreground hover:text-white hover:bg-white/5"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Templates Table / Cards */}
        <div className="rounded-xl border border-white/10 bg-slate-900/50 overflow-hidden backdrop-blur-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/60 text-xs uppercase font-semibold text-muted-foreground border-b border-white/10">
                <tr>
                  <th className="px-4 py-3.5">Template</th>
                  <th className="px-4 py-3.5">Category</th>
                  <th className="px-4 py-3.5">Resolution</th>
                  <th className="px-4 py-3.5">Pricing</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredTemplates.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      No board templates found matching your filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredTemplates.map((tpl) => (
                    <tr key={tpl.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-slate-950 border border-white/10 flex items-center justify-center text-rail-amber font-mono font-bold text-xs shrink-0 shadow-inner">
                            LED
                          </div>
                          <div>
                            <p className="font-semibold text-white leading-tight">{tpl.name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs font-mono text-muted-foreground">{tpl.id}</span>
                              {tpl.targetTextureName && (
                                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-950/60 text-cyan-300 border border-cyan-800/40">
                                  📄 {tpl.targetTextureName}.dds
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-xs px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-slate-300">
                          {tpl.category}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-xs font-mono text-muted-foreground">
                        {tpl.baseWidth || 1024} × {tpl.baseHeight || 1024}
                      </td>
                      <td className="px-4 py-3.5">
                        {tpl.isPaid ? (
                          <span className="text-xs font-bold text-rail-amber flex items-center gap-1">
                            <Lock className="h-3 w-3" /> ₹{tpl.price}
                          </span>
                        ) : (
                          <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                            <Unlock className="h-3 w-3" /> Free
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <button
                          type="button"
                          onClick={() => handleTogglePublish(tpl)}
                          className="flex items-center gap-1.5 text-xs font-medium focus:outline-none"
                          title={tpl.published !== false ? "Click to Hide" : "Click to Publish"}
                        >
                          {tpl.published !== false ? (
                            <span className="flex items-center gap-1 text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                              <Eye className="h-3 w-3" /> Published
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-muted-foreground bg-white/5 border border-white/10 px-2 py-0.5 rounded-full">
                              <EyeOff className="h-3 w-3" /> Hidden
                            </span>
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => setVisualStudioTemplate(tpl)}
                            className="h-8 border-rail-amber/30 text-rail-amber hover:bg-rail-amber/10 gap-1.5 text-xs"
                            title="Open Visual UV Coordinate Editor"
                          >
                            <Sliders className="h-3.5 w-3.5" /> Visual UV Studio
                          </Button>

                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleOpenEdit(tpl)}
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-white hover:bg-white/10"
                            title="Edit Details"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>

                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(tpl)}
                            className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                            title="Delete Template"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Create / Edit Template Modal */}
        {isEditModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="w-full max-w-xl bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in-0 zoom-in-95">
              <div className="flex items-center justify-between p-5 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-rail-red/10 text-rail-red">
                    <TrainFront className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base">
                      {editingTemplate ? "Edit Board Template" : "Create New Board Template"}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Configure template details, 3D texture mapping, and dimensions.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="p-1 rounded-lg text-muted-foreground hover:text-white hover:bg-white/10"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSaveModal} className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Template Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Amrit Bharat LED Destination Board (1024×1024)"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-lg bg-slate-950 border border-white/10 text-sm text-white focus:outline-none focus:border-rail-red"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Unique Slug ID *</label>
                    <input
                      type="text"
                      required
                      disabled={!!editingTemplate}
                      placeholder="e.g. amrit-bharat-led"
                      value={formId}
                      onChange={(e) => setFormId(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-lg bg-slate-950 border border-white/10 text-sm font-mono text-white focus:outline-none focus:border-rail-red disabled:opacity-50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Category</label>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value as BoardCategory)}
                      className="w-full px-3.5 py-2 rounded-lg bg-slate-950 border border-white/10 text-sm text-white focus:outline-none focus:border-rail-red"
                    >
                      <option value="LED Texture Sheet">LED Texture Sheet</option>
                      <option value="Coach Board">Coach Board</option>
                      <option value="Station Board">Station Board</option>
                      <option value="SLR Board">SLR Board</option>
                    </select>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-300">
                      Target Texture Name (MSTS 3D Model Filename)
                    </label>
                    <span className="text-[11px] font-mono text-rail-amber font-bold">
                      {formTargetTextureName ? `${formTargetTextureName}.dds` : 'Standard Name'}
                    </span>
                  </div>
                  <input
                    type="text"
                    placeholder="e.g. VB_NAME or AMRIT_LED (saves as VB_NAME.dds)"
                    value={formTargetTextureName}
                    onChange={(e) => setFormTargetTextureName(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-lg bg-slate-950 border border-white/10 text-sm font-mono text-white focus:outline-none focus:border-rail-red"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Simulator models map to this filename (e.g. VB_NAME downloads directly as VB_NAME.dds).
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Description</label>
                  <textarea
                    rows={2}
                    placeholder="Texture details, simulator compatibility..."
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-lg bg-slate-950 border border-white/10 text-sm text-white focus:outline-none focus:border-rail-red resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 p-3.5 rounded-xl bg-slate-950/60 border border-white/5">
                  <div>
                    <label className="flex items-center gap-2 text-xs font-semibold text-white cursor-pointer mb-2">
                      <input
                        type="checkbox"
                        checked={formIsPaid}
                        onChange={(e) => setFormIsPaid(e.target.checked)}
                        className="rounded border-white/20 bg-slate-900 text-rail-red focus:ring-0"
                      />
                      <span>Paid Template (MSTS Checkout)</span>
                    </label>
                    {formIsPaid ? (
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-bold">₹</span>
                        <input
                          type="number"
                          min="1"
                          step="1"
                          required
                          value={formPrice}
                          onChange={(e) => setFormPrice(e.target.value)}
                          className="w-full pl-7 pr-3 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-sm text-white focus:outline-none focus:border-rail-red"
                        />
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">Free for all store visitors</p>
                    )}
                  </div>

                  <div>
                    <label className="flex items-center gap-2 text-xs font-semibold text-white cursor-pointer mb-2">
                      <input
                        type="checkbox"
                        checked={formPublished}
                        onChange={(e) => setFormPublished(e.target.checked)}
                        className="rounded border-white/20 bg-slate-900 text-rail-red focus:ring-0"
                      />
                      <span>Published to Public Store</span>
                    </label>
                    <p className="text-xs text-muted-foreground">
                      {formPublished ? "Visible to users immediately" : "Hidden from public gallery"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setIsEditModalOpen(false)}
                    className="border-white/10 text-slate-300 hover:bg-white/5"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-rail-red hover:bg-rail-red/90 text-white font-semibold gap-2"
                  >
                    <Check className="h-4 w-4" /> Save Template
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

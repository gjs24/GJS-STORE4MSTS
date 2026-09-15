"use client";

import React, { useState } from "react";
import { Plus, Trash2, Save, ShieldCheck, CheckCircle, AlertCircle, Eye } from "lucide-react";
import {
  type BoardTemplate,
  type BoardSlotDefinition,
  adminSaveBoardTemplate,
  adminDeleteBoardTemplate,
} from "@/lib/board-studio-api";
import { LEDCanvas } from "./led-canvas";

interface AdminTemplateStudioProps {
  templates: BoardTemplate[];
  onRefresh: () => void;
}

const emptySlot: BoardSlotDefinition = {
  id: "slot_1",
  label: "New Slot",
  default_text: "SAMPLE",
  x: 50,
  y: 50,
  width: 300,
  height: 60,
  font: "VT323",
  font_size: 40,
  color: "#FFAA00",
  glow_color: "#FF7700",
  dot_pitch: 4,
  matrix_mode: true,
};

export function AdminTemplateStudio({ templates, onRefresh }: AdminTemplateStudioProps) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(templates[0]?.id || "new");
  const [formData, setFormData] = useState<Partial<BoardTemplate>>(() => {
    return templates[0] || createNewTemplateDraft();
  });

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  function createNewTemplateDraft(): Partial<BoardTemplate> {
    return {
      id: `custom-led-${Date.now().toString().slice(-4)}`,
      name: "New Indian Railways Board Template",
      category: "LED_MATRIX",
      description: "Custom train simulator LED destination board texture sheet.",
      base_width: 1024,
      base_height: 1024,
      background_image_url: "",
      is_paid: false,
      price: "0.00",
      published: true,
      fields: [
        {
          id: "train_number",
          label: "Train Number",
          default_text: "12345",
          x: 50,
          y: 70,
          width: 200,
          height: 70,
          font: "VT323",
          font_size: 48,
          color: "#FFAA00",
          glow_color: "#FF7700",
          dot_pitch: 4,
          matrix_mode: true,
        },
        {
          id: "train_name",
          label: "Train Name",
          default_text: "SUPERFAST EXP",
          x: 270,
          y: 70,
          width: 700,
          height: 70,
          font: "VT323",
          font_size: 44,
          color: "#FFAA00",
          glow_color: "#FF7700",
          dot_pitch: 4,
          matrix_mode: true,
        },
      ],
      fixed_graphics: [
        { type: "border", x: 25, y: 35, width: 974, height: 180, color: "#1E293B", border_width: 4 },
      ],
    };
  }

  function handleSelectTemplate(id: string) {
    setSelectedTemplateId(id);
    setMessage(null);
    if (id === "new") {
      setFormData(createNewTemplateDraft());
    } else {
      const found = templates.find((t) => t.id === id);
      if (found) {
        setFormData({ ...found });
      }
    }
  }

  function handleSlotChange(index: number, key: keyof BoardSlotDefinition, value: any) {
    const fields = [...(formData.fields || [])];
    fields[index] = { ...fields[index], [key]: value };
    setFormData((prev) => ({ ...prev, fields }));
  }

  function handleAddSlot() {
    const fields = [...(formData.fields || [])];
    const newId = `slot_${fields.length + 1}`;
    fields.push({ ...emptySlot, id: newId, label: `Slot ${fields.length + 1}` });
    setFormData((prev) => ({ ...prev, fields }));
  }

  function handleRemoveSlot(index: number) {
    const fields = [...(formData.fields || [])];
    fields.splice(index, 1);
    setFormData((prev) => ({ ...prev, fields }));
  }

  async function handleSave() {
    if (!formData.id || !formData.name) {
      setMessage({ type: "error", text: "Template ID and Name are required." });
      return;
    }
    try {
      setSaving(true);
      setMessage(null);
      await adminSaveBoardTemplate(formData);
      setMessage({ type: "success", text: `Template '${formData.name}' saved successfully!` });
      onRefresh();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to save board template." });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!formData.id || formData.id === "new") return;
    if (!confirm(`Are you sure you want to delete template '${formData.name}'?`)) return;

    try {
      setSaving(true);
      await adminDeleteBoardTemplate(formData.id);
      setMessage({ type: "success", text: "Template deleted successfully." });
      onRefresh();
      handleSelectTemplate("new");
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to delete board template." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-indigo-500/30 bg-indigo-950/30 p-4 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600 text-white">
            <ShieldCheck size={22} />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Staff Admin Studio • Board Template Creator</h2>
            <p className="text-xs text-indigo-300">
              Create and adjust LED texture sheets, slot coordinates, pricing (INR ₹), and UV backgrounds.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedTemplateId}
            onChange={(e) => handleSelectTemplate(e.target.value)}
            className="rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white focus:outline-none"
          >
            <option value="new">+ Create New Template</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.is_paid ? `₹${t.price}` : "Free"})
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
          >
            <Save size={15} /> {saving ? "Saving..." : "Save Template"}
          </button>

          {formData.id && formData.id !== "new" && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={saving}
              className="flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-950/40 px-3 py-2 text-sm text-rose-300 hover:bg-rose-900/60 transition-colors"
            >
              <Trash2 size={15} /> Delete
            </button>
          )}
        </div>
      </div>

      {message && (
        <div
          className={`flex items-center gap-2 rounded-lg p-3 text-sm border ${
            message.type === "success"
              ? "border-emerald-500/30 bg-emerald-950/40 text-emerald-300"
              : "border-rose-500/30 bg-rose-950/40 text-rose-300"
          }`}
        >
          {message.type === "success" ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Editor & Live Preview Layout */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        {/* Left Form: Metadata & Slots */}
        <div className="space-y-5 rounded-2xl border border-white/10 bg-slate-900/70 p-5 xl:col-span-6">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">Template Properties</h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-400">Template ID (Slug)</label>
              <input
                type="text"
                value={formData.id || ""}
                onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                placeholder="e.g. wapp7-led-1024"
                className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400">Category</label>
              <select
                value={formData.category || "LED_MATRIX"}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
              >
                <option value="LED_MATRIX">LED Matrix Display</option>
                <option value="ACRYLIC_METAL">Traditional Acrylic/Metal Board</option>
                <option value="LOCO_HEADCODE">Locomotive Headcode Display</option>
              </select>
            </div>

            <div className="col-span-2">
              <label className="text-xs font-semibold text-slate-400">Display Name</label>
              <input
                type="text"
                value={formData.name || ""}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Amrit Bharat Express LED Destination Board"
                className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div className="col-span-2">
              <label className="text-xs font-semibold text-slate-400">Description</label>
              <textarea
                value={formData.description || ""}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
                placeholder="Texture sheet notes, simulator compatibility..."
                className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400">Background Sheet Image URL</label>
              <input
                type="url"
                value={formData.background_image_url || ""}
                onChange={(e) => setFormData({ ...formData, background_image_url: e.target.value })}
                placeholder="https://.../sheet.png (optional)"
                className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400">Base Dimensions (px)</label>
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="number"
                  value={formData.base_width || 1024}
                  onChange={(e) => setFormData({ ...formData, base_width: parseInt(e.target.value) || 1024 })}
                  className="w-1/2 rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
                />
                <span className="text-slate-500">×</span>
                <input
                  type="number"
                  value={formData.base_height || 1024}
                  onChange={(e) => setFormData({ ...formData, base_height: parseInt(e.target.value) || 1024 })}
                  className="w-1/2 rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-4 pt-2">
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(formData.is_paid)}
                  onChange={(e) => setFormData({ ...formData, is_paid: e.target.checked })}
                  className="rounded border-white/10 accent-rail-amber"
                />
                Paid Template
              </label>

              {formData.is_paid && (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-400">Price ₹</span>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={formData.price || "0"}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-24 rounded-lg border border-white/10 bg-black/40 px-2.5 py-1 text-xs text-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 pt-2">
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(formData.published)}
                  onChange={(e) => setFormData({ ...formData, published: e.target.checked })}
                  className="rounded border-white/10 accent-emerald-500"
                />
                Published (Visible in Store)
              </label>
            </div>
          </div>

          {/* Slots List */}
          <div className="border-t border-white/10 pt-4 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Text Slots ({formData.fields?.length || 0})
              </h4>
              <button
                type="button"
                onClick={handleAddSlot}
                className="flex items-center gap-1 rounded bg-indigo-600/30 border border-indigo-500/40 px-2.5 py-1 text-xs font-medium text-indigo-300 hover:bg-indigo-600/50"
              >
                <Plus size={13} /> Add Slot
              </button>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {(formData.fields || []).map((slot, idx) => (
                <div key={idx} className="rounded-xl border border-white/10 bg-black/40 p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-rail-amber font-mono">#{idx + 1} {slot.id}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveSlot(idx)}
                      className="text-rose-400 hover:text-rose-300 text-xs"
                      title="Remove slot"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400">Slot ID</label>
                      <input
                        type="text"
                        value={slot.id}
                        onChange={(e) => handleSlotChange(idx, "id", e.target.value)}
                        className="mt-0.5 w-full rounded border border-white/10 bg-slate-900 px-2 py-1 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400">Label</label>
                      <input
                        type="text"
                        value={slot.label}
                        onChange={(e) => handleSlotChange(idx, "label", e.target.value)}
                        className="mt-0.5 w-full rounded border border-white/10 bg-slate-900 px-2 py-1 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400">Default Text</label>
                      <input
                        type="text"
                        value={slot.default_text}
                        onChange={(e) => handleSlotChange(idx, "default_text", e.target.value)}
                        className="mt-0.5 w-full rounded border border-white/10 bg-slate-900 px-2 py-1 text-xs text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400">X (px)</label>
                      <input
                        type="number"
                        value={slot.x}
                        onChange={(e) => handleSlotChange(idx, "x", parseInt(e.target.value) || 0)}
                        className="mt-0.5 w-full rounded border border-white/10 bg-slate-900 px-2 py-1 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400">Y (px)</label>
                      <input
                        type="number"
                        value={slot.y}
                        onChange={(e) => handleSlotChange(idx, "y", parseInt(e.target.value) || 0)}
                        className="mt-0.5 w-full rounded border border-white/10 bg-slate-900 px-2 py-1 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400">W (px)</label>
                      <input
                        type="number"
                        value={slot.width}
                        onChange={(e) => handleSlotChange(idx, "width", parseInt(e.target.value) || 0)}
                        className="mt-0.5 w-full rounded border border-white/10 bg-slate-900 px-2 py-1 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400">H (px)</label>
                      <input
                        type="number"
                        value={slot.height}
                        onChange={(e) => handleSlotChange(idx, "height", parseInt(e.target.value) || 0)}
                        className="mt-0.5 w-full rounded border border-white/10 bg-slate-900 px-2 py-1 text-xs text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400">Font</label>
                      <select
                        value={slot.font || "VT323"}
                        onChange={(e) => handleSlotChange(idx, "font", e.target.value)}
                        className="mt-0.5 w-full rounded border border-white/10 bg-slate-900 px-2 py-1 text-xs text-white"
                      >
                        <option value="VT323">VT323 (LED)</option>
                        <option value="Noto Sans Devanagari">Noto Sans Devanagari</option>
                        <option value="Arial Black">Arial Black</option>
                        <option value="Arial">Arial</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400">Font Size (px)</label>
                      <input
                        type="number"
                        value={slot.font_size || 36}
                        onChange={(e) => handleSlotChange(idx, "font_size", parseInt(e.target.value) || 36)}
                        className="mt-0.5 w-full rounded border border-white/10 bg-slate-900 px-2 py-1 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400">LED Color</label>
                      <input
                        type="color"
                        value={slot.color || "#FFAA00"}
                        onChange={(e) => handleSlotChange(idx, "color", e.target.value)}
                        className="mt-0.5 h-7 w-full cursor-pointer rounded border border-white/10 bg-slate-900 p-0.5"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Preview: Live Canvas with UV grid */}
        <div className="flex flex-col items-center justify-start space-y-3 xl:col-span-6">
          <div className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-slate-900/80 px-4 py-2 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <Eye size={15} className="text-indigo-400" />
              <span className="font-semibold">Live Staff Layout Preview (UV Grid On)</span>
            </div>
            <span className="font-mono text-[11px] text-slate-400">
              {formData.base_width || 1024} × {formData.base_height || 1024} px
            </span>
          </div>

          <div className="flex w-full items-center justify-center overflow-auto rounded-2xl border border-white/10 bg-black/80 p-4 shadow-inner">
            <LEDCanvas
              template={formData as BoardTemplate}
              fieldValues={{}}
              showGrid={true}
              scale={0.55}
              bloomIntensity={1}
            />
          </div>
        </div>
      </div>
    </div>
  );
}


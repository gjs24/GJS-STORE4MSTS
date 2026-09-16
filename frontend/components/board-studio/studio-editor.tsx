"use client";

import React, { useState, useRef } from "react";
import {
  Download,
  Save,
  Layers,
  ZoomIn,
  ZoomOut,
  Sparkles,
  Grid,
  Lock,
  CheckCircle,
  AlertCircle,
  RotateCcw,
  Sliders,
} from "lucide-react";
import { load } from "@cashfreepayments/cashfree-js";
import { LEDCanvas, type LEDCanvasHandle } from "./led-canvas";
import {
  type BoardTemplate,
  saveUserCustomBoard,
  createBoardOrder,
} from "@/lib/board-studio-api";
import { exportCanvasAsDDS, exportCanvasAsPNG, type DDSFormat } from "@/lib/dds-generator";
import { getStoredUser, isLoggedIn } from "@/lib/api";

const cashfreeMode = process.env.NEXT_PUBLIC_CASHFREE_MODE === "production" ? "production" : "sandbox";

interface StudioEditorProps {
  template: BoardTemplate;
  initialValues?: Record<string, string>;
  boardId?: number;
  initialTitle?: string;
  onSaved?: () => void;
  onUnlockSuccess?: () => void;
}

export function StudioEditor({
  template,
  initialValues = {},
  boardId,
  initialTitle,
  onSaved,
  onUnlockSuccess,
}: StudioEditorProps) {
  const canvasHandleRef = useRef<LEDCanvasHandle | null>(null);

  // Field values state
  const [fieldValues, setFieldValues] = useState<Record<string, string>>(() => {
    const vals: Record<string, string> = {};
    for (const f of template.fields || []) {
      vals[f.id] = initialValues[f.id] !== undefined ? initialValues[f.id] : f.default_text;
    }
    return vals;
  });

  const [boardTitle, setBoardTitle] = useState(initialTitle || `${template.name} Custom`);
  const [zoomScale, setZoomScale] = useState<number>(0.65);
  const [showGrid, setShowGrid] = useState<boolean>(false);
  const [unlitDots, setUnlitDots] = useState<boolean>(true);
  const [bloomIntensity, setBloomIntensity] = useState<number>(1);
  const [ddsFormat, setDdsFormat] = useState<DDSFormat>("RGBA32");

  const [saving, setSaving] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);
  const [isUnlocking, setIsUnlocking] = useState<boolean>(false);

  const canCustomize = template.can_customize;

  function handleFieldChange(fieldId: string, val: string) {
    setFieldValues((prev) => ({ ...prev, [fieldId]: val }));
  }

  function handleReset() {
    const vals: Record<string, string> = {};
    for (const f of template.fields || []) {
      vals[f.id] = f.default_text;
    }
    setFieldValues(vals);
    setMessage({ type: "info", text: "Reset fields to template defaults." });
  }

  async function handleSaveBoard() {
    if (!isLoggedIn()) {
      setMessage({ type: "error", text: "Please login to your account to save customized boards." });
      return;
    }
    if (!canCustomize) {
      setMessage({ type: "error", text: "Please unlock this board template before saving." });
      return;
    }

    try {
      setSaving(true);
      setMessage(null);
      const previewUrl = canvasHandleRef.current?.getPreviewDataUrl() || "";

      await saveUserCustomBoard({
        id: boardId,
        template: template.id,
        title: boardTitle,
        custom_field_values: fieldValues,
        preview_image_url: previewUrl,
      });

      setMessage({ type: "success", text: "Custom board saved to your account successfully!" });
      if (onSaved) onSaved();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to save customized board." });
    } finally {
      setSaving(false);
    }
  }

  function handleExportDDS() {
    const canvas = canvasHandleRef.current?.getCanvas();
    if (!canvas) return;
    const filename = `${boardTitle.toLowerCase().replace(/[^a-z0-9]/g, "_")}_${template.id}.dds`;
    exportCanvasAsDDS(canvas, filename, ddsFormat);
    setMessage({ type: "success", text: `Exported ${filename} (${ddsFormat}) successfully!` });
  }

  function handleExportPNG() {
    const canvas = canvasHandleRef.current?.getCanvas();
    if (!canvas) return;
    const filename = `${boardTitle.toLowerCase().replace(/[^a-z0-9]/g, "_")}.png`;
    exportCanvasAsPNG(canvas, filename);
    setMessage({ type: "success", text: `Exported ${filename} successfully!` });
  }

  async function handleCashfreeUnlock() {
    if (!isLoggedIn()) {
      setMessage({ type: "error", text: "Please log in to unlock this premium board template." });
      return;
    }
    try {
      setIsUnlocking(true);
      setMessage({ type: "info", text: "Initiating Cashfree checkout..." });

      const orderData = await createBoardOrder(template.id);
      if (orderData.status === "APPROVED" || orderData.download_enabled) {
        setMessage({ type: "success", text: "Board template unlocked successfully!" });
        if (onUnlockSuccess) onUnlockSuccess();
        return;
      }

      if (!orderData.payment_session_id) {
        throw new Error("Cashfree payment session could not be created.");
      }

      const targetMode = orderData.cashfree_mode || cashfreeMode;
      const cashfree = await load({ mode: targetMode });
      const result = await cashfree.checkout({
        paymentSessionId: orderData.payment_session_id,
        redirectTarget: "_self",
      });

      if (result.error) {
        throw new Error(result.error.message || "Cashfree payment could not be completed.");
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Checkout failed. Please try again." });
    } finally {
      setIsUnlocking(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Lock Notice if Paid & Not Unlocked */}
      {!canCustomize && (
        <div className="flex flex-col items-center justify-between gap-4 rounded-xl border border-rail-amber/40 bg-rail-amber/10 p-4 text-slate-200 sm:flex-row">
          <div className="flex items-center gap-3">
            <Lock className="size-6 text-rail-amber" />
            <div>
              <div className="font-bold text-white">Premium Board Template (₹{template.price})</div>
              <div className="text-xs text-slate-300">
                Unlock full interactive editing, saving to account, and direct DDS exports.
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleCashfreeUnlock}
            disabled={isUnlocking}
            className="flex items-center gap-2 rounded-lg bg-rail-amber px-5 py-2.5 text-sm font-bold text-black shadow-glow transition-all hover:bg-yellow-400 disabled:opacity-50"
          >
            {isUnlocking ? "Processing..." : `Unlock for ₹${template.price} via Cashfree`}
          </button>
        </div>
      )}

      {/* Message Banner */}
      {message && (
        <div
          className={`flex items-center gap-2.5 rounded-lg border p-3.5 text-sm ${
            message.type === "success"
              ? "border-emerald-500/30 bg-emerald-950/40 text-emerald-300"
              : message.type === "error"
              ? "border-rose-500/30 bg-rose-950/40 text-rose-300"
              : "border-sky-500/30 bg-sky-950/40 text-sky-300"
          }`}
        >
          {message.type === "success" && <CheckCircle size={16} />}
          {message.type === "error" && <AlertCircle size={16} />}
          <span>{message.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Side: Field Inputs & Controls */}
        <div className="space-y-5 rounded-2xl border border-white/10 bg-slate-900/60 p-5 backdrop-blur-xl lg:col-span-5">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div>
              <h3 className="text-base font-bold text-white">Board Text & Fields</h3>
              <p className="text-xs text-slate-400">{template.name}</p>
            </div>
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-1 text-xs text-slate-400 transition-colors hover:text-white"
              title="Reset fields to defaults"
            >
              <RotateCcw size={13} /> Reset
            </button>
          </div>

          {/* Board Title */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
              Custom Rake Title
            </label>
            <input
              type="text"
              value={boardTitle}
              onChange={(e) => setBoardTitle(e.target.value)}
              placeholder="e.g. 12637 Pandian Rake LED Texture"
              className="mt-1.5 w-full rounded-lg border border-white/10 bg-black/40 px-3.5 py-2 text-sm text-white placeholder:text-slate-600 focus:border-rail-amber focus:outline-none"
            />
          </div>

          {/* Dynamic Slots Form */}
          <div className="space-y-4">
            {(template.fields || []).map((field) => (
              <div key={field.id} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-slate-300">{field.label}</label>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {field.font || "VT323"} • {field.matrix_mode !== false ? "LED Dot Matrix" : "Solid Text"}
                  </span>
                </div>
                <input
                  type="text"
                  value={fieldValues[field.id] || ""}
                  onChange={(e) => handleFieldChange(field.id, e.target.value)}
                  placeholder={field.default_text}
                  className="w-full rounded-lg border border-white/10 bg-black/50 px-3.5 py-2 text-sm text-white placeholder:text-slate-600 focus:border-rail-amber focus:outline-none"
                />
              </div>
            ))}
          </div>

          {/* LED Engine Tuning Controls */}
          <div className="border-t border-white/10 pt-4 space-y-3.5">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300">
              <Sliders size={14} className="text-rail-amber" /> LED Diode Engine Tuning
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-slate-400">LED Bloom Glow</label>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={bloomIntensity}
                  onChange={(e) => setBloomIntensity(parseFloat(e.target.value))}
                  className="mt-1 w-full accent-rail-amber cursor-pointer"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400">Unlit LED Grid</label>
                <button
                  type="button"
                  onClick={() => setUnlitDots(!unlitDots)}
                  className={`mt-1 w-full rounded-md border px-2 py-1 text-xs font-medium transition-colors ${
                    unlitDots
                      ? "border-rail-amber/40 bg-rail-amber/20 text-rail-amber"
                      : "border-white/10 bg-black/30 text-slate-400"
                  }`}
                >
                  {unlitDots ? "Enabled (Authentic)" : "Disabled (Dark)"}
                </button>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="border-t border-white/10 pt-4 space-y-2.5">
            <button
              type="button"
              onClick={handleSaveBoard}
              disabled={saving || !canCustomize}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 py-2.5 text-sm font-bold text-white shadow-lg transition-all hover:brightness-110 disabled:opacity-50"
            >
              <Save size={16} />
              {saving ? "Saving to Account..." : "Save to My Boards"}
            </button>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="col-span-2 flex items-center justify-between rounded-lg border border-white/10 bg-black/30 px-3 py-1.5 text-xs text-slate-300">
                <span>DDS Compression:</span>
                <select
                  value={ddsFormat}
                  onChange={(e) => setDdsFormat(e.target.value as DDSFormat)}
                  className="rounded bg-slate-800 px-2 py-0.5 text-xs text-white focus:outline-none"
                >
                  <option value="RGBA32">32-bit RGBA (Universal HQ)</option>
                  <option value="DXT5">DXT5 / BC3 (Compact VRAM)</option>
                </select>
              </div>

              <button
                type="button"
                onClick={handleExportDDS}
                className="flex items-center justify-center gap-1.5 rounded-lg border border-white/15 bg-white/5 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/10"
              >
                <Download size={14} className="text-rail-amber" /> Direct DDS
              </button>

              <button
                type="button"
                onClick={handleExportPNG}
                className="flex items-center justify-center gap-1.5 rounded-lg border border-white/15 bg-white/5 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/10"
              >
                <Download size={14} className="text-sky-400" /> Direct PNG
              </button>
            </div>
          </div>
        </div>

        {/* Right Side: Interactive Live Canvas Preview */}
        <div className="flex flex-col items-center justify-start space-y-3 lg:col-span-7">
          {/* Canvas Toolbar */}
          <div className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-slate-900/80 px-4 py-2 text-xs text-slate-300 backdrop-blur-md">
            <div className="flex items-center gap-2">
              <Layers size={15} className="text-rail-amber" />
              <span className="font-mono text-[11px] text-slate-400">
                {template.base_width || 1024} × {template.base_height || 1024} px
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowGrid(!showGrid)}
                className={`flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-colors ${
                  showGrid ? "bg-white/15 text-rail-amber" : "text-slate-400 hover:text-white"
                }`}
                title="Toggle UV bounds and alignment grid"
              >
                <Grid size={14} /> UV Grid
              </button>

              <div className="flex items-center gap-1 border-l border-white/10 pl-3">
                <button
                  type="button"
                  onClick={() => setZoomScale((s) => Math.max(0.25, s - 0.15))}
                  className="rounded p-1 hover:bg-white/10"
                  title="Zoom Out"
                >
                  <ZoomOut size={14} />
                </button>
                <span className="w-10 text-center font-mono text-[11px]">{Math.round(zoomScale * 100)}%</span>
                <button
                  type="button"
                  onClick={() => setZoomScale((s) => Math.min(1.2, s + 0.15))}
                  className="rounded p-1 hover:bg-white/10"
                  title="Zoom In"
                >
                  <ZoomIn size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* Canvas Component */}
          <div className="flex w-full items-center justify-center overflow-auto rounded-2xl border border-white/10 bg-black/80 p-4 shadow-inner">
            <LEDCanvas
              ref={canvasHandleRef}
              template={template}
              fieldValues={fieldValues}
              showGrid={showGrid}
              scale={zoomScale}
              bloomIntensity={bloomIntensity}
              unlitDots={unlitDots}
            />
          </div>

          {/* UV Layout Info Tip */}
          <p className="text-center text-[11px] text-slate-500">
            Exported texture sheet matches standard TRS19/22 and Open Rails UV layouts. Direct DDS produces native 32-bit DirectX texture surfaces.
          </p>
        </div>
      </div>
    </div>
  );
}


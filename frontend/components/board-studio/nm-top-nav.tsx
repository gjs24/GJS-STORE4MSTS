'use client';

import React from 'react';
import {
  Download,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Grid,
  Lock,
  Unlock,
  Package,
  Upload,
  Layers,
  Image as ImageIcon
} from 'lucide-react';
import { AtlasTemplate } from '@/lib/nm-editor/types';

interface NmTopNavProps {
  zoom: number;
  setZoom: React.Dispatch<React.SetStateAction<number>>;
  onFitScreen: () => void;
  onExportPng: () => void;
  onOpenPatcher: () => void;
  template: AtlasTemplate;
  showUvGuides: boolean;
  setShowUvGuides: (show: boolean) => void;
  isTemplateLocked: boolean;
  setIsTemplateLocked: (locked: boolean) => void;
  onOpenExportTemplate: () => void;
  onImportTemplateFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function NmTopNav({
  zoom,
  setZoom,
  onFitScreen,
  onExportPng,
  onOpenPatcher,
  template,
  showUvGuides,
  setShowUvGuides,
  isTemplateLocked,
  setIsTemplateLocked,
  onOpenExportTemplate,
  onImportTemplateFile
}: NmTopNavProps) {
  return (
    <header className="h-14 border-b border-slate-800 bg-slate-900/90 backdrop-blur flex items-center justify-between px-4 select-none shrink-0 z-20">
      {/* Left Branding */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-600 via-yellow-500 to-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
          <Layers className="w-5 h-5 text-slate-950 stroke-[2.5]" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-black tracking-tight text-white text-base">GJS PRO</span>
            <span className="text-xs px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30">NM STUDIO</span>
            <span className="text-[10px] text-slate-400 font-mono">4K Master</span>
          </div>
          <div className="text-[10px] text-slate-400">4096×4096 Standard Coach Atlas & Nameboard Studio</div>
        </div>
      </div>

      {/* Middle Zoom & UV Guides */}
      <div className="flex items-center gap-1.5 bg-slate-950/80 border border-slate-800 rounded-xl px-2.5 py-1">
        <button
          onClick={() => setZoom(z => Math.max(0.05, Number((z - 0.03).toFixed(3))))}
          className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>

        <span className="font-mono text-xs text-slate-300 px-2 min-w-[50px] text-center font-medium">
          {Math.round(zoom * 100)}%
        </span>

        <button
          onClick={() => setZoom(z => Math.min(1.5, Number((z + 0.03).toFixed(3))))}
          className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>

        <div className="h-4 w-px bg-slate-800 mx-1" />

        <button
          onClick={onFitScreen}
          className="p-1.5 hover:bg-amber-500/20 rounded text-amber-400 hover:text-amber-300 transition flex items-center gap-1 text-xs font-semibold"
          title="Fit 4096 Atlas 100% into Viewport"
        >
          <Maximize2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline text-[11px]">Fit</span>
        </button>

        <div className="h-4 w-px bg-slate-800 mx-1" />

        {/* UV Guides Toggle */}
        <button
          onClick={() => setShowUvGuides(!showUvGuides)}
          className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold transition ${
            showUvGuides ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'text-slate-400 hover:text-white'
          }`}
          title="Toggle 4096 UV Slot Guides"
        >
          <Grid className="w-3.5 h-3.5" />
          <span>UV Guides</span>
        </button>

        <div className="h-4 w-px bg-slate-800 mx-1" />

        <span className="text-[11px] font-mono text-amber-400 font-bold px-1">
          {template?.width || 4096} × {template?.height || 4096}
        </span>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2">
        {/* Template Lock Toggle */}
        <button
          onClick={() => setIsTemplateLocked(!isTemplateLocked)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold border transition ${
            isTemplateLocked
              ? 'bg-emerald-950/60 border-emerald-600/70 text-emerald-300 hover:bg-emerald-900/60'
              : 'bg-amber-950/60 border-amber-600/70 text-amber-300 hover:bg-amber-900/60'
          }`}
          title={isTemplateLocked ? "Template UV Locked for Buyers. Click to unlock Creator Mode." : "Creator Mode Active. Click to lock for Buyers."}
        >
          {isTemplateLocked ? <Lock className="w-3.5 h-3.5 text-emerald-400" /> : <Unlock className="w-3.5 h-3.5 text-amber-400" />}
          <span>{isTemplateLocked ? 'LOCKED (Buyer)' : 'UNLOCKED (Creator)'}</span>
        </button>

        {/* Package Template Button */}
        <button
          onClick={onOpenExportTemplate}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium bg-slate-800/80 hover:bg-slate-800 text-purple-300 border border-purple-800/50 transition"
          title="Package this design into a .gjs-template file for your buyers"
        >
          <Package className="w-3.5 h-3.5 text-purple-400" />
          <span className="hidden md:inline">Package</span>
        </button>

        {/* Import Template Button */}
        <label
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium bg-slate-800/80 hover:bg-slate-800 text-teal-300 border border-teal-800/50 transition cursor-pointer"
          title="Import a .gjs-template package file from a creator"
        >
          <Upload className="w-3.5 h-3.5 text-teal-400" />
          <span className="hidden md:inline">Import</span>
          <input
            type="file"
            accept=".gjs-template,.json"
            onChange={onImportTemplateFile}
            className="hidden"
          />
        </label>

        {/* Livery Patcher */}
        <button
          onClick={onOpenPatcher}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium bg-slate-800/80 hover:bg-slate-800 text-slate-200 border border-slate-700/60 transition"
          title="Overlay onto existing coach texture"
        >
          <ImageIcon className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden lg:inline">Livery Patcher</span>
        </button>

        {/* Export 4K PNG */}
        <button
          onClick={onExportPng}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 shadow-lg shadow-amber-500/20 transition transform active:scale-95"
        >
          <Download className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Export 4K PNG</span>
        </button>
      </div>
    </header>
  );
}


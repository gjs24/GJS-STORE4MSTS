'use client';

import React, { useState } from 'react';
import { Package, Lock, Download, Check } from 'lucide-react';
import { AtlasTemplate, BoardState } from '@/lib/nm-editor/types';
import { TemplateStorage } from '@/lib/nm-editor/template-storage';

interface ExportTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTemplate: AtlasTemplate;
  boardState: BoardState;
}

export default function ExportTemplateModal({
  isOpen,
  onClose,
  currentTemplate,
  boardState
}: ExportTemplateModalProps) {
  const [templateName, setTemplateName] = useState(currentTemplate?.name || 'My Custom 4K Coach Template');
  const [authorName, setAuthorName] = useState('GJS 3D Asset Creator');
  const [description, setDescription] = useState('Official 4K Texture Atlas for Indian Railways 3D Coach Models.');
  const [lockLayout, setLockLayout] = useState(true);
  const [exported, setExported] = useState(false);

  if (!isOpen) return null;

  const handlePackageAndExport = (e: React.FormEvent) => {
    e.preventDefault();

    const templatePackage: AtlasTemplate = {
      id: `custom_${Date.now()}`,
      name: templateName.trim(),
      category: currentTemplate?.category || 'Custom Atlas',
      author: authorName.trim(),
      description: description.trim(),
      width: currentTemplate?.width || 4096,
      height: currentTemplate?.height || 4096,
      layout: currentTemplate?.layout || 'full_atlas',
      atlasType: currentTemplate?.atlasType || 'icf',
      lockedByDefault: lockLayout,
      boardColor: boardState.customBoardColor || currentTemplate?.boardColor || '#fbc02d',
      boardBorderColor: currentTemplate?.boardBorderColor || '#0d2b5c',
      textColor: boardState.customTextColor || currentTemplate?.textColor || '#000000',
      accentColor: currentTemplate?.accentColor || '#9c1d1e',
      coachType: currentTemplate?.coachType || 'Custom Indian Railways Coach',
      bgTheme: currentTemplate?.bgTheme || 'icf_classic_blue',
      fontFamily: currentTemplate?.fontFamily || "'Inter', sans-serif",
      defaultParts: { ...(boardState.parts || currentTemplate?.defaultParts) },
      defaultBoardState: {
        boardMode: boardState.boardMode,
        trainNo: boardState.trainNo,
        trainName: boardState.trainName,
        sourceEn: boardState.sourceEn,
        destEn: boardState.destEn,
        zone: boardState.zone,
        baseDepot: boardState.baseDepot,
        rsaSegments: boardState.rsaSegments,
        slrLuggage: boardState.slrLuggage
      }
    };

    TemplateStorage.saveTemplate(templatePackage);
    TemplateStorage.exportTemplateFile(templatePackage);

    setExported(true);
    setTimeout(() => {
      setExported(false);
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-950/20 flex items-center justify-center border border-white/20">
              <Package className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Publish Protected Template Pack</h2>
              <p className="text-xs text-emerald-100">Package your 4K design into a .gjs-template file for your buyers</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white font-semibold">✕</button>
        </div>

        {/* Content */}
        <form onSubmit={handlePackageAndExport} className="p-6 space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1">Template Package Name</label>
            <input
              type="text"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="e.g. GJS 2026 LHB Tejas Smart Pack"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-bold text-white"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Creator / Author Name</label>
              <input
                type="text"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                placeholder="e.g. GJS Modding Studio"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200"
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Resolution Standard</label>
              <input
                type="text"
                disabled
                value={`${currentTemplate?.width || 4096} × ${currentTemplate?.height || 4096} 4K`}
                className="w-full px-3 py-2 bg-slate-950/50 border border-slate-800 rounded-xl text-xs font-mono text-amber-400 font-bold"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1">Asset Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Description of the 3D model or coach pack this template maps to..."
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-300"
            />
          </div>

          {/* Buyer Protection Toggle */}
          <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Lock className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <div className="text-xs font-bold text-slate-200">Lock Template Layout for Buyers</div>
                <div className="text-[11px] text-slate-400">
                  Prevents users from accidentally moving slots or breaking your 3D asset&apos;s UV mapping.
                </div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={lockLayout}
              onChange={(e) => setLockLayout(e.target.checked)}
              className="w-5 h-5 rounded accent-amber-500 cursor-pointer"
            />
          </div>

          {exported ? (
            <div className="p-3 bg-emerald-950/40 border border-emerald-800 text-emerald-300 rounded-xl text-xs flex items-center justify-center gap-2">
              <Check className="w-4 h-4 text-emerald-400" />
              <span>Template Packaged Successfully! Downloading .gjs-template...</span>
            </div>
          ) : (
            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition"
            >
              <Download className="w-4 h-4 stroke-[2.5]" />
              <span>Package & Download .gjs-template File</span>
            </button>
          )}
        </form>
      </div>
    </div>
  );
}

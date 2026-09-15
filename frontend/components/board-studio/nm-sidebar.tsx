'use client';

import React, { useState } from 'react';
import {
  Sparkles,
  Download,
  Search,
  Plus,
  Trash2,
  Save,
  RotateCcw,
  Grid,
  MapPin,
  ArrowRight,
  Boxes,
  Lock,
  Unlock,
  Package,
  Layers,
  CloudRain,
  Palette
} from 'lucide-react';
import { TEMPLATES } from '@/lib/nm-editor/templates';
import { POPULAR_TRAINS, REGIONAL_LANGUAGES } from '@/lib/nm-editor/trains';
import { IR_ZONES, COACH_CLASSES } from '@/lib/nm-editor/zones';
import { AtlasTemplate, BoardState, WeatheringState } from '@/lib/nm-editor/types';

interface NmSidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  selectedTemplate: AtlasTemplate;
  setSelectedTemplate: (template: AtlasTemplate) => void;
  boardState: BoardState;
  setBoardState: React.Dispatch<React.SetStateAction<BoardState>>;
  weathering: WeatheringState;
  setWeathering: React.Dispatch<React.SetStateAction<WeatheringState>>;
  onExportPng: () => void;
  onExportDds: (format?: 'RGBA32' | 'DXT5') => void;
  onSaveToAccount?: () => void;
  isSavingToAccount?: boolean;
  onOpenPatcher: () => void;
  showUvGuides: boolean;
  setShowUvGuides: (show: boolean) => void;
  selectedPart: string | null;
  setSelectedPart: (part: string | null) => void;
  isTemplateLocked: boolean;
  setIsTemplateLocked: (locked: boolean) => void;
  installedTemplates?: AtlasTemplate[];
  onDeleteCustomTemplate?: (id: string) => void;
}

export default function NmSidebar({
  activeTab,
  setActiveTab,
  selectedTemplate,
  setSelectedTemplate,
  boardState,
  setBoardState,
  weathering,
  setWeathering,
  onExportPng,
  onExportDds,
  onSaveToAccount,
  isSavingToAccount,
  onOpenPatcher,
  showUvGuides,
  setShowUvGuides,
  selectedPart,
  setSelectedPart,
  isTemplateLocked,
  setIsTemplateLocked,
  installedTemplates = [],
  onDeleteCustomTemplate
}: NmSidebarProps) {
  const [trainSearch, setTrainSearch] = useState('');

  // RSA Multi-Segment Helpers
  const addRsaSegment = () => {
    const segments = [...(boardState.rsaSegments || [])];
    segments.push({
      station: "NEW STATION",
      upNo: "12345",
      downNo: "12346"
    });
    setBoardState({ ...boardState, rsaSegments: segments });
  };

  const removeRsaSegment = (index: number) => {
    const segments = (boardState.rsaSegments || []).filter((_, i) => i !== index);
    setBoardState({ ...boardState, rsaSegments: segments });
  };

  const updateRsaSegment = (index: number, field: string, value: string) => {
    const segments = [...(boardState.rsaSegments || [])];
    segments[index] = { ...segments[index], [field]: value };
    setBoardState({ ...boardState, rsaSegments: segments });
  };

  // UV Slot Adjustments for 4096 Atlas
  const updatePartCoord = (partKey: string, field: string, val: string | number) => {
    const num = Number(val);
    setBoardState({
      ...boardState,
      parts: {
        ...boardState.parts,
        [partKey]: {
          ...boardState.parts[partKey],
          [field]: num
        }
      }
    });
  };

  const saveAsDefaultAssetStandard = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('gjs_custom_asset_standard', JSON.stringify(boardState.parts));
      alert('Success! Your custom 4096×4096 UV Slot layout has been saved as the Default Asset Standard.');
    }
  };

  const resetToStandardAtlas = () => {
    if (selectedTemplate.defaultParts) {
      setBoardState({
        ...boardState,
        parts: { ...selectedTemplate.defaultParts }
      });
    }
    if (typeof window !== 'undefined') {
      localStorage.removeItem('gjs_custom_asset_standard');
    }
  };

  return (
    <aside className="w-96 border-r border-slate-800 bg-slate-900/95 flex flex-col shrink-0 select-none z-10 h-full overflow-hidden">
      {/* 3 Master Coach Type Selectors: ICF | LHB | Digiboards */}
      <div className="p-2 border-b border-slate-800 bg-slate-950/90">
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex justify-between items-center px-1">
          <span>Coach Atlas Standard</span>
          <span className="text-amber-400 font-mono font-bold">4096×4096 4K</span>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {/* ICF Button */}
          <button
            onClick={() => {
              const tmpl = TEMPLATES.find(t => t.id === 'icf_4096_atlas') || TEMPLATES[0];
              setSelectedTemplate(tmpl);
              if (tmpl.defaultParts) setBoardState(prev => ({ ...prev, parts: { ...tmpl.defaultParts! } }));
            }}
            className={`py-1.5 px-2 rounded-lg text-xs font-bold transition flex flex-col items-center border ${
              selectedTemplate.id === 'icf_4096_atlas'
                ? 'bg-blue-600/30 border-blue-400 text-white shadow-md shadow-blue-500/20'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <span className="text-[10px] uppercase font-black text-blue-400">ICF COACH</span>
            <span className="text-[11px] font-semibold">Blue & Utkrisht</span>
          </button>

          {/* LHB Button */}
          <button
            onClick={() => {
              const tmpl = TEMPLATES.find(t => t.id === 'lhb_4096_atlas');
              if (tmpl) {
                setSelectedTemplate(tmpl);
                if (tmpl.defaultParts) setBoardState(prev => ({ ...prev, parts: { ...tmpl.defaultParts! } }));
              }
            }}
            className={`py-1.5 px-2 rounded-lg text-xs font-bold transition flex flex-col items-center border ${
              selectedTemplate.id === 'lhb_4096_atlas'
                ? 'bg-red-600/30 border-red-400 text-white shadow-md shadow-red-500/20'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <span className="text-[10px] uppercase font-black text-red-400">LHB COACH</span>
            <span className="text-[11px] font-semibold">Red & Silver</span>
          </button>

          {/* Digiboard Button */}
          <button
            onClick={() => {
              const tmpl = TEMPLATES.find(t => t.id === 'digiboard_4096_atlas');
              if (tmpl) {
                setSelectedTemplate(tmpl);
                if (tmpl.defaultParts) setBoardState(prev => ({ ...prev, parts: { ...tmpl.defaultParts! } }));
              }
            }}
            className={`py-1.5 px-2 rounded-lg text-xs font-bold transition flex flex-col items-center border ${
              selectedTemplate.id === 'digiboard_4096_atlas'
                ? 'bg-amber-600/30 border-amber-400 text-white shadow-md shadow-amber-500/20'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <span className="text-[10px] uppercase font-black text-amber-400">DIGIBOARDS</span>
            <span className="text-[11px] font-semibold">LED Matrix</span>
          </button>
        </div>

        {/* User-Imported Creator Templates */}
        {installedTemplates.length > 0 && (
          <div className="mt-2 pt-2 border-t border-slate-800/80">
            <div className="text-[9px] font-bold text-purple-300 uppercase tracking-wider mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Package className="w-3 h-3 text-purple-400" />
                <span>Installed Creator Packs ({installedTemplates.length})</span>
              </span>
            </div>
            <div className="space-y-1 max-h-24 overflow-y-auto pr-0.5">
              {installedTemplates.map(t => (
                <div
                  key={t.id}
                  className={`flex items-center justify-between px-2 py-1 rounded-lg text-xs border transition ${
                    selectedTemplate.id === t.id
                      ? 'bg-purple-950/60 border-purple-500 text-purple-200'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <button
                    onClick={() => {
                      setSelectedTemplate(t);
                      if (t.defaultParts) setBoardState(prev => ({ ...prev, parts: { ...t.defaultParts! } }));
                      if (t.defaultBoardState) setBoardState(prev => ({ ...prev, ...t.defaultBoardState }));
                      if (t.lockedByDefault !== undefined) setIsTemplateLocked(t.lockedByDefault);
                    }}
                    className="flex-1 text-left truncate font-semibold mr-1 text-[11px]"
                    title={`By ${t.author || 'Creator'}: ${t.description || ''}`}
                  >
                    {t.name}
                  </button>
                  {onDeleteCustomTemplate && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Remove template "${t.name}"?`)) {
                          onDeleteCustomTemplate(t.id);
                        }
                      }}
                      className="p-1 text-slate-500 hover:text-red-400 transition"
                      title="Remove template"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Top Sidebar Tabs */}
      <div className="grid grid-cols-5 border-b border-slate-800 bg-slate-950/70 p-1 gap-1">
        <button
          onClick={() => setActiveTab('quick')}
          className={`py-1.5 px-1 rounded-lg text-[11px] font-semibold flex flex-col items-center justify-center gap-0.5 transition ${
            activeTab === 'quick'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
          title="Instant Source & Destination Generator"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Quick</span>
        </button>

        <button
          onClick={() => setActiveTab('rsa')}
          className={`py-1.5 px-1 rounded-lg text-[11px] font-semibold flex flex-col items-center justify-center gap-0.5 transition ${
            activeTab === 'rsa'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
          title="Multi-Station RSA Arrow Board"
        >
          <ArrowRight className="w-3.5 h-3.5" />
          <span>RSA</span>
        </button>

        <button
          onClick={() => setActiveTab('slr')}
          className={`py-1.5 px-1 rounded-lg text-[11px] font-semibold flex flex-col items-center justify-center gap-0.5 transition ${
            activeTab === 'slr'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
          title="SLR Luggage Van End-Wall"
        >
          <Boxes className="w-3.5 h-3.5" />
          <span>SLR</span>
        </button>

        <button
          onClick={() => setActiveTab('uv')}
          className={`py-1.5 px-1 rounded-lg text-[11px] font-semibold flex flex-col items-center justify-center gap-0.5 transition ${
            activeTab === 'uv'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
          title="4096×4096 UV Slot Manager"
        >
          <Grid className="w-3.5 h-3.5" />
          <span>4K UV</span>
        </button>

        <button
          onClick={() => setActiveTab('export')}
          className={`py-1.5 px-1 rounded-lg text-[11px] font-semibold flex flex-col items-center justify-center gap-0.5 transition ${
            activeTab === 'export'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export</span>
        </button>
      </div>

      {/* Mode Indicator Banner: Buyer Mode vs Creator Mode */}
      <div className="px-3 py-2 bg-slate-950/80 border-b border-slate-800">
        {isTemplateLocked ? (
          <div className="p-2 rounded-xl bg-emerald-950/50 border border-emerald-600/40 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-emerald-400 shrink-0" />
              <div>
                <div className="text-[11px] font-black text-emerald-300">BUYER CONTENT MODE</div>
                <div className="text-[10px] text-emerald-200/70">Layout locked — safe to edit station text.</div>
              </div>
            </div>
            <button
              onClick={() => setIsTemplateLocked(false)}
              className="px-2 py-1 bg-emerald-900/80 hover:bg-emerald-800 text-emerald-200 rounded-lg text-[10px] font-bold transition shrink-0 ml-1 border border-emerald-700/50"
              title="Switch to Creator Mode to edit UV slot positions"
            >
              Unlock
            </button>
          </div>
        ) : (
          <div className="p-2 rounded-xl bg-amber-950/50 border border-amber-600/40 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Unlock className="w-4 h-4 text-amber-400 shrink-0" />
              <div>
                <div className="text-[11px] font-black text-amber-300">CREATOR STUDIO MODE</div>
                <div className="text-[10px] text-amber-200/70">Drag & resize 4K UV slots freely on canvas.</div>
              </div>
            </div>
            <button
              onClick={() => setIsTemplateLocked(true)}
              className="px-2 py-1 bg-amber-900/80 hover:bg-amber-800 text-amber-200 rounded-lg text-[10px] font-bold transition shrink-0 ml-1 border border-amber-700/50"
              title="Lock layout before packaging for buyers"
            >
              Lock
            </button>
          </div>
        )}
      </div>

      {/* Main Tab Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* ================= TAB 1: QUICK ROUTE MAKER ================= */}
        {activeTab === 'quick' && (
          <div className="space-y-4">
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-200">
              <strong>Standard Asset Workflow:</strong> Enter Train No, Station Names or use Instant Auto-Fill to generate a 4096×4096 texture sheet.
            </div>

            {/* Quick Train Search */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span>Instant Auto-Fill From Database</span>
                <span className="text-[10px] text-amber-400">IR Network</span>
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={trainSearch}
                  onChange={(e) => setTrainSearch(e.target.value)}
                  placeholder="Search train no. (e.g. 12626 or Kerala)..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {trainSearch && (
              <div className="max-h-44 overflow-y-auto space-y-1 bg-slate-950 border border-slate-800 rounded-xl p-2">
                {POPULAR_TRAINS.filter(t => t.trainNo.includes(trainSearch) || t.trainName.toLowerCase().includes(trainSearch.toLowerCase())).map(t => (
                  <div
                    key={t.trainNo}
                    onClick={() => {
                      setBoardState(prev => ({
                        ...prev,
                        trainNo: t.trainNo,
                        trainName: t.trainName,
                        sourceEn: t.sourceEn,
                        sourceHi: t.sourceHi,
                        sourceReg: t.sourceReg,
                        destEn: t.destEn,
                        destHi: t.destHi,
                        destReg: t.destReg,
                        zone: t.zone,
                        baseDepot: t.baseDepot,
                        coachClass: t.coachClass || prev.coachClass
                      }));
                      setTrainSearch('');
                    }}
                    className="p-2 rounded hover:bg-slate-800 cursor-pointer text-xs flex justify-between items-center text-amber-300 transition"
                  >
                    <span>{t.trainNo} {t.trainName}</span>
                    <span className="text-slate-400 text-[10px]">{t.zone}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Source & Destination Inputs */}
            <div className="space-y-3 pt-1">
              <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400 uppercase">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Source Station (Starting Place)</span>
                </div>
                <input
                  type="text"
                  value={boardState.sourceEn}
                  onChange={(e) => setBoardState({ ...boardState, sourceEn: e.target.value.toUpperCase() })}
                  placeholder="NEW DELHI"
                  className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-bold text-white uppercase"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={boardState.sourceHi}
                    onChange={(e) => setBoardState({ ...boardState, sourceHi: e.target.value })}
                    placeholder="नई दिल्ली (Hindi)"
                    className="w-full px-2.5 py-1.5 bg-slate-900/80 border border-slate-800 rounded text-xs text-slate-200"
                  />
                  <input
                    type="text"
                    value={boardState.sourceReg}
                    onChange={(e) => setBoardState({ ...boardState, sourceReg: e.target.value })}
                    placeholder="Regional Script"
                    className="w-full px-2.5 py-1.5 bg-slate-900/80 border border-slate-800 rounded text-xs text-slate-200"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400 uppercase">
                  <MapPin className="w-3.5 h-3.5 text-rose-400" />
                  <span>Destination Station (Ending Place)</span>
                </div>
                <input
                  type="text"
                  value={boardState.destEn}
                  onChange={(e) => setBoardState({ ...boardState, destEn: e.target.value.toUpperCase() })}
                  placeholder="THIRUVANANTHAPURAM CENTRAL"
                  className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-bold text-white uppercase"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={boardState.destHi}
                    onChange={(e) => setBoardState({ ...boardState, destHi: e.target.value })}
                    placeholder="तिरुवनंतपुरम सेंट्रल (Hindi)"
                    className="w-full px-2.5 py-1.5 bg-slate-900/80 border border-slate-800 rounded text-xs text-slate-200"
                  />
                  <input
                    type="text"
                    value={boardState.destReg}
                    onChange={(e) => setBoardState({ ...boardState, destReg: e.target.value })}
                    placeholder="Regional Script"
                    className="w-full px-2.5 py-1.5 bg-slate-900/80 border border-slate-800 rounded text-xs text-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-slate-400 mb-1 block">Train Number</label>
                  <input
                    type="text"
                    value={boardState.trainNo}
                    onChange={(e) => setBoardState({ ...boardState, trainNo: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded text-xs font-mono font-bold text-amber-400"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 mb-1 block">Zone Crest</label>
                  <select
                    value={boardState.zone}
                    onChange={(e) => setBoardState({ ...boardState, zone: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded text-xs font-bold text-amber-300"
                  >
                    {IR_ZONES.map(z => (
                      <option key={z.code} value={z.code}>{z.code} - {z.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-slate-400 mb-1 block">Base Depot</label>
                  <input
                    type="text"
                    value={boardState.baseDepot}
                    onChange={(e) => setBoardState({ ...boardState, baseDepot: e.target.value.toUpperCase() })}
                    placeholder="TVC / SR"
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded text-xs font-mono text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 mb-1 block">Coach Class</label>
                  <select
                    value={boardState.coachClass}
                    onChange={(e) => setBoardState({ ...boardState, coachClass: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded text-xs font-bold text-white"
                  >
                    {COACH_CLASSES.map(c => (
                      <option key={c.code} value={c.code}>{c.code} - {c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Weathering Sliders */}
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
                <div className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                  <CloudRain className="w-3.5 h-3.5" />
                  <span>Weathering & Grime Engine</span>
                </div>
                <div className="space-y-2 text-xs">
                  <div>
                    <div className="flex justify-between text-slate-400 mb-1">
                      <span>Track Dust / Grime</span>
                      <span className="font-mono text-amber-300">{weathering.grime}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={weathering.grime}
                      onChange={(e) => setWeathering({ ...weathering, grime: Number(e.target.value) })}
                      className="w-full accent-amber-500"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-slate-400 mb-1">
                      <span>Rust Streaks</span>
                      <span className="font-mono text-amber-300">{weathering.rust}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={weathering.rust}
                      onChange={(e) => setWeathering({ ...weathering, rust: Number(e.target.value) })}
                      className="w-full accent-amber-500"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-slate-400 mb-1">
                      <span>Sun Fading</span>
                      <span className="font-mono text-amber-300">{weathering.sunFade}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={weathering.sunFade}
                      onChange={(e) => setWeathering({ ...weathering, sunFade: Number(e.target.value) })}
                      className="w-full accent-amber-500"
                    />
                  </div>
                </div>
              </div>

              {/* Quick Save PNG Button */}
              <button
                onClick={onExportPng}
                className="w-full py-3 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition transform active:scale-98 mt-2"
              >
                <Download className="w-4 h-4 stroke-[2.5]" />
                <span>Save 4096×4096 Standard Texture (PNG)</span>
              </button>
            </div>
          </div>
        )}

        {/* ================= TAB 2: MULTI-STATION RSA ARROWS ================= */}
        {activeTab === 'rsa' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-amber-400 uppercase tracking-wider">Multi-Leg RSA Arrow Board</div>
                <div className="text-[11px] text-slate-400">Authentic Twin Red Arrow Style</div>
              </div>
              <button
                onClick={() => setBoardState({ ...boardState, boardMode: boardState.boardMode === 'multi_rsa' ? 'standard_2point' : 'multi_rsa' })}
                className={`px-2.5 py-1 rounded text-xs font-bold transition ${
                  boardState.boardMode === 'multi_rsa' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'
                }`}
              >
                {boardState.boardMode === 'multi_rsa' ? 'ENABLED' : 'DISABLED'}
              </button>
            </div>

            {boardState.boardMode !== 'multi_rsa' ? (
              <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl text-center space-y-2">
                <p className="text-xs text-slate-400">Enable this mode to reproduce the exact multi-station rake sharing board with twin red arrows shown in Indian Railways trains.</p>
                <button
                  onClick={() => setBoardState({ ...boardState, boardMode: 'multi_rsa' })}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg"
                >
                  Activate RSA Arrow Board
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {(boardState.rsaSegments || []).map((seg, idx) => (
                  <div key={idx} className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2 relative">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-400">Station {idx + 1}</span>
                      {idx > 1 && (
                        <button
                          onClick={() => removeRsaSegment(idx)}
                          className="text-rose-400 hover:text-rose-300 p-1"
                          title="Remove Station"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <input
                      type="text"
                      value={seg.station}
                      onChange={(e) => updateRsaSegment(idx, 'station', e.target.value.toUpperCase())}
                      placeholder="STATION NAME"
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs font-bold text-white uppercase"
                    />

                    {idx < (boardState.rsaSegments || []).length - 1 && (
                      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/80">
                        <div>
                          <span className="text-[10px] text-emerald-400 font-mono block">▶ Forward No.</span>
                          <input
                            type="text"
                            value={seg.upNo || ""}
                            onChange={(e) => updateRsaSegment(idx, 'upNo', e.target.value)}
                            placeholder="56210"
                            className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs font-mono text-white"
                          />
                        </div>
                        <div>
                          <span className="text-[10px] text-rose-400 font-mono block">◀ Return No.</span>
                          <input
                            type="text"
                            value={seg.downNo || ""}
                            onChange={(e) => updateRsaSegment(idx, 'downNo', e.target.value)}
                            placeholder="56209"
                            className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs font-mono text-white"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                <button
                  onClick={addRsaSegment}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 border border-slate-700"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Next Station Leg</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 3: SLR LUGGAGE END-WALL ================= */}
        {activeTab === 'slr' && (
          <div className="space-y-4">
            <div>
              <div className="text-xs font-bold text-amber-400 uppercase tracking-wider">SLR Luggage Van End-Wall</div>
              <div className="text-[11px] text-slate-400">Bilingual Stencil & Small Destination Plate</div>
            </div>

            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
              <div className="text-xs font-bold text-slate-200 uppercase">1. Large Luggage Stencil</div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-slate-400 block mb-1">Hindi Text</span>
                  <input
                    type="text"
                    value={boardState.slrLuggage?.hindiText || "सामान"}
                    onChange={(e) => setBoardState({
                      ...boardState,
                      slrLuggage: { ...boardState.slrLuggage, hindiText: e.target.value }
                    })}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-white"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block mb-1">English Text</span>
                  <input
                    type="text"
                    value={boardState.slrLuggage?.englishText || "LUGGAGE"}
                    onChange={(e) => setBoardState({
                      ...boardState,
                      slrLuggage: { ...boardState.slrLuggage, englishText: e.target.value.toUpperCase() }
                    })}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs font-bold text-white uppercase"
                  />
                </div>
              </div>
            </div>

            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
              <div className="text-xs font-bold text-slate-200 uppercase">2. Compact Train Destination Plate</div>

              <div>
                <span className="text-[10px] text-slate-400 block mb-1">English Train Name</span>
                <input
                  type="text"
                  value={boardState.slrLuggage?.smallBoardName || "VISAKHA EXPRESS"}
                  onChange={(e) => setBoardState({
                    ...boardState,
                    slrLuggage: { ...boardState.slrLuggage, smallBoardName: e.target.value.toUpperCase() }
                  })}
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs font-bold text-white uppercase"
                />
              </div>

              <div>
                <span className="text-[10px] text-slate-400 block mb-1">Hindi Train Name</span>
                <input
                  type="text"
                  value={boardState.slrLuggage?.smallBoardHi || "विशाखा एक्सप्रेस"}
                  onChange={(e) => setBoardState({
                    ...boardState,
                    slrLuggage: { ...boardState.slrLuggage, smallBoardHi: e.target.value }
                  })}
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-white"
                />
              </div>

              <div>
                <span className="text-[10px] text-slate-400 block mb-1">Regional Script (e.g. Telugu / Tamil)</span>
                <input
                  type="text"
                  value={boardState.slrLuggage?.smallBoardReg || "విశాఖ ఎక్స్ ప్రెస్"}
                  onChange={(e) => setBoardState({
                    ...boardState,
                    slrLuggage: { ...boardState.slrLuggage, smallBoardReg: e.target.value }
                  })}
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-white"
                />
              </div>

              <div>
                <span className="text-[10px] text-slate-400 block mb-1">Endpoints</span>
                <input
                  type="text"
                  value={boardState.slrLuggage?.smallBoardEndpoints || "SECUNDERABAD    BHUBANESWAR"}
                  onChange={(e) => setBoardState({
                    ...boardState,
                    slrLuggage: { ...boardState.slrLuggage, smallBoardEndpoints: e.target.value.toUpperCase() }
                  })}
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs font-mono text-white uppercase"
                />
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 4: 4096×4096 UV SLOT MANAGER ================= */}
        {activeTab === 'uv' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-amber-400 uppercase tracking-wider">4096×4096 Standard Atlas</div>
                <div className="text-[11px] text-slate-400">Position UV Parts for 3D Coach Assets</div>
              </div>
              <button
                onClick={() => setShowUvGuides(!showUvGuides)}
                className={`px-2.5 py-1 rounded text-xs font-bold transition flex items-center gap-1 ${
                  showUvGuides ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300'
                }`}
              >
                <Grid className="w-3.5 h-3.5" />
                <span>{showUvGuides ? 'Guides ON' : 'Guides OFF'}</span>
              </button>
            </div>

            {isTemplateLocked ? (
              <div className="p-4 bg-emerald-950/40 border border-emerald-600/50 rounded-2xl space-y-3">
                <div className="flex items-center gap-2 text-emerald-300 font-bold text-xs">
                  <Lock className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>UV Mapping Protected (Buyer Safe)</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  The UV slot coordinates for this 4096×4096 master atlas are locked to ensure 100% alignment with your 3D train model in MSTS & Open Rails.
                </p>
                <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-1.5 font-mono">
                  <div className="flex justify-between">
                    <span className="text-slate-300">Part 1 (Long Board):</span>
                    <span className="text-amber-400 font-bold">{boardState.parts?.longBoard?.width || 3840}×{boardState.parts?.longBoard?.height || 720}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-300">Part 2 (SLR Luggage):</span>
                    <span className="text-amber-400 font-bold">{boardState.parts?.slrLuggage?.width || 1800}×{boardState.parts?.slrLuggage?.height || 1450}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-300">Part 3 (Door Plates):</span>
                    <span className="text-amber-400 font-bold">{boardState.parts?.doorPlates?.width || 1888}×{boardState.parts?.doorPlates?.height || 1450}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-300">Part 4 (Depot Stencils):</span>
                    <span className="text-amber-400 font-bold">{boardState.parts?.depotStencils?.width || 3840}×{boardState.parts?.depotStencils?.height || 1368}</span>
                  </div>
                </div>
                <button
                  onClick={() => setIsTemplateLocked(false)}
                  className="w-full py-2 bg-emerald-700/80 hover:bg-emerald-600 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition shadow"
                >
                  <Unlock className="w-3.5 h-3.5" />
                  <span>Unlock Creator Mode to Adjust UV Slots</span>
                </button>
              </div>
            ) : (
              <>
                <div className="p-3 bg-amber-950/40 border border-amber-600/50 rounded-xl text-xs text-amber-200">
                  <strong>Creator Mode:</strong> Drag boxes or 8 resize handles on canvas, or enter exact pixel coordinates below.
                </div>

                <div className="space-y-3">
                  {[
                    { key: 'longBoard', name: 'Part 1: Primary Long Side Board', desc: 'Fits main coach side mesh' },
                    { key: 'slrLuggage', name: 'Part 2: SLR Luggage End-Wall', desc: 'Fits luggage & brake van end wall' },
                    { key: 'doorPlates', name: 'Part 3: Class & Door Plates', desc: 'Fits door classification meshes' },
                    { key: 'depotStencils', name: 'Part 4: Depot & Tech Stencils', desc: 'Fits coach ends and chassis' }
                  ].map(p => {
                    const coord = boardState.parts?.[p.key] || selectedTemplate.defaultParts?.[p.key] || { x: 0, y: 0, width: 1000, height: 500 };
                    const isSelected = selectedPart === p.key;

                    return (
                      <div
                        key={p.key}
                        onClick={() => setSelectedPart(p.key)}
                        className={`p-3 rounded-xl border transition cursor-pointer ${
                          isSelected
                            ? 'bg-amber-950/30 border-amber-500'
                            : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-white">{p.name}</span>
                          <span className="text-[10px] font-mono text-amber-400">{coord.width}×{coord.height}</span>
                        </div>
                        <p className="text-[10px] text-slate-400 mb-2">{p.desc}</p>

                        <div className="grid grid-cols-4 gap-1.5 text-[11px] font-mono">
                          <div>
                            <span className="text-[9px] text-slate-500 block">X</span>
                            <input
                              type="number"
                              value={coord.x}
                              onChange={(e) => updatePartCoord(p.key, 'x', e.target.value)}
                              className="w-full px-1.5 py-1 bg-slate-900 border border-slate-700 rounded text-center text-white"
                            />
                          </div>
                          <div>
                            <span className="text-[9px] text-slate-500 block">Y</span>
                            <input
                              type="number"
                              value={coord.y}
                              onChange={(e) => updatePartCoord(p.key, 'y', e.target.value)}
                              className="w-full px-1.5 py-1 bg-slate-900 border border-slate-700 rounded text-center text-white"
                            />
                          </div>
                          <div>
                            <span className="text-[9px] text-slate-500 block">W</span>
                            <input
                              type="number"
                              value={coord.width}
                              onChange={(e) => updatePartCoord(p.key, 'width', e.target.value)}
                              className="w-full px-1.5 py-1 bg-slate-900 border border-slate-700 rounded text-center text-white"
                            />
                          </div>
                          <div>
                            <span className="text-[9px] text-slate-500 block">H</span>
                            <input
                              type="number"
                              value={coord.height}
                              onChange={(e) => updatePartCoord(p.key, 'height', e.target.value)}
                              className="w-full px-1.5 py-1 bg-slate-900 border border-slate-700 rounded text-center text-white"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-2 space-y-2">
                  <button
                    onClick={saveAsDefaultAssetStandard}
                    className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg transition"
                  >
                    <Save className="w-4 h-4" />
                    <span>Save as Default Asset Standard</span>
                  </button>

                  <button
                    onClick={resetToStandardAtlas}
                    className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs flex items-center justify-center gap-1.5 transition"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset to Factory Standard Atlas</span>
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ================= TAB 5: EXPORT & FORMATS ================= */}
        {activeTab === 'export' && (
          <div className="space-y-4">
            <div className="p-4 bg-gradient-to-br from-amber-950/40 to-slate-950 border border-amber-600/30 rounded-2xl space-y-3">
              <div className="font-bold text-sm text-amber-300 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>4096×4096 Master Texture Export</span>
              </div>
              <p className="text-xs text-slate-300">
                Exports the entire 4K UV Atlas map (Side Board, SLR Luggage, Door Plates, and Depot Stencils) in a single lossless 4096×4096 PNG file.
              </p>

              <button
                onClick={onExportPng}
                className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition"
              >
                <Download className="w-4 h-4 stroke-[2.5]" />
                <span>Download 4096×4096 PNG Atlas</span>
              </button>
            </div>

            {/* Direct DDS Exporters */}
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-3">
              <div className="font-bold text-xs text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <span>Train Simulator Binary DDS</span>
              </div>
              <p className="text-xs text-slate-400">
                DirectDraw Surface texture format for Open Rails, MSTS, and Trainz TRS19/22 simulators.
              </p>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => onExportDds('RGBA32')}
                  className="py-2.5 px-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 border border-slate-700 transition"
                  title="Direct 32-bit uncompressed RGBA DDS"
                >
                  <Download className="w-3.5 h-3.5 text-cyan-400" />
                  <span>32-bit DDS</span>
                </button>
                <button
                  onClick={() => onExportDds('DXT5')}
                  className="py-2.5 px-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 border border-slate-700 transition"
                  title="DXT5 (BC3) block compressed DDS for optimized simulator VRAM"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  <span>DXT5 DDS</span>
                </button>
              </div>
            </div>

            {/* Save to Account */}
            {onSaveToAccount && (
              <button
                onClick={onSaveToAccount}
                disabled={isSavingToAccount}
                className="w-full py-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs border border-purple-500/50 transition flex items-center justify-center gap-2 shadow-lg shadow-purple-600/20"
              >
                <Save className="w-4 h-4" />
                <span>{isSavingToAccount ? 'Saving to Account...' : 'Save Design to My Account'}</span>
              </button>
            )}

            {/* Open Livery Patcher Tool */}
            <button
              onClick={onOpenPatcher}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 font-semibold rounded-xl text-xs border border-cyan-800/40 transition flex items-center justify-center gap-1.5"
            >
              <span>Open Livery Patcher Tool</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}

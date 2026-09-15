'use client';

import React, { useState, useRef } from 'react';
import { Upload, Download, Check, Sparkles, Image as ImageIcon } from 'lucide-react';

interface LiveryPatcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  nameboardCanvasRef: React.RefObject<HTMLCanvasElement | null>;
}

export default function LiveryPatcherModal({
  isOpen,
  onClose,
  nameboardCanvasRef
}: LiveryPatcherModalProps) {
  const [baseImage, setBaseImage] = useState<HTMLImageElement | null>(null);
  const [baseFileName, setBaseFileName] = useState('');
  const [slotX, setSlotX] = useState(1200);
  const [slotY, setSlotY] = useState(850);
  const [slotWidth, setSlotWidth] = useState(900);
  const [slotHeight, setSlotHeight] = useState(200);
  const [mergedUrl, setMergedUrl] = useState<string | null>(null);
  const patchCanvasRef = useRef<HTMLCanvasElement | null>(null);

  if (!isOpen) return null;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBaseFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        setBaseImage(img);
        setMergedUrl(null);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const applyPreset = (preset: string) => {
    if (!baseImage) return;
    const w = baseImage.width;
    const h = baseImage.height;

    if (preset === 'LHB_STANDARD_SLOT') {
      setSlotX(Math.round(w * 0.28));
      setSlotY(Math.round(h * 0.42));
      setSlotWidth(Math.round(w * 0.44));
      setSlotHeight(Math.round(h * 0.11));
    } else if (preset === 'ICF_WINDOW_SLOT') {
      setSlotX(Math.round(w * 0.35));
      setSlotY(Math.round(h * 0.5));
      setSlotWidth(Math.round(w * 0.38));
      setSlotHeight(Math.round(h * 0.09));
    } else if (preset === 'LED_DOOR_SLOT') {
      setSlotX(Math.round(w * 0.15));
      setSlotY(Math.round(h * 0.2));
      setSlotWidth(Math.round(w * 0.25));
      setSlotHeight(Math.round(h * 0.06));
    }
  };

  const handleStampAndMerge = () => {
    if (!baseImage || !nameboardCanvasRef.current) return;
    const canvas = patchCanvasRef.current;
    if (!canvas) return;

    canvas.width = baseImage.width;
    canvas.height = baseImage.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 1. Draw base coach texture
    ctx.drawImage(baseImage, 0, 0);

    // 2. Draw current nameboard into selected slot
    const boardCanvas = nameboardCanvasRef.current;
    ctx.drawImage(boardCanvas, slotX, slotY, slotWidth, slotHeight);

    // Generate output URL
    const url = canvas.toDataURL('image/png');
    setMergedUrl(url);
  };

  const handleDownloadPatched = () => {
    if (!mergedUrl) return;
    const link = document.createElement('a');
    link.download = `PATCHED_${baseFileName || 'Coach_Texture.png'}`;
    link.href = mergedUrl;
    link.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-cyan-600 to-blue-700 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-950/20 flex items-center justify-center border border-white/20">
              <ImageIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Coach Livery Direct Patcher</h2>
              <p className="text-xs text-cyan-100">Stamp this nameboard directly onto an existing MSTS / Open Rails coach texture</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white text-sm font-semibold px-2 py-1 rounded"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Step 1: Upload */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              1. Select Existing Coach Texture (.PNG / .TGA / .BMP)
            </label>
            <div className="border-2 border-dashed border-slate-700 hover:border-cyan-500/70 rounded-xl p-6 text-center cursor-pointer bg-slate-950/50 transition">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                id="coach-file-upload"
              />
              <label htmlFor="coach-file-upload" className="cursor-pointer space-y-2 block">
                <Upload className="w-7 h-7 text-cyan-400 mx-auto" />
                <div className="text-sm font-medium text-slate-200">
                  {baseFileName ? baseFileName : 'Click to browse coach texture from your computer'}
                </div>
                {baseImage && (
                  <div className="text-xs text-emerald-400 font-mono">
                    Loaded: {baseImage.width} × {baseImage.height} px
                  </div>
                )}
              </label>
            </div>
          </div>

          {/* Step 2: Slot Coordinates */}
          {baseImage && (
            <div className="space-y-3 bg-slate-950/60 border border-slate-800 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  2. Destination Board Slot Coordinates
                </label>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => applyPreset('LHB_STANDARD_SLOT')}
                    className="px-2.5 py-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded font-medium border border-slate-700"
                  >
                    LHB Slot Preset
                  </button>
                  <button
                    onClick={() => applyPreset('ICF_WINDOW_SLOT')}
                    className="px-2.5 py-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded font-medium border border-slate-700"
                  >
                    ICF Slot Preset
                  </button>
                  <button
                    onClick={() => applyPreset('LED_DOOR_SLOT')}
                    className="px-2.5 py-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded font-medium border border-slate-700"
                  >
                    LED Door Preset
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-3">
                <div>
                  <span className="text-[11px] text-slate-400 block mb-1">X Position (px)</span>
                  <input
                    type="number"
                    value={slotX}
                    onChange={(e) => setSlotX(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs font-mono text-white"
                  />
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block mb-1">Y Position (px)</span>
                  <input
                    type="number"
                    value={slotY}
                    onChange={(e) => setSlotY(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs font-mono text-white"
                  />
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block mb-1">Slot Width (px)</span>
                  <input
                    type="number"
                    value={slotWidth}
                    onChange={(e) => setSlotWidth(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs font-mono text-white"
                  />
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block mb-1">Slot Height (px)</span>
                  <input
                    type="number"
                    value={slotHeight}
                    onChange={(e) => setSlotHeight(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs font-mono text-white"
                  />
                </div>
              </div>

              <button
                onClick={handleStampAndMerge}
                className="w-full py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg transition"
              >
                <Sparkles className="w-4 h-4" />
                <span>Stamp & Merge Nameboard into Texture</span>
              </button>
            </div>
          )}

          {/* Hidden Canvas used for merging */}
          <canvas ref={patchCanvasRef} className="hidden" />

          {/* Step 3: Result & Download */}
          {mergedUrl && (
            <div className="space-y-3 bg-emerald-950/30 border border-emerald-800/50 rounded-xl p-4">
              <div className="flex items-center gap-2 text-emerald-300 font-bold text-xs">
                <Check className="w-4 h-4 text-emerald-400" />
                <span>Coach Texture Successfully Patched! Ready for MSTS / Open Rails</span>
              </div>
              <img
                src={mergedUrl}
                alt="Patched Coach Texture"
                className="max-h-44 w-full object-contain rounded-lg border border-slate-800 bg-slate-950"
              />
              <button
                onClick={handleDownloadPatched}
                className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg transition"
              >
                <Download className="w-4 h-4 stroke-[2.5]" />
                <span>Download Patched Livery Texture</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


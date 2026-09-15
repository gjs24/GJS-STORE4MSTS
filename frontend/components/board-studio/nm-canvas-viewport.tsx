'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Lock, Unlock, RotateCcw, Grid } from 'lucide-react';
import { AtlasTemplate, BoardState, WeatheringState, PartRect } from '@/lib/nm-editor/types';

interface NmCanvasViewportProps {
  template: AtlasTemplate;
  boardState: BoardState;
  setBoardState: React.Dispatch<React.SetStateAction<BoardState>>;
  weathering: WeatheringState;
  zoom: number;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  showUvGuides: boolean;
  selectedPart: string | null;
  onSelectPart: (part: string | null) => void;
  isTemplateLocked: boolean;
  setIsTemplateLocked: (locked: boolean) => void;
}

export default function NmCanvasViewport({
  template,
  boardState,
  setBoardState,
  weathering,
  zoom,
  canvasRef,
  showUvGuides,
  selectedPart,
  onSelectPart,
  isTemplateLocked,
  setIsTemplateLocked
}: NmCanvasViewportProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [cursor, setCursor] = useState('default');
  const [dragMode, setDragMode] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState<{
    mouseX: number;
    mouseY: number;
    part: PartRect;
  } | null>(null);
  const [snapToGrid, setSnapToGrid] = useState(true);

  const parts = boardState.parts || template.defaultParts || {
    longBoard: { x: 128, y: 128, width: 3840, height: 720 },
    slrLuggage: { x: 128, y: 1000, width: 1800, height: 1450 },
    doorPlates: { x: 2080, y: 1000, width: 1888, height: 1450 },
    depotStencils: { x: 128, y: 2600, width: 3840, height: 1368 }
  };

  // Convert mouse screen coordinates to 4096 canvas coordinates
  const getCanvasPos = useCallback((e: React.MouseEvent<HTMLCanvasElement | HTMLDivElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  }, [canvasRef]);

  // Find if mouse is over any resize handle
  const getHandleAt = useCallback((cx: number, cy: number, rect: PartRect) => {
    if (!rect || isTemplateLocked) return null;
    const handleDist = 45; // Hit radius on 4096 canvas
    const x = rect.x;
    const y = rect.y;
    const w = rect.width;
    const h = rect.height;

    const points: Record<string, { x: number; y: number }> = {
      nw: { x: x, y: y },
      ne: { x: x + w, y: y },
      se: { x: x + w, y: y + h },
      sw: { x: x, y: y + h },
      n: { x: x + w / 2, y: y },
      s: { x: x + w / 2, y: y + h },
      w: { x: x, y: y + h / 2 },
      e: { x: x + w, y: y + h / 2 }
    };

    for (const [handle, pt] of Object.entries(points)) {
      const dist = Math.hypot(cx - pt.x, cy - pt.y);
      if (dist <= handleDist) return handle;
    }
    return null;
  }, [isTemplateLocked]);

  // Find if mouse is inside any part bounding box
  const getPartUnderMouse = useCallback((cx: number, cy: number) => {
    const partKeys = ['longBoard', 'slrLuggage', 'doorPlates', 'depotStencils'];
    for (const key of partKeys) {
      const p = parts[key];
      if (p && cx >= p.x && cx <= p.x + p.width && cy >= p.y && cy <= p.y + p.height) {
        return key;
      }
    }
    return null;
  }, [parts]);

  // Redraw canvas whenever state changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !template) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = template.width;
    const height = template.height;
    canvas.width = width;
    canvas.height = height;

    ctx.clearRect(0, 0, width, height);

    if (template.layout === 'full_atlas') {
      drawMaster4096Atlas(ctx, template, boardState, weathering, showUvGuides, selectedPart, isTemplateLocked);
    } else if (template.category === 'Digiboards') {
      drawCoachBackground(ctx, template, width, height);
      drawBoardBase(ctx, template, boardState);
      drawDigitalLedContent(ctx, template, boardState);
      drawWeatheringEffects(ctx, template, weathering);
    } else {
      drawCoachBackground(ctx, template, width, height);
      drawBoardBase(ctx, template, boardState);
      if (template.hasScrews && boardState.layers.showScrewsAndRivets && template.boardRect) {
        drawScrews(ctx, template.boardRect);
      }
      if (boardState.boardMode === 'multi_rsa' && template.boardRect) {
        drawMultiRsaBoard(ctx, template.boardRect, boardState);
      } else {
        drawPhysicalBoardContent(ctx, template, boardState);
      }
      drawWeatheringEffects(ctx, template, weathering);
    }
  }, [template, boardState, weathering, showUvGuides, selectedPart, isTemplateLocked, canvasRef]);

  // Mouse Down: Start Move or Resize
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (template.layout !== 'full_atlas') return;
    if (isTemplateLocked) return;

    const { x: cx, y: cy } = getCanvasPos(e);

    if (selectedPart && parts[selectedPart]) {
      const handle = getHandleAt(cx, cy, parts[selectedPart]);
      if (handle) {
        setDragMode(handle);
        setDragStart({
          mouseX: cx,
          mouseY: cy,
          part: { ...parts[selectedPart] }
        });
        return;
      }
    }

    const hitPart = getPartUnderMouse(cx, cy);
    if (hitPart) {
      onSelectPart(hitPart);
      setDragMode('move');
      setDragStart({
        mouseX: cx,
        mouseY: cy,
        part: { ...parts[hitPart] }
      });
    } else {
      onSelectPart(null);
    }
  };

  // Mouse Move: Drag Move or Resize in real time
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (template.layout !== 'full_atlas') return;
    if (isTemplateLocked) {
      setCursor('default');
      return;
    }

    const { x: cx, y: cy } = getCanvasPos(e);

    if (dragMode && dragStart && selectedPart && setBoardState) {
      const dx = cx - dragStart.mouseX;
      const dy = cy - dragStart.mouseY;
      const orig = dragStart.part;
      const snap = (val: number) => snapToGrid ? Math.round(val / 32) * 32 : Math.round(val);

      const newPart: PartRect = { ...orig };

      if (dragMode === 'move') {
        newPart.x = Math.max(0, Math.min(4096 - orig.width, snap(orig.x + dx)));
        newPart.y = Math.max(0, Math.min(4096 - orig.height, snap(orig.y + dy)));
      } else if (dragMode === 'se') {
        newPart.width = Math.max(200, snap(orig.width + dx));
        newPart.height = Math.max(100, snap(orig.height + dy));
      } else if (dragMode === 'sw') {
        newPart.x = snap(orig.x + dx);
        newPart.width = Math.max(200, snap(orig.width - dx));
        newPart.height = Math.max(100, snap(orig.height + dy));
      } else if (dragMode === 'ne') {
        newPart.y = snap(orig.y + dy);
        newPart.width = Math.max(200, snap(orig.width + dx));
        newPart.height = Math.max(100, snap(orig.height - dy));
      } else if (dragMode === 'nw') {
        newPart.x = snap(orig.x + dx);
        newPart.y = snap(orig.y + dy);
        newPart.width = Math.max(200, snap(orig.width - dx));
        newPart.height = Math.max(100, snap(orig.height - dy));
      } else if (dragMode === 'e') {
        newPart.width = Math.max(200, snap(orig.width + dx));
      } else if (dragMode === 'w') {
        newPart.x = snap(orig.x + dx);
        newPart.width = Math.max(200, snap(orig.width - dx));
      } else if (dragMode === 's') {
        newPart.height = Math.max(100, snap(orig.height + dy));
      } else if (dragMode === 'n') {
        newPart.y = snap(orig.y + dy);
        newPart.height = Math.max(100, snap(orig.height - dy));
      }

      setBoardState(prev => ({
        ...prev,
        parts: {
          ...prev.parts,
          [selectedPart]: newPart
        }
      }));
    } else {
      if (selectedPart && parts[selectedPart]) {
        const handle = getHandleAt(cx, cy, parts[selectedPart]);
        if (handle) {
          if (handle === 'nw' || handle === 'se') setCursor('nwse-resize');
          else if (handle === 'ne' || handle === 'sw') setCursor('nesw-resize');
          else if (handle === 'n' || handle === 's') setCursor('ns-resize');
          else if (handle === 'e' || handle === 'w') setCursor('ew-resize');
          return;
        }
      }
      const hit = getPartUnderMouse(cx, cy);
      if (hit === selectedPart) setCursor('move');
      else if (hit) setCursor('pointer');
      else setCursor('default');
    }
  };

  const handleMouseUp = () => {
    setDragMode(null);
    setDragStart(null);
  };

  // Keyboard Nudge Support (Photoshop arrow keys)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedPart || !parts[selectedPart] || !setBoardState) return;
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Escape'].includes(e.key)) return;

      if (e.key === 'Escape') {
        onSelectPart(null);
        return;
      }

      e.preventDefault();
      const step = e.shiftKey ? 16 : 1;
      const p = { ...parts[selectedPart] };

      if (e.key === 'ArrowLeft') p.x = Math.max(0, p.x - step);
      if (e.key === 'ArrowRight') p.x = Math.min(4096 - p.width, p.x + step);
      if (e.key === 'ArrowUp') p.y = Math.max(0, p.y - step);
      if (e.key === 'ArrowDown') p.y = Math.min(4096 - p.height, p.y + step);

      setBoardState(prev => ({
        ...prev,
        parts: {
          ...prev.parts,
          [selectedPart]: p
        }
      }));
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedPart, parts, onSelectPart, setBoardState]);

  // Reset selected part to template default position
  const handleResetSelectedPart = () => {
    if (!selectedPart || !template.defaultParts) return;
    const def = template.defaultParts[selectedPart];
    if (!def) return;
    setBoardState(prev => ({
      ...prev,
      parts: {
        ...prev.parts,
        [selectedPart]: { ...def }
      }
    }));
  };

  const displayWidth = Math.round((template?.width || 4096) * zoom);
  const displayHeight = Math.round((template?.height || 4096) * zoom);
  const activePartCoord = selectedPart ? parts[selectedPart] : null;

  return (
    <div
      ref={containerRef}
      className="flex-1 h-full overflow-auto flex flex-col p-4 relative select-none bg-slate-950"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {/* HUD Toolbar with Buyer Lock Indicator */}
      {template.layout === 'full_atlas' && (
        <div className="mb-3 flex items-center justify-between bg-slate-900/90 backdrop-blur border border-slate-800 rounded-xl px-4 py-2 shadow-2xl shrink-0 z-10">
          <div className="flex items-center gap-3">
            {isTemplateLocked ? (
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-300 bg-emerald-950/70 border border-emerald-600/60 px-3 py-1.5 rounded-lg shadow-sm">
                <Lock className="w-3.5 h-3.5 text-emerald-400" />
                <span>TEMPLATE UV LOCKED (Buyer Mode — 3D Mapping Protected)</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400 bg-amber-500/20 px-2.5 py-1 rounded-lg border border-amber-500/40">
                <Unlock className="w-3.5 h-3.5" />
                <span>Creator Mode (Photoshop Drag & Transform)</span>
              </div>
            )}

            {!isTemplateLocked && selectedPart ? (
              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="text-white font-bold uppercase bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                  {selectedPart}
                </span>
                <span className="text-slate-300">
                  X: <strong className="text-amber-300">{activePartCoord?.x}px</strong> Y: <strong className="text-amber-300">{activePartCoord?.y}px</strong> | W: <strong className="text-cyan-300">{activePartCoord?.width}px</strong> H: <strong className="text-cyan-300">{activePartCoord?.height}px</strong>
                </span>
              </div>
            ) : isTemplateLocked ? (
              <span className="text-xs text-slate-400">
                Buyers can change station names & train content in the sidebar without altering the 3D model&apos;s UV layout.
              </span>
            ) : (
              <span className="text-xs text-slate-400">
                Click any part on the 4096 canvas to drag, reposition, or resize handles.
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsTemplateLocked(!isTemplateLocked)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 border ${
                isTemplateLocked
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                  : 'bg-emerald-600/30 hover:bg-emerald-600/40 text-emerald-300 border-emerald-500/60'
              }`}
              title={isTemplateLocked ? "Unlock to modify UV layout in Creator Mode" : "Lock layout so buyers cannot alter coordinates"}
            >
              {isTemplateLocked ? <Unlock className="w-3.5 h-3.5 text-amber-400" /> : <Lock className="w-3.5 h-3.5 text-emerald-400" />}
              <span>{isTemplateLocked ? 'Unlock Creator Mode' : 'Lock for Buyers'}</span>
            </button>

            {!isTemplateLocked && selectedPart && (
              <button
                onClick={handleResetSelectedPart}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium flex items-center gap-1 transition"
                title="Reset part to default UV position"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Part</span>
              </button>
            )}

            {!isTemplateLocked && (
              <button
                onClick={() => setSnapToGrid(!snapToGrid)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 border ${
                  snapToGrid
                    ? 'bg-cyan-950/60 border-cyan-500/70 text-cyan-300'
                    : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-white'
                }`}
                title="Toggle Snap to 32px Grid"
              >
                <Grid className="w-3.5 h-3.5" />
                <span>{snapToGrid ? 'Snap: ON' : 'Snap: OFF'}</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Centered Canvas Box */}
      <div
        className="m-auto shadow-2xl shadow-black rounded-lg overflow-hidden border border-slate-800 shrink-0 transition-all duration-75 relative"
        style={{
          width: `${displayWidth}px`,
          height: `${displayHeight}px`
        }}
      >
        <canvas
          ref={canvasRef as React.RefObject<HTMLCanvasElement>}
          onMouseDown={handleMouseDown}
          className="block w-full h-full"
          style={{ cursor: cursor }}
        />
      </div>

      {/* Floating Canvas Info Tag */}
      <div className="absolute bottom-4 right-4 bg-slate-900/90 backdrop-blur border border-slate-800 px-3.5 py-2 rounded-xl text-xs font-mono text-slate-400 flex items-center gap-3 shadow-xl">
        <span>Template: <strong className="text-amber-300">{template?.name}</strong></span>
        <span>|</span>
        <span>Resolution: <strong className="text-amber-300">{template?.width} × {template?.height} px</strong></span>
        {template?.layout === 'full_atlas' && (
          <>
            <span>|</span>
            <span className="text-emerald-400 font-bold">DRAG & DROP ACTIVE</span>
          </>
        )}
      </div>
    </div>
  );
}

// ---------------- MASTER 4096×4096 ATLAS RENDERER ----------------

function drawMaster4096Atlas(
  ctx: CanvasRenderingContext2D,
  template: AtlasTemplate,
  boardState: BoardState,
  weathering: WeatheringState,
  showUvGuides: boolean,
  selectedPart: string | null,
  isTemplateLocked: boolean
) {
  const parts = boardState.parts || template.defaultParts || {
    longBoard: { x: 128, y: 128, width: 3840, height: 720 },
    slrLuggage: { x: 128, y: 1000, width: 1800, height: 1450 },
    doorPlates: { x: 2080, y: 1000, width: 1888, height: 1450 },
    depotStencils: { x: 128, y: 2600, width: 3840, height: 1368 }
  };

  // Background chassis / sheet
  ctx.fillStyle = '#0a0e17';
  ctx.fillRect(0, 0, 4096, 4096);

  // Subtle UV Grid lines across 4096
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
  ctx.lineWidth = 2;
  for (let x = 256; x < 4096; x += 256) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 4096);
    ctx.stroke();
  }
  for (let y = 256; y < 4096; y += 256) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(4096, y);
    ctx.stroke();
  }

  const atlasType = template.atlasType || (template.category === 'LHB' ? 'lhb' : template.category === 'Digiboards' ? 'digital' : 'icf');

  // 1. PART 1: PRIMARY LONG SIDE DESTINATION BOARD
  if (boardState.atlasParts.showLongBoard) {
    const rect = parts.longBoard;
    if (atlasType === 'digital') {
      drawDigitalLedContent(ctx, { boardRect: rect, textColor: template.textColor } as any, boardState);
    } else {
      drawCoachStripBackground(ctx, rect, atlasType);
      drawBoardPlateBase(ctx, rect, boardState, atlasType);
      if (boardState.layers.showScrewsAndRivets) {
        drawScrews(ctx, rect);
      }
      if (boardState.boardMode === 'multi_rsa') {
        drawMultiRsaBoard(ctx, rect, boardState);
      } else {
        drawPhysicalBoardContent(ctx, { boardRect: rect, hasCoachClass: true, hasViaStrip: true, hasZoneBadge: true, accentColor: atlasType === 'lhb' ? '#9c1d1e' : '#b71c1c' } as any, boardState);
      }
    }
    if (showUvGuides) drawUvGuideBox(ctx, rect, `PART 1: LONG BOARD (${atlasType.toUpperCase()})`, selectedPart === 'longBoard', isTemplateLocked);
  }

  // 2. PART 2: SLR / LUGGAGE / DIGITAL PIDS
  if (boardState.atlasParts.showSlrLuggage) {
    const rect = parts.slrLuggage;
    if (atlasType === 'digital') {
      drawDigitalDoorPids(ctx, rect, boardState);
    } else {
      drawSlrEndWall(ctx, rect, boardState);
    }
    if (showUvGuides) drawUvGuideBox(ctx, rect, atlasType === 'digital' ? "PART 2: DIGITAL DOOR PIDS MATRIX" : "PART 2: SLR LUGGAGE & GUARD END-WALL", selectedPart === 'slrLuggage', isTemplateLocked);
  }

  // 3. PART 3: COACH CLASS & DOOR PLATES / DIGITAL INDICATORS
  if (boardState.atlasParts.showDoorPlates) {
    const rect = parts.doorPlates;
    if (atlasType === 'digital') {
      drawDigitalEndIndicators(ctx, rect, boardState);
    } else {
      drawDoorClassPlates(ctx, rect, atlasType);
    }
    if (showUvGuides) drawUvGuideBox(ctx, rect, atlasType === 'digital' ? "PART 3: DIGITAL END INDICATOR MATRIX" : "PART 3: COACH CLASS & DOOR PLATES", selectedPart === 'doorPlates', isTemplateLocked);
  }

  // 4. PART 4: DEPOT, ZONAL CRESTS & TECHNICAL STENCILS
  if (boardState.atlasParts.showDepotStencils) {
    const rect = parts.depotStencils;
    drawDepotAndStencils(ctx, rect, boardState, atlasType);
    if (showUvGuides) drawUvGuideBox(ctx, rect, "PART 4: DEPOT & TECHNICAL STENCILS", selectedPart === 'depotStencils', isTemplateLocked);
  }

  // Master Weathering Overlay
  drawWeatheringEffects(ctx, { width: 4096, height: 4096 } as any, weathering);
}

function drawUvGuideBox(
  ctx: CanvasRenderingContext2D,
  rect: PartRect,
  label: string,
  isSelected: boolean,
  isTemplateLocked: boolean
) {
  ctx.save();

  if (isSelected && !isTemplateLocked) {
    // Solid Cyan with Glow & 8 Handles
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#38bdf8';
    ctx.setLineDash([]);
    ctx.shadowColor = 'rgba(56, 189, 248, 0.6)';
    ctx.shadowBlur = 16;
    ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
    ctx.shadowBlur = 0;

    // 8 Transform Control Handles
    const handleSize = 36;
    const halfH = handleSize / 2;
    const x = rect.x;
    const y = rect.y;
    const w = rect.width;
    const h = rect.height;

    const handles = [
      { x: x, y: y },
      { x: x + w / 2, y: y },
      { x: x + w, y: y },
      { x: x + w, y: y + h / 2 },
      { x: x + w, y: y + h },
      { x: x + w / 2, y: y + h },
      { x: x, y: y + h },
      { x: x, y: y + h / 2 }
    ];

    handles.forEach(pt => {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(pt.x - halfH, pt.y - halfH, handleSize, handleSize);
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#0284c7';
      ctx.strokeRect(pt.x - halfH, pt.y - halfH, handleSize, handleSize);
    });

    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(rect.x, Math.max(0, rect.y - 48), 620, 48);
    ctx.fillStyle = '#020617';
    ctx.font = "900 24px 'Inter', sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`[TRANSFORM] ${label} (${rect.width}×${rect.height})`, rect.x + 16, Math.max(0, rect.y - 48) + 32);
  } else {
    ctx.lineWidth = 3;
    ctx.strokeStyle = isTemplateLocked ? 'rgba(52, 211, 153, 0.6)' : '#eab308';
    ctx.setLineDash([16, 12]);
    ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);

    ctx.fillStyle = isTemplateLocked ? '#059669' : '#eab308';
    ctx.fillRect(rect.x, Math.max(0, rect.y - 42), 480, 42);
    ctx.fillStyle = '#ffffff';
    ctx.font = "900 22px 'Inter', sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(isTemplateLocked ? `[LOCKED UV] ${label}` : `[UV] ${label}`, rect.x + 16, Math.max(0, rect.y - 42) + 28);
  }

  ctx.restore();
}

function drawCoachStripBackground(ctx: CanvasRenderingContext2D, rect: PartRect, atlasType: string) {
  const pad = 24;
  const bgX = Math.max(0, rect.x - pad);
  const bgY = Math.max(0, rect.y - pad);
  const bgW = rect.width + pad * 2;
  const bgH = rect.height + pad * 2;

  if (atlasType === 'lhb') {
    ctx.fillStyle = '#941b1d';
    ctx.fillRect(bgX, bgY, bgW, bgH);
    ctx.fillStyle = '#d8d9de';
    ctx.fillRect(bgX, bgY + 50, bgW, bgH - 100);

    ctx.strokeStyle = 'rgba(0,0,0,0.1)';
    ctx.lineWidth = 4;
    for (let cy = bgY + 70; cy < bgY + bgH - 70; cy += 36) {
      ctx.beginPath();
      ctx.moveTo(bgX, cy);
      ctx.lineTo(bgX + bgW, cy);
      ctx.stroke();
    }
  } else {
    ctx.fillStyle = '#10274f';
    ctx.fillRect(bgX, bgY, bgW, bgH);
    ctx.fillStyle = '#f5b016';
    ctx.fillRect(bgX, bgY + 12, bgW, 14);
    ctx.fillRect(bgX, bgY + bgH - 26, bgW, 14);
  }
}

function drawBoardPlateBase(ctx: CanvasRenderingContext2D, rect: PartRect, boardState: BoardState, atlasType: string) {
  const boardColor = boardState.customBoardColor || '#f7b118';
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 12;

  ctx.fillStyle = boardColor;
  ctx.beginPath();
  ctx.roundRect(rect.x, rect.y, rect.width, rect.height, 14);
  ctx.fill();
  ctx.restore();

  ctx.lineWidth = 14;
  ctx.strokeStyle = atlasType === 'lhb' ? '#9c1d1e' : '#0d2b5c';
  ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);

  ctx.lineWidth = 4;
  ctx.strokeStyle = 'rgba(0,0,0,0.18)';
  ctx.strokeRect(rect.x + 14, rect.y + 14, rect.width - 28, rect.height - 28);
}

// MULTI-SEGMENT RSA ARROW BOARD
function drawMultiRsaBoard(ctx: CanvasRenderingContext2D, rect: PartRect, boardState: BoardState) {
  const segments = boardState.rsaSegments || [
    { station: "MYSURU", upNo: "56210", downNo: "56209" },
    { station: "CHAMRAJANAGAR", upNo: "16219", downNo: "16220" },
    { station: "THIRUPATI", upNo: "16204", downNo: "16203" },
    { station: "CHENNAI" }
  ];

  ctx.save();
  const numStations = segments.length;
  const numArrowPairs = numStations - 1;

  const totalPadding = 120;
  const availableWidth = rect.width - totalPadding * 2;
  const arrowWidth = 260;
  const totalArrowWidth = numArrowPairs * arrowWidth;
  const stationTotalWidth = availableWidth - totalArrowWidth;
  const stationWidth = stationTotalWidth / numStations;

  let currentX = rect.x + totalPadding;
  const centerY = rect.y + rect.height / 2;

  for (let i = 0; i < numStations; i++) {
    const seg = segments[i];

    ctx.fillStyle = '#8b1e1e';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = "900 88px 'Chakra Petch', 'Inter', sans-serif";
    ctx.fillText(seg.station.toUpperCase(), currentX + stationWidth / 2, centerY);

    currentX += stationWidth;

    if (i < numArrowPairs) {
      const arrowCenterX = currentX + arrowWidth / 2;
      const arrowStartX = currentX + 30;
      const arrowEndX = currentX + arrowWidth - 30;
      const arrowMidY = centerY;

      // 1. UPPER RED ARROW POINTING RIGHT (▶)
      ctx.fillStyle = '#b71c1c';
      ctx.beginPath();
      ctx.moveTo(arrowStartX, arrowMidY - 26);
      ctx.lineTo(arrowEndX - 40, arrowMidY - 26);
      ctx.lineTo(arrowEndX - 40, arrowMidY - 44);
      ctx.lineTo(arrowEndX, arrowMidY - 14);
      ctx.lineTo(arrowEndX - 40, arrowMidY + 16);
      ctx.lineTo(arrowEndX - 40, arrowMidY - 2);
      ctx.lineTo(arrowStartX, arrowMidY - 2);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#0f172a';
      ctx.font = "900 38px 'Inter', monospace";
      ctx.textAlign = 'center';
      ctx.fillText(seg.upNo || "12345", arrowCenterX - 10, arrowMidY - 56);

      // 2. LOWER RED ARROW POINTING LEFT (◀)
      ctx.fillStyle = '#b71c1c';
      ctx.beginPath();
      ctx.moveTo(arrowEndX, arrowMidY + 10);
      ctx.lineTo(arrowStartX + 40, arrowMidY + 10);
      ctx.lineTo(arrowStartX + 40, arrowMidY - 8);
      ctx.lineTo(arrowStartX, arrowMidY + 22);
      ctx.lineTo(arrowStartX + 40, arrowMidY + 52);
      ctx.lineTo(arrowStartX + 40, arrowMidY + 34);
      ctx.lineTo(arrowEndX, arrowMidY + 34);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#0f172a';
      ctx.font = "900 38px 'Inter', monospace";
      ctx.textAlign = 'center';
      ctx.fillText(seg.downNo || "12346", arrowCenterX + 10, arrowMidY + 76);

      currentX += arrowWidth;
    }
  }

  ctx.fillStyle = '#9c1d1e';
  ctx.font = "700 24px 'Inter', monospace";
  ctx.textAlign = 'right';
  ctx.fillText("IR / RSA EXPRESS", rect.x + rect.width - 30, rect.y + rect.height - 24);

  ctx.restore();
}

// SLR LUGGAGE & GUARD END-WALL
function drawSlrEndWall(ctx: CanvasRenderingContext2D, rect: PartRect, boardState: BoardState) {
  const slr = boardState.slrLuggage || {
    hindiText: 'सामान',
    englishText: 'LUGGAGE',
    smallBoardName: 'VISAKHA EXPRESS',
    smallBoardHi: 'विशाखा एक्सप्रेस',
    smallBoardReg: 'విశాఖ ఎక్స్ ప్రెస్',
    smallBoardEndpoints: 'SECUNDERABAD    BHUBANESWAR',
    liveryType: 'utkrisht'
  };

  ctx.save();

  const x = rect.x;
  const y = rect.y;
  const w = rect.width;
  const h = rect.height;

  ctx.fillStyle = '#5c1921';
  ctx.fillRect(x, y, w, h);

  ctx.fillStyle = '#f5b016';
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + w, y);
  ctx.lineTo(x, y + h);
  ctx.closePath();
  ctx.fill();

  // Roller Shutter / Luggage sliding door
  const shutterW = w * 0.38;
  ctx.fillStyle = '#f7b731';
  ctx.fillRect(x + 20, y + 20, shutterW, h - 40);
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#c68400';
  for (let sy = y + 40; sy < y + h - 40; sy += 24) {
    ctx.beginPath();
    ctx.moveTo(x + 20, sy);
    ctx.lineTo(x + 20 + shutterW, sy);
    ctx.stroke();
  }
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 10;
  ctx.strokeRect(x + 20, y + 20, shutterW, h - 40);

  // Large Stenciled "सामान / LUGGAGE"
  const textCenterX = x + shutterW + (w - shutterW) / 2;
  const textTopY = y + 260;

  ctx.fillStyle = '#0f172a';
  ctx.textAlign = 'center';

  ctx.font = "900 130px 'Noto Sans Devanagari', sans-serif";
  ctx.fillText(slr.hindiText || 'सामान', textCenterX, textTopY);

  ctx.font = "900 120px 'Inter', sans-serif";
  ctx.fillText(slr.englishText || 'LUGGAGE', textCenterX, textTopY + 140);

  // Compact Destination Board
  const boardW = 960;
  const boardH = 440;
  const boardX = textCenterX - boardW / 2;
  const boardY = textTopY + 280;

  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 10;
  ctx.fillStyle = '#f7b118';
  ctx.beginPath();
  ctx.roundRect(boardX, boardY, boardW, boardH, 12);
  ctx.fill();

  ctx.lineWidth = 10;
  ctx.strokeStyle = '#000000';
  ctx.strokeRect(boardX, boardY, boardW, boardH);

  ctx.fillStyle = '#000000';
  ctx.textAlign = 'center';

  if (slr.smallBoardReg) {
    ctx.font = "800 62px 'Noto Sans Telugu', 'Noto Sans Tamil', 'Noto Sans Kannada', sans-serif";
    ctx.fillText(slr.smallBoardReg, boardX + boardW / 2, boardY + 90);
  }

  ctx.font = "800 66px 'Noto Sans Devanagari', sans-serif";
  ctx.fillText(slr.smallBoardHi || 'विशाखा एक्सप्रेस', boardX + boardW / 2, boardY + 180);

  ctx.font = "900 74px 'Inter', sans-serif";
  ctx.fillText(slr.smallBoardName || 'VISAKHA EXPRESS', boardX + boardW / 2, boardY + 275);

  ctx.font = "800 44px 'Inter', monospace";
  ctx.fillText(slr.smallBoardEndpoints || 'SECUNDERABAD    BHUBANESWAR', boardX + boardW / 2, boardY + 370);

  drawScrews(ctx, { x: boardX, y: boardY, width: boardW, height: boardH });
  ctx.restore();
}

// COACH CLASS & DOOR PLATES
function drawDoorClassPlates(ctx: CanvasRenderingContext2D, rect: PartRect, atlasType: string) {
  const x = rect.x;
  const y = rect.y;
  const w = rect.width;
  const h = rect.height;

  ctx.fillStyle = atlasType === 'lhb' ? '#27272a' : '#111827';
  ctx.fillRect(x, y, w, h);

  const lhbPlates = [
    { title: "AC 3 TIER", coach: "B1", color: "#1e3a8a", text: "#ffffff" },
    { title: "AC 2 TIER", coach: "A1", color: "#831843", text: "#ffffff" },
    { title: "AC FIRST CLASS", coach: "H1", color: "#701a75", text: "#ffffff" },
    { title: "3 TIER ECONOMY", coach: "M1", color: "#0f766e", text: "#ffffff" },
    { title: "SLEEPER CLASS", coach: "S1", color: "#065f46", text: "#ffffff" },
    { title: "POWER CAR / EOG", coach: "L/SLR", color: "#991b1b", text: "#fef08a" }
  ];

  const icfPlates = [
    { title: "AC 3 TIER", coach: "B1", color: "#1e3a8a", text: "#ffffff" },
    { title: "SLEEPER", coach: "S1", color: "#065f46", text: "#ffffff" },
    { title: "AC 2 TIER", coach: "A1", color: "#831843", text: "#ffffff" },
    { title: "GENERAL", coach: "सामान्य", color: "#b45309", text: "#ffffff" },
    { title: "LADIES", coach: "महिला", color: "#9d174d", text: "#ffffff" },
    { title: "GUARD / BRAKE", coach: "गार्ड", color: "#1e293b", text: "#38bdf8" }
  ];

  const plates = atlasType === 'lhb' ? lhbPlates : icfPlates;
  const cols = 2;
  const rows = 3;
  const cellW = (w - 60) / cols;
  const cellH = (h - 60) / rows;

  plates.forEach((p, index) => {
    const c = index % cols;
    const r = Math.floor(index / cols);
    const px = x + 20 + c * (cellW + 20);
    const py = y + 20 + r * (cellH + 20);

    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.roundRect(px, py, cellW, cellH, 16);
    ctx.fill();

    ctx.lineWidth = 6;
    ctx.strokeStyle = atlasType === 'lhb' ? '#e2e8f0' : '#ffffff';
    ctx.strokeRect(px, py, cellW, cellH);

    ctx.fillStyle = p.text;
    ctx.textAlign = 'center';
    ctx.font = "800 46px 'Inter', sans-serif";
    ctx.fillText(p.title, px + cellW / 2, py + 80);

    ctx.font = "900 120px 'Inter', sans-serif";
    ctx.fillText(p.coach, px + cellW / 2, py + cellH - 70);
  });
}

// DIGITAL DOOR PIDS
function drawDigitalDoorPids(ctx: CanvasRenderingContext2D, rect: PartRect, boardState: BoardState) {
  const x = rect.x;
  const y = rect.y;
  const w = rect.width;
  const h = rect.height;

  ctx.fillStyle = '#030712';
  ctx.fillRect(x, y, w, h);

  const pidsBoxes = [
    { coach: "B1", cls: "AC 3 TIER", seats: "BERTHS 1 - 72" },
    { coach: "A1", cls: "AC 2 TIER", seats: "BERTHS 1 - 54" },
  ];

  const cellH = (h - 60) / 2;

  pidsBoxes.forEach((pid, idx) => {
    const py = y + 20 + idx * (cellH + 20);

    ctx.fillStyle = '#090d16';
    ctx.beginPath();
    ctx.roundRect(x + 20, py, w - 40, cellH, 16);
    ctx.fill();
    ctx.lineWidth = 8;
    ctx.strokeStyle = '#1e293b';
    ctx.stroke();

    // LED Dot Grid Simulation
    ctx.fillStyle = 'rgba(255,255,255,0.03)';
    for (let dx = x + 40; dx < x + w - 40; dx += 20) {
      for (let dy = py + 20; dy < py + cellH - 20; dy += 20) {
        ctx.beginPath();
        ctx.arc(dx, dy, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.save();
    ctx.shadowColor = 'rgba(0, 255, 102, 0.8)';
    ctx.shadowBlur = 20;
    ctx.fillStyle = '#00ff66';
    ctx.font = "900 150px 'VT323', monospace";
    ctx.textAlign = 'left';
    ctx.fillText(`COACH: ${pid.coach}`, x + 60, py + 160);

    ctx.shadowColor = 'rgba(255, 170, 0, 0.8)';
    ctx.fillStyle = '#ffaa00';
    ctx.font = "900 100px 'VT323', monospace";
    ctx.textAlign = 'right';
    ctx.fillText(pid.cls, x + w - 60, py + 160);

    ctx.font = "700 80px 'VT323', monospace";
    ctx.textAlign = 'left';
    ctx.fillText(`${pid.seats} | NEXT: ${boardState.destEn}`, x + 60, py + 340);
    ctx.restore();
  });
}

// DIGITAL END WALL INDICATORS
function drawDigitalEndIndicators(ctx: CanvasRenderingContext2D, rect: PartRect, boardState: BoardState) {
  const x = rect.x;
  const y = rect.y;
  const w = rect.width;
  const h = rect.height;

  ctx.fillStyle = '#05070a';
  ctx.fillRect(x, y, w, h);

  ctx.save();
  ctx.shadowColor = 'rgba(255, 34, 0, 0.9)';
  ctx.shadowBlur = 25;
  ctx.fillStyle = '#ff2200';
  ctx.font = "900 120px 'VT323', monospace";
  ctx.textAlign = 'center';
  ctx.fillText(`TRAIN NO: ${boardState.trainNo || "12626"}`, x + w / 2, y + 200);

  ctx.shadowColor = 'rgba(255, 170, 0, 0.9)';
  ctx.fillStyle = '#ffaa00';
  ctx.font = "900 160px 'VT323', monospace";
  ctx.textAlign = 'center';
  ctx.fillText(`ROUTE: ${boardState.sourceEn} ➔ ${boardState.destEn}`, x + w / 2, y + 420);

  // Emergency Red LED tail lamps
  ctx.fillStyle = '#ff0033';
  ctx.shadowColor = '#ff0033';
  ctx.shadowBlur = 40;
  ctx.beginPath();
  ctx.arc(x + 200, y + 700, 100, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(x + w - 200, y + 700, 100, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// DEPOT & TECHNICAL STENCILS
function drawDepotAndStencils(ctx: CanvasRenderingContext2D, rect: PartRect, boardState: BoardState, atlasType: string) {
  const x = rect.x;
  const y = rect.y;
  const w = rect.width;
  const h = rect.height;

  ctx.fillStyle = '#090d16';
  ctx.fillRect(x, y, w, h);

  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 4;
  ctx.strokeRect(x, y, w, h);

  ctx.fillStyle = '#f8fafc';
  ctx.textAlign = 'left';

  ctx.font = "900 70px 'Inter', monospace";
  ctx.fillText(`BASE: ${boardState.baseDepot || "TVC / SR"}`, x + 60, y + 140);
  ctx.font = "700 42px 'Inter', monospace";
  ctx.fillText(`ZONE: ${boardState.zone || "SR"} RAILWAY - COACHING DIVISION`, x + 60, y + 220);

  if (atlasType === 'lhb') {
    ctx.fillText("LHB STAINLESS STEEL SHELL - ALSTOM DESIGN", x + 60, y + 290);
    ctx.font = "900 95px 'Inter', monospace";
    ctx.fillText("NR  22145 / C", x + 60, y + 460);
    ctx.font = "700 40px 'Inter', monospace";
    ctx.fillText("TARE: 41.5 T   PAYLOAD: 18.0 T   CAPACITY: 72 BERTHS", x + 60, y + 540);

    ctx.font = "900 58px 'Inter', monospace";
    ctx.fillStyle = '#eab308';
    ctx.fillText("MAX SPEED 160 KMPH", x + w - 1100, y + 140);
    ctx.fillStyle = '#f8fafc';
    ctx.font = "700 38px 'Inter', monospace";
    ctx.fillText("FIAT BOGIE WITH AXLE MOUNTED DISC BRAKES", x + w - 1100, y + 220);
    ctx.fillText("CBC COUPLER WITH ANTI-CLIMBING FEATURE", x + w - 1100, y + 290);
    ctx.fillText("POH: JUDW / NR  RETURN: 12/2027", x + w - 1100, y + 360);
  } else if (atlasType === 'digital') {
    ctx.fillText("INTELLIGENT SMART COACH - IOT MONITORED", x + 60, y + 290);
    ctx.font = "900 95px 'Inter', monospace";
    ctx.fillText("VB  20951 / EC", x + 60, y + 460);
    ctx.font = "700 40px 'Inter', monospace";
    ctx.fillText("DIGITAL DISPLAY CONTROLLER: UNIT 04 - IP 192.168.1.104", x + 60, y + 540);

    ctx.font = "900 58px 'Inter', monospace";
    ctx.fillStyle = '#00ff66';
    ctx.fillText("MAX SPEED 180 KMPH (TESTED)", x + w - 1100, y + 140);
    ctx.fillStyle = '#f8fafc';
    ctx.font = "700 38px 'Inter', monospace";
    ctx.fillText("MICROPROCESSOR ELECTRO-PNEUMATIC BRAKE", x + w - 1100, y + 220);
    ctx.fillText("AUTOMATIC SLIDING PLUG DOORS", x + w - 1100, y + 290);
    ctx.fillText("SOFTWARE VER: 4.2.1  FIRMWARE: 2026.08", x + w - 1100, y + 360);
  } else {
    ctx.fillText("MAINTAINED BY COACHING DEPOT MAS", x + 60, y + 290);
    ctx.font = "900 95px 'Inter', monospace";
    ctx.fillText("SR  192341 / C", x + 60, y + 460);
    ctx.font = "700 40px 'Inter', monospace";
    ctx.fillText("TARE: 40.2 T   PAYLOAD: 16.8 T   CAPACITY: 72 BERTHS", x + 60, y + 540);

    ctx.font = "900 58px 'Inter', monospace";
    ctx.fillStyle = '#eab308';
    ctx.fillText("MAX SPEED 130 KMPH", x + w - 1100, y + 140);
    ctx.fillStyle = '#f8fafc';
    ctx.font = "700 38px 'Inter', monospace";
    ctx.fillText("TWIN PIPE AIR BRAKE SYSTEM", x + w - 1100, y + 220);
    ctx.fillText("INTEGRAL COACH FACTORY - PERAMBUR", x + w - 1100, y + 290);
    ctx.fillText("POH: GOC / SR  RETURN: 08/2026", x + w - 1100, y + 360);
  }

  // Large Zonal Emblem
  const badgeX = x + w - 300;
  const badgeY = y + 500;
  ctx.fillStyle = atlasType === 'lhb' ? '#9c1d1e' : atlasType === 'digital' ? '#0f766e' : '#1e3a8a';
  ctx.beginPath();
  ctx.arc(badgeX, badgeY, 150, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = "900 110px 'Inter', sans-serif";
  ctx.textAlign = 'center';
  ctx.fillText(boardState.zone || "SR", badgeX, badgeY + 40);
}

// ---------------- SUPPORTING HELPERS ----------------

function drawCoachBackground(ctx: CanvasRenderingContext2D, template: AtlasTemplate, width: number, height: number) {
  ctx.fillStyle = '#10274f';
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = '#f5b016';
  ctx.fillRect(0, height * 0.1, width, 18);
  ctx.fillRect(0, height * 0.9, width, 18);
}

function drawBoardBase(ctx: CanvasRenderingContext2D, template: AtlasTemplate, boardState: BoardState) {
  const rect = template.boardRect || { x: 320, y: 160, width: 3200, height: 640 };
  const boardColor = boardState.customBoardColor || template.boardColor;
  ctx.fillStyle = boardColor;
  ctx.beginPath();
  ctx.roundRect(rect.x, rect.y, rect.width, rect.height, 16);
  ctx.fill();
  ctx.lineWidth = 14;
  ctx.strokeStyle = template.boardBorderColor;
  ctx.stroke();
}

function drawScrews(ctx: CanvasRenderingContext2D, rect: PartRect) {
  const screwPositions = [
    { x: rect.x + 36, y: rect.y + 36 },
    { x: rect.x + rect.width - 36, y: rect.y + 36 },
    { x: rect.x + 36, y: rect.y + rect.height - 36 },
    { x: rect.x + rect.width - 36, y: rect.y + rect.height - 36 },
    { x: rect.x + rect.width / 2, y: rect.y + 32 },
    { x: rect.x + rect.width / 2, y: rect.y + rect.height - 32 },
  ];
  screwPositions.forEach(pos => {
    ctx.fillStyle = '#555';
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(pos.x - 6, pos.y);
    ctx.lineTo(pos.x + 6, pos.y);
    ctx.stroke();
  });
}

function drawPhysicalBoardContent(ctx: CanvasRenderingContext2D, template: AtlasTemplate, boardState: BoardState) {
  const rect = template.boardRect || { x: 320, y: 160, width: 3200, height: 640 };
  const textColor = boardState.customTextColor || '#111111';
  const leftBoxWidth = 520;
  const rightBoxWidth = 420;
  const centerLeft = rect.x + leftBoxWidth + 40;
  const centerWidth = rect.width - leftBoxWidth - rightBoxWidth - 80;
  const centerX = centerLeft + centerWidth / 2;

  ctx.save();
  ctx.fillStyle = textColor;
  ctx.textAlign = "center";
  ctx.font = "900 115px 'Inter', sans-serif";
  ctx.fillText(boardState.trainNo || "12626", rect.x + leftBoxWidth / 2, rect.y + 190);

  if (boardState.sourceHi && boardState.destHi) {
    ctx.font = "800 68px 'Noto Sans Devanagari', sans-serif";
    ctx.fillText(`${boardState.sourceHi}  —  ${boardState.destHi}`, centerX, rect.y + 140);
  }
  if (boardState.sourceEn && boardState.destEn) {
    ctx.font = "900 82px 'Inter', sans-serif";
    ctx.fillText(`${boardState.sourceEn}  —  ${boardState.destEn}`, centerX, rect.y + 250);
  }
  if (boardState.sourceReg && boardState.destReg) {
    ctx.font = "700 62px 'Noto Sans Tamil', 'Noto Sans Telugu', 'Noto Sans Malayalam', sans-serif";
    ctx.fillText(`${boardState.sourceReg}  —  ${boardState.destReg}`, centerX, rect.y + 355);
  }
  ctx.restore();
}

function drawDigitalLedContent(ctx: CanvasRenderingContext2D, template: AtlasTemplate, boardState: BoardState) {
  const rect = template.boardRect || { x: 240, y: 160, width: 3360, height: 640 };
  ctx.save();
  ctx.fillStyle = '#05070a';
  ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
  ctx.fillStyle = template.textColor || '#ffaa00';
  ctx.shadowColor = 'rgba(255, 170, 0, 0.9)';
  ctx.shadowBlur = 25;
  ctx.font = "700 160px 'VT323', monospace";
  ctx.textAlign = "center";
  ctx.fillText(`${boardState.sourceEn}  ➔  ${boardState.destEn}`, rect.x + rect.width / 2, rect.y + 360);
  ctx.restore();
}

function drawWeatheringEffects(ctx: CanvasRenderingContext2D, template: AtlasTemplate, weathering: WeatheringState) {
  const width = template.width;
  const height = template.height;
  if (weathering.grime > 0) {
    const alpha = (weathering.grime / 100) * 0.45;
    const grimeGrad = ctx.createLinearGradient(0, height, 0, 0);
    grimeGrad.addColorStop(0, `rgba(74, 55, 40, ${alpha})`);
    grimeGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grimeGrad;
    ctx.fillRect(0, 0, width, height);
  }
  if (weathering.rust > 0) {
    const alpha = (weathering.rust / 100) * 0.35;
    ctx.fillStyle = `rgba(180, 83, 9, ${alpha})`;
    for (let rx = 200; rx < width; rx += 480) {
      ctx.fillRect(rx, 0, 16, height * 0.25);
    }
  }
  if (weathering.sunFade > 0) {
    const alpha = (weathering.sunFade / 100) * 0.25;
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.fillRect(0, 0, width, height);
  }
}


"use client";

import React, { useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import type { BoardTemplate, BoardSlotDefinition } from "@/lib/board-studio-api";

export interface LEDCanvasHandle {
  getCanvas: () => HTMLCanvasElement | null;
  getPreviewDataUrl: () => string;
}

interface LEDCanvasProps {
  template: BoardTemplate;
  fieldValues: Record<string, string>;
  showGrid?: boolean;
  scale?: number;
  bloomIntensity?: number; // 0 to 2
  unlitDots?: boolean;
}

export const LEDCanvas = forwardRef<LEDCanvasHandle, LEDCanvasProps>(function LEDCanvas(
  { template, fieldValues, showGrid = false, scale = 1, bloomIntensity = 1, unlitDots = true },
  ref
) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const bgImageRef = useRef<HTMLImageElement | null>(null);

  useImperativeHandle(ref, () => ({
    getCanvas: () => canvasRef.current,
    getPreviewDataUrl: () => {
      if (!canvasRef.current) return "";
      return canvasRef.current.toDataURL("image/jpeg", 0.85);
    },
  }));

  // Preload background image if available
  useEffect(() => {
    const bgUrl = template.background_image_url || template.background_image;
    if (bgUrl) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        bgImageRef.current = img;
        renderCanvas();
      };
      img.onerror = () => {
        bgImageRef.current = null;
        renderCanvas();
      };
      img.src = bgUrl;
    } else {
      bgImageRef.current = null;
      renderCanvas();
    }
  }, [template.background_image_url, template.background_image]);

  useEffect(() => {
    renderCanvas();
  }, [template, fieldValues, showGrid, bloomIntensity, unlitDots]);

  function renderCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    const width = template.base_width || 1024;
    const height = template.base_height || 1024;

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    // 1. Render Background
    ctx.clearRect(0, 0, width, height);

    if (bgImageRef.current && bgImageRef.current.complete) {
      ctx.drawImage(bgImageRef.current, 0, 0, width, height);
    } else {
      // Procedural Railway Enclosure Background
      const isMetal = template.category === "ACRYLIC_METAL";
      if (isMetal) {
        // Stainless Steel / Blue Coach Texture
        const grad = ctx.createLinearGradient(0, 0, 0, height);
        grad.addColorStop(0, "#1E293B");
        grad.addColorStop(0.5, "#0F172A");
        grad.addColorStop(1, "#020617");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
      } else {
        // Matte Black Polycarbonate LED Chassis
        ctx.fillStyle = "#0A0D14";
        ctx.fillRect(0, 0, width, height);

        // Subtle LED chassis panel texture
        ctx.fillStyle = "#111622";
        ctx.fillRect(16, 16, width - 32, height - 32);
      }
    }

    // 2. Render Fixed Graphics (Borders, Separators, Plates)
    if (Array.isArray(template.fixed_graphics)) {
      for (const fg of template.fixed_graphics) {
        ctx.save();
        if (fg.type === "border" && fg.width && fg.height) {
          ctx.strokeStyle = fg.color || "#2C2C2E";
          ctx.lineWidth = fg.border_width || 3;
          ctx.strokeRect(fg.x, fg.y, fg.width, fg.height);
        } else if (fg.type === "separator" && fg.x2 !== undefined && fg.y2 !== undefined) {
          ctx.strokeStyle = fg.color || "#2C2C2E";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(fg.x, fg.y);
          ctx.lineTo(fg.x2, fg.y2);
          ctx.stroke();
        }
        ctx.restore();
      }
    }

    // 3. Render Slots (LED Matrix or Crisp Typography)
    for (const field of template.fields || []) {
      const text = fieldValues[field.id] !== undefined ? fieldValues[field.id] : field.default_text;
      if (!text) continue;

      const isMatrix = field.matrix_mode !== false && (field.dot_pitch || 4) > 0;
      if (isMatrix) {
        renderLEDMatrixSlot(ctx, field, text, bloomIntensity, unlitDots);
      } else {
        renderSolidTextSlot(ctx, field, text);
      }
    }

    // 4. Render Grid & UV Bounds Overlay if enabled
    if (showGrid) {
      ctx.save();
      ctx.strokeStyle = "rgba(0, 255, 200, 0.25)";
      ctx.lineWidth = 1;
      const gridSize = 64;
      for (let x = 0; x <= width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y <= height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Slot bounding boxes
      for (const field of template.fields || []) {
        ctx.strokeStyle = "rgba(255, 170, 0, 0.8)";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(field.x, field.y, field.width, field.height);
        ctx.fillStyle = "rgba(255, 170, 0, 0.9)";
        ctx.font = "10px monospace";
        ctx.fillText(`${field.label} (${field.width}x${field.height})`, field.x + 4, field.y - 4);
      }
      ctx.restore();
    }
  }

  function renderSolidTextSlot(
    ctx: CanvasRenderingContext2D,
    field: BoardSlotDefinition,
    text: string
  ) {
    ctx.save();
    ctx.font = `bold ${field.font_size || 36}px ${field.font || "Arial, sans-serif"}`;
    ctx.fillStyle = field.color || "#FFFFFF";
    ctx.textBaseline = "middle";

    // Text shadow for high contrast
    if (field.glow_color && field.glow_color !== "transparent") {
      ctx.shadowColor = field.glow_color;
      ctx.shadowBlur = 8;
    }

    ctx.fillText(text, field.x, field.y + field.height / 2, field.width);
    ctx.restore();
  }

  function renderLEDMatrixSlot(
    ctx: CanvasRenderingContext2D,
    field: BoardSlotDefinition,
    text: string,
    bloom: number,
    drawUnlit: boolean
  ) {
    const pitch = field.dot_pitch || 4;
    const dotRadius = Math.max(1, (pitch / 2) * 0.85);

    // Scratch canvas to rasterize font into binary pixel map
    const scratch = document.createElement("canvas");
    scratch.width = field.width;
    scratch.height = field.height;
    const sctx = scratch.getContext("2d");
    if (!sctx) return;

    sctx.fillStyle = "#000000";
    sctx.fillRect(0, 0, field.width, field.height);

    sctx.fillStyle = "#FFFFFF";
    sctx.font = `bold ${field.font_size || 40}px ${field.font || "VT323, monospace"}`;
    sctx.textBaseline = "middle";
    sctx.fillText(text, 2, field.height / 2, field.width - 4);

    const sImg = sctx.getImageData(0, 0, field.width, field.height);
    const sData = sImg.data;

    const litColor = field.color || "#FFAA00";
    const glowColor = field.glow_color || "#FF6600";
    const unlitColor = "rgba(255, 170, 0, 0.07)";

    ctx.save();

    // 1. Draw Unlit Background Diode Grid if enabled
    if (drawUnlit) {
      ctx.fillStyle = unlitColor;
      for (let y = pitch / 2; y < field.height; y += pitch) {
        for (let x = pitch / 2; x < field.width; x += pitch) {
          ctx.beginPath();
          ctx.arc(field.x + x, field.y + y, dotRadius * 0.65, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // 2. Draw Glowing Lit Diode Matrix
    ctx.fillStyle = litColor;
    if (bloom > 0) {
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = Math.round(pitch * 1.6 * bloom);
    }

    for (let y = pitch / 2; y < field.height; y += pitch) {
      for (let x = pitch / 2; x < field.width; x += pitch) {
        const sx = Math.floor(x);
        const sy = Math.floor(y);
        const idx = (sy * field.width + sx) * 4;

        // Brightness threshold for LED diode trigger
        if (sData[idx] > 90) {
          ctx.beginPath();
          ctx.arc(field.x + x, field.y + y, dotRadius, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    ctx.restore();
  }

  return (
    <div className="relative inline-block overflow-hidden rounded-xl border border-white/10 bg-black/60 p-2 shadow-2xl backdrop-blur-md">
      <canvas
        ref={canvasRef}
        style={{
          width: `${(template.base_width || 1024) * scale}px`,
          height: `${(template.base_height || 1024) * scale}px`,
          maxWidth: "100%",
          display: "block",
          imageRendering: "pixelated",
        }}
      />
    </div>
  );
});


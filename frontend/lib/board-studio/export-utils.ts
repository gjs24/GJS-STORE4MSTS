import { BoardTemplate, UserBoardValues } from './types';
import { canvasToDDS, DDSFormat } from './dds-encoder';

/**
 * Loads an image URL into an HTMLImageElement safely
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}

/**
 * Draws the board or texture sheet onto a canvas at target resolution
 */
export async function renderBoardToCanvas(
  template: BoardTemplate,
  values: UserBoardValues,
  targetWidth?: number,
  targetHeight?: number,
  customBackgroundUrl?: string
): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas');
  const w = targetWidth || template.baseWidth;
  const h = targetHeight || template.baseHeight;
  canvas.width = w;
  canvas.height = h;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Cannot get canvas 2d context');

  const scale = w / template.baseWidth;
  const effectiveBgImage = customBackgroundUrl || template.backgroundImageUrl;

  // 1. Render Background
  if (effectiveBgImage) {
    try {
      const bgImg = await loadImage(effectiveBgImage);
      ctx.drawImage(bgImg, 0, 0, w, h);
    } catch (err) {
      console.warn('Failed to load background texture, using fallback color:', err);
      if (template.backgroundType !== 'transparent') {
        ctx.fillStyle = template.backgroundColor || '#000000';
        ctx.fillRect(0, 0, w, h);
      }
    }
  } else if (template.backgroundType !== 'transparent') {
    if (template.backgroundType === 'gradient' && template.backgroundSecondaryColor) {
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, template.backgroundColor);
      grad.addColorStop(1, template.backgroundSecondaryColor);
      ctx.fillStyle = grad;
    } else {
      ctx.fillStyle = template.backgroundColor;
    }

    if (template.borderRadius > 0) {
      ctx.beginPath();
      ctx.roundRect(0, 0, w, h, template.borderRadius * scale);
      ctx.fill();
    } else {
      ctx.fillRect(0, 0, w, h);
    }
  }

  // 2. Borders
  if (template.borderWidth > 0 && template.borderColor !== 'transparent') {
    ctx.lineWidth = template.borderWidth * scale;
    ctx.strokeStyle = template.borderColor;
    if (template.borderRadius > 0) {
      ctx.beginPath();
      ctx.roundRect(0, 0, w, h, template.borderRadius * scale);
      ctx.stroke();
    } else {
      ctx.strokeRect(0, 0, w, h);
    }
  }

  if (template.innerBorder) {
    const pad = (template.innerBorderPadding || 6) * scale;
    ctx.lineWidth = Math.max(1, template.borderWidth * 0.4 * scale);
    ctx.strokeStyle = template.innerBorderColor || template.borderColor;
    ctx.beginPath();
    ctx.roundRect(pad, pad, w - pad * 2, h - pad * 2, Math.max(2, (template.borderRadius - 4) * scale));
    ctx.stroke();
  }

  // 3. Bolts
  if (template.showBolts) {
    const boltPad = 14 * scale;
    const boltRadius = 5 * scale;
    const boltPositions = [
      [boltPad, boltPad],
      [w - boltPad, boltPad],
      [boltPad, h - boltPad],
      [w - boltPad, h - boltPad]
    ];
    boltPositions.forEach(([bx, by]) => {
      ctx.beginPath();
      ctx.arc(bx, by, boltRadius, 0, Math.PI * 2);
      ctx.fillStyle = '#444444';
      ctx.fill();
      ctx.lineWidth = 1 * scale;
      ctx.strokeStyle = '#222222';
      ctx.stroke();
    });
  }

  // 4. Fixed Graphics (Static Stamps, Logos, Dividers, Watermarks)
  for (const g of template.fixedGraphics) {
    const gx = (g.x / 100) * w;
    const gy = (g.y / 100) * h;
    const rot = ((g.rotation || 0) * Math.PI) / 180;
    const sc = g.scale || 1.0;
    const opacity = g.opacity !== undefined ? g.opacity : 1.0;

    ctx.save();
    ctx.translate(gx, gy);
    if (rot) ctx.rotate(rot);
    if (sc !== 1.0) ctx.scale(sc, sc);
    if (opacity < 1.0) ctx.globalAlpha = opacity;

    if (g.type === 'divider') {
      const gw = ((g.width || 90) / 100) * w;
      const gh = (g.height || 2) * scale;
      ctx.fillStyle = g.color || template.borderColor;
      ctx.fillRect(-gw / 2, -gh / 2, gw, gh);
    } else if (g.type === 'logo') {
      if (g.content) {
        try {
          const img = await loadImage(g.content);
          const gw = ((g.width || 15) / 100) * w;
          const gh = ((g.height || 15) / 100) * h;
          ctx.drawImage(img, -gw / 2, -gh / 2, gw, gh);
        } catch (err) {
          console.warn('Failed to load logo stamp image for export:', err);
        }
      }
    } else if (g.type === 'badge') {
      ctx.font = `900 ${(g.fontSize || 14) * scale}px Arial, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = g.color || template.borderColor;
      ctx.fillText(g.content || '', 0, 0);
    } else if (g.type === 'text') {
      const fSize = (g.fontSize || 14) * scale;
      ctx.font = `${g.fontWeight || 700} ${fSize}px ${g.fontFamily || 'Arial'}`;
      ctx.textAlign = (g.align as CanvasTextAlign) || 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = g.color || template.borderColor;
      ctx.fillText(g.content || '', 0, 0);
    }
    ctx.restore();
  }

  // 5. Fields (Text or Image) with Free Rotation & Zoom/Scale
  for (const f of template.fields) {
    const rawVal = values[f.id] !== undefined ? values[f.id] : (f.defaultValue || f.imageUrl || '');
    if (!rawVal) continue;

    const fx = (f.x / 100) * w;
    const fy = (f.y / 100) * h;
    const fw = (f.width / 100) * w;
    const fh = (f.height / 100) * h;
    const rot = ((f.rotation || 0) * Math.PI) / 180;
    const sc = f.scale || 1.0;

    ctx.save();
    ctx.translate(fx, fy);
    if (rot) ctx.rotate(rot);
    if (sc !== 1.0) ctx.scale(sc, sc);

    if (f.type === 'image') {
      try {
        const img = await loadImage(rawVal);
        ctx.drawImage(img, -fw / 2, -fh / 2, fw, fh);
      } catch (err) {
        console.warn('Failed to load image field for export:', err);
      }
      ctx.restore();
      continue;
    }

    const text = f.textTransform === 'uppercase' ? rawVal.toUpperCase() : rawVal;
    let fontSize = f.fontSize * scale;
    ctx.font = `${f.fontStyle || 'normal'} ${f.fontWeight} ${fontSize}px ${f.fontFamily}`;

    const lines = String(text).split('\n');

    // Auto-fit if any line exceeds width
    const maxMeasured = Math.max(...lines.map((l) => ctx.measureText(l).width), 1);
    if (maxMeasured > fw) {
      fontSize = fontSize * (fw / maxMeasured) * 0.96;
      ctx.font = `${f.fontStyle || 'normal'} ${f.fontWeight} ${fontSize}px ${f.fontFamily}`;
    }

    ctx.textAlign = (f.align as CanvasTextAlign) || 'center';
    ctx.textBaseline = 'middle';

    const drawX = f.align === 'left' ? -fw / 2 : f.align === 'right' ? fw / 2 : 0;
    const lineHeight = fontSize * 1.18;
    const totalBlockHeight = (lines.length - 1) * lineHeight;
    const startY = -totalBlockHeight / 2;

    lines.forEach((lineText, lineIdx) => {
      const lineY = startY + lineIdx * lineHeight;
      // Apply LED Glow
      if (f.ledGlow) {
        const glowR = (f.glowRadius || 12) * scale;
        ctx.shadowColor = f.glowColor || '#ff6200';
        ctx.shadowBlur = glowR;
        ctx.fillStyle = f.color;
        ctx.fillText(lineText, drawX, lineY);
        // Secondary pass for intense core glow
        ctx.shadowBlur = glowR / 2;
        ctx.fillText(lineText, drawX, lineY);
      } else {
        ctx.fillStyle = f.color;
        ctx.fillText(lineText, drawX, lineY);
      }
    });
    ctx.restore();
  }

  // 6. Site Details / Watermark at bottom of template
  if (template.showWatermark !== false) {
    const watermark = template.watermarkText || 'Created with GJS Railway Board Studio • https://gjs-store-4-msts.vercel.app';
    ctx.save();
    ctx.font = `600 ${Math.max(8, Math.round(10 * scale))}px system-ui, -apple-system, sans-serif`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillText(watermark, w - 8 * scale, h - 5 * scale);
    ctx.restore();
  }

  return canvas;
}

/**
 * Export board directly to DDS format file with custom filename support
 */
export async function exportBoardToDDS(
  template: BoardTemplate,
  values: UserBoardValues,
  format: DDSFormat = 'bgra8',
  customBackgroundUrl?: string,
  customFilename?: string
): Promise<void> {
  const w = template.isTextureSheet ? (template.textureResolution || 1024) : template.baseWidth;
  const h = template.isTextureSheet ? (template.textureResolution || 1024) : template.baseHeight;

  const canvas = await renderBoardToCanvas(template, values, w, h, customBackgroundUrl);
  const chosenName = (customFilename?.trim() || template.targetTextureName?.trim() || template.name)
    .replace(/\.(dds|png)$/i, '')
    .replace(/[^a-zA-Z0-9_\-]/g, '_');
  canvasToDDS(canvas, `${chosenName}.dds`, { format });
}

/**
 * Export board to PNG file with custom filename support
 */
export async function exportBoardToPNG(
  template: BoardTemplate,
  values: UserBoardValues,
  scale: number = 2,
  customBackgroundUrl?: string,
  customFilename?: string
): Promise<void> {
  const w = template.baseWidth * scale;
  const h = template.baseHeight * scale;

  const canvas = await renderBoardToCanvas(template, values, w, h, customBackgroundUrl);
  const dataUrl = canvas.toDataURL('image/png');
  const link = document.createElement('a');
  const chosenName = (customFilename?.trim() || template.targetTextureName?.trim() || template.name)
    .replace(/\.(dds|png)$/i, '')
    .replace(/[^a-zA-Z0-9_\-]/g, '_');
  link.download = `${chosenName}.png`;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Native print
 */
export function printBoard(): void {
  window.print();
}


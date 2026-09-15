/**
 * Binary Direct DDS (DirectDraw Surface) Texture Sheet Generator
 * Compatible with Open Rails (MSTS) and Trainz Railroad Simulator (TRS19 / TRS22).
 *
 * Supports:
 * 1. 32-bit Uncompressed BGRA/RGBA DDS (crystal clear zero compression artifacts, universally loaded)
 * 2. DXT5 (BC3) block compressed DDS (optimal VRAM footprint for simulator engines)
 */

export type DDSFormat = "RGBA32" | "DXT5";

const DDS_MAGIC = 0x20534444; // 'DDS '
const DDSD_CAPS = 0x00000001;
const DDSD_HEIGHT = 0x00000002;
const DDSD_WIDTH = 0x00000004;
const DDSD_PITCH = 0x00000008;
const DDSD_PIXELFORMAT = 0x00001000;
const DDSD_LINEARSIZE = 0x00080000;

const DDPF_ALPHAPIXELS = 0x00000001;
const DDPF_FOURCC = 0x00000004;
const DDPF_RGB = 0x00000040;
const DDSCAPS_TEXTURE = 0x00001000;

// FourCC for DXT5 = 'DXT5' = 0x35545844
const FOURCC_DXT5 = 0x35545844;

/**
 * Encode RGB888 to RGB565 integer
 */
function toRGB565(r: number, g: number, b: number): number {
  return (((r >> 3) & 0x1f) << 11) | (((g >> 2) & 0x3f) << 5) | ((b >> 3) & 0x1f);
}

/**
 * Encodes a 4x4 pixel block into 16-byte DXT5 block
 */
function encodeDXT5Block(
  src: Uint8ClampedArray,
  bx: number,
  by: number,
  width: number,
  height: number,
  out: Uint8Array,
  outOffset: number
) {
  const blockR = new Uint8Array(16);
  const blockG = new Uint8Array(16);
  const blockB = new Uint8Array(16);
  const blockA = new Uint8Array(16);

  let minA = 255;
  let maxA = 0;

  for (let py = 0; py < 4; py++) {
    const y = Math.min(by + py, height - 1);
    for (let px = 0; px < 4; px++) {
      const x = Math.min(bx + px, width - 1);
      const idx = (y * width + x) * 4;
      const bIdx = py * 4 + px;

      const r = src[idx];
      const g = src[idx + 1];
      const b = src[idx + 2];
      const a = src[idx + 3];

      blockR[bIdx] = r;
      blockG[bIdx] = g;
      blockB[bIdx] = b;
      blockA[bIdx] = a;

      if (a < minA) minA = a;
      if (a > maxA) maxA = a;
    }
  }

  // --- 1. Encode 8 bytes of Alpha ---
  out[outOffset] = maxA;
  out[outOffset + 1] = minA;

  // Build alpha palette
  const alphaTable = new Uint8Array(8);
  alphaTable[0] = maxA;
  alphaTable[1] = minA;
  if (maxA > minA) {
    for (let i = 1; i <= 6; i++) {
      alphaTable[i + 1] = Math.round(((7 - i) * maxA + i * minA) / 7);
    }
  } else {
    for (let i = 1; i <= 4; i++) {
      alphaTable[i + 1] = Math.round(((5 - i) * maxA + i * minA) / 5);
    }
    alphaTable[6] = 0;
    alphaTable[7] = 255;
  }

  // Find 3-bit indices for 16 pixels (48 bits total = 6 bytes)
  let alphaBitsLow = 0;
  let alphaBitsHigh = 0;

  for (let i = 0; i < 16; i++) {
    const a = blockA[i];
    let bestDist = 999999;
    let bestCode = 0;
    for (let c = 0; c < 8; c++) {
      const d = Math.abs(a - alphaTable[c]);
      if (d < bestDist) {
        bestDist = d;
        bestCode = c;
      }
    }

    if (i < 8) {
      alphaBitsLow |= (bestCode & 0x07) << (i * 3);
    } else {
      alphaBitsHigh |= (bestCode & 0x07) << ((i - 8) * 3);
    }
  }

  out[outOffset + 2] = alphaBitsLow & 0xff;
  out[outOffset + 3] = (alphaBitsLow >> 8) & 0xff;
  out[outOffset + 4] = (alphaBitsLow >> 16) & 0xff;
  out[outOffset + 5] = alphaBitsHigh & 0xff;
  out[outOffset + 6] = (alphaBitsHigh >> 8) & 0xff;
  out[outOffset + 7] = (alphaBitsHigh >> 16) & 0xff;

  // --- 2. Encode 8 bytes of RGB (DXT1 block) ---
  let minR = 255, maxR = 0;
  let minG = 255, maxG = 0;
  let minB = 255, maxB = 0;

  for (let i = 0; i < 16; i++) {
    if (blockR[i] < minR) minR = blockR[i];
    if (blockR[i] > maxR) maxR = blockR[i];
    if (blockG[i] < minG) minG = blockG[i];
    if (blockG[i] > maxG) maxG = blockG[i];
    if (blockB[i] < minB) minB = blockB[i];
    if (blockB[i] > maxB) maxB = blockB[i];
  }

  const c0 = toRGB565(maxR, maxG, maxB);
  const c1 = toRGB565(minR, minG, minB);

  out[outOffset + 8] = c0 & 0xff;
  out[outOffset + 9] = (c0 >> 8) & 0xff;
  out[outOffset + 10] = c1 & 0xff;
  out[outOffset + 11] = (c1 >> 8) & 0xff;

  // Expand c0, c1
  const r0 = ((c0 >> 11) & 0x1f) * 255 / 31;
  const g0 = ((c0 >> 5) & 0x3f) * 255 / 63;
  const b0 = (c0 & 0x1f) * 255 / 31;

  const r1 = ((c1 >> 11) & 0x1f) * 255 / 31;
  const g1 = ((c1 >> 5) & 0x3f) * 255 / 63;
  const b1 = (c1 & 0x1f) * 255 / 31;

  const colorPalette = [
    [r0, g0, b0],
    [r1, g1, b1],
    [(2 * r0 + r1) / 3, (2 * g0 + g1) / 3, (2 * b0 + b1) / 3],
    [(r0 + 2 * r1) / 3, (g0 + 2 * g1) / 3, (b0 + 2 * b1) / 3],
  ];

  let colorIndices = 0;
  for (let i = 0; i < 16; i++) {
    const r = blockR[i];
    const g = blockG[i];
    const b = blockB[i];

    let bestDist = Infinity;
    let bestIndex = 0;

    for (let c = 0; c < 4; c++) {
      const dr = r - colorPalette[c][0];
      const dg = g - colorPalette[c][1];
      const db = b - colorPalette[c][2];
      const dist = dr * dr + dg * dg + db * db;
      if (dist < bestDist) {
        bestDist = dist;
        bestIndex = c;
      }
    }
    colorIndices |= (bestIndex & 0x03) << (i * 2);
  }

  out[outOffset + 12] = colorIndices & 0xff;
  out[outOffset + 13] = (colorIndices >> 8) & 0xff;
  out[outOffset + 14] = (colorIndices >> 16) & 0xff;
  out[outOffset + 15] = (colorIndices >> 24) & 0xff;
}

/**
 * Builds a valid binary DirectDraw Surface (DDS) file from an HTML5 Canvas.
 */
export function canvasToDDS(canvas: HTMLCanvasElement, format: DDSFormat = "RGBA32"): Uint8Array {
  const width = canvas.width;
  const height = canvas.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Could not acquire 2D canvas context");

  const imageData = ctx.getImageData(0, 0, width, height);
  const src = imageData.data;

  const HEADER_SIZE = 128; // 4 bytes magic + 124 bytes DDS_HEADER
  let dataSize = 0;

  if (format === "RGBA32") {
    dataSize = width * height * 4;
  } else {
    // DXT5 size = max(1, (w+3)/4) * max(1, (h+3)/4) * 16
    const blocksX = Math.max(1, Math.floor((width + 3) / 4));
    const blocksY = Math.max(1, Math.floor((height + 3) / 4));
    dataSize = blocksX * blocksY * 16;
  }

  const buffer = new ArrayBuffer(HEADER_SIZE + dataSize);
  const view = new DataView(buffer);
  const uint8 = new Uint8Array(buffer);

  // 1. Magic
  view.setUint32(0, DDS_MAGIC, true);

  // 2. DDS_HEADER
  view.setUint32(4, 124, true); // dwSize
  const flags =
    DDSD_CAPS |
    DDSD_HEIGHT |
    DDSD_WIDTH |
    DDSD_PIXELFORMAT |
    (format === "RGBA32" ? DDSD_PITCH : DDSD_LINEARSIZE);
  view.setUint32(8, flags, true);
  view.setUint32(12, height, true); // dwHeight
  view.setUint32(16, width, true); // dwWidth
  view.setUint32(20, format === "RGBA32" ? width * 4 : dataSize, true); // dwPitchOrLinearSize
  view.setUint32(24, 0, true); // dwDepth
  view.setUint32(28, 1, true); // dwMipMapCount

  // 3. DDS_PIXELFORMAT
  const pfOffset = 76;
  view.setUint32(pfOffset, 32, true); // dwSize

  if (format === "RGBA32") {
    view.setUint32(pfOffset + 4, DDPF_RGB | DDPF_ALPHAPIXELS, true); // dwFlags
    view.setUint32(pfOffset + 8, 0, true); // dwFourCC
    view.setUint32(pfOffset + 12, 32, true); // dwRGBBitCount
    // DirectX 32-bit BGRA masks
    view.setUint32(pfOffset + 16, 0x00ff0000, true); // R
    view.setUint32(pfOffset + 20, 0x0000ff00, true); // G
    view.setUint32(pfOffset + 24, 0x000000ff, true); // B
    view.setUint32(pfOffset + 28, 0xff000000, true); // A
  } else {
    view.setUint32(pfOffset + 4, DDPF_FOURCC, true); // dwFlags
    view.setUint32(pfOffset + 8, FOURCC_DXT5, true); // dwFourCC
    view.setUint32(pfOffset + 12, 0, true);
    view.setUint32(pfOffset + 16, 0, true);
    view.setUint32(pfOffset + 20, 0, true);
    view.setUint32(pfOffset + 24, 0, true);
    view.setUint32(pfOffset + 28, 0, true);
  }

  // 4. dwCaps
  view.setUint32(108, DDSCAPS_TEXTURE, true);

  // 5. Write Pixel Payload
  const payloadOffset = HEADER_SIZE;

  if (format === "RGBA32") {
    let dstIdx = payloadOffset;
    const totalPixels = width * height;
    for (let p = 0; p < totalPixels; p++) {
      const srcIdx = p * 4;
      uint8[dstIdx] = src[srcIdx + 2]; // B
      uint8[dstIdx + 1] = src[srcIdx + 1]; // G
      uint8[dstIdx + 2] = src[srcIdx]; // R
      uint8[dstIdx + 3] = src[srcIdx + 3]; // A
      dstIdx += 4;
    }
  } else {
    // DXT5 compression pass
    let currentOffset = payloadOffset;
    for (let by = 0; by < height; by += 4) {
      for (let bx = 0; bx < width; bx += 4) {
        encodeDXT5Block(src, bx, by, width, height, uint8, currentOffset);
        currentOffset += 16;
      }
    }
  }

  return uint8;
}

/**
 * Triggers a browser download of any Blob
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/**
 * Export canvas directly as DDS file
 */
export function exportCanvasAsDDS(canvas: HTMLCanvasElement, filename: string, format: DDSFormat = "RGBA32"): void {
  const ddsBytes = canvasToDDS(canvas, format);
  const blob = new Blob([ddsBytes.buffer as ArrayBuffer], { type: "image/vnd-ms.dds" });
  const finalFilename = filename.toLowerCase().endsWith(".dds") ? filename : `${filename}.dds`;
  downloadBlob(blob, finalFilename);
}

/**
 * Export canvas directly as high-res PNG file
 */
export function exportCanvasAsPNG(canvas: HTMLCanvasElement, filename: string): void {
  canvas.toBlob((blob) => {
    if (!blob) return;
    const finalFilename = filename.toLowerCase().endsWith(".png") ? filename : `${filename}.png`;
    downloadBlob(blob, finalFilename);
  }, "image/png");
}


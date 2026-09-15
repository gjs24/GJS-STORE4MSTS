/**
 * DirectDraw Surface (DDS) format encoder for DirectX & Train Simulators
 * Supports 32-bit BGRA uncompressed (A8R8G8B8) and DXT5 (BC3) block compression.
 */

export type DDSFormat = 'bgra8' | 'dxt5';

export interface DDSOptions {
  format?: DDSFormat;
}

/**
 * Creates standard 128-byte DDS header
 */
function createDDSHeader(width: number, height: number, format: DDSFormat): Uint8Array {
  const header = new Uint8Array(128);
  const view = new DataView(header.buffer);

  // 'DDS ' magic number
  view.setUint32(0, 0x20534444, true);

  // dwSize (struct size = 124)
  view.setUint32(4, 124, true);

  // dwFlags: DDSD_CAPS (0x1) | DDSD_HEIGHT (0x2) | DDSD_WIDTH (0x4) | DDSD_PIXELFORMAT (0x1000)
  let flags = 0x1 | 0x2 | 0x4 | 0x1000;
  if (format === 'bgra8') {
    flags |= 0x8; // DDSD_PITCH
    view.setUint32(20, width * 4, true); // dwPitchOrLinearSize
  } else {
    flags |= 0x80000; // DDSD_LINEARSIZE
    view.setUint32(20, Math.max(1, Math.floor((width + 3) / 4)) * 16, true);
  }
  view.setUint32(8, flags, true);

  view.setUint32(12, height, true); // dwHeight
  view.setUint32(16, width, true);  // dwWidth
  view.setUint32(24, 0, true);       // dwDepth
  view.setUint32(28, 1, true);       // dwMipMapCount (1 mip level)

  // ddspf (DDS_PIXELFORMAT, 32 bytes at offset 76)
  view.setUint32(76, 32, true); // ddspf.dwSize

  if (format === 'dxt5') {
    view.setUint32(80, 0x4, true); // DDPF_FOURCC
    view.setUint32(84, 0x35545844, true); // 'DXT5'
  } else {
    // Uncompressed 32-bit BGRA (A8R8G8B8)
    view.setUint32(80, 0x41, true); // DDPF_RGB | DDPF_ALPHAPIXELS
    view.setUint32(84, 0, true);    // dwFourCC = 0
    view.setUint32(88, 32, true);   // dwRGBBitCount = 32
    view.setUint32(92, 0x00FF0000, true); // R mask
    view.setUint32(96, 0x0000FF00, true); // G mask
    view.setUint32(100, 0x000000FF, true); // B mask
    view.setUint32(104, 0xFF000000, true); // A mask
  }

  // dwCaps: DDSCAPS_TEXTURE (0x1000)
  view.setUint32(108, 0x1000, true);

  return header;
}

/**
 * Converts ImageData (RGBA) to 32-bit uncompressed BGRA DDS byte array
 */
function encodeBGRA8(imageData: ImageData): Uint8Array {
  const { width, height, data } = imageData;
  const header = createDDSHeader(width, height, 'bgra8');
  const totalPixels = width * height;
  const out = new Uint8Array(128 + totalPixels * 4);

  // Copy header
  out.set(header, 0);

  // Convert RGBA -> BGRA
  let srcIdx = 0;
  let dstIdx = 128;
  for (let i = 0; i < totalPixels; i++) {
    const r = data[srcIdx];
    const g = data[srcIdx + 1];
    const b = data[srcIdx + 2];
    const a = data[srcIdx + 3];

    out[dstIdx] = b;
    out[dstIdx + 1] = g;
    out[dstIdx + 2] = r;
    out[dstIdx + 3] = a;

    srcIdx += 4;
    dstIdx += 4;
  }

  return out;
}

/**
 * RGB888 to RGB565 helper
 */
function colorTo565(r: number, g: number, b: number): number {
  return ((r >> 3) << 11) | ((g >> 2) << 5) | (b >> 3);
}

/**
 * Encodes ImageData to DXT5 compressed DDS byte array
 */
function encodeDXT5(imageData: ImageData): Uint8Array {
  const { width, height, data } = imageData;
  const header = createDDSHeader(width, height, 'dxt5');
  const blocksX = Math.ceil(width / 4);
  const blocksY = Math.ceil(height / 4);
  const dxtDataSize = blocksX * blocksY * 16;
  const out = new Uint8Array(128 + dxtDataSize);

  out.set(header, 0);
  let outOffset = 128;

  for (let by = 0; by < blocksY; by++) {
    for (let bx = 0; bx < blocksX; bx++) {
      // Gather 4x4 block pixels
      const blockAlphas: number[] = [];
      const blockColors: { r: number; g: number; b: number }[] = [];

      let minA = 255;
      let maxA = 0;

      for (let py = 0; py < 4; py++) {
        const y = Math.min(height - 1, by * 4 + py);
        for (let px = 0; px < 4; px++) {
          const x = Math.min(width - 1, bx * 4 + px);
          const idx = (y * width + x) * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          const a = data[idx + 3];

          blockAlphas.push(a);
          blockColors.push({ r, g, b });

          if (a < minA) minA = a;
          if (a > maxA) maxA = a;
        }
      }

      // 1. Alpha block (8 bytes)
      out[outOffset] = maxA;
      out[outOffset + 1] = minA;

      // 6 interpolated alpha levels
      const alphaTable: number[] = [maxA, minA];
      for (let i = 1; i <= 6; i++) {
        alphaTable.push(Math.round(((7 - i) * maxA + i * minA) / 7));
      }

      // 48 bits of alpha indices (3 bits per pixel)
      let alphaIndices = 0n;
      for (let i = 0; i < 16; i++) {
        const a = blockAlphas[i];
        let bestDist = 999999;
        let bestIdx = 0;
        for (let j = 0; j < 8; j++) {
          const dist = Math.abs(a - alphaTable[j]);
          if (dist < bestDist) {
            bestDist = dist;
            bestIdx = j;
          }
        }
        alphaIndices |= BigInt(bestIdx) << BigInt(i * 3);
      }

      for (let b = 0; b < 6; b++) {
        out[outOffset + 2 + b] = Number((alphaIndices >> BigInt(b * 8)) & 0xffn);
      }

      // 2. Color block (8 bytes: 2x 16-bit colors + 16x 2-bit indices)
      let minR = 255, maxR = 0, minG = 255, maxG = 0, minB = 255, maxB = 0;
      for (const c of blockColors) {
        if (c.r < minR) minR = c.r;
        if (c.r > maxR) maxR = c.r;
        if (c.g < minG) minG = c.g;
        if (c.g > maxG) maxG = c.g;
        if (c.b < minB) minB = c.b;
        if (c.b > maxB) maxB = c.b;
      }

      const c0 = colorTo565(maxR, maxG, maxB);
      const c1 = colorTo565(minR, minG, minB);

      out[outOffset + 8] = c0 & 0xff;
      out[outOffset + 9] = (c0 >> 8) & 0xff;
      out[outOffset + 10] = c1 & 0xff;
      out[outOffset + 11] = (c1 >> 8) & 0xff;

      // Color indices
      let colorIndices = 0;
      for (let i = 0; i < 16; i++) {
        const c = blockColors[i];
        const dist0 = Math.abs(c.r - maxR) + Math.abs(c.g - maxG) + Math.abs(c.b - maxB);
        const dist1 = Math.abs(c.r - minR) + Math.abs(c.g - minG) + Math.abs(c.b - minB);
        const code = dist0 < dist1 ? 0 : 1;
        colorIndices |= code << (i * 2);
      }

      out[outOffset + 12] = colorIndices & 0xff;
      out[outOffset + 13] = (colorIndices >> 8) & 0xff;
      out[outOffset + 14] = (colorIndices >> 16) & 0xff;
      out[outOffset + 15] = (colorIndices >> 24) & 0xff;

      outOffset += 16;
    }
  }

  return out;
}

/**
 * Main export function: Converts HTMLCanvasElement to a DDS Blob and triggers download
 */
export function canvasToDDS(
  canvas: HTMLCanvasElement,
  filename: string,
  options: DDSOptions = {}
): void {
  const format = options.format || 'bgra8';
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context not available');

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const ddsBytes = format === 'dxt5' ? encodeDXT5(imageData) : encodeBGRA8(imageData);

  const blob = new Blob([ddsBytes.buffer as ArrayBuffer], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.dds') ? filename : `${filename}.dds`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}


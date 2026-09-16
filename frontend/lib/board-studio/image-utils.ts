/**
 * Google Drive and External Image Utilities for Railway Board Studio
 * Converts Google Drive sharing links to direct high-speed CDN URLs (0 KB database space).
 */

export interface ImageUrlInfo {
  url: string;
  isGoogleDrive: boolean;
  fileId?: string;
  originalUrl: string;
}

/**
 * Converts a Google Drive share link into a direct high-resolution CDN URL.
 * Google's `lh3.googleusercontent.com/d/{fileId}` serves direct image bytes with CORS enabled,
 * allowing seamless rendering to HTML5 Canvas and DDS export without server storage overhead.
 */
export function convertGoogleDriveUrl(rawUrl: string): ImageUrlInfo {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { url: '', isGoogleDrive: false, originalUrl: '' };
  }

  const trimmed = rawUrl.trim();

  // Check for Google Drive formats
  if (
    trimmed.includes('drive.google.com') ||
    trimmed.includes('docs.google.com') ||
    trimmed.includes('googleusercontent.com')
  ) {
    // 1. Match /file/d/{FILE_ID}
    const fileDMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (fileDMatch && fileDMatch[1]) {
      const fileId = fileDMatch[1];
      return {
        url: `https://lh3.googleusercontent.com/d/${fileId}`,
        isGoogleDrive: true,
        fileId,
        originalUrl: trimmed
      };
    }

    // 2. Match ?id={FILE_ID} or &id={FILE_ID}
    const idMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (idMatch && idMatch[1]) {
      const fileId = idMatch[1];
      return {
        url: `https://lh3.googleusercontent.com/d/${fileId}`,
        isGoogleDrive: true,
        fileId,
        originalUrl: trimmed
      };
    }

    // 3. Match /d/{FILE_ID} directly on googleusercontent.com
    const lh3Match = trimmed.match(/googleusercontent\.com\/d\/([a-zA-Z0-9_-]+)/);
    if (lh3Match && lh3Match[1]) {
      const fileId = lh3Match[1];
      return {
        url: `https://lh3.googleusercontent.com/d/${fileId}`,
        isGoogleDrive: true,
        fileId,
        originalUrl: trimmed
      };
    }
  }

  // Regular URL (Cloudinary, Imgur, Postimages, direct HTTPS)
  return {
    url: trimmed,
    isGoogleDrive: false,
    originalUrl: trimmed
  };
}

/**
 * Returns true if the URL is a base64 Data URI
 */
export function isBase64DataUri(url?: string): boolean {
  if (!url) return false;
  return url.startsWith('data:image/');
}

/**
 * Returns estimated size of base64 string in KB
 */
export function getBase64SizeKb(dataUri: string): number {
  if (!dataUri) return 0;
  return Math.round((dataUri.length * 3) / 4 / 1024);
}


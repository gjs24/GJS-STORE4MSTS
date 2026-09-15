// Font Manager for GJS Railway Board Studio
// Manages built-in railway fonts, user-uploaded TTF/OTF fonts, and Google web fonts.

export interface CustomFont {
  name: string;
  dataUrl?: string; // Base64 TTF/OTF data URL
  isGoogleFont?: boolean;
}

const STORAGE_KEY = 'gjs_railway_custom_fonts_v1';

export const BUILT_IN_FONTS = [
  { label: 'VT323 (Authentic LED Matrix)', value: "'VT323', 'DotGothic16', monospace" },
  { label: 'DotGothic16 (LED Dot Font)', value: "'DotGothic16', monospace" },
  { label: 'Share Tech Mono (Digital Monospace)', value: "'Share Tech Mono', monospace" },
  { label: 'Chakra Petch (Futuristic / High-Tech)', value: "'Chakra Petch', sans-serif" },
  { label: 'Arial Black (Heavy Railway)', value: 'Arial Black, sans-serif' },
  { label: 'Roboto Condensed (Classic Board)', value: "'Roboto Condensed', Arial, sans-serif" },
  { label: 'Nirmala UI (Hindi / Indian Scripts)', value: "'Nirmala UI', Mangal, Arial" },
  { label: 'Impact (Heavy Bold)', value: 'Impact, sans-serif' }
];

export const fontManager = {
  getCustomFonts(): CustomFont[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  getAllFontOptions(): Array<{ label: string; value: string; isCustom?: boolean }> {
    const custom = this.getCustomFonts();
    const customOptions = custom.map((f) => ({
      label: `⭐ ${f.name} (Custom Font)`,
      value: `'${f.name}', sans-serif`,
      isCustom: true
    }));
    return [...BUILT_IN_FONTS, ...customOptions];
  },

  applyCustomFontsToDOM(): void {
    if (typeof document === 'undefined') return;
    const customFonts = this.getCustomFonts();
    if (customFonts.length === 0) return;

    let styleTag = document.getElementById('gjs-custom-fonts-style') as HTMLStyleElement | null;
    if (!styleTag) {
      styleTag = document.createElement('style');
      styleTag.id = 'gjs-custom-fonts-style';
      document.head.appendChild(styleTag);
    }

    let css = '';
    for (const font of customFonts) {
      if (font.dataUrl) {
        css += `
          @font-face {
            font-family: '${font.name}';
            src: url('${font.dataUrl}');
            font-display: swap;
          }
        `;
      } else if (font.isGoogleFont) {
        const linkId = `gjs-google-font-${font.name.replace(/\s+/g, '-').toLowerCase()}`;
        if (!document.getElementById(linkId)) {
          const link = document.createElement('link');
          link.id = linkId;
          link.rel = 'stylesheet';
          link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(font.name)}:wght@400;700;800;900&display=swap`;
          document.head.appendChild(link);
        }
      }
    }
    styleTag.textContent = css;
  },

  addUploadedFont(name: string, dataUrl: string): CustomFont {
    const cleanName = name.replace(/[^a-zA-Z0-9 _-]/g, '').trim() || 'Custom Railway Font';
    const fonts = this.getCustomFonts().filter((f) => f.name.toLowerCase() !== cleanName.toLowerCase());
    const newFont: CustomFont = { name: cleanName, dataUrl };
    fonts.push(newFont);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(fonts));
    }
    this.applyCustomFontsToDOM();
    return newFont;
  },

  addGoogleFont(name: string): CustomFont {
    const cleanName = name.trim();
    const fonts = this.getCustomFonts().filter((f) => f.name.toLowerCase() !== cleanName.toLowerCase());
    const newFont: CustomFont = { name: cleanName, isGoogleFont: true };
    fonts.push(newFont);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(fonts));
    }
    this.applyCustomFontsToDOM();
    return newFont;
  },

  deleteCustomFont(name: string): void {
    const fonts = this.getCustomFonts().filter((f) => f.name !== name);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(fonts));
    }
    this.applyCustomFontsToDOM();
  }
};


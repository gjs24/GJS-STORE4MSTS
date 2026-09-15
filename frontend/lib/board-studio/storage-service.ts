import { BoardTemplate, SavedUserBoard } from './types';
import { DEFAULT_TEMPLATES } from './default-templates';
import { API_URL, getStoredUser } from '@/lib/api';

const TEMPLATES_STORAGE_KEY = 'gjs_railway_templates_v3';
const USER_BOARDS_STORAGE_KEY = 'gjs_user_saved_boards_v3';
const DELETED_IDS_STORAGE_KEY = 'gjs_deleted_template_ids_v3';

function getDeletedIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(DELETED_IDS_STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function saveDeletedIds(ids: Set<string>): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(DELETED_IDS_STORAGE_KEY, JSON.stringify(Array.from(ids)));
  } catch (err) {
    console.warn('Failed to save deleted template IDs:', err);
  }
}

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('accessToken');
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export const storageService = {
  // Get all templates (for admin)
  getAllTemplates(): BoardTemplate[] {
    if (typeof window === 'undefined') return DEFAULT_TEMPLATES;
    const deletedIds = getDeletedIds();
    try {
      const stored = localStorage.getItem(TEMPLATES_STORAGE_KEY);
      if (stored) {
        const parsed: BoardTemplate[] = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          const ids = new Set(parsed.map((t) => t.id));
          const missingDefaults = DEFAULT_TEMPLATES.filter((d) => !ids.has(d.id) && !deletedIds.has(d.id));
          
          const synced = parsed.map((tpl) => {
            const def = DEFAULT_TEMPLATES.find((d) => d.id === tpl.id);
            if (def && tpl.isPaid === undefined && def.isPaid !== undefined) {
              return { ...tpl, isPaid: def.isPaid, price: def.price, currency: def.currency };
            }
            return tpl;
          });

          if (missingDefaults.length > 0) {
            const merged = [...missingDefaults, ...synced];
            this.saveAllTemplates(merged);
            return merged;
          }
          return synced;
        }
      }
    } catch (err) {
      console.warn('Error reading templates from localStorage, using defaults:', err);
    }
    const initial = DEFAULT_TEMPLATES.filter(d => !deletedIds.has(d.id));
    this.saveAllTemplates(initial);
    return initial;
  },

  // Get only published templates (for normal users)
  getPublishedTemplates(): BoardTemplate[] {
    const all = this.getAllTemplates();
    return all.filter(t => t.published !== false);
  },

  // Get single template
  getTemplateById(id: string): BoardTemplate | undefined {
    return this.getAllTemplates().find(t => t.id === id);
  },

  // Save all templates list
  saveAllTemplates(templates: BoardTemplate[]): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(templates));
    } catch (err) {
      console.error('Failed to save templates to localStorage:', err);
    }
  },

  // Save or update a single template (Admin only)
  saveTemplate(template: BoardTemplate): BoardTemplate {
    const templates = this.getAllTemplates();
    const index = templates.findIndex(t => t.id === template.id);
    const updatedTemplate = {
      ...template,
      updatedAt: new Date().toISOString()
    };

    if (index >= 0) {
      templates[index] = updatedTemplate;
    } else {
      templates.unshift(updatedTemplate);
    }

    this.saveAllTemplates(templates);
    return updatedTemplate;
  },

  // Publish / Unpublish template (Admin only)
  setPublishedStatus(id: string, published: boolean): void {
    const templates = this.getAllTemplates();
    const target = templates.find(t => t.id === id);
    if (target) {
      target.published = published;
      target.updatedAt = new Date().toISOString();
      this.saveAllTemplates(templates);
    }
  },

  // Delete template (Admin only)
  deleteTemplate(id: string): boolean {
    const deletedIds = getDeletedIds();
    deletedIds.add(id);
    saveDeletedIds(deletedIds);

    const templates = this.getAllTemplates();
    const filtered = templates.filter(t => t.id !== id);
    if (filtered.length !== templates.length) {
      this.saveAllTemplates(filtered);
      return true;
    }
    return false;
  },

  // Reset to original factory defaults
  resetToDefaults(): BoardTemplate[] {
    saveDeletedIds(new Set());
    this.saveAllTemplates(DEFAULT_TEMPLATES);
    return DEFAULT_TEMPLATES;
  },

  // User saved customized boards
  getUserBoards(): SavedUserBoard[] {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(USER_BOARDS_STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.warn('Error reading saved user boards:', e);
    }
    return [];
  },

  saveUserBoard(board: SavedUserBoard): void {
    if (typeof window === 'undefined') return;
    try {
      const boards = this.getUserBoards();
      const idx = boards.findIndex(b => b.id === board.id);
      if (idx >= 0) {
        boards[idx] = board;
      } else {
        boards.unshift(board);
      }
      localStorage.setItem(USER_BOARDS_STORAGE_KEY, JSON.stringify(boards));
    } catch (e) {
      console.warn('Error saving custom board:', e);
    }
  },

  deleteUserBoard(id: string): void {
    if (typeof window === 'undefined') return;
    try {
      const boards = this.getUserBoards().filter(b => b.id !== id);
      localStorage.setItem(USER_BOARDS_STORAGE_KEY, JSON.stringify(boards));
    } catch (e) {
      console.warn('Error deleting custom board:', e);
    }
  },

  // Backend Sync helpers
  async fetchCloudTemplates(): Promise<BoardTemplate[]> {
    try {
      const res = await fetch(`${API_URL}/board-templates/`, { headers: getAuthHeaders() });
      if (!res.ok) return [];
      const data = await res.json();
      const results = Array.isArray(data) ? data : data.results || [];
      if (results.length > 0) {
        return results.map((item: any) => ({
          id: item.id,
          name: item.name,
          category: item.category || 'LED Texture Sheet',
          description: item.description || '',
          aspectRatio: item.aspectRatio || `${item.base_width || 1024}:${item.base_height || 1024}`,
          baseWidth: item.base_width || 1024,
          baseHeight: item.base_height || 1024,
          backgroundColor: item.backgroundColor || '#0c0f12',
          backgroundSecondaryColor: item.backgroundSecondaryColor,
          backgroundType: item.backgroundType || 'transparent',
          backgroundImageUrl: item.background_image || item.background_image_url || item.backgroundImageUrl,
          targetTextureName: item.target_texture_name || item.targetTextureName || '',
          showWatermark: item.show_watermark !== undefined ? item.show_watermark : (item.showWatermark !== undefined ? item.showWatermark : true),
          watermarkText: item.watermark_text || item.watermarkText || 'Created with GJS Railway Board Studio • https://gjs-store-4-msts.vercel.app',
          isTextureSheet: item.isTextureSheet !== undefined ? item.isTextureSheet : true,
          textureResolution: item.textureResolution || 1024,
          allowUserCustomBackground: item.allowUserCustomBackground || false,
          borderColor: item.borderColor || '#33404d',
          borderWidth: item.borderWidth || 0,
          borderRadius: item.borderRadius || 0,
          innerBorder: item.innerBorder || false,
          innerBorderColor: item.innerBorderColor,
          innerBorderPadding: item.innerBorderPadding,
          showBolts: item.showBolts || false,
          fixedGraphics: (item.fixed_graphics || item.fixedGraphics || []).map((g: any) => ({
            ...g,
            rotation: g.rotation || 0,
            scale: g.scale !== undefined ? g.scale : 1.0,
            opacity: g.opacity !== undefined ? g.opacity : 1.0
          })),
          fields: (item.fields || []).map((f: any) => ({
            id: f.id,
            label: f.label || f.id,
            type: f.type || 'text',
            defaultValue: f.defaultValue || f.default_text || '',
            placeholder: f.placeholder || '',
            x: f.x !== undefined ? f.x : 50,
            y: f.y !== undefined ? f.y : 50,
            width: f.width !== undefined ? f.width : 50,
            height: f.height !== undefined ? f.height : 10,
            rotation: f.rotation || 0,
            scale: f.scale !== undefined ? f.scale : 1.0,
            allowUserEdit: f.allowUserEdit !== undefined ? f.allowUserEdit : true,
            hiddenFromUser: f.hiddenFromUser || false,
            fontFamily: f.fontFamily || f.font || "'VT323', monospace",
            fontSize: f.fontSize || f.font_size || 48,
            fontWeight: f.fontWeight || 700,
            fontStyle: f.fontStyle || 'normal',
            color: f.color || '#ff9f1c',
            align: f.align || 'center',
            textTransform: f.textTransform || 'uppercase',
            letterSpacing: f.letterSpacing || 4,
            ledGlow: f.ledGlow !== undefined ? f.ledGlow : true,
            glowColor: f.glowColor || f.glow_color || '#ff6200',
            glowRadius: f.glowRadius || 12,
            isDotMatrix: f.isDotMatrix !== undefined ? f.isDotMatrix : true
          })),
          published: item.published !== false,
          isPaid: item.is_paid || item.isPaid || false,
          price: Number(item.price || 0),
          currency: item.currency || 'INR',
          isUnlocked: item.is_unlocked !== undefined ? item.is_unlocked : (!item.is_paid),
          canCustomize: item.can_customize !== undefined ? item.can_customize : (!item.is_paid),
          unlockedViaAsset: item.unlocked_via_asset || null,
          bundledWithAssets: item.bundled_with_assets || [],
          createdAt: item.created_at || new Date().toISOString(),
          updatedAt: item.updated_at || new Date().toISOString(),
          author: item.author || 'Admin'
        }));
      }
    } catch (e) {
      console.warn('Could not fetch cloud board templates, using local fallback:', e);
    }
    return [];
  },

  // Push template create/update to Django API
  async syncCloudTemplate(template: BoardTemplate): Promise<boolean> {
    try {
      const payload = {
        id: template.id,
        name: template.name,
        category: template.category,
        description: template.description || '',
        base_width: template.baseWidth || 1024,
        base_height: template.baseHeight || 1024,
        background_image_url: template.backgroundImageUrl || '',
        target_texture_name: template.targetTextureName || '',
        is_paid: !!template.isPaid,
        price: template.price || 0,
        published: template.published !== false,
        fields: template.fields || [],
        fixed_graphics: template.fixedGraphics || []
      };

      const checkRes = await fetch(`${API_URL}/board-templates/${template.id}/`, {
        headers: getAuthHeaders()
      });

      if (checkRes.ok) {
        const res = await fetch(`${API_URL}/board-templates/${template.id}/`, {
          method: 'PATCH',
          headers: getAuthHeaders(),
          body: JSON.stringify(payload)
        });
        return res.ok;
      } else {
        const res = await fetch(`${API_URL}/board-templates/`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(payload)
        });
        return res.ok;
      }
    } catch (err) {
      console.warn('Failed to sync cloud board template:', err);
      return false;
    }
  },

  // Delete template from Django API
  async deleteCloudTemplate(id: string): Promise<boolean> {
    try {
      const res = await fetch(`${API_URL}/board-templates/${id}/`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      return res.ok;
    } catch (err) {
      console.warn('Failed to delete cloud board template:', err);
      return false;
    }
  }
};


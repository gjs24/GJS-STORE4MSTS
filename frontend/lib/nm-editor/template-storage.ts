// Template Storage, Packaging, and Import/Export Service for GJS PRO NM EDITOR
import { AtlasTemplate } from './types';

const INSTALLED_TEMPLATES_KEY = 'gjs_user_installed_templates';

export const TemplateStorage = {
  // Get all user-installed / custom templates from localStorage
  getInstalledTemplates(): AtlasTemplate[] {
    if (typeof window === 'undefined') return [];
    try {
      const data = localStorage.getItem(INSTALLED_TEMPLATES_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Error loading installed templates', e);
      return [];
    }
  },

  // Save a new custom template
  saveTemplate(templateData: AtlasTemplate) {
    if (typeof window === 'undefined') return { success: false, error: 'No browser window' };
    try {
      const current = this.getInstalledTemplates();
      const existingIdx = current.findIndex(t => t.id === templateData.id);
      if (existingIdx >= 0) {
        current[existingIdx] = templateData;
      } else {
        current.push(templateData);
      }
      localStorage.setItem(INSTALLED_TEMPLATES_KEY, JSON.stringify(current));
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  // Export template as a downloadable .gjs-template package file
  exportTemplateFile(templatePackage: AtlasTemplate) {
    if (typeof window === 'undefined') return;
    const jsonStr = JSON.stringify(templatePackage, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const safeName = (templatePackage.name || 'Custom_Template').replace(/[^a-zA-Z0-9_-]/g, '_');
    a.download = `${safeName}.gjs-template`;
    a.href = url;
    a.click();
    URL.revokeObjectURL(url);
  },

  // Parse and validate an imported .gjs-template file
  parseTemplateFile(fileContent: string): { success: boolean; template?: AtlasTemplate; error?: string } {
    try {
      const data = JSON.parse(fileContent);
      if (!data.id || !data.name || !data.defaultParts) {
        throw new Error('Invalid GJS Template package format. Missing required layout data.');
      }
      return { success: true, template: data };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  // Delete an installed template
  deleteTemplate(templateId: string) {
    if (typeof window === 'undefined') return { success: false, error: 'No browser window' };
    try {
      const current = this.getInstalledTemplates();
      const filtered = current.filter(t => t.id !== templateId);
      localStorage.setItem(INSTALLED_TEMPLATES_KEY, JSON.stringify(filtered));
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }
};


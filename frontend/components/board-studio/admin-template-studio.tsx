'use client';

import React, { useState, useRef } from 'react';
import { BoardTemplate, EditableField, BoardCategory, FixedGraphicElement, BoardVariation } from '@/lib/board-studio/types';
import { BoardCanvas } from './board-canvas';
import { CustomFontModal } from './custom-font-modal';
import { fontManager } from '@/lib/board-studio/font-manager';
import { storageService } from '@/lib/board-studio/storage-service';
import {
  Plus,
  Trash2,
  Globe,
  Eye,
  EyeOff,
  Move,
  Type,
  Palette,
  CheckCircle,
  Copy,
  Sliders,
  Layers,
  Upload,
  Sparkles,
  Image as ImageIcon,
  Lock,
  Unlock,
  Edit3,
  Check,
  X,
  FileText,
  AlertTriangle,
  Tag,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RefreshCw
} from 'lucide-react';

interface AdminTemplateStudioProps {
  templates: BoardTemplate[];
  activeTemplate: BoardTemplate;
  onSaveTemplate: (template: BoardTemplate) => void;
  onSelectTemplate: (template: BoardTemplate) => void;
  onDeleteTemplate: (id: string) => void;
  onCreateNewTemplate: () => void;
}

export const AdminTemplateStudio: React.FC<AdminTemplateStudioProps> = ({
  templates,
  activeTemplate,
  onSaveTemplate,
  onSelectTemplate,
  onDeleteTemplate,
  onCreateNewTemplate
}) => {
  const [template, setTemplate] = useState<BoardTemplate>(activeTemplate);
  const [showCustomFontModal, setShowCustomFontModal] = useState<boolean>(false);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(
    activeTemplate.fields[0]?.id || null
  );
  const [activeTab, setActiveTab] = useState<'details' | 'fields' | 'board' | 'fixed' | 'variations'>('details');
  const [saveToast, setSaveToast] = useState<string | null>(null);

  // Rename states
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameText, setRenameText] = useState(activeTemplate.name);

  // Zoom controls state
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);

  // Variations & Background Upload states
  const [selectedVariationId, setSelectedVariationId] = useState<string | null>(null);
  const [editingVariationOnCanvas, setEditingVariationOnCanvas] = useState<string | null>(null);
  const [isUploadingBg, setIsUploadingBg] = useState(false);
  const [uploadingForVariationId, setUploadingForVariationId] = useState<string | null>(null);

  const bgFileInputRef = useRef<HTMLInputElement>(null);
  const slotImageInputRef = useRef<HTMLInputElement>(null);
  const stampImageInputRef = useRef<HTMLInputElement>(null);
  const variationBgInputRef = useRef<HTMLInputElement>(null);
  const [selectedStampId, setSelectedStampId] = useState<string | null>(
    activeTemplate.fixedGraphics[0]?.id || null
  );

  // Keep local template in sync when parent activeTemplate changes
  React.useEffect(() => {
    setTemplate(activeTemplate);
    setRenameText(activeTemplate.name);
    setIsRenaming(false);
    setZoomLevel(1.0);
    if (activeTemplate.fields.length > 0) {
      setSelectedFieldId(activeTemplate.fields[0].id);
    }
    if (activeTemplate.fixedGraphics.length > 0) {
      setSelectedStampId(activeTemplate.fixedGraphics[0].id);
    }
  }, [activeTemplate.id]);

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(3.0, Number((prev + 0.25).toFixed(2))));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(0.25, Number((prev - 0.25).toFixed(2))));
  const handleZoomReset = () => setZoomLevel(1.0);
  const handleZoomSet = (val: number) => setZoomLevel(val);

  const updateTemplate = (updates: Partial<BoardTemplate>) => {
    setTemplate((prev) => {
      const next = { ...prev, ...updates, updatedAt: new Date().toISOString() };
      onSaveTemplate(next);
      return next;
    });
  };

  const handlePublishToggle = (target?: BoardTemplate) => {
    const tpl = target || template;
    const nextPublished = !tpl.published;
    const updated: BoardTemplate = {
      ...tpl,
      published: nextPublished,
      updatedAt: new Date().toISOString()
    };
    if (tpl.id === template.id) {
      setTemplate(updated);
    }
    onSaveTemplate(updated);
    setSaveToast(
      nextPublished
        ? `"${tpl.name}" is now VISIBLE to users on site!`
        : `"${tpl.name}" is now HIDDEN from users (Draft).`
    );
    setTimeout(() => setSaveToast(null), 3000);
  };

  const handleSaveOnly = () => {
    const updated = {
      ...template,
      updatedAt: new Date().toISOString()
    };
    onSaveTemplate(updated);
    setSaveToast('Template saved successfully!');
    setTimeout(() => setSaveToast(null), 3000);
  };

  const handleSaveRename = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = renameText.trim();
    if (!trimmed) return;
    const updated = {
      ...template,
      name: trimmed,
      updatedAt: new Date().toISOString()
    };
    setTemplate(updated);
    onSaveTemplate(updated);
    setIsRenaming(false);
    setSaveToast(`Template renamed to "${trimmed}"`);
    setTimeout(() => setSaveToast(null), 3000);
  };

  const handleDuplicateTemplate = () => {
    const duplicated: BoardTemplate = {
      ...template,
      id: 'tpl_' + Date.now(),
      name: `${template.name} (Copy)`,
      published: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    onSaveTemplate(duplicated);
    onSelectTemplate(duplicated);
    setSaveToast('Template duplicated as new draft.');
    setTimeout(() => setSaveToast(null), 3000);
  };

  const handleDeleteActiveTemplate = () => {
    if (
      window.confirm(
        `Are you sure you want to permanently delete template "${template.name}"?\n\nThis will remove it from the online website and database.`
      )
    ) {
      onDeleteTemplate(template.id);
    }
  };

  const handleDeleteCatalogCard = (tpl: BoardTemplate, e: React.MouseEvent) => {
    e.stopPropagation();
    if (
      window.confirm(
        `Are you sure you want to delete template "${tpl.name}"?`
      )
    ) {
      onDeleteTemplate(tpl.id);
    }
  };

  const handleRenameCatalogCard = (tpl: BoardTemplate, e: React.MouseEvent) => {
    e.stopPropagation();
    const newName = window.prompt(`Enter new name for template:`, tpl.name);
    if (newName && newName.trim() && newName.trim() !== tpl.name) {
      const updated = {
        ...tpl,
        name: newName.trim(),
        updatedAt: new Date().toISOString()
      };
      if (tpl.id === template.id) {
        setTemplate(updated);
        setRenameText(newName.trim());
      }
      onSaveTemplate(updated);
      setSaveToast(`Renamed to "${newName.trim()}"`);
      setTimeout(() => setSaveToast(null), 3000);
    }
  };

  const handleToggleCatalogVisibility = (tpl: BoardTemplate, e: React.MouseEvent) => {
    e.stopPropagation();
    handlePublishToggle(tpl);
  };

  // Image Upload handler for custom background texture map (uploads to Django media storage)
  const handleBgImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingBg(true);
    setSaveToast('Uploading background texture to server...');

    try {
      const uploadedUrl = await storageService.uploadBoardImage(file);
      const urlToUse = uploadedUrl || '';

      const img = new Image();
      img.onload = () => {
        updateTemplate({
          backgroundImageUrl: urlToUse || img.src,
          backgroundType: 'transparent',
          baseWidth: img.naturalWidth || 1024,
          baseHeight: img.naturalHeight || 1024,
          isTextureSheet: img.naturalWidth === img.naturalHeight,
          textureResolution: img.naturalWidth
        });
        setIsUploadingBg(false);
        setSaveToast(`Background texture saved to server! (${img.naturalWidth}×${img.naturalHeight}px)`);
        setTimeout(() => setSaveToast(null), 3000);
      };
      img.onerror = () => {
        updateTemplate({
          backgroundImageUrl: urlToUse,
          backgroundType: 'transparent'
        });
        setIsUploadingBg(false);
        setSaveToast('Background texture saved to server!');
        setTimeout(() => setSaveToast(null), 3000);
      };
      img.src = urlToUse;
    } catch (err) {
      console.warn('Server upload failed, falling back to data URL:', err);
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        const img = new Image();
        img.onload = () => {
          updateTemplate({
            backgroundImageUrl: dataUrl,
            backgroundType: 'transparent',
            baseWidth: img.naturalWidth || 1024,
            baseHeight: img.naturalHeight || 1024,
            isTextureSheet: img.naturalWidth === img.naturalHeight,
            textureResolution: img.naturalWidth
          });
          setIsUploadingBg(false);
          setSaveToast(`Background texture loaded locally (${img.naturalWidth}×${img.naturalHeight}px)`);
          setTimeout(() => setSaveToast(null), 3000);
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
    }
  };

  // Upload handler for variation background
  const triggerVariationBgUpload = (varId: string) => {
    setUploadingForVariationId(varId);
    variationBgInputRef.current?.click();
  };

  const handleVariationBgFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadingForVariationId) return;

    setSaveToast('Uploading variation background...');
    try {
      const uploadedUrl = await storageService.uploadBoardImage(file);
      handleUpdateVariation(uploadingForVariationId, { backgroundImageUrl: uploadedUrl });
      setSaveToast('Variation background texture uploaded & saved!');
      setTimeout(() => setSaveToast(null), 3000);
    } catch (err) {
      console.warn('Failed variation image upload, falling back to data URL:', err);
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        handleUpdateVariation(uploadingForVariationId, { backgroundImageUrl: dataUrl });
      };
      reader.readAsDataURL(file);
    }
  };

  // Variations CRUD & Canvas synchronization
  const handleAddVariation = () => {
    const nextNum = (template.variations?.length || 0) + 1;
    const newVariation: BoardVariation = {
      id: `var_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: `Variation ${nextNum}`,
      description: 'Alternate theme or colorway (e.g. Ice Blue Matrix, Night Mode, Stencil)',
      targetTextureName: template.targetTextureName,
      backgroundImageUrl: template.backgroundImageUrl,
      backgroundColor: template.backgroundColor,
      fields: template.fields.map((f) => ({ ...f })),
      fixedGraphics: template.fixedGraphics ? [...template.fixedGraphics] : []
    };
    const updated = [...(template.variations || []), newVariation];
    updateTemplate({ variations: updated });
    setSelectedVariationId(newVariation.id);
    setSaveToast(`Added new variation: "${newVariation.name}"`);
    setTimeout(() => setSaveToast(null), 2500);
  };

  const handleSaveCurrentCanvasAsNewVariation = () => {
    const defaultName = `Variation ${(template.variations?.length || 0) + 1}`;
    const name = window.prompt('Name this new style variation (e.g. "Amrit Bharat Saffron LED" or "Ice Blue Matrix"):', defaultName);
    if (!name || !name.trim()) return;

    const newVariation: BoardVariation = {
      id: `var_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: name.trim(),
      description: 'Custom style & layout captured from current board canvas',
      targetTextureName: template.targetTextureName,
      backgroundImageUrl: template.backgroundImageUrl,
      backgroundColor: template.backgroundColor,
      fields: template.fields.map((f) => ({ ...f })),
      fixedGraphics: template.fixedGraphics ? [...template.fixedGraphics] : []
    };

    const updated = [...(template.variations || []), newVariation];
    updateTemplate({ variations: updated });
    setSelectedVariationId(newVariation.id);
    setSaveToast(`Snapshot saved as variation: "${newVariation.name}"!`);
    setTimeout(() => setSaveToast(null), 3000);
  };

  const handleUpdateVariation = (varId: string, updates: Partial<BoardVariation>) => {
    const updated = (template.variations || []).map((v) =>
      v.id === varId ? { ...v, ...updates } : v
    );
    updateTemplate({ variations: updated });
  };

  const handleDeleteVariation = (varId: string) => {
    const v = (template.variations || []).find((item) => item.id === varId);
    if (!window.confirm(`Delete variation "${v?.name || 'this variation'}"?`)) return;
    const updated = (template.variations || []).filter((item) => item.id !== varId);
    updateTemplate({ variations: updated });
    if (selectedVariationId === varId) setSelectedVariationId(null);
    if (editingVariationOnCanvas === varId) setEditingVariationOnCanvas(null);
    setSaveToast(`Deleted variation "${v?.name || ''}"`);
    setTimeout(() => setSaveToast(null), 2500);
  };

  const handleDuplicateVariation = (varId: string) => {
    const orig = (template.variations || []).find((item) => item.id === varId);
    if (!orig) return;
    const cloned: BoardVariation = {
      ...orig,
      id: `var_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: `${orig.name} (Copy)`
    };
    const updated = [...(template.variations || []), cloned];
    updateTemplate({ variations: updated });
    setSelectedVariationId(cloned.id);
    setSaveToast(`Duplicated "${orig.name}"`);
    setTimeout(() => setSaveToast(null), 2500);
  };

  const handleLoadVariationToCanvas = (varId: string) => {
    const v = (template.variations || []).find((item) => item.id === varId);
    if (!v) return;

    let mergedFields = template.fields;
    if (v.fields && v.fields.length > 0) {
      mergedFields = template.fields.map((f) => {
        const override = v.fields?.find((vf) => vf.id === f.id);
        return override ? { ...f, ...override } : f;
      });
    }

    setEditingVariationOnCanvas(varId);
    updateTemplate({
      backgroundImageUrl: v.backgroundImageUrl !== undefined ? v.backgroundImageUrl : template.backgroundImageUrl,
      backgroundColor: v.backgroundColor || template.backgroundColor,
      targetTextureName: v.targetTextureName || template.targetTextureName,
      fields: mergedFields,
      fixedGraphics: v.fixedGraphics && v.fixedGraphics.length > 0 ? v.fixedGraphics : template.fixedGraphics
    });

    setSaveToast(`Loaded "${v.name}" onto canvas. You can now tweak slots, colors, and background!`);
    setTimeout(() => setSaveToast(null), 3500);
  };

  const handleSaveCanvasToActiveVariation = () => {
    if (!editingVariationOnCanvas) return;
    const v = (template.variations || []).find((item) => item.id === editingVariationOnCanvas);
    if (!v) return;

    const fieldsSnapshot = template.fields.map((f) => ({ ...f }));

    handleUpdateVariation(editingVariationOnCanvas, {
      backgroundImageUrl: template.backgroundImageUrl,
      backgroundColor: template.backgroundColor,
      targetTextureName: template.targetTextureName,
      fields: fieldsSnapshot,
      fixedGraphics: template.fixedGraphics ? [...template.fixedGraphics] : []
    });

    setSaveToast(`Updated variation "${v.name}" with current canvas settings!`);
    setTimeout(() => setSaveToast(null), 3000);
  };

  const handleFinishEditingVariation = () => {
    setEditingVariationOnCanvas(null);
    setSaveToast('Exited variation canvas edit mode.');
    setTimeout(() => setSaveToast(null), 2000);
  };

  // Image Upload handler for a specific slot/box
  const handleSlotImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedFieldId) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      handleUpdateSelectedField({
        defaultValue: dataUrl,
        imageUrl: dataUrl
      });
      setSaveToast('Picture uploaded to slot!');
      setTimeout(() => setSaveToast(null), 2500);
    };
    reader.readAsDataURL(file);
  };

  // Image Upload handler for a static stamp / logo / watermark
  const handleStampImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedStampId) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const updated = template.fixedGraphics.map((item) => {
        if (item.id === selectedStampId) {
          return { ...item, type: 'logo' as const, content: dataUrl };
        }
        return item;
      });
      updateTemplate({ fixedGraphics: updated });
      setSaveToast('Loco stamp / watermark uploaded!');
      setTimeout(() => setSaveToast(null), 2500);
    };
    reader.readAsDataURL(file);
  };

  // Field updates
  const handleUpdateFieldPosition = (fieldId: string, x: number, y: number) => {
    setTemplate((prev) => ({
      ...prev,
      fields: prev.fields.map((f) => (f.id === fieldId ? { ...f, x, y } : f))
    }));
  };

  const handleUpdateSelectedField = (updates: Partial<EditableField>) => {
    if (!selectedFieldId) return;
    setTemplate((prev) => ({
      ...prev,
      fields: prev.fields.map((f) => (f.id === selectedFieldId ? { ...f, ...updates } : f))
    }));
  };

  // Add Text Slot
  const handleAddTextField = () => {
    const newId = `field_${Date.now()}`;
    const newField: EditableField = {
      id: newId,
      label: `Text Slot ${template.fields.length + 1}`,
      type: 'text',
      defaultValue: 'SAMPLE TEXT',
      placeholder: 'Enter content...',
      allowUserEdit: true,
      x: 50,
      y: 50,
      width: 70,
      height: 10,
      fontFamily: "'VT323', 'DotGothic16', monospace",
      fontSize: 50,
      fontWeight: 700,
      color: '#ff9f1c',
      align: 'center',
      textTransform: 'uppercase',
      ledGlow: true,
      glowColor: '#ff6200',
      glowRadius: 10,
      isDotMatrix: true
    };

    setTemplate((prev) => ({
      ...prev,
      fields: [...prev.fields, newField]
    }));
    setSelectedFieldId(newId);
  };

  // Add Image / Picture Slot
  const handleAddImageField = () => {
    const newId = `pic_${Date.now()}`;
    const newField: EditableField = {
      id: newId,
      label: `Picture Box ${template.fields.length + 1}`,
      type: 'image',
      defaultValue: '',
      placeholder: 'Picture / Logo Box',
      allowUserEdit: true,
      imageFit: 'contain',
      x: 50,
      y: 50,
      width: 25,
      height: 25,
      fontFamily: 'Arial',
      fontSize: 14,
      fontWeight: 400,
      color: '#ffffff',
      align: 'center'
    };

    setTemplate((prev) => ({
      ...prev,
      fields: [...prev.fields, newField]
    }));
    setSelectedFieldId(newId);
  };

  const handleDeleteField = (fieldId: string) => {
    setTemplate((prev) => ({
      ...prev,
      fields: prev.fields.filter((f) => f.id !== fieldId)
    }));
    if (selectedFieldId === fieldId) {
      setSelectedFieldId(null);
    }
  };

  const currentField = template.fields.find((f) => f.id === selectedFieldId);

  // Preview values
  const previewValues = template.fields.reduce<Record<string, string>>((acc, f) => {
    acc[f.id] = f.defaultValue || f.imageUrl || '';
    return acc;
  }, {});

  const fontOptions = fontManager.getAllFontOptions();

  return (
    <div className="admin-studio-container">
      {/* Hidden file input for slot images */}
      <input
        ref={slotImageInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleSlotImageUpload}
      />

      {/* Hidden file input for static stamp / logo / watermark */}
      <input
        ref={stampImageInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleStampImageUpload}
      />

      {/* Admin Sidebar */}
      <aside className="admin-sidebar">
        {/* Template Selector & New Template Action */}
        <div style={{ padding: '10px 12px 6px 12px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#94a3b8' }}>
              Active Template:
            </span>
            <button
              type="button"
              onClick={onCreateNewTemplate}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '3px 8px',
                fontSize: 11,
                fontWeight: 700,
                background: 'linear-gradient(135deg, #ef3b2d, #ff8a1f)',
                color: '#ffffff',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer'
              }}
              title="Create a new blank template"
            >
              <Plus size={12} /> New Template
            </button>
          </div>
          <select
            style={{
              width: '100%',
              padding: '6px 8px',
              fontSize: 12,
              background: '#0e1620',
              color: '#f8fafc',
              border: '1px solid rgba(255,255,255,0.18)',
              borderRadius: 5
            }}
            value={template.id}
            onChange={(e) => {
              const chosen = templates.find((t) => t.id === e.target.value);
              if (chosen) {
                onSelectTemplate(chosen);
              }
            }}
          >
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.category || 'Board'}) {t.targetTextureName ? `[${t.targetTextureName}]` : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="admin-header-badge">
          <div className="status-pill admin">
            <Sliders size={13} />
            <span>Template Creator (Freely Design)</span>
          </div>
          <p className="admin-subtitle">
            Upload custom background images, add text & picture boxes, and configure user edit permissions.
          </p>
        </div>

        {/* Visibility / Save Actions */}
        <div className="admin-publish-bar">
          <button
            type="button"
            className={`btn-publish ${template.published ? 'published' : 'draft'}`}
            onClick={() => handlePublishToggle()}
            title={template.published ? 'Click to hide from regular users' : 'Click to make visible to users on website'}
          >
            {template.published ? (
              <>
                <Eye size={15} /> Visible to Users (Live)
              </>
            ) : (
              <>
                <EyeOff size={15} /> Hidden from Users (Draft)
              </>
            )}
          </button>
          <button type="button" className="btn-secondary" onClick={handleSaveOnly} title="Save changes">
            Save
          </button>
          <button type="button" className="btn-icon" onClick={handleDuplicateTemplate} title="Duplicate template">
            <Copy size={15} />
          </button>
        </div>

        {/* Tabs */}
        <div className="admin-tabs">
          <button
            type="button"
            className={`admin-tab ${activeTab === 'details' ? 'active' : ''}`}
            onClick={() => setActiveTab('details')}
          >
            <Sliders size={13} /> Details & Specs
          </button>
          <button
            type="button"
            className={`admin-tab ${activeTab === 'fields' ? 'active' : ''}`}
            onClick={() => setActiveTab('fields')}
          >
            <Type size={13} /> Slots ({template.fields.length})
          </button>
          <button
            type="button"
            className={`admin-tab ${activeTab === 'board' ? 'active' : ''}`}
            onClick={() => setActiveTab('board')}
          >
            <Palette size={13} /> Texture & Canvas
          </button>
          <button
            type="button"
            className={`admin-tab ${activeTab === 'fixed' ? 'active' : ''}`}
            onClick={() => setActiveTab('fixed')}
          >
            <Layers size={13} /> Static Stamps
          </button>
          <button
            type="button"
            className={`admin-tab ${activeTab === 'variations' ? 'active' : ''}`}
            onClick={() => setActiveTab('variations')}
          >
            <Sparkles size={13} /> Variations ({(template.variations || []).length})
          </button>
        </div>

        {/* TAB 0: TEMPLATE DETAILS & SPECIFICATIONS */}
        {activeTab === 'details' && (
          <div className="tab-content">
            <span className="sub-title">Template Details & Metadata</span>
            <p className="field-help">
              Core details, user instructions, category, dimensions, and user visibility controls.
            </p>

            {/* Template Name (Title) with Inline Rename */}
            <div className="prop-row">
              <label>Template Name (Title):</label>
              <input
                type="text"
                value={template.name}
                placeholder="Template Title..."
                onChange={(e) => {
                  updateTemplate({ name: e.target.value });
                  setRenameText(e.target.value);
                }}
              />
            </div>

            {/* User Visibility Toggle Switch (Hide / Show) */}
            <div className="visibility-banner-card">
              <div className="vis-card-header">
                {template.published ? (
                  <Eye size={18} style={{ color: 'var(--rail-green)' }} />
                ) : (
                  <EyeOff size={18} style={{ color: 'var(--rail-yellow)' }} />
                )}
                <div>
                  <strong className="vis-card-title">
                    {template.published ? 'Visible to Users (Live Online)' : 'Hidden from Users (Private Draft)'}
                  </strong>
                  <p className="vis-card-desc">
                    {template.published
                      ? 'This template appears on the Home Page and in the User Editor for regular visitors.'
                      : 'Hidden from public visitors. Only visible in the Admin Studio for preparation.'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                className={`btn-vis-toggle-full ${template.published ? 'is-visible' : 'is-hidden'}`}
                onClick={() => handlePublishToggle()}
              >
                {template.published ? (
                  <>
                    <EyeOff size={14} /> Switch to: Hide from Users
                  </>
                ) : (
                  <>
                    <Eye size={14} /> Switch to: Make Visible to Users
                  </>
                )}
              </button>
            </div>

            {/* Category */}
            <div className="prop-row" style={{ marginTop: 10 }}>
              <label>Category:</label>
              <select
                value={template.category}
                onChange={(e) => updateTemplate({ category: e.target.value as BoardCategory })}
              >
                <option value="LED Texture Sheet">LED Texture Sheet (Trainz / Simulators)</option>
                <option value="Coach Board">Coach Board</option>
                <option value="Station Board">Station Board</option>
                <option value="SLR Board">SLR Board</option>
                <option value="Loco Board">Loco Board</option>
                <option value="Custom">Custom</option>
              </select>
            </div>

            {/* Description & User Guidelines */}
            <div className="prop-row">
              <label>Description & User Instructions:</label>
              <textarea
                rows={3}
                value={template.description || ''}
                placeholder="Guidelines for users: rake compatibility, slot details, simulator notes..."
                className="admin-textarea"
                onChange={(e) => updateTemplate({ description: e.target.value })}
              />
            </div>

            {/* Author / Creator */}
            <div className="prop-row">
              <label>Author / Creator:</label>
              <input
                type="text"
                value={template.author || ''}
                placeholder="e.g. GJS Productions / Indian Railways"
                onChange={(e) => updateTemplate({ author: e.target.value })}
              />
            </div>

            {/* Target Texture Filename (MSTS / Open Rails 3D Model Mapping) */}
            <div className="prop-row" style={{ marginTop: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <label style={{ margin: 0 }}>Target Texture Name (MSTS 3D Model Filename):</label>
                <span style={{ fontSize: 11, color: 'var(--rail-amber)', fontWeight: 700, fontFamily: 'monospace' }}>
                  {template.targetTextureName ? `${template.targetTextureName}.dds` : 'Standard Name'}
                </span>
              </div>
              <input
                type="text"
                value={template.targetTextureName || ''}
                placeholder="e.g. VB_NAME or AMRIT_LED"
                onChange={(e) => updateTemplate({ targetTextureName: e.target.value })}
              />
              <span className="field-help" style={{ fontSize: 11, marginTop: 4, display: 'block', color: '#94a3b8' }}>
                Required by train models (e.g. setting <code>VB_NAME</code> exports texture as <code>VB_NAME.dds</code> directly so users don&apos;t have to rename).
              </span>
            </div>

            {/* Site Details & Watermark Branding at Template End */}
            <div className="prop-row" style={{ marginTop: 12 }}>
              <label className="checkbox-label" style={{ fontWeight: 600 }}>
                <input
                  type="checkbox"
                  checked={template.showWatermark !== false}
                  onChange={(e) => updateTemplate({ showWatermark: e.target.checked })}
                />
                <span>Display Site Details & URL Watermark at bottom of template</span>
              </label>
              {template.showWatermark !== false && (
                <input
                  type="text"
                  style={{ marginTop: 6, fontSize: 12 }}
                  value={template.watermarkText || 'Created with GJS Railway Board Studio • https://gjs-store-4-msts.vercel.app'}
                  placeholder="Site details & URL..."
                  onChange={(e) => updateTemplate({ watermarkText: e.target.value })}
                />
              )}
            </div>

            {/* Resolution Specifications */}
            <div className="prop-row-double">
              <div>
                <label>Resolution Width (px):</label>
                <input
                  type="number"
                  value={template.baseWidth}
                  onChange={(e) => updateTemplate({ baseWidth: +e.target.value })}
                />
              </div>
              <div>
                <label>Resolution Height (px):</label>
                <input
                  type="number"
                  value={template.baseHeight}
                  onChange={(e) => updateTemplate({ baseHeight: +e.target.value })}
                />
              </div>
            </div>

            {/* Resolution Quick Presets (1024, 2K, 4K, 8K) */}
            <div className="presets-row">
              <span className="preset-title">Resolution Presets:</span>
              <div className="preset-pills">
                <button
                  type="button"
                  className={`btn-preset-pill ${template.baseWidth === 1024 && template.baseHeight === 1024 ? 'active-preset' : ''}`}
                  onClick={() => updateTemplate({ baseWidth: 1024, baseHeight: 1024, isTextureSheet: true, textureResolution: 1024 })}
                >
                  1024×1024 (1K UV)
                </button>
                <button
                  type="button"
                  className={`btn-preset-pill ${template.baseWidth === 2048 && template.baseHeight === 2048 ? 'active-preset' : ''}`}
                  onClick={() => updateTemplate({ baseWidth: 2048, baseHeight: 2048, isTextureSheet: true, textureResolution: 2048 })}
                >
                  2048×2048 (2K)
                </button>
                <button
                  type="button"
                  className={`btn-preset-pill ${template.baseWidth === 4096 && template.baseHeight === 4096 ? 'active-preset' : ''}`}
                  onClick={() => updateTemplate({ baseWidth: 4096, baseHeight: 4096, isTextureSheet: true, textureResolution: 4096 })}
                >
                  4096×4096 (4K)
                </button>
                <button
                  type="button"
                  className={`btn-preset-pill ${template.baseWidth === 8192 && template.baseHeight === 8192 ? 'active-preset' : ''}`}
                  onClick={() => updateTemplate({ baseWidth: 8192, baseHeight: 8192, isTextureSheet: true, textureResolution: 8192 })}
                >
                  8192×8192 (8K)
                </button>
              </div>
            </div>

            {/* User Custom Background Permission */}
            <div className="permission-toggle-box" style={{ marginTop: 10 }}>
              <div className="perm-header">
                {template.allowUserCustomBackground ? (
                  <Unlock size={14} className="perm-icon unlocked" />
                ) : (
                  <Lock size={14} className="perm-icon locked" />
                )}
                <span className="perm-title">USER CAN CHANGE BACKGROUND?</span>
                <span className={`perm-badge ${template.allowUserCustomBackground ? 'yes' : 'no'}`}>
                  {template.allowUserCustomBackground ? 'YES (Allowed)' : 'NO (Locked)'}
                </span>
              </div>
              <label className="checkbox-label" style={{ marginTop: 6 }}>
                <input
                  type="checkbox"
                  checked={template.allowUserCustomBackground ?? false}
                  onChange={(e) => updateTemplate({ allowUserCustomBackground: e.target.checked })}
                />
                <span>Allow users to upload or replace background image/texture</span>
              </label>
            </div>

            {/* Store Pricing & User Access Permissions */}
            <div className="permission-toggle-box" style={{ marginTop: 14, borderColor: template.isPaid ? 'rgba(234, 179, 8, 0.4)' : 'rgba(34, 197, 94, 0.3)' }}>
              <div className="perm-header">
                <Tag size={14} style={{ color: template.isPaid ? 'var(--rail-yellow)' : 'var(--rail-green)' }} />
                <span className="perm-title">STORE PRICING & ACCESS</span>
                <span className={`perm-badge ${template.isPaid ? 'paid' : 'yes'}`}>
                  {template.isPaid ? `PAID (₹${template.price || 99})` : 'FREE TO EDIT'}
                </span>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '6px 0 10px 0' }}>
                Control whether users must purchase this template before they can edit, customize, or export it.
              </p>

              <div style={{ display: 'flex', gap: 8, marginBottom: template.isPaid ? 10 : 0 }}>
                <button
                  type="button"
                  className={`btn-filter ${!template.isPaid ? 'active' : ''}`}
                  style={{ flex: 1, padding: '7px 10px', fontSize: '0.78rem' }}
                  onClick={() => updateTemplate({ isPaid: false, price: 0 })}
                >
                  <Unlock size={12} style={{ marginRight: 4 }} /> Free Template
                </button>
                <button
                  type="button"
                  className={`btn-filter ${template.isPaid ? 'active' : ''}`}
                  style={{ flex: 1, padding: '7px 10px', fontSize: '0.78rem' }}
                  onClick={() => updateTemplate({ isPaid: true, price: template.price && template.price > 0 ? template.price : 99 })}
                >
                  <Lock size={12} style={{ marginRight: 4 }} /> Paid Template
                </button>
              </div>

              {template.isPaid && (
                <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(0,0,0,0.2)', padding: '8px 10px', borderRadius: 6 }}>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600, minWidth: 90 }}>
                    Price (INR ₹):
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="99999"
                    value={template.price ?? 99}
                    onChange={(e) => updateTemplate({ price: Math.max(1, parseInt(e.target.value) || 1), isPaid: true })}
                    className="input-text"
                    style={{ flex: 1, padding: '5px 8px', fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--rail-yellow)' }}
                    placeholder="e.g. 99"
                  />
                  <div style={{ display: 'flex', gap: 4 }}>
                    {[49, 99, 149, 299].map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => updateTemplate({ price: p, isPaid: true })}
                        className={`btn-preset-pill ${template.price === p ? 'active-preset' : ''}`}
                        style={{ padding: '3px 8px', fontSize: '0.72rem' }}
                      >
                        ₹{p}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Payment Gateway Status */}
              <div style={{ marginTop: 12, borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Payment Gateway:</span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--rail-amber)' }}>Cashfree & UPI</span>
                </div>
                <span style={{ fontSize: '0.72rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <CheckCircle size={12} /> Server Managed (Render Env)
                </span>
              </div>
            </div>

            {/* Danger Zone: Delete Template Option */}
            <div className="danger-zone-box" style={{ marginTop: 16 }}>
              <div className="danger-header">
                <Trash2 size={14} style={{ color: 'var(--rail-red)' }} />
                <strong>Danger Zone: Delete Template</strong>
              </div>
              <p className="danger-description">
                Permanently delete this template from the website and storage.
              </p>
              <button
                type="button"
                className="btn-danger-full"
                onClick={handleDeleteActiveTemplate}
              >
                <Trash2 size={13} /> Delete "{template.name}"
              </button>
            </div>
          </div>
        )}

        {/* TAB 1: SLOTS & PICTURE BOXES */}
        {activeTab === 'fields' && (
          <div className="tab-content">
            <div className="slots-header-actions">
              <span className="sub-title">Content Slots & Boxes</span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button type="button" className="btn-add-small" onClick={handleAddTextField} title="Add Text Slot">
                  <Plus size={13} /> Text
                </button>
                <button type="button" className="btn-add-small" onClick={handleAddImageField} title="Add Picture / Logo Box">
                  <ImageIcon size={13} /> Picture
                </button>
              </div>
            </div>

            <div className="slots-chips-grid">
              {template.fields.map((f, i) => (
                <button
                  key={f.id}
                  type="button"
                  className={`slot-chip ${selectedFieldId === f.id ? 'active' : ''}`}
                  onClick={() => setSelectedFieldId(f.id)}
                >
                  <span className="chip-index">
                    {f.type === 'image' ? '🖼️' : '📝'} #{i + 1}
                  </span>
                  <span className="chip-label">{f.label}</span>
                  {f.allowUserEdit === false && <Lock size={10} style={{ color: '#ff758f' }} />}
                </button>
              ))}
            </div>

            {currentField ? (
              <div className="property-inspector-card">
                <div className="inspector-top">
                  <strong>
                    {currentField.type === 'image' ? '🖼️ Picture Box' : '📝 Text Slot'} · {currentField.label}
                  </strong>
                  <button
                    type="button"
                    className="btn-delete-slot"
                    onClick={() => handleDeleteField(currentField.id)}
                    title="Delete this slot"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>

                {/* USER MODIFICATION PERMISSION TOGGLE */}
                <div className="permission-toggle-box">
                  <div className="perm-header">
                    {currentField.allowUserEdit !== false ? (
                      <Unlock size={14} className="perm-icon unlocked" />
                    ) : (
                      <Lock size={14} className="perm-icon locked" />
                    )}
                    <span className="perm-title">USER CAN MODIFY THIS FIELD?</span>
                    <span className={`perm-badge ${currentField.allowUserEdit !== false ? 'yes' : 'no'}`}>
                      {currentField.allowUserEdit !== false ? 'YES (Editable)' : 'NO (Locked)'}
                    </span>
                  </div>
                  <label className="checkbox-label" style={{ marginTop: 6 }}>
                    <input
                      type="checkbox"
                      checked={currentField.allowUserEdit !== false}
                      onChange={(e) => handleUpdateSelectedField({ allowUserEdit: e.target.checked })}
                    />
                    <span>Allow user to edit / replace this {currentField.type === 'image' ? 'picture' : 'text'}</span>
                  </label>
                </div>

                {/* FIELD VISIBILITY IN USER FORM */}
                <div className="permission-toggle-box" style={{ marginTop: 6 }}>
                  <div className="perm-header">
                    {!currentField.hiddenFromUser ? (
                      <Eye size={14} className="perm-icon unlocked" />
                    ) : (
                      <EyeOff size={14} className="perm-icon locked" />
                    )}
                    <span className="perm-title">SHOW IN USER INPUT FORM?</span>
                    <span className={`perm-badge ${!currentField.hiddenFromUser ? 'yes' : 'no'}`}>
                      {!currentField.hiddenFromUser ? 'VISIBLE' : 'HIDDEN'}
                    </span>
                  </div>
                  <label className="checkbox-label" style={{ marginTop: 6 }}>
                    <input
                      type="checkbox"
                      checked={!currentField.hiddenFromUser}
                      onChange={(e) => handleUpdateSelectedField({ hiddenFromUser: !e.target.checked })}
                    />
                    <span>Show in regular user's edit form (Uncheck to hide from user)</span>
                  </label>
                </div>

                <div className="prop-row-double" style={{ marginTop: 8 }}>
                  <div>
                    <label>Slot Type:</label>
                    <select
                      value={currentField.type || 'text'}
                      onChange={(e) => handleUpdateSelectedField({ type: e.target.value as any })}
                    >
                      <option value="text">Text Slot</option>
                      <option value="image">Picture / Logo Box</option>
                    </select>
                  </div>
                  <div>
                    <label>Field Identifier (Key):</label>
                    <input
                      type="text"
                      value={currentField.id}
                      onChange={(e) => handleUpdateSelectedField({ id: e.target.value })}
                    />
                  </div>
                </div>

                <div className="prop-row">
                  <label>Display Label (Shown to User):</label>
                  <input
                    type="text"
                    value={currentField.label}
                    onChange={(e) => handleUpdateSelectedField({ label: e.target.value })}
                  />
                </div>

                <div className="prop-row">
                  <label>Field Instructions / Help Text (For User):</label>
                  <input
                    type="text"
                    value={currentField.helpText || ''}
                    placeholder="e.g. Enter train name in English, max 20 chars..."
                    onChange={(e) => handleUpdateSelectedField({ helpText: e.target.value })}
                  />
                </div>

                {/* PICTURE / IMAGE BOX SPECIFIC CONTROLS */}
                {currentField.type === 'image' ? (
                  <div className="image-box-controls">
                    <label className="sub-title" style={{ marginTop: 6 }}>
                      Default Picture / Logo:
                    </label>

                    {currentField.defaultValue ? (
                      <div className="slot-img-preview-row">
                        <img
                          src={currentField.defaultValue}
                          alt="Slot preview"
                          style={{
                            width: 64,
                            height: 64,
                            objectFit: currentField.imageFit || 'contain',
                            borderRadius: 4,
                            background: '#111',
                            border: '1px solid var(--border-color)'
                          }}
                        />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <button
                            type="button"
                            className="btn-secondary"
                            onClick={() => slotImageInputRef.current?.click()}
                          >
                            <Upload size={12} /> Replace Image
                          </button>
                          <button
                            type="button"
                            className="btn-danger-outline"
                            style={{ padding: '4px 8px', fontSize: 11 }}
                            onClick={() => handleUpdateSelectedField({ defaultValue: '', imageUrl: '' })}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="btn-primary"
                        style={{ marginTop: 4 }}
                        onClick={() => slotImageInputRef.current?.click()}
                      >
                        <Upload size={14} /> Upload Picture / Logo
                      </button>
                    )}

                    <div className="prop-row" style={{ marginTop: 8 }}>
                      <label>Or Image URL:</label>
                      <input
                        type="text"
                        placeholder="https://... or data:..."
                        value={currentField.defaultValue}
                        onChange={(e) => handleUpdateSelectedField({ defaultValue: e.target.value, imageUrl: e.target.value })}
                      />
                    </div>

                    <div className="prop-row">
                      <label>Image Fit:</label>
                      <select
                        value={currentField.imageFit || 'contain'}
                        onChange={(e) => handleUpdateSelectedField({ imageFit: e.target.value as any })}
                      >
                        <option value="contain">Contain (Keep Proportions)</option>
                        <option value="cover">Cover (Fill Entire Box)</option>
                        <option value="fill">Stretch / Fill</option>
                      </select>
                    </div>
                  </div>
                ) : (
                  /* TEXT SPECIFIC CONTROLS */
                  <>
                    <div className="prop-row">
                      <label>Default Text Content:</label>
                      <input
                        type="text"
                        value={currentField.defaultValue}
                        onChange={(e) => handleUpdateSelectedField({ defaultValue: e.target.value })}
                      />
                    </div>

                    <div className="prop-row">
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                        <label style={{ margin: 0 }}>Font Style:</label>
                        <button
                          type="button"
                          onClick={() => setShowCustomFontModal(true)}
                          style={{
                            background: 'rgba(255,159,28,0.15)',
                            border: '1px solid rgba(255,159,28,0.35)',
                            color: 'var(--rail-yellow)',
                            borderRadius: 4,
                            padding: '2px 8px',
                            fontSize: 11,
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4
                          }}
                        >
                          <Plus size={11} /> Add Custom Font
                        </button>
                      </div>
                      <select
                        value={currentField.fontFamily}
                        onChange={(e) => handleUpdateSelectedField({ fontFamily: e.target.value })}
                      >
                        {fontOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="prop-row-double">
                      <div>
                        <label>Font Size ({currentField.fontSize}px):</label>
                        <input
                          type="range"
                          min="12"
                          max="120"
                          value={currentField.fontSize}
                          onChange={(e) => handleUpdateSelectedField({ fontSize: +e.target.value })}
                        />
                      </div>
                      <div>
                        <label>Letter Spacing ({currentField.letterSpacing || 0}px):</label>
                        <input
                          type="range"
                          min="0"
                          max="20"
                          value={currentField.letterSpacing || 0}
                          onChange={(e) => handleUpdateSelectedField({ letterSpacing: +e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="prop-row-double">
                      <div>
                        <label>Text Color:</label>
                        <input
                          type="color"
                          value={currentField.color}
                          onChange={(e) => handleUpdateSelectedField({ color: e.target.value })}
                        />
                      </div>
                      <div>
                        <label>Alignment:</label>
                        <select
                          value={currentField.align}
                          onChange={(e) =>
                            handleUpdateSelectedField({ align: e.target.value as 'left' | 'center' | 'right' })
                          }
                        >
                          <option value="center">Center</option>
                          <option value="left">Left</option>
                          <option value="right">Right</option>
                        </select>
                      </div>
                    </div>

                    {/* LED Glow controls */}
                    <div className="led-controls-box">
                      <label className="checkbox-label" style={{ fontWeight: 700, color: '#ffbe0b' }}>
                        <input
                          type="checkbox"
                          checked={currentField.ledGlow ?? true}
                          onChange={(e) => handleUpdateSelectedField({ ledGlow: e.target.checked })}
                        />
                        <Sparkles size={12} /> Enable Authentic LED Glow
                      </label>

                      {currentField.ledGlow && (
                        <div className="prop-row-double" style={{ marginTop: 8 }}>
                          <div>
                            <label>Glow Color:</label>
                            <input
                              type="color"
                              value={currentField.glowColor || '#ff6200'}
                              onChange={(e) => handleUpdateSelectedField({ glowColor: e.target.value })}
                            />
                          </div>
                          <div>
                            <label>Glow Radius ({currentField.glowRadius || 12}px):</label>
                            <input
                              type="range"
                              min="2"
                              max="30"
                              value={currentField.glowRadius || 12}
                              onChange={(e) => handleUpdateSelectedField({ glowRadius: +e.target.value })}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="prop-row-checkboxes">
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={currentField.textTransform === 'uppercase'}
                          onChange={(e) =>
                            handleUpdateSelectedField({
                              textTransform: e.target.checked ? 'uppercase' : 'none'
                            })
                          }
                        />
                        Force Uppercase
                      </label>
                    </div>
                  </>
                )}

                {/* COMMON POSITION & SIZE CONTROLS */}
                <div className="prop-row-double" style={{ marginTop: 8 }}>
                  <div>
                    <label>Position X ({currentField.x}%):</label>
                    <input
                      type="range"
                      min="2"
                      max="98"
                      value={currentField.x}
                      onChange={(e) => handleUpdateSelectedField({ x: +e.target.value })}
                    />
                  </div>
                  <div>
                    <label>Position Y ({currentField.y}%):</label>
                    <input
                      type="range"
                      min="2"
                      max="98"
                      value={currentField.y}
                      onChange={(e) => handleUpdateSelectedField({ y: +e.target.value })}
                    />
                  </div>
                </div>

                <div className="prop-row-double">
                  <div>
                    <label>Width ({currentField.width}%):</label>
                    <input
                      type="range"
                      min="5"
                      max="98"
                      value={currentField.width}
                      onChange={(e) => handleUpdateSelectedField({ width: +e.target.value })}
                    />
                  </div>
                  <div>
                    <label>Height ({currentField.height}%):</label>
                    <input
                      type="range"
                      min="3"
                      max="60"
                      value={currentField.height}
                      onChange={(e) => handleUpdateSelectedField({ height: +e.target.value })}
                    />
                  </div>
                </div>

                {/* FREE ROTATION & FREE ZOOM / SCALE CONTROLS */}
                <div className="prop-row-double" style={{ marginTop: 8 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <label style={{ margin: 0 }}>Rotation ({currentField.rotation || 0}°):</label>
                      <input
                        type="number"
                        min="0"
                        max="360"
                        value={currentField.rotation || 0}
                        onChange={(e) => handleUpdateSelectedField({ rotation: Math.max(0, Math.min(360, Number(e.target.value) || 0)) })}
                        style={{ width: 52, padding: '1px 4px', fontSize: 11, textAlign: 'right' }}
                      />
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="360"
                      value={currentField.rotation || 0}
                      onChange={(e) => handleUpdateSelectedField({ rotation: +e.target.value })}
                      style={{ marginTop: 4 }}
                    />
                    <div style={{ display: 'flex', gap: 3, marginTop: 4 }}>
                      {[0, 90, 180, 270].map((deg) => (
                        <button
                          key={deg}
                          type="button"
                          onClick={() => handleUpdateSelectedField({ rotation: deg })}
                          style={{
                            flex: 1,
                            padding: '2px 0',
                            fontSize: 10,
                            background: (currentField.rotation || 0) === deg ? 'var(--rail-red)' : 'rgba(255,255,255,0.08)',
                            color: '#fff',
                            border: '1px solid rgba(255,255,255,0.15)',
                            borderRadius: 3,
                            cursor: 'pointer'
                          }}
                        >
                          {deg}°
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <label style={{ margin: 0 }}>Zoom / Scale ({(currentField.scale !== undefined ? currentField.scale : 1.0).toFixed(2)}x):</label>
                      <input
                        type="number"
                        min="0.2"
                        max="3.0"
                        step="0.05"
                        value={currentField.scale !== undefined ? currentField.scale : 1.0}
                        onChange={(e) => handleUpdateSelectedField({ scale: Math.max(0.1, Math.min(5.0, Number(e.target.value) || 1.0)) })}
                        style={{ width: 52, padding: '1px 4px', fontSize: 11, textAlign: 'right' }}
                      />
                    </div>
                    <input
                      type="range"
                      min="0.2"
                      max="3.0"
                      step="0.05"
                      value={currentField.scale !== undefined ? currentField.scale : 1.0}
                      onChange={(e) => handleUpdateSelectedField({ scale: +e.target.value })}
                      style={{ marginTop: 4 }}
                    />
                    <div style={{ display: 'flex', gap: 3, marginTop: 4 }}>
                      {[0.5, 1.0, 1.5, 2.0].map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => handleUpdateSelectedField({ scale: s })}
                          style={{
                            flex: 1,
                            padding: '2px 0',
                            fontSize: 10,
                            background: (currentField.scale ?? 1.0) === s ? 'var(--rail-amber)' : 'rgba(255,255,255,0.08)',
                            color: '#fff',
                            border: '1px solid rgba(255,255,255,0.15)',
                            borderRadius: 3,
                            cursor: 'pointer'
                          }}
                        >
                          {s}x
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <p className="no-selection-hint">Select or add a slot above to inspect and adjust.</p>
            )}
          </div>
        )}

        {/* TAB 2: TEXTURE & BACKGROUND */}
        {activeTab === 'board' && (
          <div className="tab-content">
            <div className="prop-row">
              <label>Template Name:</label>
              <input
                type="text"
                value={template.name}
                onChange={(e) => updateTemplate({ name: e.target.value })}
              />
            </div>

            <div className="prop-row">
              <label>Category:</label>
              <select
                value={template.category}
                onChange={(e) => updateTemplate({ category: e.target.value as BoardCategory })}
              >
                <option value="LED Texture Sheet">LED Texture Sheet (Trainz / Simulators)</option>
                <option value="Coach Board">Coach Board</option>
                <option value="Station Board">Station Board</option>
                <option value="Custom">Custom</option>
              </select>
            </div>

            {/* USER PERMISSION: BACKGROUND MODIFICATION */}
            <div className="permission-toggle-box" style={{ marginTop: 4 }}>
              <div className="perm-header">
                {template.allowUserCustomBackground ? (
                  <Unlock size={14} className="perm-icon unlocked" />
                ) : (
                  <Lock size={14} className="perm-icon locked" />
                )}
                <span className="perm-title">USER CAN CHANGE BACKGROUND?</span>
                <span className={`perm-badge ${template.allowUserCustomBackground ? 'yes' : 'no'}`}>
                  {template.allowUserCustomBackground ? 'YES (Allowed)' : 'NO (Locked)'}
                </span>
              </div>
              <label className="checkbox-label" style={{ marginTop: 6 }}>
                <input
                  type="checkbox"
                  checked={template.allowUserCustomBackground ?? false}
                  onChange={(e) => updateTemplate({ allowUserCustomBackground: e.target.checked })}
                />
                <span>Allow users to upload or replace the background image/texture</span>
              </label>
            </div>

            {/* Upload Custom Background Texture */}
            <div className="upload-texture-box" style={{ marginTop: 10 }}>
              <label className="sub-title">
                <ImageIcon size={14} /> Background Custom Image / Texture Map
              </label>
              <p className="field-help">
                Upload any PNG/JPG image or texture sheet (e.g. 1024×1024 UV map) to serve as the background.
              </p>

              <input
                ref={bgFileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleBgImageUpload}
              />

              <div className="upload-buttons-row">
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => bgFileInputRef.current?.click()}
                  disabled={isUploadingBg}
                >
                  <Upload size={14} /> {isUploadingBg ? 'Uploading to Server...' : 'Upload Background Image'}
                </button>
                {template.backgroundImageUrl && (
                  <button
                    type="button"
                    className="btn-danger-outline"
                    onClick={() => updateTemplate({ backgroundImageUrl: undefined })}
                  >
                    Clear Image
                  </button>
                )}
              </div>

              {/* Direct URL input fallback */}
              <div style={{ marginTop: 8 }}>
                <label style={{ fontSize: 11, color: '#94a3b8' }}>Or Background Image URL / CDN Link:</label>
                <input
                  type="text"
                  placeholder="https://... or /media/... or /textures/..."
                  value={template.backgroundImageUrl || ''}
                  onChange={(e) => updateTemplate({ backgroundImageUrl: e.target.value })}
                  style={{ width: '100%', fontSize: 11, padding: '6px 8px', marginTop: 4 }}
                />
              </div>

              {/* Thumbnail preview if set */}
              {template.backgroundImageUrl && (
                <div style={{ marginTop: 8, padding: 6, background: 'rgba(0,0,0,0.3)', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <img
                    src={template.backgroundImageUrl}
                    alt="Background Preview"
                    style={{ width: 44, height: 44, objectFit: 'contain', borderRadius: 4, background: '#111', border: '1px solid rgba(255,255,255,0.1)' }}
                  />
                  <div style={{ fontSize: 11, color: '#cbd5e1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <div style={{ fontWeight: 600, color: '#4ade80' }}>✓ Active Background Saved</div>
                    <div style={{ fontSize: 10, color: '#94a3b8' }}>{template.baseWidth} × {template.baseHeight} px</div>
                  </div>
                </div>
              )}
            </div>

            <div className="prop-row-double">
              <div>
                <label>Resolution Width (px):</label>
                <input
                  type="number"
                  value={template.baseWidth}
                  onChange={(e) => updateTemplate({ baseWidth: +e.target.value })}
                />
              </div>
              <div>
                <label>Resolution Height (px):</label>
                <input
                  type="number"
                  value={template.baseHeight}
                  onChange={(e) => updateTemplate({ baseHeight: +e.target.value })}
                />
              </div>
            </div>

            {/* Resolution Quick Presets (1024, 2K, 4K, 8K) */}
            <div className="presets-row" style={{ marginBottom: 8 }}>
              <span className="preset-title">Resolution Presets:</span>
              <div className="preset-pills">
                <button
                  type="button"
                  className={`btn-preset-pill ${template.baseWidth === 1024 && template.baseHeight === 1024 ? 'active-preset' : ''}`}
                  onClick={() => updateTemplate({ baseWidth: 1024, baseHeight: 1024, isTextureSheet: true, textureResolution: 1024 })}
                >
                  1024×1024 (1K)
                </button>
                <button
                  type="button"
                  className={`btn-preset-pill ${template.baseWidth === 2048 && template.baseHeight === 2048 ? 'active-preset' : ''}`}
                  onClick={() => updateTemplate({ baseWidth: 2048, baseHeight: 2048, isTextureSheet: true, textureResolution: 2048 })}
                >
                  2048×2048 (2K)
                </button>
                <button
                  type="button"
                  className={`btn-preset-pill ${template.baseWidth === 4096 && template.baseHeight === 4096 ? 'active-preset' : ''}`}
                  onClick={() => updateTemplate({ baseWidth: 4096, baseHeight: 4096, isTextureSheet: true, textureResolution: 4096 })}
                >
                  4096×4096 (4K)
                </button>
                <button
                  type="button"
                  className={`btn-preset-pill ${template.baseWidth === 8192 && template.baseHeight === 8192 ? 'active-preset' : ''}`}
                  onClick={() => updateTemplate({ baseWidth: 8192, baseHeight: 8192, isTextureSheet: true, textureResolution: 8192 })}
                >
                  8192×8192 (8K)
                </button>
              </div>
            </div>

            <div className="prop-row-double">
              <div>
                <label>Background Fill:</label>
                <input
                  type="color"
                  value={template.backgroundColor === 'transparent' ? '#000000' : template.backgroundColor}
                  onChange={(e) => updateTemplate({ backgroundColor: e.target.value })}
                />
              </div>
              <div>
                <label>Background Type:</label>
                <select
                  value={template.backgroundType}
                  onChange={(e) => updateTemplate({ backgroundType: e.target.value as any })}
                >
                  <option value="transparent">Transparent / Texture Only</option>
                  <option value="solid">Solid Color</option>
                  <option value="gradient">Gradient</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: FIXED ELEMENTS (STATIC STAMPS & LOCO WATERMARKS) */}
        {activeTab === 'fixed' && (
          <div className="tab-content">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <span className="sub-title">Static Stamps & Watermarks</span>
              <span style={{ fontSize: 11, color: '#94a3b8' }}>
                {template.fixedGraphics.length} elements
              </span>
            </div>
            <p className="field-help">
              Non-editable locomotive logos, watermarks, stamps, crests, and fixed borders. Admin can freely move, rotate, zoom, or upload custom graphics.
            </p>

            {/* Quick Add Stamp Buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, margin: '10px 0' }}>
              <button
                type="button"
                className="btn-primary"
                style={{ fontSize: 11, padding: '7px 8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
                onClick={() => {
                  const newId = `stamp_${Date.now()}`;
                  const newG: FixedGraphicElement = {
                    id: newId,
                    type: 'logo',
                    content: '',
                    x: 50,
                    y: 50,
                    width: 20,
                    height: 20,
                    rotation: 0,
                    scale: 1.0,
                    opacity: 0.85
                  };
                  updateTemplate({ fixedGraphics: [...template.fixedGraphics, newG] });
                  setSelectedStampId(newId);
                }}
              >
                <Upload size={12} /> + Loco Stamp / Logo
              </button>

              <button
                type="button"
                className="btn-secondary"
                style={{ fontSize: 11, padding: '7px 8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
                onClick={() => {
                  const newId = `fixed_txt_${Date.now()}`;
                  const newG: FixedGraphicElement = {
                    id: newId,
                    type: 'text',
                    content: 'INDIAN RAILWAYS',
                    x: 50,
                    y: 12,
                    fontSize: 16,
                    fontWeight: 800,
                    color: '#ffffff',
                    rotation: 0,
                    scale: 1.0,
                    opacity: 1.0
                  };
                  updateTemplate({ fixedGraphics: [...template.fixedGraphics, newG] });
                  setSelectedStampId(newId);
                }}
              >
                <Plus size={12} /> + Static Text
              </button>
            </div>

            {/* Stamp Element Selector Chips */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 12 }}>
              {template.fixedGraphics.map((item, idx) => {
                const isCur = (selectedStampId || template.fixedGraphics[0]?.id) === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedStampId(item.id)}
                    style={{
                      padding: '4px 8px',
                      fontSize: 11,
                      borderRadius: 4,
                      cursor: 'pointer',
                      border: isCur ? '1px solid var(--rail-amber)' : '1px solid rgba(255,255,255,0.12)',
                      background: isCur ? 'rgba(255,159,28,0.2)' : 'rgba(255,255,255,0.04)',
                      color: isCur ? 'var(--rail-yellow)' : '#cbd5e1',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    <span>{item.type === 'logo' ? '🚂 Stamp' : item.type === 'text' ? '📝 Text' : item.type === 'divider' ? '➖ Line' : '🏷️ Badge'}</span>
                    <span style={{ opacity: 0.6, fontSize: 10 }}>#{idx + 1}</span>
                  </button>
                );
              })}
            </div>

            {/* Selected Stamp Inspector & Controls */}
            {(() => {
              const activeStamp = template.fixedGraphics.find((g) => g.id === (selectedStampId || template.fixedGraphics[0]?.id));
              if (!activeStamp) {
                return (
                  <p className="no-selection-hint" style={{ marginTop: 12 }}>
                    Click &quot;+ Loco Stamp / Logo&quot; above to add a watermark, logo, or fixed text.
                  </p>
                );
              }

              const updateActiveStamp = (updates: Partial<FixedGraphicElement>) => {
                const updated = template.fixedGraphics.map((item) =>
                  item.id === activeStamp.id ? { ...item, ...updates } : item
                );
                updateTemplate({ fixedGraphics: updated });
              };

              return (
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--rail-amber)' }}>
                      Editing: {activeStamp.type.toUpperCase()} ({activeStamp.id})
                    </span>
                    <button
                      type="button"
                      className="btn-danger-outline"
                      style={{ padding: '3px 8px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}
                      onClick={() => {
                        const filtered = template.fixedGraphics.filter((g) => g.id !== activeStamp.id);
                        updateTemplate({ fixedGraphics: filtered });
                        setSelectedStampId(filtered[0]?.id || null);
                      }}
                      title="Delete this static element"
                    >
                      <Trash2 size={12} /> Delete
                    </button>
                  </div>

                  <div className="prop-row-double">
                    <div>
                      <label>Element Type:</label>
                      <select
                        value={activeStamp.type}
                        onChange={(e) => updateActiveStamp({ type: e.target.value as any })}
                      >
                        <option value="logo">Loco Logo / Watermark Image</option>
                        <option value="text">Static Text</option>
                        <option value="badge">Badge Pill</option>
                        <option value="divider">Divider Line</option>
                      </select>
                    </div>
                    <div>
                      <label>Opacity / Transparency ({Math.round((activeStamp.opacity !== undefined ? activeStamp.opacity : 1) * 100)}%):</label>
                      <input
                        type="range"
                        min="0.1"
                        max="1.0"
                        step="0.05"
                        value={activeStamp.opacity !== undefined ? activeStamp.opacity : 1.0}
                        onChange={(e) => updateActiveStamp({ opacity: +e.target.value })}
                      />
                    </div>
                  </div>

                  {/* LOGO / WATERMARK IMAGE CONTROLS */}
                  {activeStamp.type === 'logo' ? (
                    <div style={{ margin: '10px 0', padding: 10, background: 'rgba(0,0,0,0.3)', borderRadius: 6, border: '1px solid rgba(255,255,255,0.06)' }}>
                      <label style={{ fontSize: 11, fontWeight: 700, color: '#e2e8f0', marginBottom: 6, display: 'block' }}>
                        Locomotive Stamp / Logo Picture:
                      </label>
                      {activeStamp.content ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                          <img
                            src={activeStamp.content}
                            alt="Stamp"
                            style={{ width: 48, height: 48, objectFit: 'contain', background: '#111', borderRadius: 4, border: '1px solid rgba(255,255,255,0.2)' }}
                          />
                          <button
                            type="button"
                            className="btn-secondary"
                            style={{ fontSize: 11, padding: '5px 10px' }}
                            onClick={() => stampImageInputRef.current?.click()}
                          >
                            <Upload size={12} /> Replace Image
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="btn-primary"
                          style={{ width: '100%', fontSize: 12, padding: '8px 12px', marginBottom: 8 }}
                          onClick={() => stampImageInputRef.current?.click()}
                        >
                          <Upload size={13} /> Upload Loco / Watermark File
                        </button>
                      )}
                      <input
                        type="text"
                        placeholder="Or paste Image URL (https://... or data:...)"
                        value={activeStamp.content || ''}
                        onChange={(e) => updateActiveStamp({ content: e.target.value })}
                        style={{ fontSize: 11 }}
                      />
                    </div>
                  ) : (
                    /* TEXT / BADGE / DIVIDER CONTROLS */
                    <div style={{ margin: '10px 0' }}>
                      <div className="prop-row">
                        <label>Content / Text:</label>
                        <input
                          type="text"
                          value={activeStamp.content || ''}
                          placeholder="e.g. INDIAN RAILWAYS..."
                          onChange={(e) => updateActiveStamp({ content: e.target.value })}
                        />
                      </div>
                      <div className="prop-row-double">
                        <div>
                          <label>Font Size ({activeStamp.fontSize || 14}px):</label>
                          <input
                            type="range"
                            min="10"
                            max="80"
                            value={activeStamp.fontSize || 14}
                            onChange={(e) => updateActiveStamp({ fontSize: +e.target.value })}
                          />
                        </div>
                        <div>
                          <label>Color:</label>
                          <input
                            type="color"
                            value={activeStamp.color || '#ffffff'}
                            onChange={(e) => updateActiveStamp({ color: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* POSITION (MOVE BY ADMIN) */}
                  <div className="prop-row-double" style={{ marginTop: 8 }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <label style={{ margin: 0 }}>Position X ({activeStamp.x}%):</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={activeStamp.x}
                          onChange={(e) => updateActiveStamp({ x: Math.max(0, Math.min(100, Number(e.target.value) || 0)) })}
                          style={{ width: 48, padding: '1px 3px', fontSize: 11, textAlign: 'right' }}
                        />
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={activeStamp.x}
                        onChange={(e) => updateActiveStamp({ x: +e.target.value })}
                        style={{ marginTop: 4 }}
                      />
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <label style={{ margin: 0 }}>Position Y ({activeStamp.y}%):</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={activeStamp.y}
                          onChange={(e) => updateActiveStamp({ y: Math.max(0, Math.min(100, Number(e.target.value) || 0)) })}
                          style={{ width: 48, padding: '1px 3px', fontSize: 11, textAlign: 'right' }}
                        />
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={activeStamp.y}
                        onChange={(e) => updateActiveStamp({ y: +e.target.value })}
                        style={{ marginTop: 4 }}
                      />
                    </div>
                  </div>

                  {/* WIDTH & HEIGHT */}
                  <div className="prop-row-double" style={{ marginTop: 8 }}>
                    <div>
                      <label>Width ({activeStamp.width || 15}%):</label>
                      <input
                        type="range"
                        min="2"
                        max="100"
                        value={activeStamp.width || 15}
                        onChange={(e) => updateActiveStamp({ width: +e.target.value })}
                      />
                    </div>
                    <div>
                      <label>Height ({activeStamp.height || 15}%):</label>
                      <input
                        type="range"
                        min="2"
                        max="100"
                        value={activeStamp.height || 15}
                        onChange={(e) => updateActiveStamp({ height: +e.target.value })}
                      />
                    </div>
                  </div>

                  {/* FREE ROTATION & FREE ZOOM / SCALE CONTROLS */}
                  <div className="prop-row-double" style={{ marginTop: 8 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <label style={{ margin: 0 }}>Rotation ({activeStamp.rotation || 0}°):</label>
                        <input
                          type="number"
                          min="0"
                          max="360"
                          value={activeStamp.rotation || 0}
                          onChange={(e) => updateActiveStamp({ rotation: Math.max(0, Math.min(360, Number(e.target.value) || 0)) })}
                          style={{ width: 48, padding: '1px 3px', fontSize: 11, textAlign: 'right' }}
                        />
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="360"
                        value={activeStamp.rotation || 0}
                        onChange={(e) => updateActiveStamp({ rotation: +e.target.value })}
                        style={{ marginTop: 4 }}
                      />
                      <div style={{ display: 'flex', gap: 3, marginTop: 4 }}>
                        {[0, 90, 180, 270].map((deg) => (
                          <button
                            key={deg}
                            type="button"
                            onClick={() => updateActiveStamp({ rotation: deg })}
                            style={{
                              flex: 1,
                              padding: '2px 0',
                              fontSize: 10,
                              background: (activeStamp.rotation || 0) === deg ? 'var(--rail-red)' : 'rgba(255,255,255,0.08)',
                              color: '#fff',
                              border: '1px solid rgba(255,255,255,0.15)',
                              borderRadius: 3,
                              cursor: 'pointer'
                            }}
                          >
                            {deg}°
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <label style={{ margin: 0 }}>Zoom / Scale ({(activeStamp.scale !== undefined ? activeStamp.scale : 1.0).toFixed(2)}x):</label>
                        <input
                          type="number"
                          min="0.2"
                          max="3.0"
                          step="0.05"
                          value={activeStamp.scale !== undefined ? activeStamp.scale : 1.0}
                          onChange={(e) => updateActiveStamp({ scale: Math.max(0.1, Math.min(5.0, Number(e.target.value) || 1.0)) })}
                          style={{ width: 48, padding: '1px 3px', fontSize: 11, textAlign: 'right' }}
                        />
                      </div>
                      <input
                        type="range"
                        min="0.2"
                        max="3.0"
                        step="0.05"
                        value={activeStamp.scale !== undefined ? activeStamp.scale : 1.0}
                        onChange={(e) => updateActiveStamp({ scale: +e.target.value })}
                        style={{ marginTop: 4 }}
                      />
                      <div style={{ display: 'flex', gap: 3, marginTop: 4 }}>
                        {[0.5, 1.0, 1.5, 2.0].map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => updateActiveStamp({ scale: s })}
                            style={{
                              flex: 1,
                              padding: '2px 0',
                              fontSize: 10,
                              background: (activeStamp.scale ?? 1.0) === s ? 'var(--rail-amber)' : 'rgba(255,255,255,0.08)',
                              color: '#fff',
                              border: '1px solid rgba(255,255,255,0.15)',
                              borderRadius: 3,
                              cursor: 'pointer'
                            }}
                          >
                            {s}x
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* TAB 4: BOARD VARIATIONS & THEMES */}
        {activeTab === 'variations' && (
          <div className="tab-content">
            <span className="sub-title">Board Variations & Themes</span>
            <p className="field-help">
              Design multiple visual variants for this template (e.g. Amrit Bharat Saffron LED vs Ice Blue Matrix, Dual-line Hindi + English, Sleeper coach stencil). Users can pick any variation freely while keeping their customized train numbers & names.
            </p>

            <input
              ref={variationBgInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleVariationBgFile}
            />

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, margin: '12px 0 16px 0' }}>
              <button
                type="button"
                className="btn-primary"
                onClick={handleSaveCurrentCanvasAsNewVariation}
                style={{ background: 'linear-gradient(135deg, #ea580c 0%, #f97316 100%)', justifyContent: 'center' }}
                title="Capture the current canvas slots, colors, and background into a new variation"
              >
                <Sparkles size={14} /> 📸 Save Canvas as New Variation
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={handleAddVariation}
                style={{ justifyContent: 'center' }}
                title="Add an empty variation based on this template"
              >
                <Plus size={14} /> + Add Blank Variation
              </button>
            </div>

            {(!template.variations || template.variations.length === 0) ? (
              <div style={{ padding: 18, background: 'rgba(0,0,0,0.3)', border: '1px dashed rgba(255,255,255,0.15)', borderRadius: 8, textAlign: 'center' }}>
                <Sparkles size={24} style={{ color: '#fb923c', margin: '0 auto 8px auto', display: 'block' }} />
                <div style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9', marginBottom: 4 }}>No Variations Created Yet</div>
                <p style={{ fontSize: 11, color: '#94a3b8', margin: '0 0 12px 0', lineHeight: 1.4 }}>
                  Style your board on the right canvas (change text color to Ice Blue, Amber, or swap background) then click &quot;Save Canvas as New Variation&quot;.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {template.variations.map((v, idx) => {
                  const isEditingThis = editingVariationOnCanvas === v.id;
                  return (
                    <div
                      key={v.id}
                      style={{
                        padding: 12,
                        borderRadius: 8,
                        background: isEditingThis ? 'rgba(234, 88, 12, 0.12)' : 'rgba(15, 23, 42, 0.6)',
                        border: isEditingThis ? '1px solid #ea580c' : '1px solid rgba(255,255,255,0.1)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 11, fontWeight: 800, color: '#fb923c' }}>#{idx + 1}</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#f8fafc' }}>{v.name}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <button
                            type="button"
                            className="btn-icon"
                            onClick={() => handleDuplicateVariation(v.id)}
                            title="Duplicate variation"
                          >
                            <Copy size={13} />
                          </button>
                          <button
                            type="button"
                            className="btn-icon danger"
                            onClick={() => handleDeleteVariation(v.id)}
                            title="Delete variation"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      {/* Action Bar for Variation */}
                      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                        <button
                          type="button"
                          className="btn-primary"
                          onClick={() => handleLoadVariationToCanvas(v.id)}
                          style={{
                            flex: 1,
                            fontSize: 11,
                            padding: '4px 8px',
                            background: isEditingThis ? '#ea580c' : 'rgba(255,255,255,0.08)'
                          }}
                          title="Load this variation onto the main canvas so you can visually move slots, change fonts, and preview"
                        >
                          <Palette size={12} /> {isEditingThis ? 'Editing on Canvas' : 'Load to Canvas'}
                        </button>
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => {
                            setEditingVariationOnCanvas(v.id);
                            handleSaveCanvasToActiveVariation();
                          }}
                          style={{ fontSize: 11, padding: '4px 8px' }}
                          title="Update this variation with the current slots & colors from the canvas"
                        >
                          <Check size={12} /> Snapshot Canvas
                        </button>
                      </div>

                      {/* Variation Name */}
                      <div style={{ marginBottom: 6 }}>
                        <label style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
                          Variation Name:
                        </label>
                        <input
                          type="text"
                          value={v.name}
                          onChange={(e) => handleUpdateVariation(v.id, { name: e.target.value })}
                          style={{ width: '100%', fontSize: 11, padding: '5px 8px', marginTop: 2 }}
                        />
                      </div>

                      {/* Variation Description */}
                      <div style={{ marginBottom: 6 }}>
                        <label style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
                          Theme Description:
                        </label>
                        <input
                          type="text"
                          value={v.description || ''}
                          placeholder="e.g. Saffron LED Matrix, Ice Blue, Sleeper Stencil"
                          onChange={(e) => handleUpdateVariation(v.id, { description: e.target.value })}
                          style={{ width: '100%', fontSize: 11, padding: '5px 8px', marginTop: 2 }}
                        />
                      </div>

                      {/* Export Filename Override */}
                      <div style={{ marginBottom: 6 }}>
                        <label style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
                          Target Texture Filename (.dds override):
                        </label>
                        <input
                          type="text"
                          value={v.targetTextureName || ''}
                          placeholder="e.g. AMRIT_LED or VB_AMRIT_ORANGE"
                          onChange={(e) => handleUpdateVariation(v.id, { targetTextureName: e.target.value })}
                          style={{ width: '100%', fontSize: 11, padding: '5px 8px', marginTop: 2 }}
                        />
                      </div>

                      {/* Background Color & Image for Variation */}
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                        <div style={{ flex: 1 }}>
                          <label style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
                            BG Color:
                          </label>
                          <div style={{ display: 'flex', gap: 4, alignItems: 'center', marginTop: 2 }}>
                            <input
                              type="color"
                              value={v.backgroundColor || '#000000'}
                              onChange={(e) => handleUpdateVariation(v.id, { backgroundColor: e.target.value })}
                              style={{ width: 26, height: 26, padding: 0, border: 'none', cursor: 'pointer', background: 'transparent' }}
                            />
                            <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#cbd5e1' }}>
                              {v.backgroundColor || '#000000'}
                            </span>
                          </div>
                        </div>

                        <div style={{ flex: 2 }}>
                          <label style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
                            Variation Background Texture:
                          </label>
                          <div style={{ display: 'flex', gap: 4, marginTop: 2 }}>
                            <button
                              type="button"
                              className="btn-secondary"
                              style={{ fontSize: 10, padding: '4px 6px', flex: 1 }}
                              onClick={() => triggerVariationBgUpload(v.id)}
                            >
                              <Upload size={11} /> {v.backgroundImageUrl ? 'Replace' : 'Upload Texture'}
                            </button>
                            {v.backgroundImageUrl && (
                              <button
                                type="button"
                                className="btn-danger-outline"
                                style={{ fontSize: 10, padding: '4px 6px' }}
                                onClick={() => handleUpdateVariation(v.id, { backgroundImageUrl: undefined })}
                              >
                                Clear
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Slot Overrides Quick Summary */}
                      {v.fields && v.fields.length > 0 && (
                        <div style={{ marginTop: 8, padding: 6, background: 'rgba(0,0,0,0.25)', borderRadius: 4 }}>
                          <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700 }}>
                            SLOT STYLING OVERRIDES ({v.fields.length} SLOTS):
                          </span>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                            {v.fields.map((fld) => (
                              <div
                                key={fld.id}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  fontSize: 10,
                                  background: 'rgba(255,255,255,0.05)',
                                  padding: '2px 6px',
                                  borderRadius: 3
                                }}
                              >
                                <span
                                  style={{
                                    display: 'inline-block',
                                    width: 8,
                                    height: 8,
                                    borderRadius: '50%',
                                    backgroundColor: fld.color || '#fff'
                                  }}
                                />
                                <span style={{ color: '#cbd5e1' }}>{fld.label || fld.id}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {saveToast && (
          <div className="notification-toast">
            <CheckCircle size={15} />
            <span>{saveToast}</span>
          </div>
        )}
      </aside>

      {/* Admin Canvas Area */}
      <main className="admin-main-stage">
        <div className="admin-stage-topbar">
          <div className="template-headline">
            {isRenaming ? (
              <form className="inline-rename-form" onSubmit={handleSaveRename}>
                <input
                  type="text"
                  className="inline-rename-input"
                  value={renameText}
                  onChange={(e) => setRenameText(e.target.value)}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setRenameText(template.name);
                      setIsRenaming(false);
                    }
                  }}
                />
                <button type="submit" className="btn-save-rename" title="Save name">
                  <Check size={14} />
                </button>
                <button
                  type="button"
                  className="btn-cancel-rename"
                  onClick={() => {
                    setRenameText(template.name);
                    setIsRenaming(false);
                  }}
                  title="Cancel"
                >
                  <X size={14} />
                </button>
              </form>
            ) : (
              <div className="title-row-container">
                <h3>{template.name}</h3>
                <button
                  type="button"
                  className="btn-rename-trigger"
                  onClick={() => {
                    setRenameText(template.name);
                    setIsRenaming(true);
                  }}
                  title="Rename this template"
                >
                  <Edit3 size={13} /> Rename
                </button>
              </div>
            )}

            <button
              type="button"
              className={`status-tag-btn ${template.published ? 'tag-published' : 'tag-draft'}`}
              onClick={() => handlePublishToggle()}
              title={template.published ? 'Currently VISIBLE to users on site. Click to hide.' : 'Currently HIDDEN from users. Click to make visible.'}
            >
              {template.published ? (
                <>
                  <Eye size={12} /> 👁️ Visible to Users (Live)
                </>
              ) : (
                <>
                  <EyeOff size={12} /> 🙈 Hidden from Users (Draft)
                </>
              )}
            </button>
            <span className="board-dimensions">
              {template.baseWidth} × {template.baseHeight} px
            </span>
          </div>

          <div className="stage-actions">
            <button
              type="button"
              className={`btn-visibility-action ${template.published ? 'is-live' : 'is-draft'}`}
              onClick={() => handlePublishToggle()}
              title={template.published ? 'Click to hide this template from regular users' : 'Click to make this template visible on the website'}
            >
              {template.published ? (
                <>
                  <EyeOff size={14} /> Hide from Users
                </>
              ) : (
                <>
                  <Eye size={14} /> Visible to Users
                </>
              )}
            </button>

            <button
              type="button"
              className="btn-danger-outline"
              onClick={handleDeleteActiveTemplate}
              title="Delete this template"
            >
              <Trash2 size={14} /> Delete Template
            </button>
            <button type="button" className="btn-primary" onClick={onCreateNewTemplate}>
              <Plus size={14} /> New Template
            </button>
          </div>
        </div>

        {/* Canvas Viewport with Slot Handles */}
        <div className="canvas-viewport admin-viewport">
          {/* Active Variation Editing Banner */}
          {editingVariationOnCanvas && (() => {
            const currentVar = (template.variations || []).find((v) => v.id === editingVariationOnCanvas);
            return (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 16px',
                  background: 'linear-gradient(90deg, rgba(234, 88, 12, 0.25), rgba(249, 115, 22, 0.25))',
                  border: '1px solid #ea580c',
                  borderRadius: '8px',
                  marginBottom: '10px',
                  width: '100%',
                  maxWidth: '960px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles size={16} style={{ color: '#fb923c' }} />
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#fed7aa' }}>
                    Currently Editing Variation: <strong>{currentVar?.name || 'Variation'}</strong>
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    className="btn-primary"
                    style={{ fontSize: '11px', padding: '4px 10px', background: '#ea580c' }}
                    onClick={handleSaveCanvasToActiveVariation}
                    title="Save current canvas slots, colors, and background to this variation"
                  >
                    💾 Save Changes to Variation
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ fontSize: '11px', padding: '4px 10px' }}
                    onClick={handleFinishEditingVariation}
                  >
                    ✕ Done
                  </button>
                </div>
              </div>
            );
          })()}

          <div className="canvas-helper-banner">
            <Move size={14} />
            <span>Drag slots or picture boxes to position them. Use tabs on the left to edit details, slots, permissions, and visibility.</span>
          </div>

          {/* Canvas Zoom In / Out Toolbar */}
          <div className="canvas-zoom-toolbar">
            <div className="zoom-controls-group">
              <button
                type="button"
                className="btn-zoom"
                onClick={handleZoomOut}
                disabled={zoomLevel <= 0.25}
                title="Zoom Out (-25%)"
              >
                <ZoomOut size={14} />
              </button>

              <div className="zoom-preset-selector">
                {[0.5, 0.75, 1.0, 1.5, 2.0, 3.0].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    className={`btn-zoom-preset ${zoomLevel === preset ? 'active' : ''}`}
                    onClick={() => handleZoomSet(preset)}
                  >
                    {Math.round(preset * 100)}%
                  </button>
                ))}
              </div>

              <button
                type="button"
                className="btn-zoom"
                onClick={handleZoomIn}
                disabled={zoomLevel >= 3.0}
                title="Zoom In (+25%)"
              >
                <ZoomIn size={14} />
              </button>

              <button
                type="button"
                className="btn-zoom-reset"
                onClick={handleZoomReset}
                title="Reset to default fit (100%)"
              >
                <Maximize2 size={13} /> Fit (100%)
              </button>
            </div>
            <span className="zoom-current-indicator">Zoom: {Math.round(zoomLevel * 100)}%</span>
          </div>

          <BoardCanvas
            template={template}
            values={previewValues}
            isAdminMode={true}
            selectedFieldId={selectedFieldId}
            onSelectField={(id) => setSelectedFieldId(id)}
            onUpdateFieldPosition={handleUpdateFieldPosition}
            zoomScale={zoomLevel}
          />
        </div>

        {/* Bottom Catalog */}
        <div className="admin-templates-catalog">
          <div className="catalog-header-row">
            <span className="catalog-title">TEMPLATE REPOSITORY ({templates.length} TEMPLATES)</span>
            <span className="catalog-subtitle">
              Click any card to select · Action buttons: 👁️ Hide/Show, ✏️ Rename, 🗑️ Delete
            </span>
          </div>

          <div className="catalog-grid">
            {templates.map((t) => (
              <div
                key={t.id}
                className={`catalog-item ${t.id === template.id ? 'active' : ''}`}
                onClick={() => onSelectTemplate(t)}
              >
                <div className="item-badge-row">
                  <span className="item-cat">{t.category}</span>
                  <span className={`item-dot ${t.published ? 'published' : 'draft'}`}>
                    {t.published ? '👁️ Live' : '🙈 Hidden'}
                  </span>
                </div>

                <strong className="item-name">{t.name}</strong>
                <small className="item-slots">{t.fields.length} slots · {t.baseWidth}×{t.baseHeight}px</small>

                {/* Quick Action Toolbar on Each Card */}
                <div className="catalog-card-actions" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    className={`btn-card-action ${t.published ? 'action-visible' : 'action-hidden'}`}
                    onClick={(e) => handleToggleCatalogVisibility(t, e)}
                    title={t.published ? 'Currently VISIBLE to users. Click to HIDE.' : 'Currently HIDDEN from users. Click to MAKE VISIBLE.'}
                  >
                    {t.published ? <EyeOff size={12} /> : <Eye size={12} />}
                    <span>{t.published ? 'Hide' : 'Show'}</span>
                  </button>

                  <button
                    type="button"
                    className="btn-card-action"
                    onClick={(e) => handleRenameCatalogCard(t, e)}
                    title="Rename this template"
                  >
                    <Edit3 size={12} />
                    <span>Rename</span>
                  </button>

                  <button
                    type="button"
                    className="btn-card-action action-delete"
                    onClick={(e) => handleDeleteCatalogCard(t, e)}
                    title="Delete this template"
                  >
                    <Trash2 size={12} />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>


      {/* Custom Railway Font Manager Modal */}
      <CustomFontModal
        isOpen={showCustomFontModal}
        onClose={() => setShowCustomFontModal(false)}
        onFontAdded={(fontVal) => {
          if (selectedFieldId) {
            handleUpdateSelectedField({ fontFamily: fontVal });
          }
        }}
      />
    </div>
  );
};

'use client';

import React, { useState, useRef } from 'react';
import { BoardTemplate, EditableField, BoardCategory } from '@/lib/board-studio/types';
import { BoardCanvas } from './board-canvas';
import { CustomFontModal } from './custom-font-modal';
import { fontManager } from '@/lib/board-studio/font-manager';
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
  Maximize2
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
  const [activeTab, setActiveTab] = useState<'details' | 'fields' | 'board' | 'fixed'>('details');
  const [saveToast, setSaveToast] = useState<string | null>(null);

  // Rename states
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameText, setRenameText] = useState(activeTemplate.name);

  // Zoom controls state
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);

  const bgFileInputRef = useRef<HTMLInputElement>(null);
  const slotImageInputRef = useRef<HTMLInputElement>(null);

  // Keep local template in sync when parent activeTemplate changes
  React.useEffect(() => {
    setTemplate(activeTemplate);
    setRenameText(activeTemplate.name);
    setIsRenaming(false);
    setZoomLevel(1.0);
    if (activeTemplate.fields.length > 0) {
      setSelectedFieldId(activeTemplate.fields[0].id);
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

  // Image Upload handler for custom background texture map
  const handleBgImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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
        setSaveToast(`Background texture loaded (${img.naturalWidth}×${img.naturalHeight}px)`);
        setTimeout(() => setSaveToast(null), 3000);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
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

      {/* Admin Sidebar */}
      <aside className="admin-sidebar">
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
                >
                  <Upload size={14} /> Upload Background Image
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

        {/* TAB 3: FIXED ELEMENTS */}
        {activeTab === 'fixed' && (
          <div className="tab-content">
            <span className="sub-title">Static Non-Editable Stamps</span>
            <p className="field-help">
              Elements that users cannot move or edit.
            </p>

            <div className="fixed-elements-list">
              {template.fixedGraphics.map((item, idx) => (
                <div key={item.id} className="fixed-item-row">
                  <span className="fixed-badge">{item.type}</span>
                  <input
                    type="text"
                    value={item.content || ''}
                    placeholder="Content..."
                    onChange={(e) => {
                      const updated = [...template.fixedGraphics];
                      updated[idx] = { ...updated[idx], content: e.target.value };
                      updateTemplate({ fixedGraphics: updated });
                    }}
                  />
                  <button
                    type="button"
                    className="btn-delete-slot"
                    onClick={() => {
                      updateTemplate({
                        fixedGraphics: template.fixedGraphics.filter((_, i) => i !== idx)
                      });
                    }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              className="btn-secondary"
              style={{ marginTop: 10 }}
              onClick={() => {
                const newG = {
                  id: `fixed_${Date.now()}`,
                  type: 'text' as const,
                  content: 'INDIAN RAILWAYS',
                  x: 50,
                  y: 10,
                  fontSize: 14,
                  fontWeight: 700,
                  color: '#ffffff'
                };
                updateTemplate({ fixedGraphics: [...template.fixedGraphics, newG] });
              }}
            >
              <Plus size={13} /> Add Static Text / Divider
            </button>
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

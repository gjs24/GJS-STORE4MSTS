'use client';

import React, { useState, useEffect, useRef } from 'react';
import { BoardTemplate, UserBoardValues } from '@/lib/board-studio/types';
import { BoardCanvas } from './board-canvas';
import { exportBoardToPNG, exportBoardToDDS, printBoard } from '@/lib/board-studio/export-utils';
import { storageService } from '@/lib/board-studio/storage-service';
import {
  Download,
  Printer,
  RotateCcw,
  Sparkles,
  Lock,
  Unlock,
  Layers,
  CheckCircle2,
  BookmarkPlus,
  FileCode,
  SlidersHorizontal,
  ArrowLeft,
  Upload,
  Image as ImageIcon,
  Store,
  ShoppingCart,
  ShieldCheck
} from 'lucide-react';

interface UserBoardEditorProps {
  templates: BoardTemplate[];
  activeTemplate: BoardTemplate;
  initialValues?: UserBoardValues | null;
  initialCustomBackground?: string | null;
  onSelectTemplate: (template: BoardTemplate) => void;
  onBackToHome?: () => void;
  onNavigateToMyStore?: () => void;
  onOpenPurchaseModal?: (template: BoardTemplate) => void;
  unlockedTemplateIds?: string[];
}

export const UserBoardEditor: React.FC<UserBoardEditorProps> = ({
  templates,
  activeTemplate,
  initialValues,
  initialCustomBackground,
  onSelectTemplate,
  onBackToHome,
  onNavigateToMyStore,
  onOpenPurchaseModal,
  unlockedTemplateIds = []
}) => {
  const isUnlocked = !activeTemplate.isPaid || activeTemplate.isUnlocked || unlockedTemplateIds.includes(activeTemplate.id);
  const openPurchaseModal = (tpl: BoardTemplate) => {
    if (onOpenPurchaseModal) onOpenPurchaseModal(tpl);
  };

  const [values, setValues] = useState<UserBoardValues>({});
  const [customBackground, setCustomBackground] = useState<string | null>(null);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [selectedVariationId, setSelectedVariationId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [savedStatus, setSavedStatus] = useState<string | null>(null);
  const [isExportingDDS, setIsExportingDDS] = useState(false);
  const [isExportingPNG, setIsExportingPNG] = useState(false);
  const [ddsFormat, setDdsFormat] = useState<'bgra8' | 'dxt5'>('bgra8');
  const [exportFilename, setExportFilename] = useState<string>(
    activeTemplate.targetTextureName || activeTemplate.name
  );
  
  const [uploadingFieldId, setUploadingFieldId] = useState<string | null>(null);
  const userBgFileRef = useRef<HTMLInputElement>(null);
  const userSlotImgRef = useRef<HTMLInputElement>(null);

  // Compute effective template with selected variation overrides applied
  const effectiveTemplate = React.useMemo(() => {
    if (!selectedVariationId) return activeTemplate;
    const variation = activeTemplate.variations?.find((v) => v.id === selectedVariationId);
    if (!variation) return activeTemplate;

    let mergedFields = activeTemplate.fields;
    if (variation.fields && Array.isArray(variation.fields)) {
      mergedFields = variation.fields.map((vf) => {
        const base = activeTemplate.fields.find((f) => f.id === vf.id);
        return base ? { ...base, ...vf } : vf;
      });
    }

    return {
      ...activeTemplate,
      backgroundImageUrl:
        variation.backgroundImageUrl !== undefined && variation.backgroundImageUrl !== ''
          ? variation.backgroundImageUrl
          : activeTemplate.backgroundImageUrl,
      backgroundColor: variation.backgroundColor || activeTemplate.backgroundColor,
      targetTextureName: variation.targetTextureName || activeTemplate.targetTextureName,
      allowUserEditTextureName:
        variation.allowUserEditTextureName !== undefined
          ? variation.allowUserEditTextureName
          : activeTemplate.allowUserEditTextureName,
      fields: mergedFields,
      fixedGraphics:
        variation.fixedGraphics && Array.isArray(variation.fixedGraphics)
          ? variation.fixedGraphics
          : activeTemplate.fixedGraphics
    };
  }, [activeTemplate, selectedVariationId]);

  // Automatically load fields when template or initialValues changes
  useEffect(() => {
    setSelectedVariationId(null);
    setExportFilename(activeTemplate.targetTextureName || activeTemplate.name);
    if (initialValues) {
      setValues(initialValues);
      setCustomBackground(initialCustomBackground || null);
    } else {
      const initial: UserBoardValues = {};
      activeTemplate.fields.forEach((f) => {
        initial[f.id] = f.defaultValue || f.imageUrl || '';
      });
      setValues(initial);
      setCustomBackground(null);
    }
    if (activeTemplate.fields.length > 0) {
      setSelectedFieldId(activeTemplate.fields[0].id);
    }
  }, [activeTemplate.id, initialValues, initialCustomBackground]);

  const handleSelectVariation = (varId: string | null) => {
    setSelectedVariationId(varId);
    if (varId) {
      const v = activeTemplate.variations?.find((item) => item.id === varId);
      if (v?.targetTextureName) {
        setExportFilename(v.targetTextureName);
      }
      if (v?.fields) {
        setValues((prev) => {
          const next = { ...prev };
          v.fields?.forEach((f) => {
            if (next[f.id] === undefined) {
              next[f.id] = f.defaultValue || f.imageUrl || '';
            }
          });
          return next;
        });
      }
      setSavedStatus(`Switched style variation to: ${v?.name || 'Variation'}`);
    } else {
      setExportFilename(activeTemplate.targetTextureName || activeTemplate.name);
      setSavedStatus('Switched to default style');
    }
    setTimeout(() => setSavedStatus(null), 2500);
  };

  const handleFieldChange = (fieldId: string, val: string) => {
    if (!isUnlocked) {
      openPurchaseModal(activeTemplate);
      return;
    }
    setValues((prev) => ({
      ...prev,
      [fieldId]: val
    }));
  };

  const handleResetToDefaults = () => {
    if (!isUnlocked) {
      openPurchaseModal(activeTemplate);
      return;
    }
    const initial: UserBoardValues = {};
    effectiveTemplate.fields.forEach((f) => {
      initial[f.id] = f.defaultValue || f.imageUrl || '';
    });
    setValues(initial);
    setCustomBackground(null);
    setSavedStatus('Reset all content to template defaults');
    setTimeout(() => setSavedStatus(null), 2500);
  };

  // User Custom Background Upload (if admin allowed)
  const handleUserBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isUnlocked) {
      openPurchaseModal(activeTemplate);
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setCustomBackground(event.target?.result as string);
      setSavedStatus('Custom background image applied!');
      setTimeout(() => setSavedStatus(null), 2500);
    };
    reader.readAsDataURL(file);
  };

  // User Slot Image Upload
  const triggerSlotImageUpload = (fieldId: string) => {
    if (!isUnlocked) {
      openPurchaseModal(activeTemplate);
      return;
    }
    setUploadingFieldId(fieldId);
    userSlotImgRef.current?.click();
  };

  const handleSlotImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isUnlocked) {
      openPurchaseModal(activeTemplate);
      return;
    }
    const file = e.target.files?.[0];
    if (!file || !uploadingFieldId) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      handleFieldChange(uploadingFieldId, dataUrl);
      setSavedStatus('Picture updated in slot!');
      setTimeout(() => setSavedStatus(null), 2500);
    };
    reader.readAsDataURL(file);
  };

  const handleExportDDS = async () => {
    if (!isUnlocked) {
      openPurchaseModal(activeTemplate);
      return;
    }
    setIsExportingDDS(true);
    try {
      await exportBoardToDDS(
        effectiveTemplate,
        values,
        ddsFormat,
        customBackground || undefined,
        exportFilename
      );
      setSavedStatus(`Exported ${exportFilename || effectiveTemplate.name} to DDS (${ddsFormat.toUpperCase()}) successfully!`);
      setTimeout(() => setSavedStatus(null), 3500);
    } catch (err) {
      console.error('DDS export error:', err);
      alert('Error generating DDS file: ' + err);
    } finally {
      setIsExportingDDS(false);
    }
  };

  const handleExportPNG = async () => {
    if (!isUnlocked) {
      openPurchaseModal(activeTemplate);
      return;
    }
    setIsExportingPNG(true);
    try {
      await exportBoardToPNG(
        effectiveTemplate,
        values,
        1,
        customBackground || undefined,
        exportFilename
      );
      setSavedStatus(`Exported ${exportFilename || effectiveTemplate.name}.png successfully!`);
      setTimeout(() => setSavedStatus(null), 3000);
    } catch (err) {
      console.error('PNG export error:', err);
    } finally {
      setIsExportingPNG(false);
    }
  };

  const handleSaveToMyStore = () => {
    if (!isUnlocked) {
      openPurchaseModal(activeTemplate);
      return;
    }
    const defaultTitle = values[effectiveTemplate.fields[0]?.id] || effectiveTemplate.name;
    const boardTitle = window.prompt("Save this customized board to My Store as:", defaultTitle);
    if (!boardTitle || !boardTitle.trim()) return;

    storageService.saveUserBoard({
      id: 'board_' + Date.now(),
      templateId: activeTemplate.id,
      title: boardTitle.trim(),
      values,
      customBackground: customBackground || undefined,
      savedAt: new Date().toISOString()
    });
    setSavedStatus(`Saved "${boardTitle.trim()}" to My Store!`);
    setTimeout(() => setSavedStatus(null), 3000);
  };

  // Quick presets
  const applyPreset = (presetName: string) => {
    if (activeTemplate.id.includes('amrit-bharat')) {
      if (presetName === 'HOWRAH EXPRESS') {
        setValues((prev) => ({
          ...prev,
          train_no_up: '13063',
          train_no_dn: '13064',
          route_codes: 'HWH < > BLGT',
          train_name_top: 'HOWRAH AMRIT BHARAT EXP',
          train_name_bottom: 'BALURGHAT ➔ HOWRAH'
        }));
      } else if (presetName === 'DELHI EXPRESS') {
        setValues((prev) => ({
          ...prev,
          train_no_up: '15557',
          train_no_dn: '15558',
          route_codes: 'DBG < > ANVT',
          train_name_top: 'AMRIT BHARAT EXPRESS',
          train_name_bottom: 'DARBHANGA ➔ ANAND VIHAR'
        }));
      }
    } else if (activeTemplate.id.includes('gjs-productions')) {
      if (presetName === 'KARNATAKA') {
        setValues((prev) => ({
          ...prev,
          led_row_1: 'KARNATAKA EXP',
          led_row_2: 'SBC < > NDLS',
          led_row_3: 'SUPERFAST EXPRESS',
          led_row_4: 'COACH S4'
        }));
      }
    }
  };

  const filteredTemplates = activeCategory === 'All'
    ? templates
    : templates.filter((t) => t.category === activeCategory);

  const categories = ['All', 'LED Texture Sheet', 'Coach Board', 'Station Board'];

  return (
    <div className="user-editor-container">
      {/* Hidden file inputs */}
      <input
        ref={userBgFileRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleUserBgUpload}
      />
      <input
        ref={userSlotImgRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleSlotImageFile}
      />

      {/* Sidebar: Automatically Identified Fields */}
      <aside className="editor-sidebar">
        <div className="editor-nav-actions">
          {onBackToHome && (
            <button
              type="button"
              className="btn-back-to-gallery"
              onClick={onBackToHome}
              title="Browse all templates in Template Store"
            >
              <Store size={14} /> Template Store
            </button>
          )}

          {onNavigateToMyStore && (
            <button
              type="button"
              className="btn-nav-my-store"
              onClick={onNavigateToMyStore}
              title="Access your saved boards in My Store"
            >
              <BookmarkPlus size={14} /> My Store
            </button>
          )}
        </div>

        <div className="sidebar-header">
          <div className="status-pill locked">
            <Lock size={13} />
            <span>Locked UV Template Mode</span>
          </div>
          <p className="sidebar-description">
            UV mapping and texture layout are strictly locked. Modify allowed fields below and download to <strong>DDS format</strong> for your simulator.
          </p>
        </div>

        {/* Unlocked via Asset Banner */}
        {isUnlocked && activeTemplate.unlockedViaAsset && (
          <div style={{ margin: '0 0 14px 0', padding: '10px 12px', borderRadius: 8, background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16 }}>🎁</span>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#6ee7b7' }}>Unlocked via Trainset Asset</div>
              <div style={{ fontSize: 11, color: '#a7f3d0' }}>Included free with your purchase of <strong>{activeTemplate.unlockedViaAsset.title}</strong>.</div>
            </div>
          </div>
        )}

        {/* Template Locked Warning Box if unpurchased */}
        {!isUnlocked && (
          <div className="template-locked-warning-box">
            <div className="lock-header">
              <Lock size={15} style={{ color: 'var(--rail-yellow)' }} />
              <span>Purchase Required to Edit</span>
            </div>
            <p className="lock-desc">
              This is a paid template (₹{activeTemplate.price || 99}). Purchase once to unlock editing, custom textures, and exports.
            </p>
            <button
              type="button"
              className="btn-unlock-big"
              onClick={() => openPurchaseModal(activeTemplate)}
            >
              <ShoppingCart size={14} />
              <span>Unlock Template (₹{activeTemplate.price || 99})</span>
            </button>

            {activeTemplate.bundledWithAssets && activeTemplate.bundledWithAssets.length > 0 && (
              <div style={{ marginTop: 10, padding: '8px 10px', borderRadius: 6, background: 'rgba(234, 179, 8, 0.1)', border: '1px solid rgba(234, 179, 8, 0.3)', fontSize: 11, color: '#fef08a' }}>
                💡 <strong>Bundle Option:</strong> Get this template <strong>FREE</strong> when you purchase{' '}
                <a
                  href={`/assets/${activeTemplate.bundledWithAssets[0].slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ textDecoration: 'underline', fontWeight: 700, color: '#facc15' }}
                >
                  {activeTemplate.bundledWithAssets[0].title}
                </a>{' '}
                (Single Price Bundle)!
              </div>
            )}
          </div>
        )}

        {/* Template Selector */}
        <div className="template-picker-box">
          <label className="picker-label">
            <Layers size={14} /> Active Name Board / Texture
          </label>
          <select
            className="select-template-dropdown"
            value={activeTemplate.id}
            onChange={(e) => {
              const found = templates.find((t) => t.id === e.target.value);
              if (found) onSelectTemplate(found);
            }}
          >
            {templates
              .filter((t) => t.published !== false)
              .map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.category})
                </option>
              ))}
          </select>

          {/* Quick Action: Save to My Store */}
          <button
            type="button"
            className="btn-save-to-my-store"
            onClick={handleSaveToMyStore}
            title="Save this customized board to My Store to re-open or download anytime"
          >
            <BookmarkPlus size={14} /> Save to My Store
          </button>
        </div>

        {/* Style / Theme Variations Selector */}
        {activeTemplate.variations && activeTemplate.variations.length > 0 && (
          <div
            className="variation-selector-box"
            style={{
              margin: '12px 0',
              padding: '12px 14px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, rgba(251, 146, 60, 0.08) 0%, rgba(30, 41, 59, 0.6) 100%)',
              border: '1px solid rgba(251, 146, 60, 0.25)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 12,
                  fontWeight: 700,
                  color: '#fb923c',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}
              >
                <Sparkles size={14} /> Style / Theme Variations
              </label>
              <span style={{ fontSize: 11, color: '#94a3b8' }}>
                {activeTemplate.variations.length} available
              </span>
            </div>
            <p style={{ fontSize: 11, color: '#cbd5e1', margin: '0 0 10px 0', lineHeight: 1.4 }}>
              Choose a theme variant (e.g. Saffron LED, Ice Blue Matrix, Dual-Line, Sleeper) while keeping your custom text.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <button
                type="button"
                onClick={() => handleSelectVariation(null)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: !selectedVariationId ? '1px solid #fb923c' : '1px solid rgba(255,255,255,0.08)',
                  background: !selectedVariationId ? 'rgba(251, 146, 60, 0.15)' : 'rgba(15, 23, 42, 0.6)',
                  color: !selectedVariationId ? '#fed7aa' : '#94a3b8',
                  transition: 'all 0.15s ease'
                }}
              >
                <span>★ Default / Base Style</span>
                {!selectedVariationId && <CheckCircle2 size={14} style={{ color: '#fb923c' }} />}
              </button>
              {activeTemplate.variations.map((v) => {
                const isSelected = selectedVariationId === v.id;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => handleSelectVariation(v.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: isSelected ? '1px solid #fb923c' : '1px solid rgba(255,255,255,0.08)',
                      background: isSelected ? 'rgba(251, 146, 60, 0.15)' : 'rgba(15, 23, 42, 0.6)',
                      color: isSelected ? '#fed7aa' : '#cbd5e1',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ textAlign: 'left' }}>
                      <div>{v.name}</div>
                      {v.description && (
                        <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 400, marginTop: 2 }}>
                          {v.description}
                        </div>
                      )}
                    </div>
                    {isSelected && (
                      <CheckCircle2 size={14} style={{ color: '#fb923c', flexShrink: 0, marginLeft: 8 }} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* User Background Customization (If permitted by Admin) */}
        <div className="user-bg-permission-card">
          <div className="perm-header">
            {activeTemplate.allowUserCustomBackground ? (
              <Unlock size={14} className="perm-icon unlocked" />
            ) : (
              <Lock size={14} className="perm-icon locked" />
            )}
            <span className="picker-label">
              Background Texture: {activeTemplate.allowUserCustomBackground ? 'Customizable' : 'Locked by Admin'}
            </span>
          </div>

          {activeTemplate.allowUserCustomBackground ? (
            <div className="user-bg-upload-actions" style={{ marginTop: 6 }}>
              <button
                type="button"
                className="btn-primary"
                style={{ fontSize: 12, padding: '6px 10px' }}
                onClick={() => userBgFileRef.current?.click()}
              >
                <Upload size={13} /> {customBackground ? 'Replace Background' : 'Upload Custom Background'}
              </button>
              {customBackground && (
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ fontSize: 11 }}
                  onClick={() => setCustomBackground(null)}
                >
                  Reset Default
                </button>
              )}
            </div>
          ) : (
            <small style={{ color: 'var(--text-muted)', fontSize: 11 }}>
              Admin has secured the background texture for this template.
            </small>
          )}
        </div>

        {/* DDS Format Selector */}
        <div className="dds-options-box">
          <label className="picker-label">
            <FileCode size={14} /> DirectDraw Surface (DDS) Setting
          </label>
          <div className="dds-format-toggle">
            <button
              type="button"
              className={`btn-dds-chip ${ddsFormat === 'bgra8' ? 'active' : ''}`}
              onClick={() => setDdsFormat('bgra8')}
              title="32-bit Uncompressed BGRA: Highest quality, 100% alpha transparency"
            >
              32-bit BGRA (Universal)
            </button>
            <button
              type="button"
              className={`btn-dds-chip ${ddsFormat === 'dxt5' ? 'active' : ''}`}
              onClick={() => setDdsFormat('dxt5')}
              title="DXT5 (BC3) Compressed: Standard for Trainz game textures"
            >
              DXT5 (Compressed)
            </button>
          </div>
        </div>

        {/* Custom Target Texture Export Filename (Locked by admin by default) */}
        <div className="dds-options-box" style={{ marginTop: 8 }}>
          {effectiveTemplate.allowUserEditTextureName ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <label className="picker-label" style={{ margin: 0 }}>
                  <FileCode size={14} /> Export Filename (MSTS 3D Texture Name)
                </label>
                <span style={{ fontSize: 11, color: 'var(--rail-amber)', fontWeight: 700, fontFamily: 'monospace' }}>
                  {exportFilename ? `${exportFilename}.dds` : `${effectiveTemplate.name}.dds`}
                </span>
              </div>
              <input
                type="text"
                value={exportFilename}
                onChange={(e) => setExportFilename(e.target.value)}
                placeholder="e.g. nameboard_BaseColor or VB_NAME"
                style={{
                  width: '100%',
                  padding: '7px 10px',
                  fontSize: 12,
                  background: 'rgba(0,0,0,0.4)',
                  color: '#fff',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: 4
                }}
              />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                <span style={{ fontSize: 10, color: '#94a3b8', alignSelf: 'center', marginRight: 2 }}>Presets:</span>
                {['nameboard_BaseColor', 'VB_NAME', 'AMRIT_LED', 'COACH_LED', 'STATION_BOARD'].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setExportFilename(preset)}
                    style={{
                      padding: '2px 6px',
                      fontSize: 10,
                      background: exportFilename === preset ? 'var(--rail-amber)' : 'rgba(255,255,255,0.08)',
                      color: '#fff',
                      border: '1px solid rgba(255,255,255,0.15)',
                      borderRadius: 3,
                      cursor: 'pointer'
                    }}
                  >
                    {preset}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setExportFilename(effectiveTemplate.targetTextureName || effectiveTemplate.name)}
                  style={{
                    padding: '2px 6px',
                    fontSize: 10,
                    background: 'transparent',
                    color: '#94a3b8',
                    border: '1px dashed rgba(255,255,255,0.2)',
                    borderRadius: 3,
                    cursor: 'pointer'
                  }}
                >
                  Reset
                </button>
              </div>
            </>
          ) : (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Lock size={13} style={{ color: '#94a3b8' }} />
                  <label className="picker-label" style={{ margin: 0, fontSize: 11, fontWeight: 700 }}>
                    Export Filename (MSTS 3D Model):
                  </label>
                </div>
                <span style={{ fontSize: 11, color: 'var(--rail-amber)', fontWeight: 800, fontFamily: 'monospace', background: 'rgba(245, 158, 11, 0.1)', padding: '2px 8px', borderRadius: 4, border: '1px solid rgba(245, 158, 11, 0.25)' }}>
                  {exportFilename ? `${exportFilename}.dds` : `${effectiveTemplate.targetTextureName || effectiveTemplate.name}.dds`}
                </span>
              </div>
              <p style={{ color: '#94a3b8', fontSize: 11, margin: '5px 0 0 0', lineHeight: 1.4 }}>
                Fixed to 3D train model specification so your board texture maps accurately inside simulator without manual renaming.
              </p>
            </div>
          )}
        </div>

        {/* Quick Presets */}
        <div className="presets-row">
          <span className="presets-title">
            <Sparkles size={12} /> Quick Presets:
          </span>
          <div className="preset-buttons">
            {activeTemplate.id.includes('amrit-bharat') ? (
              <>
                <button type="button" onClick={() => applyPreset('DELHI EXPRESS')}>
                  Darbhanga - Delhi
                </button>
                <button type="button" onClick={() => applyPreset('HOWRAH EXPRESS')}>
                  Howrah - Balurghat
                </button>
              </>
            ) : activeTemplate.id.includes('gjs-productions') ? (
              <button type="button" onClick={() => applyPreset('KARNATAKA')}>
                Karnataka Express
              </button>
            ) : (
              <button type="button" onClick={() => applyPreset('TAMIL NADU EXPRESS')}>
                Tamil Nadu Exp
              </button>
            )}
          </div>
        </div>

        {/* Automatically Identified Fields List (Text & Pictures) */}
        <div className="fields-form">
          <div className="slots-header-actions">
            <h4 className="section-heading">
              DETECTED FIELDS ({effectiveTemplate.fields.filter(f => !f.hiddenFromUser).length})
            </h4>
          </div>

          {effectiveTemplate.fields.filter(f => !f.hiddenFromUser).length === 0 ? (
            <p className="no-selection-hint">No user-editable fields in this template.</p>
          ) : (
            effectiveTemplate.fields
              .filter((f) => !f.hiddenFromUser)
              .map((field, idx) => {
              const currentValue = values[field.id] !== undefined ? values[field.id] : (field.defaultValue || field.imageUrl || '');
              const isFocused = selectedFieldId === field.id;
              const isLocked = field.allowUserEdit === false;
              const isImage = field.type === 'image';

              // If locked by admin:
              if (isLocked) {
                return (
                  <div key={field.id} className="field-group locked-field-group">
                    <div className="field-meta">
                      <span className="field-label" style={{ color: 'var(--text-muted)' }}>
                        <span className="field-num">#{idx + 1}</span> {isImage ? '🖼️ ' : ''}{field.label}
                      </span>
                      <span className="badge-locked">
                        <Lock size={10} /> Locked by Admin
                      </span>
                    </div>
                    <div className="locked-field-value">
                      {isImage ? (
                        <span>[Fixed Graphic / Logo Box]</span>
                      ) : (
                        <span>"{currentValue}"</span>
                      )}
                    </div>
                  </div>
                );
              }

              // If editable by user:
              return (
                <div
                  key={field.id}
                  className={`field-group ${isFocused ? 'field-active' : ''}`}
                  onClick={() => setSelectedFieldId(field.id)}
                >
                  <div className="field-meta">
                    <label htmlFor={`input-${field.id}`} className="field-label">
                      <span className="field-num">#{idx + 1}</span> {isImage ? '🖼️ ' : ''}{field.label}
                    </label>
                    {isImage ? (
                      <span className="badge-editable">Picture Upload</span>
                    ) : field.ledGlow ? (
                      <span className="badge-led">LED Amber</span>
                    ) : null}
                  </div>

                  {isImage ? (
                    <div className="user-slot-img-card">
                      {currentValue ? (
                        <div className="user-slot-img-preview">
                          <img src={currentValue} alt={field.label} />
                          <button
                            type="button"
                            className="btn-secondary"
                            style={{ fontSize: 11, padding: '4px 8px' }}
                            onClick={() => triggerSlotImageUpload(field.id)}
                          >
                            Replace Picture
                          </button>
                          <button
                            type="button"
                            className="btn-danger-outline"
                            style={{ fontSize: 11, padding: '4px 8px' }}
                            onClick={() => handleFieldChange(field.id, '')}
                          >
                            Clear
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="btn-primary"
                          style={{ width: '100%', fontSize: 12, padding: '8px 12px' }}
                          onClick={() => triggerSlotImageUpload(field.id)}
                        >
                          <Upload size={13} /> Upload Picture / Logo
                        </button>
                      )}
                    </div>
                  ) : (
                    <input
                      id={`input-${field.id}`}
                      type="text"
                      className="field-input"
                      value={currentValue}
                      placeholder={field.placeholder || 'Re-enter content...'}
                      onChange={(e) => handleFieldChange(field.id, e.target.value)}
                      onFocus={() => setSelectedFieldId(field.id)}
                      maxLength={field.maxChars || 80}
                    />
                  )}

                  {field.helpText && <span className="field-help">{field.helpText}</span>}
                </div>
              );
            })
          )}
        </div>

        {/* Footer Actions */}
        <div className="sidebar-footer-actions">
          <button
            type="button"
            className="btn-secondary"
            onClick={handleResetToDefaults}
            title="Revert all fields to template defaults"
          >
            <RotateCcw size={14} /> Reset
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={handleSaveToMyStore}
            title="Save this board customization to My Store"
          >
            <BookmarkPlus size={14} /> Save to My Store
          </button>
        </div>

        {savedStatus && (
          <div className="notification-toast">
            <CheckCircle2 size={15} />
            <span>{savedStatus}</span>
          </div>
        )}
      </aside>

      {/* Main Preview Stage */}
      <main className="editor-preview-stage">
        <div className="preview-top-toolbar">
          <div className="category-tabs">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                className={`cat-tab ${activeCategory === cat ? 'active' : ''}`}
                onClick={() => setActiveCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="toolbar-actions">
            <button
              type="button"
              className="btn-action"
              onClick={printBoard}
              title="Print name board"
            >
              <Printer size={15} /> Print
            </button>
            <button
              type="button"
              className="btn-action"
              onClick={handleExportPNG}
              disabled={isExportingPNG}
              title="Download transparent PNG"
            >
              <Download size={14} /> PNG
            </button>
            <button
              type="button"
              className="btn-primary dds-highlight"
              onClick={handleExportDDS}
              disabled={isExportingDDS}
              title="Export directly to DirectDraw Surface (DDS) texture file"
            >
              <FileCode size={15} /> {isExportingDDS ? 'Saving DDS...' : `Download DDS (${ddsFormat.toUpperCase()})`}
            </button>
          </div>
        </div>

        {/* Canvas Viewport */}
        <div className="canvas-viewport">
          <div className="board-info-header">
            <span className="board-title">{activeTemplate.name}</span>
            <span className="board-dimensions">
              {activeTemplate.baseWidth} × {activeTemplate.baseHeight} px · {activeTemplate.isTextureSheet ? 'Simulator Texture Sheet' : 'Name Board'}
            </span>
          </div>

          {/* Locked Canvas Banner */}
          {!isUnlocked && (
            <div className="canvas-locked-banner">
              <div className="locked-banner-left">
                <Lock size={15} style={{ color: 'var(--rail-yellow)' }} />
                <span>
                  <strong>PREVIEW ONLY (LOCKED):</strong> This template costs ₹{activeTemplate.price || 99}. Unlock to customize content & download textures.
                </span>
              </div>
              <button
                type="button"
                className="btn-unlock-banner"
                onClick={() => openPurchaseModal(activeTemplate)}
              >
                <ShoppingCart size={13} />
                <span>Unlock for ₹{activeTemplate.price || 99}</span>
              </button>
            </div>
          )}

          <BoardCanvas
            template={effectiveTemplate}
            values={values}
            customBackgroundUrl={customBackground || undefined}
            isAdminMode={false}
            selectedFieldId={selectedFieldId}
            onSelectField={(id) => setSelectedFieldId(id)}
          />

          <div className="canvas-footer-hint">
            <span>💡 Re-enter the content in the left panel. Click <strong>Download DDS</strong> to generate the DirectDraw Surface texture for your game simulator.</span>
          </div>
        </div>

        {/* Bottom Template Drawer Gallery */}
        <div className="template-cards-gallery">
          <div className="gallery-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Store size={14} style={{ color: 'var(--rail-accent)' }} />
              <span>TEMPLATE STORE — QUICK SELECTOR</span>
            </div>
            <small style={{ color: 'var(--text-muted)' }}>Click any template below to switch instantly</small>
          </div>
          <div className="gallery-cards-scroll">
            {filteredTemplates.map((tpl) => (
              <div
                key={tpl.id}
                className={`tpl-card ${tpl.id === activeTemplate.id ? 'active' : ''}`}
                onClick={() => onSelectTemplate(tpl)}
              >
                <div
                  className="tpl-card-preview"
                  style={{
                    backgroundColor: tpl.backgroundColor || '#0c1013',
                    borderColor: tpl.borderColor || '#33404d',
                    backgroundImage: tpl.backgroundImageUrl ? `url("${tpl.backgroundImageUrl}")` : undefined,
                    backgroundSize: 'cover'
                  }}
                >
                  <span style={{ color: tpl.fields[0]?.color || '#ffb703', textShadow: '0 0 4px #000' }}>
                    {tpl.fields[1]?.defaultValue || tpl.fields[0]?.defaultValue || tpl.name}
                  </span>
                </div>
                <div className="tpl-card-info">
                  <strong>{tpl.name}</strong>
                  <small>{tpl.category}</small>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

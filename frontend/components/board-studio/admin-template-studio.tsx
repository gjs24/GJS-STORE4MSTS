'use client';

import React, { useState, useRef, useEffect } from 'react';
import { BoardTemplate, EditableField, BoardCategory, FixedGraphicElement, BoardVariation, QuickPreset } from '@/lib/board-studio/types';
import { BoardCanvas } from './board-canvas';
import { CustomFontModal } from './custom-font-modal';
import { fontManager } from '@/lib/board-studio/font-manager';
import { storageService } from '@/lib/board-studio/storage-service';
import { convertGoogleDriveUrl } from '@/lib/board-studio/image-utils';
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
  RefreshCw,
  Zap,
  Play,
  ChevronDown,
  ChevronUp,
  ArrowUp,
  ArrowDown
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
  const [activeTab, setActiveTab] = useState<'details' | 'fields' | 'presets' | 'board' | 'fixed' | 'variations'>('details');
  const [saveToast, setSaveToast] = useState<string | null>(null);

  // Quick Presets states
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(
    activeTemplate.quickPresets?.[0]?.id || null
  );
  const [canvasTestPresetId, setCanvasTestPresetId] = useState<string | null>(null);
  const [canvasTestValues, setCanvasTestValues] = useState<Record<string, string> | null>(null);

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
  const baseTemplateBackupRef = useRef<{
    fields: EditableField[];
    backgroundImageUrl?: string;
    backgroundColor: string;
    targetTextureName?: string;
    allowUserEditTextureName?: boolean;
    fixedGraphics?: FixedGraphicElement[];
  } | null>(null);

  const [selectedStampId, setSelectedStampId] = useState<string | null>(
    activeTemplate.fixedGraphics[0]?.id || null
  );

  // Keep local template in sync when parent activeTemplate changes
  React.useEffect(() => {
    setTemplate(activeTemplate);
    setRenameText(activeTemplate.name);
    setIsRenaming(false);
    setZoomLevel(1.0);
    setEditingVariationOnCanvas(null);
    baseTemplateBackupRef.current = null;
    if (activeTemplate.fields.length > 0) {
      setSelectedFieldId(activeTemplate.fields[0].id);
    }
    if (activeTemplate.fixedGraphics.length > 0) {
      setSelectedStampId(activeTemplate.fixedGraphics[0].id);
    }
    setSelectedPresetId(activeTemplate.quickPresets?.[0]?.id || null);
    setCanvasTestPresetId(null);
    setCanvasTestValues(null);
  }, [activeTemplate.id]);

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(3.0, Number((prev + 0.25).toFixed(2))));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(0.25, Number((prev - 0.25).toFixed(2))));
  const handleZoomReset = () => setZoomLevel(1.0);
  const handleZoomSet = (val: number) => setZoomLevel(val);

  const updateTemplate = (updates: Partial<BoardTemplate>) => {
    setTemplate((prev) => {
      const next = { ...prev, ...updates, updatedAt: new Date().toISOString() };
      let toPersist = next;
      if (editingVariationOnCanvas && baseTemplateBackupRef.current) {
        const currentCanvasFields = next.fields.map((f) => ({ ...f }));
        const updatedVariations = (next.variations || []).map((v) =>
          v.id === editingVariationOnCanvas
            ? {
                ...v,
                backgroundImageUrl: next.backgroundImageUrl,
                backgroundColor: next.backgroundColor,
                targetTextureName: next.targetTextureName,
                fields: currentCanvasFields,
                fixedGraphics: next.fixedGraphics ? next.fixedGraphics.map((g) => ({ ...g })) : []
              }
            : v
        );
        toPersist = {
          ...next,
          ...baseTemplateBackupRef.current,
          variations: updatedVariations
        };
        next.variations = updatedVariations;
      }
      onSaveTemplate(toPersist);
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
    let toSave: BoardTemplate = { ...template };
    if (editingVariationOnCanvas && baseTemplateBackupRef.current) {
      const fieldsSnapshot = template.fields.map((f) => ({ ...f }));
      const updatedVars = (template.variations || []).map((v) =>
        v.id === editingVariationOnCanvas
          ? {
              ...v,
              backgroundImageUrl: template.backgroundImageUrl,
              backgroundColor: template.backgroundColor,
              targetTextureName: template.targetTextureName,
              fields: fieldsSnapshot,
              fixedGraphics: template.fixedGraphics ? template.fixedGraphics.map((g) => ({ ...g })) : []
            }
          : v
      );
      toSave = {
        ...template,
        ...baseTemplateBackupRef.current,
        variations: updatedVars,
        updatedAt: new Date().toISOString()
      };
    } else {
      toSave.updatedAt = new Date().toISOString();
    }
    onSaveTemplate(toSave);
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
      console.warn('Server upload failed:', err);
      setIsUploadingBg(false);
      setSaveToast(err instanceof Error ? err.message : 'Server upload failed. Paste a Google Drive link below instead (0 KB storage)!');
      setTimeout(() => setSaveToast(null), 5000);
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
      console.warn('Failed variation image upload:', err);
      setSaveToast(err instanceof Error ? err.message : 'Upload failed. Paste a Google Drive link instead!');
      setTimeout(() => setSaveToast(null), 5000);
    } finally {
      setUploadingForVariationId(null);
    }
  };

  // Variations CRUD & Canvas synchronization
  const handleAddVariation = (customName?: string) => {
    // If currently editing a variation, save it first
    if (editingVariationOnCanvas) {
      handleSaveCanvasToActiveVariation();
    }
    const nextNum = (template.variations?.length || 0) + 1;
    const name = customName || `Variation ${nextNum}`;

    // Snapshot base template if entering variation mode from base
    if (!editingVariationOnCanvas) {
      baseTemplateBackupRef.current = {
        fields: template.fields.map((f) => ({ ...f })),
        backgroundImageUrl: template.backgroundImageUrl,
        backgroundColor: template.backgroundColor,
        targetTextureName: template.targetTextureName,
        allowUserEditTextureName: template.allowUserEditTextureName,
        fixedGraphics: template.fixedGraphics ? template.fixedGraphics.map((g) => ({ ...g })) : []
      };
    }

    const sourceFields = baseTemplateBackupRef.current?.fields || template.fields;
    const sourceBg = baseTemplateBackupRef.current?.backgroundImageUrl !== undefined
      ? baseTemplateBackupRef.current.backgroundImageUrl
      : template.backgroundImageUrl;
    const sourceBgColor = baseTemplateBackupRef.current?.backgroundColor || template.backgroundColor;
    const sourceTex = baseTemplateBackupRef.current?.targetTextureName || template.targetTextureName;
    const sourceAllowUserEdit = baseTemplateBackupRef.current?.allowUserEditTextureName !== undefined
      ? baseTemplateBackupRef.current.allowUserEditTextureName
      : template.allowUserEditTextureName;
    const sourceGfx = baseTemplateBackupRef.current?.fixedGraphics || template.fixedGraphics || [];

    const newVariation: BoardVariation = {
      id: `var_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name,
      description: 'Alternate standalone layout or styling (bundled in single pack)',
      targetTextureName: sourceTex,
      allowUserEditTextureName: sourceAllowUserEdit,
      backgroundImageUrl: sourceBg,
      backgroundColor: sourceBgColor,
      fields: sourceFields.map((f) => ({ ...f })),
      fixedGraphics: sourceGfx.map((g) => ({ ...g }))
    };

    const updated = [...(template.variations || []), newVariation];

    // Persist to template
    const toPersist: BoardTemplate = {
      ...template,
      ...(baseTemplateBackupRef.current || {}),
      variations: updated,
      updatedAt: new Date().toISOString()
    };
    onSaveTemplate(toPersist);

    setEditingVariationOnCanvas(newVariation.id);
    setSelectedVariationId(newVariation.id);
    setTemplate((prev) => ({
      ...prev,
      variations: updated,
      backgroundImageUrl: newVariation.backgroundImageUrl,
      backgroundColor: newVariation.backgroundColor || prev.backgroundColor || '#000000',
      targetTextureName: newVariation.targetTextureName,
      fields: (newVariation.fields || []).map((f) => ({ ...f })),
      fixedGraphics: newVariation.fixedGraphics ? newVariation.fixedGraphics.map((g) => ({ ...g })) : []
    }));

    if (newVariation.fields && newVariation.fields.length > 0) {
      setSelectedFieldId(newVariation.fields[0].id);
    }
    setSaveToast(`Created & loaded "${newVariation.name}" onto canvas. Design it freely!`);
    setTimeout(() => setSaveToast(null), 3500);
  };

  const handleSaveCurrentCanvasAsNewVariation = () => {
    const defaultName = `Variation ${(template.variations?.length || 0) + 1}`;
    const name = window.prompt('Name this new style variation (e.g. "Amrit Bharat Saffron LED" or "Ice Blue Matrix"):', defaultName);
    if (!name || !name.trim()) return;
    handleAddVariation(name.trim());
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
    if (editingVariationOnCanvas === varId) {
      if (baseTemplateBackupRef.current) {
        setTemplate((prev) => ({
          ...prev,
          fields: baseTemplateBackupRef.current!.fields.map((f) => ({ ...f })),
          backgroundImageUrl: baseTemplateBackupRef.current!.backgroundImageUrl,
          backgroundColor: baseTemplateBackupRef.current!.backgroundColor || prev.backgroundColor,
          targetTextureName: baseTemplateBackupRef.current!.targetTextureName,
          allowUserEditTextureName: baseTemplateBackupRef.current!.allowUserEditTextureName,
          fixedGraphics: baseTemplateBackupRef.current!.fixedGraphics || [],
          variations: updated
        }));
        baseTemplateBackupRef.current = null;
      }
      setEditingVariationOnCanvas(null);
    }
    updateTemplate({ variations: updated });
    if (selectedVariationId === varId) setSelectedVariationId(null);
    setSaveToast(`Deleted variation "${v?.name || ''}"`);
    setTimeout(() => setSaveToast(null), 2500);
  };

  const handleDuplicateVariation = (varId: string) => {
    const orig = (template.variations || []).find((item) => item.id === varId);
    if (!orig) return;
    const cloned: BoardVariation = {
      ...orig,
      id: `var_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: `${orig.name} (Copy)`,
      fields: orig.fields ? orig.fields.map((f) => ({ ...f })) : [],
      fixedGraphics: orig.fixedGraphics ? orig.fixedGraphics.map((g) => ({ ...g })) : []
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

    // If currently editing a different variation, save it first
    if (editingVariationOnCanvas && editingVariationOnCanvas !== varId) {
      handleSaveCanvasToActiveVariation();
    }

    // Snapshot base template if entering variation edit mode from base
    if (!editingVariationOnCanvas) {
      baseTemplateBackupRef.current = {
        fields: template.fields.map((f) => ({ ...f })),
        backgroundImageUrl: template.backgroundImageUrl,
        backgroundColor: template.backgroundColor,
        targetTextureName: template.targetTextureName,
        allowUserEditTextureName: template.allowUserEditTextureName,
        fixedGraphics: template.fixedGraphics ? template.fixedGraphics.map((g) => ({ ...g })) : []
      };
    }

    let mergedFields: EditableField[] = [];
    if (v.fields && Array.isArray(v.fields)) {
      mergedFields = v.fields.map((vf) => {
        const base = (baseTemplateBackupRef.current?.fields || template.fields).find((f) => f.id === vf.id);
        return base ? { ...base, ...vf } : { ...vf };
      });
    } else {
      mergedFields = (baseTemplateBackupRef.current?.fields || template.fields).map((f) => ({ ...f }));
    }

    setEditingVariationOnCanvas(varId);
    setSelectedVariationId(varId);
    if (mergedFields.length > 0) {
      setSelectedFieldId(mergedFields[0].id);
    } else {
      setSelectedFieldId(null);
    }

    setTemplate((prev) => ({
      ...prev,
      backgroundImageUrl: v.backgroundImageUrl !== undefined ? v.backgroundImageUrl : prev.backgroundImageUrl,
      backgroundColor: v.backgroundColor || prev.backgroundColor,
      targetTextureName: v.targetTextureName || prev.targetTextureName,
      fields: mergedFields,
      fixedGraphics: v.fixedGraphics && Array.isArray(v.fixedGraphics)
        ? v.fixedGraphics.map((g) => ({ ...g }))
        : (baseTemplateBackupRef.current?.fixedGraphics || prev.fixedGraphics || [])
    }));

    setSaveToast(`Loaded "${v.name}" onto canvas. You can now tweak slots, colors, and background!`);
    setTimeout(() => setSaveToast(null), 3500);
  };

  const handleSaveCanvasToActiveVariation = () => {
    if (!editingVariationOnCanvas) return;
    const v = (template.variations || []).find((item) => item.id === editingVariationOnCanvas);
    if (!v) return;

    const fieldsSnapshot = template.fields.map((f) => ({ ...f }));

    const updatedVars = (template.variations || []).map((item) =>
      item.id === editingVariationOnCanvas
        ? {
            ...item,
            backgroundImageUrl: template.backgroundImageUrl,
            backgroundColor: template.backgroundColor,
            targetTextureName: template.targetTextureName,
            fields: fieldsSnapshot,
            fixedGraphics: template.fixedGraphics ? [...template.fixedGraphics] : []
          }
        : item
    );

    // Persist to parent/cloud immediately
    const toPersist: BoardTemplate = {
      ...template,
      ...(baseTemplateBackupRef.current || {}),
      variations: updatedVars,
      updatedAt: new Date().toISOString()
    };
    onSaveTemplate(toPersist);

    setTemplate((prev) => ({
      ...prev,
      variations: updatedVars
    }));

    setSaveToast(`Saved changes to variation "${v.name}"!`);
    setTimeout(() => setSaveToast(null), 3000);
  };

  const handleFinishEditingVariation = () => {
    if (editingVariationOnCanvas) {
      // First save active variation canvas state
      const fieldsSnapshot = template.fields.map((f) => ({ ...f }));
      const updatedVars = (template.variations || []).map((item) =>
        item.id === editingVariationOnCanvas
          ? {
              ...item,
              backgroundImageUrl: template.backgroundImageUrl,
              backgroundColor: template.backgroundColor,
              targetTextureName: template.targetTextureName,
              fields: fieldsSnapshot,
              fixedGraphics: template.fixedGraphics ? [...template.fixedGraphics] : []
            }
          : item
      );

      const baseSnapshot = baseTemplateBackupRef.current;
      if (baseSnapshot) {
        const restored: BoardTemplate = {
          ...template,
          fields: baseSnapshot.fields.map((f) => ({ ...f })),
          backgroundImageUrl: baseSnapshot.backgroundImageUrl,
          backgroundColor: baseSnapshot.backgroundColor || template.backgroundColor,
          targetTextureName: baseSnapshot.targetTextureName,
          allowUserEditTextureName: baseSnapshot.allowUserEditTextureName,
          fixedGraphics: baseSnapshot.fixedGraphics ? baseSnapshot.fixedGraphics.map((g) => ({ ...g })) : [],
          variations: updatedVars,
          updatedAt: new Date().toISOString()
        };
        onSaveTemplate(restored);
        setTemplate(restored);
        baseTemplateBackupRef.current = null;
      }
    }
    setEditingVariationOnCanvas(null);
    if (template.fields.length > 0) {
      setSelectedFieldId(template.fields[0].id);
    }
    setSaveToast('Exited variation canvas edit mode (returned to base template).');
    setTimeout(() => setSaveToast(null), 2500);
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
    updateTemplate({
      fields: template.fields.map((f) => (f.id === fieldId ? { ...f, x, y } : f))
    });
  };

  const handleUpdateSelectedField = (updates: Partial<EditableField>) => {
    if (!selectedFieldId) return;
    updateTemplate({
      fields: template.fields.map((f) => (f.id === selectedFieldId ? { ...f, ...updates } : f))
    });
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

    updateTemplate({
      fields: [...template.fields, newField]
    });
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

    updateTemplate({
      fields: [...template.fields, newField]
    });
    setSelectedFieldId(newId);
  };

  const handleDeleteField = (fieldId: string) => {
    updateTemplate({
      fields: template.fields.filter((f) => f.id !== fieldId)
    });
    if (selectedFieldId === fieldId) {
      setSelectedFieldId(null);
    }
  };

  // Duplicate / Copy Slot (Text or Picture Box)
  const handleDuplicateField = (fieldId: string) => {
    const orig = template.fields.find((f) => f.id === fieldId);
    if (!orig) return;

    const isImage = orig.type === 'image';
    const newId = `${isImage ? 'pic' : 'field'}_${Date.now()}`;
    const offsetX = Math.min(90, Math.max(2, Number((orig.x + 2.5).toFixed(1))));
    const offsetY = Math.min(90, Math.max(2, Number((orig.y + 2.5).toFixed(1))));

    const cloned: EditableField = {
      ...orig,
      id: newId,
      label: `${orig.label} (Copy)`,
      x: offsetX,
      y: offsetY
    };

    updateTemplate({
      fields: [...template.fields, cloned]
    });
    setSelectedFieldId(newId);
    setSaveToast(`Duplicated ${isImage ? 'Picture Box' : 'Text Slot'}: "${cloned.label}"`);
    setTimeout(() => setSaveToast(null), 2500);
  };

  // Duplicate / Copy Static Stamp / Logo
  const handleDuplicateStamp = (stampId: string) => {
    const orig = template.fixedGraphics.find((g) => g.id === stampId);
    if (!orig) return;
    const newId = `stamp_${Date.now()}`;
    const cloned: FixedGraphicElement = {
      ...orig,
      id: newId,
      x: Math.min(90, Math.max(2, orig.x + 2)),
      y: Math.min(90, Math.max(2, orig.y + 2))
    };
    const updated = [...template.fixedGraphics, cloned];
    updateTemplate({ fixedGraphics: updated });
    setSelectedStampId(newId);
    setSaveToast('Duplicated static stamp / watermark');
    setTimeout(() => setSaveToast(null), 2500);
  };

  // Keyboard shortcut: Ctrl+D to duplicate selected slot
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        const target = e.target as HTMLElement | null;
        const isEditingInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
        if (!isEditingInput && selectedFieldId) {
          e.preventDefault();
          handleDuplicateField(selectedFieldId);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedFieldId, template.fields]);

  const currentField = template.fields.find((f) => f.id === selectedFieldId);

  // Preview values
  const defaultPreviewValues = template.fields.reduce<Record<string, string>>((acc, f) => {
    acc[f.id] = f.defaultValue || f.imageUrl || '';
    return acc;
  }, {});

  const effectivePreviewValues = canvasTestValues
    ? { ...defaultPreviewValues, ...canvasTestValues }
    : defaultPreviewValues;

  // Quick Preset Handlers
  const handleCaptureCanvasAsNewPreset = () => {
    const currentValues: Record<string, string> = {};
    template.fields.forEach((f) => {
      currentValues[f.id] = effectivePreviewValues[f.id] || f.defaultValue || '';
    });
    const defaultName = `Preset ${(template.quickPresets || []).length + 1}`;
    const name = window.prompt('Enter a name for this Quick Preset (e.g. "Tamil Nadu Exp" or "Karnataka Express"):', defaultName);
    if (!name || !name.trim()) return;

    const newPresetId = `preset-${Date.now()}`;
    const newPreset: QuickPreset = {
      id: newPresetId,
      name: name.trim(),
      description: '',
      values: currentValues
    };
    const updated = [...(template.quickPresets || []), newPreset];
    updateTemplate({ quickPresets: updated });
    setSelectedPresetId(newPresetId);
    setSaveToast(`Captured current canvas text into "${newPreset.name}"!`);
    setTimeout(() => setSaveToast(null), 3000);
  };

  const handleAddPreset = () => {
    const defaultVals: Record<string, string> = {};
    template.fields.forEach((f) => {
      defaultVals[f.id] = f.defaultValue || '';
    });
    const newPresetId = `preset-${Date.now()}`;
    const newPreset: QuickPreset = {
      id: newPresetId,
      name: `Preset ${(template.quickPresets || []).length + 1}`,
      description: '',
      values: defaultVals
    };
    const updated = [...(template.quickPresets || []), newPreset];
    updateTemplate({ quickPresets: updated });
    setSelectedPresetId(newPresetId);
  };

  const handleTestPresetOnCanvas = (preset: QuickPreset) => {
    setCanvasTestPresetId(preset.id);
    setCanvasTestValues(preset.values);
    setSaveToast(`Previewing "${preset.name}" live on canvas!`);
    setTimeout(() => setSaveToast(null), 2500);
  };

  const handleOverwritePresetWithCanvas = (presetId: string) => {
    const currentValues: Record<string, string> = {};
    template.fields.forEach((f) => {
      currentValues[f.id] = effectivePreviewValues[f.id] || f.defaultValue || '';
    });
    const updated = (template.quickPresets || []).map((p) =>
      p.id === presetId ? { ...p, values: currentValues } : p
    );
    updateTemplate({ quickPresets: updated });
    if (canvasTestPresetId === presetId) {
      setCanvasTestValues(currentValues);
    }
    setSaveToast('Updated preset with current canvas text!');
    setTimeout(() => setSaveToast(null), 3000);
  };

  const handleUpdatePreset = (presetId: string, updates: Partial<QuickPreset>) => {
    const updated = (template.quickPresets || []).map((p) =>
      p.id === presetId ? { ...p, ...updates } : p
    );
    updateTemplate({ quickPresets: updated });
    if (canvasTestPresetId === presetId && updates.values) {
      setCanvasTestValues(updates.values);
    }
  };

  const handleUpdatePresetFieldValue = (presetId: string, fieldId: string, value: string) => {
    const target = (template.quickPresets || []).find((p) => p.id === presetId);
    if (!target) return;
    const updatedValues = { ...target.values, [fieldId]: value };
    handleUpdatePreset(presetId, { values: updatedValues });
  };

  const handleDuplicatePreset = (presetId: string) => {
    const target = (template.quickPresets || []).find((p) => p.id === presetId);
    if (!target) return;
    const newPresetId = `preset-${Date.now()}`;
    const duplicated: QuickPreset = {
      ...target,
      id: newPresetId,
      name: `${target.name} (Copy)`,
      values: { ...target.values }
    };
    const updated = [...(template.quickPresets || []), duplicated];
    updateTemplate({ quickPresets: updated });
    setSelectedPresetId(newPresetId);
  };

  const handleDeletePreset = (presetId: string) => {
    const target = (template.quickPresets || []).find((p) => p.id === presetId);
    if (!confirm(`Are you sure you want to delete preset "${target?.name || presetId}"?`)) return;
    const updated = (template.quickPresets || []).filter((p) => p.id !== presetId);
    updateTemplate({ quickPresets: updated });
    if (selectedPresetId === presetId) {
      setSelectedPresetId(updated[0]?.id || null);
    }
    if (canvasTestPresetId === presetId) {
      setCanvasTestPresetId(null);
      setCanvasTestValues(null);
    }
  };

  const handleMovePreset = (presetId: string, direction: 'up' | 'down') => {
    const list = [...(template.quickPresets || [])];
    const idx = list.findIndex((p) => p.id === presetId);
    if (idx < 0) return;
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= list.length) return;
    const temp = list[idx];
    list[idx] = list[targetIdx];
    list[targetIdx] = temp;
    updateTemplate({ quickPresets: list });
  };

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

        {/* Design Target Selector (Base Template vs Variations) */}
        <div
          style={{
            padding: '8px 12px 10px 12px',
            background: editingVariationOnCanvas ? 'rgba(234, 88, 12, 0.15)' : 'rgba(255,255,255,0.02)',
            borderBottom: '1px solid rgba(255,255,255,0.08)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                color: editingVariationOnCanvas ? '#fb923c' : '#94a3b8',
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}
            >
              <Sparkles size={12} style={{ color: editingVariationOnCanvas ? '#fb923c' : '#64748b' }} />
              Design Target:
            </span>
            {editingVariationOnCanvas ? (
              <span
                style={{
                  fontSize: 10,
                  background: '#ea580c',
                  color: '#fff',
                  padding: '1px 6px',
                  borderRadius: 10,
                  fontWeight: 700
                }}
              >
                Variation Active
              </span>
            ) : (
              <span
                style={{
                  fontSize: 10,
                  background: 'rgba(255,255,255,0.08)',
                  color: '#94a3b8',
                  padding: '1px 6px',
                  borderRadius: 10,
                  fontWeight: 600
                }}
              >
                Base Template
              </span>
            )}
          </div>
          <select
            style={{
              width: '100%',
              padding: '6px 8px',
              fontSize: 12,
              fontWeight: 600,
              background: editingVariationOnCanvas ? '#1c130d' : '#0e1620',
              color: editingVariationOnCanvas ? '#fed7aa' : '#f8fafc',
              border: editingVariationOnCanvas ? '1px solid #ea580c' : '1px solid rgba(255,255,255,0.18)',
              borderRadius: 5
            }}
            value={editingVariationOnCanvas || 'base'}
            onChange={(e) => {
              const val = e.target.value;
              if (val === 'base') {
                handleFinishEditingVariation();
              } else if (val === '__add_new__') {
                handleAddVariation();
              } else {
                handleLoadVariationToCanvas(val);
              }
            }}
          >
            <option value="base">★ Base Template (Default / Main)</option>
            {(template.variations || []).map((v, idx) => (
              <option key={v.id} value={v.id}>
                🎨 Variation {idx + 1}: {v.name}
              </option>
            ))}
            <option value="__add_new__">+ Add New Variation (Standalone Design)</option>
          </select>
          {editingVariationOnCanvas && (
            <div style={{ marginTop: 6, display: 'flex', gap: 6 }}>
              <button
                type="button"
                onClick={handleSaveCanvasToActiveVariation}
                style={{
                  flex: 1,
                  padding: '4px 6px',
                  fontSize: 10,
                  fontWeight: 700,
                  background: '#ea580c',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 4,
                  cursor: 'pointer'
                }}
              >
                💾 Save Variation
              </button>
              <button
                type="button"
                onClick={handleFinishEditingVariation}
                style={{
                  padding: '4px 8px',
                  fontSize: 10,
                  fontWeight: 600,
                  background: 'rgba(255,255,255,0.1)',
                  color: '#cbd5e1',
                  border: 'none',
                  borderRadius: 4,
                  cursor: 'pointer'
                }}
              >
                ✕ Back to Base
              </button>
            </div>
          )}
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
            className={`admin-tab ${activeTab === 'presets' ? 'active' : ''}`}
            onClick={() => setActiveTab('presets')}
          >
            <Zap size={13} /> Quick Presets ({(template.quickPresets || []).length})
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
                <label style={{ margin: 0, fontWeight: 600 }}>Target Texture Name (MSTS 3D Model Filename):</label>
                <span style={{ fontSize: 11, color: 'var(--rail-amber)', fontWeight: 700, fontFamily: 'monospace' }}>
                  {template.targetTextureName ? `${template.targetTextureName}.dds` : 'Standard Name'}
                </span>
              </div>
              <input
                type="text"
                value={template.targetTextureName || ''}
                placeholder="e.g. nameboard_BaseColor or VB_NAME"
                onChange={(e) => updateTemplate({ targetTextureName: e.target.value })}
              />

              {/* Quick Presets for Admin */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 6, alignItems: 'center' }}>
                <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>Presets:</span>
                {['nameboard_BaseColor', 'VB_NAME', 'AMRIT_LED', 'COACH_LED', 'STATION_BOARD'].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => updateTemplate({ targetTextureName: preset })}
                    style={{
                      padding: '3px 7px',
                      fontSize: 10,
                      fontWeight: 600,
                      fontFamily: 'monospace',
                      background: template.targetTextureName === preset ? 'var(--rail-amber)' : 'rgba(255,255,255,0.08)',
                      color: template.targetTextureName === preset ? '#000' : '#fff',
                      border: '1px solid ' + (template.targetTextureName === preset ? 'var(--rail-amber)' : 'rgba(255,255,255,0.15)'),
                      borderRadius: 3,
                      cursor: 'pointer'
                    }}
                  >
                    {preset}
                  </button>
                ))}
                {template.targetTextureName && (
                  <button
                    type="button"
                    onClick={() => updateTemplate({ targetTextureName: '' })}
                    style={{
                      padding: '3px 7px',
                      fontSize: 10,
                      background: 'transparent',
                      color: '#f87171',
                      border: '1px dashed rgba(248, 113, 113, 0.4)',
                      borderRadius: 3,
                      cursor: 'pointer'
                    }}
                  >
                    Clear
                  </button>
                )}
              </div>

              <span className="field-help" style={{ fontSize: 11, marginTop: 5, display: 'block', color: '#94a3b8' }}>
                Simulator 3D models require exact filename (e.g. <code>nameboard_BaseColor</code> exports directly as <code>nameboard_BaseColor.dds</code>).
              </span>

              {/* Admin Toggle: Can Users Edit Export Filename? */}
              <div style={{ marginTop: 8, padding: '8px 10px', background: 'rgba(0,0,0,0.3)', borderRadius: 5, border: '1px solid rgba(255,255,255,0.08)' }}>
                <label className="checkbox-label" style={{ fontWeight: 600, fontSize: 12, display: 'flex', alignItems: 'center', gap: 7, margin: 0, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={template.allowUserEditTextureName === true}
                    onChange={(e) => updateTemplate({ allowUserEditTextureName: e.target.checked })}
                  />
                  <span>Allow Regular Users to Edit Export Texture Filename</span>
                </label>
                <span style={{ fontSize: 10, color: template.allowUserEditTextureName ? '#fcd34d' : '#94a3b8', display: 'block', marginTop: 4, marginLeft: 21, lineHeight: 1.35 }}>
                  {template.allowUserEditTextureName
                    ? '⚠️ Unlocked: Regular users can edit the filename and choose presets in their board editor.'
                    : '🔒 Locked (Recommended): Filename is strictly locked for regular users to guarantee perfect simulator 3D model mapping.'}
                </span>
              </div>
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

            {/* Quick Presets Shortcut */}
            <div
              style={{
                marginTop: 14,
                padding: '12px 14px',
                background: 'rgba(234, 88, 12, 0.08)',
                border: '1px solid rgba(234, 88, 12, 0.25)',
                borderRadius: 8
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Zap size={15} style={{ color: '#fb923c' }} />
                  <strong style={{ fontSize: '0.82rem', color: '#fed7aa' }}>
                    Quick Presets ({(template.quickPresets || []).length})
                  </strong>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('presets')}
                  style={{
                    background: '#ea580c',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 4,
                    padding: '4px 9px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4
                  }}
                >
                  Edit Presets &rarr;
                </button>
              </div>
              <p style={{ margin: 0, fontSize: '0.72rem', color: '#94a3b8', lineHeight: 1.4 }}>
                1-click sample trains (e.g. Tamil Nadu Exp, Karnataka Express) for users in the editor.
              </p>
              {(template.quickPresets || []).length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
                  {template.quickPresets!.map((p) => (
                    <span
                      key={p.id}
                      style={{
                        fontSize: '0.7rem',
                        padding: '2px 6px',
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.12)',
                        borderRadius: 4,
                        color: '#f1f5f9'
                      }}
                    >
                      {p.name}
                    </span>
                  ))}
                </div>
              )}
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
              <div>
                <span className="sub-title">Content Slots & Boxes</span>
                {selectedFieldId && (
                  <div style={{ fontSize: 10, color: '#94a3b8' }}>
                    Tip: Press <kbd style={{ background: 'rgba(255,255,255,0.1)', padding: '1px 4px', borderRadius: 3, color: '#fb923c' }}>Ctrl+D</kbd> to duplicate slot
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <button type="button" className="btn-add-small" onClick={handleAddTextField} title="Add Text Slot">
                  <Plus size={13} /> Text
                </button>
                <button type="button" className="btn-add-small" onClick={handleAddImageField} title="Add Picture / Logo Box">
                  <ImageIcon size={13} /> Picture
                </button>
                {selectedFieldId && (
                  <button
                    type="button"
                    className="btn-add-small"
                    style={{ background: 'rgba(234, 88, 12, 0.25)', border: '1px solid #ea580c', color: '#fed7aa', fontWeight: 700 }}
                    onClick={() => handleDuplicateField(selectedFieldId)}
                    title="Duplicate selected slot (Ctrl+D)"
                  >
                    <Copy size={13} /> Duplicate
                  </button>
                )}
              </div>
            </div>

            <div className="slots-chips-grid">
              {template.fields.map((f, i) => (
                <div
                  key={f.id}
                  className={`slot-chip ${selectedFieldId === f.id ? 'active' : ''}`}
                  onClick={() => setSelectedFieldId(f.id)}
                  style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', gap: 6 }}
                >
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, minWidth: 0, overflow: 'hidden' }}>
                    <span className="chip-index">
                      {f.type === 'image' ? '🖼️' : '📝'} #{i + 1}
                    </span>
                    <span className="chip-label" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {f.label}
                    </span>
                    {f.allowUserEdit === false && <Lock size={10} style={{ color: '#ff758f', flexShrink: 0 }} />}
                  </div>
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDuplicateField(f.id);
                    }}
                    title={`Duplicate "${f.label}" (Ctrl+D)`}
                    style={{
                      padding: '2px 4px',
                      borderRadius: 3,
                      opacity: 0.6,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center'
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                    onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.6')}
                  >
                    <Copy size={11} />
                  </span>
                </div>
              ))}
            </div>

            {currentField ? (
              <div className="property-inspector-card">
                <div className="inspector-top">
                  <strong>
                    {currentField.type === 'image' ? '🖼️ Picture Box' : '📝 Text Slot'} · {currentField.label}
                  </strong>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{
                        padding: '3px 8px',
                        fontSize: 11,
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        background: 'rgba(234, 88, 12, 0.15)',
                        color: '#fb923c',
                        border: '1px solid rgba(234, 88, 12, 0.4)',
                        borderRadius: 5,
                        cursor: 'pointer'
                      }}
                      onClick={() => handleDuplicateField(currentField.id)}
                      title={`Duplicate / Copy this ${currentField.type === 'image' ? 'picture box' : 'text slot'} (Ctrl+D)`}
                    >
                      <Copy size={12} /> Duplicate
                    </button>
                    <button
                      type="button"
                      className="btn-delete-slot"
                      onClick={() => handleDeleteField(currentField.id)}
                      title="Delete this slot"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
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
                      <label>Default Text Content (Supports Enter / Next Line):</label>
                      <textarea
                        rows={currentField.defaultValue?.includes('\n') ? Math.min(6, currentField.defaultValue.split('\n').length) : 2}
                        value={currentField.defaultValue || ''}
                        placeholder="Enter default text... (Press Enter for next line)"
                        onChange={(e) => handleUpdateSelectedField({ defaultValue: e.target.value })}
                        style={{
                          width: '100%',
                          resize: 'vertical',
                          minHeight: 48,
                          padding: '6px 10px',
                          fontSize: 12,
                          background: 'rgba(0,0,0,0.4)',
                          color: '#fff',
                          border: '1px solid rgba(255,255,255,0.15)',
                          borderRadius: 4,
                          lineHeight: 1.4,
                          fontFamily: 'inherit'
                        }}
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

        {/* TAB 1.5: QUICK PRESETS (TAMIL NADU EXP, KARNATAKA EXP, ETC.) */}
        {activeTab === 'presets' && (
          <div className="tab-content">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <span className="sub-title">Quick Presets & Sample Trains</span>
              <span style={{ fontSize: 11, color: '#94a3b8' }}>
                {(template.quickPresets || []).length} presets
              </span>
            </div>
            <p className="field-help">
              Define 1-click sample trains (such as <strong>Tamil Nadu Exp</strong>, <strong>Karnataka Express</strong>) with pre-filled train numbers, English/Hindi names, and routes. Users in the editor can pick any preset to populate all board text in 1 click.
            </p>

            {/* Quick Presets Action Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, margin: '12px 0 16px 0' }}>
              <button
                type="button"
                className="btn-primary"
                onClick={handleCaptureCanvasAsNewPreset}
                style={{ background: 'linear-gradient(135deg, #ea580c 0%, #f97316 100%)', justifyContent: 'center' }}
                title="Capture all text and values currently displayed on the canvas into a new preset"
              >
                <Sparkles size={14} /> 📸 Capture Current Canvas Values as Preset
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={handleAddPreset}
                style={{ justifyContent: 'center' }}
                title="Add a new blank preset"
              >
                <Plus size={14} /> + Add New Quick Preset
              </button>
            </div>

            {/* Presets List */}
            {(!template.quickPresets || template.quickPresets.length === 0) ? (
              <div style={{ padding: 18, background: 'rgba(0,0,0,0.3)', border: '1px dashed rgba(255,255,255,0.15)', borderRadius: 8, textAlign: 'center' }}>
                <Zap size={26} style={{ color: '#fb923c', margin: '0 auto 8px auto', display: 'block' }} />
                <div style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9', marginBottom: 4 }}>
                  No Quick Presets Configured Yet
                </div>
                <p style={{ fontSize: 11, color: '#94a3b8', margin: '0 0 12px 0', lineHeight: 1.4 }}>
                  Click &quot;Capture Current Canvas Values as Preset&quot; to save current canvas text, or add a standard preset like Tamil Nadu Exp.
                </p>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    const samplePreset: QuickPreset = {
                      id: `preset-sample-${Date.now()}`,
                      name: 'Tamil Nadu Exp',
                      description: '12621 / 12622 MAS < > NDLS Superfast Express',
                      values: {
                        train_number: '12621 / 12622',
                        train_name_hi: 'तमिलनाडु एक्सप्रेस',
                        train_name_en: 'TAMIL NADU EXPRESS',
                        route_endpoints: 'चेन्नै सेंट्रल  MGR CHENNAI CTL < > NEW DELHI  नई दिल्ली',
                        train_no_up: '12621',
                        train_no_dn: '12622',
                        route_codes: 'MAS < > NDLS',
                        train_name_top: 'TAMIL NADU EXPRESS',
                        train_name_bottom: 'तमिलनाडु एक्सप्रेस',
                        led_row_1: 'TAMIL NADU EXP',
                        led_row_2: 'MAS < > NDLS',
                        led_row_3: 'SUPERFAST EXPRESS',
                        led_row_4: 'COACH B1'
                      }
                    };
                    const updated = [...(template.quickPresets || []), samplePreset];
                    updateTemplate({ quickPresets: updated });
                    setSelectedPresetId(samplePreset.id);
                  }}
                  style={{ margin: '0 auto', fontSize: 11 }}
                >
                  ⚡ Add &quot;Tamil Nadu Exp&quot; Preset
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {template.quickPresets.map((preset, idx) => {
                  const isSelected = selectedPresetId === preset.id;
                  const isTestingOnCanvas = canvasTestPresetId === preset.id;

                  return (
                    <div
                      key={preset.id}
                      style={{
                        padding: 12,
                        borderRadius: 8,
                        background: isTestingOnCanvas
                          ? 'rgba(234, 88, 12, 0.14)'
                          : isSelected
                          ? 'rgba(30, 41, 59, 0.85)'
                          : 'rgba(15, 23, 42, 0.6)',
                        border: isTestingOnCanvas
                          ? '1px solid #ea580c'
                          : isSelected
                          ? '1px solid rgba(255,255,255,0.25)'
                          : '1px solid rgba(255,255,255,0.08)'
                      }}
                    >
                      {/* Preset Card Header */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <div
                          style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', flex: 1 }}
                          onClick={() => setSelectedPresetId(isSelected ? null : preset.id)}
                        >
                          <span style={{ fontSize: 11, fontWeight: 800, color: '#fb923c' }}>#{idx + 1}</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#f8fafc' }}>{preset.name}</span>
                          {isTestingOnCanvas && (
                            <span
                              style={{
                                fontSize: 9,
                                fontWeight: 800,
                                background: '#ea580c',
                                color: '#fff',
                                padding: '1px 5px',
                                borderRadius: 3,
                                letterSpacing: 0.5
                              }}
                            >
                              ON CANVAS
                            </span>
                          )}
                        </div>

                        {/* Quick Action Buttons */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                          <button
                            type="button"
                            className="btn-icon"
                            onClick={() => handleMovePreset(preset.id, 'up')}
                            disabled={idx === 0}
                            title="Move preset up"
                            style={{ opacity: idx === 0 ? 0.3 : 1 }}
                          >
                            <ArrowUp size={12} />
                          </button>
                          <button
                            type="button"
                            className="btn-icon"
                            onClick={() => handleMovePreset(preset.id, 'down')}
                            disabled={idx === template.quickPresets!.length - 1}
                            title="Move preset down"
                            style={{ opacity: idx === template.quickPresets!.length - 1 ? 0.3 : 1 }}
                          >
                            <ArrowDown size={12} />
                          </button>
                          <button
                            type="button"
                            className="btn-icon"
                            onClick={() => handleDuplicatePreset(preset.id)}
                            title="Duplicate preset"
                          >
                            <Copy size={12} />
                          </button>
                          <button
                            type="button"
                            className="btn-icon danger"
                            onClick={() => handleDeletePreset(preset.id)}
                            title="Delete preset"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>

                      {/* Top Action Bar: Test on Canvas & Snapshot */}
                      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => handleTestPresetOnCanvas(preset)}
                          style={{
                            flex: 1,
                            fontSize: 11,
                            padding: '4px 8px',
                            background: isTestingOnCanvas ? '#ea580c' : 'rgba(255,255,255,0.06)',
                            color: '#fff',
                            borderColor: isTestingOnCanvas ? '#ea580c' : 'rgba(255,255,255,0.15)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 4
                          }}
                          title="Load this preset's values into the canvas preview"
                        >
                          <Play size={11} fill={isTestingOnCanvas ? '#fff' : 'none'} />
                          {isTestingOnCanvas ? 'Viewing on Canvas' : 'Test on Canvas'}
                        </button>
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => handleOverwritePresetWithCanvas(preset.id)}
                          style={{
                            fontSize: 11,
                            padding: '4px 8px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4
                          }}
                          title="Overwrite this preset's values with whatever is currently displayed on the canvas"
                        >
                          <Sparkles size={11} /> Snapshot Canvas
                        </button>
                      </div>

                      {/* Preset Properties Editor (Always editable) */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 10 }}>
                        <div className="prop-row">
                          <label style={{ fontSize: 11 }}>Preset Name / Title:</label>
                          <input
                            type="text"
                            value={preset.name}
                            onChange={(e) => handleUpdatePreset(preset.id, { name: e.target.value })}
                            placeholder="e.g. Tamil Nadu Exp"
                            style={{ fontSize: 12, fontWeight: 700 }}
                          />
                        </div>

                        <div className="prop-row">
                          <label style={{ fontSize: 11 }}>Description / Route Subtitle:</label>
                          <input
                            type="text"
                            value={preset.description || ''}
                            onChange={(e) => handleUpdatePreset(preset.id, { description: e.target.value })}
                            placeholder="e.g. 12621 / 12622 MAS < > NDLS Superfast Express"
                            style={{ fontSize: 11 }}
                          />
                        </div>

                        {/* Slot Values Section */}
                        <div style={{ marginTop: 4 }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                            <span style={{ fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                              Preset Slot Text ({template.fields.length} Slots)
                            </span>
                            <span style={{ fontSize: 10, color: '#64748b' }}>
                              Values applied when user clicks preset
                            </span>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {template.fields.map((field) => {
                              const val = preset.values?.[field.id] ?? '';
                              return (
                                <div
                                  key={field.id}
                                  style={{
                                    padding: '6px 8px',
                                    background: 'rgba(0,0,0,0.25)',
                                    borderRadius: 6,
                                    border: '1px solid rgba(255,255,255,0.05)'
                                  }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                                    <span style={{ fontSize: 10, fontWeight: 700, color: '#cbd5e1' }}>
                                      {field.label}
                                    </span>
                                    <span style={{ fontSize: 9, color: '#64748b', fontFamily: 'monospace' }}>
                                      {field.id}
                                    </span>
                                  </div>
                                  <textarea
                                    value={val}
                                    onChange={(e) => handleUpdatePresetFieldValue(preset.id, field.id, e.target.value)}
                                    placeholder={field.defaultValue || `Default value for ${field.label}`}
                                    rows={val.includes('\n') ? 2 : 1}
                                    style={{
                                      width: '100%',
                                      padding: '4px 6px',
                                      fontSize: 11,
                                      background: 'rgba(0,0,0,0.35)',
                                      border: '1px solid rgba(255,255,255,0.12)',
                                      borderRadius: 4,
                                      color: '#f8fafc',
                                      resize: 'vertical',
                                      fontFamily: field.isDotMatrix ? "'VT323', monospace" : 'inherit'
                                    }}
                                  />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
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

              {/* Google Drive / Direct CDN URL (Recommended: 0 KB Database / Server Space) */}
              <div style={{ marginTop: 10, padding: 10, background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span>📁</span> Google Drive / Direct Image URL:
                  </label>
                  <span style={{ fontSize: 10, color: '#4ade80', fontWeight: 600, background: 'rgba(74, 222, 128, 0.1)', padding: '2px 6px', borderRadius: 4 }}>
                    0 KB Server Space Used
                  </span>
                </div>
                <p style={{ fontSize: 10, color: '#94a3b8', margin: '0 0 6px 0', lineHeight: 1.4 }}>
                  Paste a Google Drive sharing link or any web image link. Google Drive links are automatically converted to high-speed CDN URLs!
                </p>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input
                    type="text"
                    placeholder="Paste Google Drive link (e.g. drive.google.com/file/d/...) or CDN URL"
                    value={template.backgroundImageUrl || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      const info = convertGoogleDriveUrl(val);
                      updateTemplate({
                        backgroundImageUrl: info.url,
                        backgroundType: 'transparent'
                      });
                      if (info.isGoogleDrive) {
                        setSaveToast('Google Drive link converted to direct high-speed CDN URL!');
                        setTimeout(() => setSaveToast(null), 3000);
                      }
                    }}
                    style={{ width: '100%', fontSize: 11, padding: '7px 10px', background: '#090d12', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6, color: '#fff' }}
                  />
                  {template.backgroundImageUrl && (
                    <button
                      type="button"
                      className="btn-danger-outline"
                      style={{ fontSize: 11, padding: '4px 8px', whiteSpace: 'nowrap' }}
                      onClick={() => updateTemplate({ backgroundImageUrl: undefined })}
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* Thumbnail preview if set */}
                {template.backgroundImageUrl && (
                  <div style={{ marginTop: 8, padding: 8, background: 'rgba(0,0,0,0.4)', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 10, border: '1px solid rgba(255,255,255,0.06)' }}>
                    <img
                      src={template.backgroundImageUrl}
                      alt="Background Preview"
                      style={{ width: 48, height: 48, objectFit: 'contain', borderRadius: 4, background: '#111', border: '1px solid rgba(255,255,255,0.1)' }}
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                      onLoad={(e) => {
                        const img = e.currentTarget;
                        if (img.naturalWidth && img.naturalHeight && (template.baseWidth !== img.naturalWidth || template.baseHeight !== img.naturalHeight)) {
                          updateTemplate({
                            baseWidth: img.naturalWidth,
                            baseHeight: img.naturalHeight,
                            isTextureSheet: img.naturalWidth === img.naturalHeight,
                            textureResolution: img.naturalWidth
                          });
                        }
                      }}
                    />
                    <div style={{ fontSize: 11, color: '#cbd5e1', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0, flex: 1 }}>
                      <div style={{ fontWeight: 600, color: '#4ade80', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <CheckCircle size={12} /> Active Texture Loaded
                      </div>
                      <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>
                        {template.baseWidth} × {template.baseHeight} px · {template.backgroundImageUrl.includes('googleusercontent.com') ? 'Google Drive CDN' : 'Web CDN Link'}
                      </div>
                      <div style={{ fontSize: 9, color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%', marginTop: 2 }}>
                        {template.backgroundImageUrl}
                      </div>
                    </div>
                  </div>
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <button
                        type="button"
                        className="btn-secondary"
                        style={{ padding: '3px 8px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}
                        onClick={() => handleDuplicateStamp(activeStamp.id)}
                        title="Duplicate this static element"
                      >
                        <Copy size={12} /> Duplicate
                      </button>
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
                onClick={() => handleAddVariation()}
                style={{ justifyContent: 'center' }}
                title="Add a new standalone variation bundled in this template pack"
              >
                <Plus size={14} /> + Add Standalone Variation
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
                          <Palette size={12} /> {isEditingThis ? '★ Active on Canvas (Editing)' : '🎨 Edit Standalone Layout'}
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
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                          <label style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
                            Target Texture Filename (.dds override):
                          </label>
                          <span style={{ fontSize: 10, color: 'var(--rail-amber)', fontWeight: 700, fontFamily: 'monospace' }}>
                            {v.targetTextureName ? `${v.targetTextureName}.dds` : 'Inherit Base'}
                          </span>
                        </div>
                        <input
                          type="text"
                          value={v.targetTextureName || ''}
                          placeholder="e.g. nameboard_BaseColor or VB_NAME"
                          onChange={(e) => handleUpdateVariation(v.id, { targetTextureName: e.target.value })}
                          style={{ width: '100%', fontSize: 11, padding: '5px 8px', marginTop: 2 }}
                        />
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4, alignItems: 'center' }}>
                          <span style={{ fontSize: 9, color: '#94a3b8', fontWeight: 600 }}>Presets:</span>
                          {['nameboard_BaseColor', 'VB_NAME', 'AMRIT_LED', 'COACH_LED', 'STATION_BOARD'].map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => handleUpdateVariation(v.id, { targetTextureName: preset })}
                              style={{
                                padding: '2px 6px',
                                fontSize: 9,
                                fontFamily: 'monospace',
                                fontWeight: 600,
                                background: v.targetTextureName === preset ? 'var(--rail-amber)' : 'rgba(255,255,255,0.08)',
                                color: v.targetTextureName === preset ? '#000' : '#fff',
                                border: '1px solid ' + (v.targetTextureName === preset ? 'var(--rail-amber)' : 'rgba(255,255,255,0.15)'),
                                borderRadius: 3,
                                cursor: 'pointer'
                              }}
                            >
                              {preset}
                            </button>
                          ))}
                          {v.targetTextureName && (
                            <button
                              type="button"
                              onClick={() => handleUpdateVariation(v.id, { targetTextureName: '' })}
                              style={{
                                padding: '2px 6px',
                                fontSize: 9,
                                background: 'transparent',
                                color: '#f87171',
                                border: '1px dashed rgba(248, 113, 113, 0.4)',
                                borderRadius: 3,
                                cursor: 'pointer'
                              }}
                            >
                              Reset
                            </button>
                          )}
                        </div>
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
                              <Upload size={11} /> {v.backgroundImageUrl ? 'Replace File' : 'Upload File'}
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
                          <div style={{ marginTop: 4 }}>
                            <input
                              type="text"
                              placeholder="Or paste Google Drive / Image URL (0 KB server space)"
                              value={v.backgroundImageUrl || ''}
                              onChange={(e) => {
                                const info = convertGoogleDriveUrl(e.target.value);
                                handleUpdateVariation(v.id, { backgroundImageUrl: info.url });
                              }}
                              style={{ width: '100%', fontSize: 10, padding: '4px 6px', background: '#090d12', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, color: '#fff' }}
                            />
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
                    title="Exit variation editing and return canvas to base template"
                  >
                    ✕ Done (Back to Base)
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

          {/* Quick Active Slot Action Bar */}
          {currentField && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 14px',
                background: 'rgba(15, 23, 42, 0.95)',
                border: '1px solid rgba(234, 88, 12, 0.4)',
                borderRadius: '8px',
                marginBottom: '10px',
                width: '100%',
                maxWidth: '960px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                flexWrap: 'wrap',
                gap: 8
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13 }}>{currentField.type === 'image' ? '🖼️' : '📝'}</span>
                <span style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
                  Selected:
                </span>
                <strong style={{ fontSize: 12, color: '#f8fafc' }}>{currentField.label}</strong>
                <span style={{ fontSize: 11, color: '#fb923c', background: 'rgba(234, 88, 12, 0.15)', padding: '1px 6px', borderRadius: 4, fontFamily: 'monospace' }}>
                  X: {currentField.x}% · Y: {currentField.y}% · {currentField.width}×{currentField.height}%
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button
                  type="button"
                  onClick={() => handleDuplicateField(currentField.id)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '4px 12px',
                    fontSize: 11,
                    fontWeight: 700,
                    background: 'linear-gradient(135deg, #ea580c 0%, #f97316 100%)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 5,
                    cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(234, 88, 12, 0.3)'
                  }}
                  title={`Duplicate / Copy this ${currentField.type === 'image' ? 'picture box' : 'text slot'} (Ctrl+D)`}
                >
                  <Copy size={12} /> Duplicate Slot
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('fields')}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '4px 9px',
                    fontSize: 11,
                    background: 'rgba(255,255,255,0.08)',
                    color: '#cbd5e1',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: 5,
                    cursor: 'pointer'
                  }}
                  title="Open Slot Properties in Sidebar"
                >
                  <Sliders size={12} /> Style Inspector
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteField(currentField.id)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '4px 8px',
                    fontSize: 11,
                    background: 'rgba(239, 68, 68, 0.12)',
                    color: '#ef4444',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: 5,
                    cursor: 'pointer'
                  }}
                  title="Delete this slot"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          )}

          {canvasTestPresetId && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '7px 14px',
                marginBottom: 8,
                background: 'linear-gradient(90deg, rgba(234, 88, 12, 0.25) 0%, rgba(245, 158, 11, 0.18) 100%)',
                border: '1px solid rgba(245, 158, 11, 0.4)',
                borderRadius: 8,
                fontSize: 12,
                color: '#fef3c7'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Zap size={15} style={{ color: '#f59e0b' }} />
                <span>
                  Testing Quick Preset on Canvas: <strong>{template.quickPresets?.find((p) => p.id === canvasTestPresetId)?.name || 'Custom Preset'}</strong>
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setCanvasTestPresetId(null);
                  setCanvasTestValues(null);
                }}
                style={{
                  background: 'rgba(0, 0, 0, 0.45)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: '#fff',
                  borderRadius: 4,
                  padding: '3px 8px',
                  fontSize: 11,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4
                }}
              >
                <X size={12} /> Reset Canvas Text
              </button>
            </div>
          )}

          <BoardCanvas
            template={template}
            values={effectivePreviewValues}
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

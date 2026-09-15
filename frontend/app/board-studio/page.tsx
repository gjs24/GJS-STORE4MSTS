'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { BoardTemplate, UserBoardValues } from '@/lib/board-studio/types';
import { storageService } from '@/lib/board-studio/storage-service';
import { fontManager } from '@/lib/board-studio/font-manager';
import { getStoredUser, CurrentUser } from '@/lib/api';

import { StudioNavbar } from '@/components/board-studio/studio-navbar';
import { HomePage } from '@/components/board-studio/home-gallery';
import { UserBoardEditor } from '@/components/board-studio/user-board-editor';
import { AdminTemplateStudio } from '@/components/board-studio/admin-template-studio';
import { AdminLoginModal } from '@/components/board-studio/admin-login-modal';
import { PurchaseTemplateModal } from '@/components/board-studio/purchase-template-modal';
import { HelpModal } from '@/components/board-studio/help-modal';

import '@/styles/board-studio.css';

export default function BoardStudioPage() {
  const [templates, setTemplates] = useState<BoardTemplate[]>([]);
  const [activeTemplate, setActiveTemplate] = useState<BoardTemplate | null>(null);
  const [viewMode, setViewMode] = useState<'home' | 'editor'>('home');
  const [storeTab, setStoreTab] = useState<'store' | 'my-store'>('store');
  const [initialValues, setInitialValues] = useState<UserBoardValues | null>(null);
  const [initialCustomBg, setInitialCustomBg] = useState<string | null>(null);

  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [unlockedIds, setUnlockedIds] = useState<string[]>([]);
  const [savedCount, setSavedCount] = useState<number>(0);

  // Modals
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState(false);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [purchaseTarget, setPurchaseTarget] = useState<BoardTemplate | null>(null);

  // Initialize fonts & auth on mount
  useEffect(() => {
    fontManager.applyCustomFontsToDOM();

    if (typeof window !== 'undefined') {
      const user = getStoredUser();
      setCurrentUser(user);

      const hasAdminSession = localStorage.getItem('gjs_board_studio_admin_session') === 'true';
      if (user?.is_staff || hasAdminSession) {
        setIsAdmin(hasAdminSession);
      }

      const storedUnlocks: string[] = JSON.parse(localStorage.getItem('gjs_unlocked_templates') || '[]');
      setUnlockedIds(storedUnlocks);
    }
  }, []);

  const updateSavedCount = useCallback(() => {
    try {
      const saved = storageService.getUserBoards();
      setSavedCount(saved.length);
    } catch {
      setSavedCount(0);
    }
  }, []);

  const loadTemplates = useCallback(async () => {
    // 1. Immediately load local templates
    const local = storageService.getAllTemplates();
    if (local.length > 0) {
      setTemplates(local);
      if (!activeTemplate) {
        const first = local.find((t) => t.published !== false) || local[0];
        setActiveTemplate(first);
      }
    }

    // 2. Fetch and merge cloud templates in background
    try {
      const cloud = await storageService.fetchCloudTemplates();
      if (cloud && cloud.length > 0) {
        setTemplates(cloud);
        if (!activeTemplate) {
          const first = cloud.find((t) => t.published !== false) || cloud[0];
          setActiveTemplate(first);
        }
      }
    } catch (e) {
      console.warn('Cloud template sync notice:', e);
    }
  }, [activeTemplate]);

  useEffect(() => {
    loadTemplates();
    updateSavedCount();
  }, [loadTemplates, updateSavedCount, isAdmin, viewMode]);

  // Admin save template
  const handleSaveTemplate = (updated: BoardTemplate) => {
    const saved = storageService.saveTemplate(updated);
    const refreshed = storageService.getAllTemplates();
    setTemplates(refreshed);
    setActiveTemplate(saved);
  };

  // Admin delete template
  const handleDeleteTemplate = (id: string) => {
    storageService.deleteTemplate(id);
    const refreshed = storageService.getAllTemplates();
    setTemplates(refreshed);
    if (refreshed.length === 0) {
      handleCreateNewTemplate();
    } else if (activeTemplate?.id === id) {
      setActiveTemplate(refreshed[0]);
    }
  };

  // Admin create new template
  const handleCreateNewTemplate = () => {
    const newTemplate: BoardTemplate = {
      id: 'template_' + Date.now(),
      name: 'New Custom LED Texture (1024×1024)',
      category: 'LED Texture Sheet',
      description: 'Custom train simulator texture sheet or board.',
      aspectRatio: '1:1',
      baseWidth: 1024,
      baseHeight: 1024,
      isTextureSheet: true,
      textureResolution: 1024,
      backgroundColor: '#0c0f12',
      backgroundType: 'transparent',
      borderColor: '#33404d',
      borderWidth: 0,
      borderRadius: 0,
      showBolts: false,
      fixedGraphics: [],
      fields: [
        {
          id: 'field_train_no',
          label: 'Train Number Slot',
          defaultValue: '12627 / 12628',
          placeholder: 'TRAIN NUMBER',
          x: 50,
          y: 20,
          width: 70,
          height: 10,
          fontFamily: "'VT323', 'DotGothic16', monospace",
          fontSize: 58,
          fontWeight: 700,
          color: '#ff9f1c',
          align: 'center',
          textTransform: 'uppercase',
          ledGlow: true,
          glowColor: '#ff6200',
          glowRadius: 12,
          isDotMatrix: true
        },
        {
          id: 'field_train_name',
          label: 'Train Name Slot',
          defaultValue: 'KARNATAKA EXPRESS',
          placeholder: 'TRAIN NAME',
          x: 50,
          y: 40,
          width: 90,
          height: 12,
          fontFamily: "'VT323', 'DotGothic16', monospace",
          fontSize: 68,
          fontWeight: 700,
          color: '#ff9f1c',
          align: 'center',
          textTransform: 'uppercase',
          ledGlow: true,
          glowColor: '#ff6200',
          glowRadius: 14,
          isDotMatrix: true
        }
      ],
      published: true,
      isPaid: false,
      price: 0,
      currency: 'INR',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      author: currentUser?.username || 'Admin'
    };

    storageService.saveTemplate(newTemplate);
    const refreshed = storageService.getAllTemplates();
    setTemplates(refreshed);
    setActiveTemplate(newTemplate);
  };

  const handleToggleAdmin = () => {
    if (isAdmin) {
      setIsAdmin(false);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('gjs_board_studio_admin_session');
      }
    } else {
      if (currentUser?.is_staff) {
        setIsAdmin(true);
        if (typeof window !== 'undefined') {
          localStorage.setItem('gjs_board_studio_admin_session', 'true');
        }
      } else {
        setIsAdminLoginOpen(true);
      }
    }
  };

  const handleOpenPurchase = (tpl: BoardTemplate) => {
    setPurchaseTarget(tpl);
    setIsPurchaseModalOpen(true);
  };

  const handlePurchaseSuccess = (templateId: string) => {
    const updated = [...unlockedIds, templateId];
    setUnlockedIds(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('gjs_unlocked_templates', JSON.stringify(updated));
    }
  };

  const publishedTemplates = templates.filter((t) => t.published !== false);

  if (!activeTemplate && templates.length === 0) {
    return (
      <div className="gjs-board-studio-root" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ margin: '0 auto 16px auto' }} />
          <p style={{ color: '#94a3b8' }}>Initializing Railway Board Studio...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="gjs-board-studio-root">
      <div className="app-container">
        <StudioNavbar
          currentView={isAdmin ? 'admin' : viewMode}
          activeStoreTab={storeTab}
          savedBoardsCount={savedCount}
          isAdmin={isAdmin}
          currentUser={currentUser}
          onNavigateHome={() => {
            setStoreTab('store');
            setViewMode('home');
          }}
          onNavigateStore={(tab) => {
            setStoreTab(tab);
            setViewMode('home');
            updateSavedCount();
          }}
          onOpenHelp={() => setIsHelpOpen(true)}
          onToggleAdmin={handleToggleAdmin}
        />

        {isAdmin && activeTemplate ? (
          <AdminTemplateStudio
            templates={templates}
            activeTemplate={activeTemplate}
            onSaveTemplate={handleSaveTemplate}
            onSelectTemplate={(tpl) => setActiveTemplate(tpl)}
            onDeleteTemplate={handleDeleteTemplate}
            onCreateNewTemplate={handleCreateNewTemplate}
          />
        ) : viewMode === 'home' ? (
          <HomePage
            templates={publishedTemplates.length > 0 ? publishedTemplates : templates}
            activeStoreTab={storeTab}
            onTabChange={(tab) => {
              setStoreTab(tab);
              updateSavedCount();
            }}
            onSelectTemplate={(tpl, userVals, customBg) => {
              setActiveTemplate(tpl);
              setInitialValues(userVals || null);
              setInitialCustomBg(customBg || null);
              setViewMode('editor');
            }}
            onOpenPurchaseModal={handleOpenPurchase}
            unlockedTemplateIds={unlockedIds}
          />
        ) : activeTemplate ? (
          <UserBoardEditor
            templates={publishedTemplates.length > 0 ? publishedTemplates : templates}
            activeTemplate={activeTemplate}
            initialValues={initialValues}
            initialCustomBackground={initialCustomBg}
            onSelectTemplate={(tpl) => {
              setActiveTemplate(tpl);
              setInitialValues(null);
              setInitialCustomBg(null);
            }}
            onBackToHome={() => {
              setStoreTab('store');
              setViewMode('home');
              updateSavedCount();
            }}
            onNavigateToMyStore={() => {
              setStoreTab('my-store');
              setViewMode('home');
              updateSavedCount();
            }}
            onOpenPurchaseModal={handleOpenPurchase}
            unlockedTemplateIds={unlockedIds}
          />
        ) : null}

        <AdminLoginModal
          isOpen={isAdminLoginOpen}
          onClose={() => setIsAdminLoginOpen(false)}
          onSuccess={() => setIsAdmin(true)}
        />

        <PurchaseTemplateModal
          isOpen={isPurchaseModalOpen}
          template={purchaseTarget}
          onClose={() => setIsPurchaseModalOpen(false)}
          onSuccess={handlePurchaseSuccess}
        />

        <HelpModal
          isOpen={isHelpOpen}
          onClose={() => setIsHelpOpen(false)}
        />
      </div>
    </div>
  );
}

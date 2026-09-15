'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { BoardTemplate, UserBoardValues } from '@/lib/board-studio/types';
import { storageService } from '@/lib/board-studio/storage-service';
import { fontManager } from '@/lib/board-studio/font-manager';
import { getStoredUser, setStoredUser, clearAuth, AUTH_CHANGE_EVENT, CurrentUser } from '@/lib/api';
import { userGet, verifyPayment, type StoreOrder } from '@/lib/store-api';

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

  const targetTemplateIdRef = useRef<string | null>(null);

  // 1. Sync authentication with MSTS Production Store
  const syncUserAuth = useCallback(async () => {
    if (typeof window === 'undefined') return;
    const stored = getStoredUser();
    if (stored) {
      setCurrentUser(stored);
      if (stored.is_staff) {
        setIsAdmin(true);
      }
    }

    const token = localStorage.getItem('accessToken');
    if (token) {
      try {
        const fresh = await userGet<CurrentUser>('/auth/me/');
        setStoredUser(fresh);
        setCurrentUser(fresh);
        if (fresh.is_staff) {
          setIsAdmin(true);
        }
      } catch (err) {
        if (!stored) {
          clearAuth();
          setCurrentUser(null);
        }
      }
    } else {
      setCurrentUser(null);
    }
  }, []);

  // 2. Fetch and sync unlocked templates from MSTS user purchases
  const syncUserPurchases = useCallback(async () => {
    if (typeof window === 'undefined') return;
    const storedUnlocks: string[] = JSON.parse(localStorage.getItem('gjs_unlocked_templates') || '[]');
    const unlockSet = new Set<string>(storedUnlocks);

    const token = localStorage.getItem('accessToken');
    if (token) {
      try {
        const purchases = await userGet<StoreOrder[]>('/user/purchases/');
        if (Array.isArray(purchases)) {
          purchases.forEach((order) => {
            if (
              order.board_template?.id &&
              (order.download_enabled || order.status === 'PAID' || order.status === 'APPROVED')
            ) {
              unlockSet.add(order.board_template.id);
            }
          });
        }
      } catch (err) {
        // Guest or offline
      }
    }

    const merged = Array.from(unlockSet);
    setUnlockedIds(merged);
    localStorage.setItem('gjs_unlocked_templates', JSON.stringify(merged));
  }, []);

  // Initialize fonts, auth, and listen for store-wide auth changes
  useEffect(() => {
    fontManager.applyCustomFontsToDOM();

    syncUserAuth();
    syncUserPurchases();

    window.addEventListener(AUTH_CHANGE_EVENT, syncUserAuth);
    window.addEventListener('storage', syncUserAuth);

    return () => {
      window.removeEventListener(AUTH_CHANGE_EVENT, syncUserAuth);
      window.removeEventListener('storage', syncUserAuth);
    };
  }, [syncUserAuth, syncUserPurchases]);

  // Handle URL query parameters: ?template= and ?order_id= (Cashfree return)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const templateParam = params.get('template');
    const orderIdParam = params.get('order_id');

    if (templateParam) {
      targetTemplateIdRef.current = templateParam;
    }

    if (orderIdParam) {
      const orderId = Number(orderIdParam);
      if (!isNaN(orderId) && orderId > 0) {
        verifyPayment(orderId)
          .then((verifiedOrder) => {
            if (
              verifiedOrder.download_enabled ||
              verifiedOrder.status === 'PAID' ||
              verifiedOrder.status === 'APPROVED'
            ) {
              const targetTpl = verifiedOrder.board_template?.id || templateParam;
              if (targetTpl) {
                const currentUnlocks: string[] = JSON.parse(
                  localStorage.getItem('gjs_unlocked_templates') || '[]'
                );
                if (!currentUnlocks.includes(targetTpl)) {
                  currentUnlocks.push(targetTpl);
                  localStorage.setItem('gjs_unlocked_templates', JSON.stringify(currentUnlocks));
                  setUnlockedIds(currentUnlocks);
                }
              }
            }
          })
          .catch((err) => {
            console.warn('Cashfree payment verification notice:', err);
          })
          .finally(() => {
            const cleanUrl = templateParam ? `/board-studio?template=${templateParam}` : '/board-studio';
            window.history.replaceState(null, '', cleanUrl);
          });
      }
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
      const target = targetTemplateIdRef.current
        ? local.find((t) => t.id === targetTemplateIdRef.current)
        : null;
      if (target) {
        setActiveTemplate(target);
        setViewMode('editor');
      } else if (!activeTemplate) {
        const first = local.find((t) => t.published !== false) || local[0];
        setActiveTemplate(first);
      }
    }

    // 2. Fetch and merge cloud templates in background
    try {
      const cloud = await storageService.fetchCloudTemplates();
      if (cloud && cloud.length > 0) {
        setTemplates(cloud);

        // Sync any server-confirmed unlocks into unlockedIds
        cloud.forEach((t) => {
          if (t.isUnlocked) {
            setUnlockedIds((prev) => (prev.includes(t.id) ? prev : [...prev, t.id]));
          }
        });

        const target = targetTemplateIdRef.current
          ? cloud.find((t) => t.id === targetTemplateIdRef.current)
          : null;
        if (target) {
          setActiveTemplate(target);
          setViewMode('editor');
        } else if (!activeTemplate) {
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
      description: 'Indian Railways LED display sheet with locked UV coordinates for MSTS / Open Rails.',
      aspectRatio: '1:1',
      baseWidth: 1024,
      baseHeight: 1024,
      backgroundColor: '#0c0f12',
      backgroundType: 'transparent',
      borderColor: '#ef3b2d',
      borderWidth: 2,
      borderRadius: 0,
      showBolts: false,
      isTextureSheet: true,
      textureResolution: 1024,
      allowUserCustomBackground: false,
      fixedGraphics: [],
      fields: [
        {
          id: 'field_train_no',
          label: 'Train Number Slot',
          defaultValue: '12627',
          placeholder: '12627',
          x: 50,
          y: 20,
          width: 80,
          height: 12,
          fontFamily: "'VT323', 'DotGothic16', monospace",
          fontSize: 72,
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

  const handleLogout = () => {
    setCurrentUser(null);
    setIsAdmin(false);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('gjs_board_studio_admin_session');
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
          onLogout={handleLogout}
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

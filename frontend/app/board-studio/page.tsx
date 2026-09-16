'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { BoardTemplate, UserBoardValues } from '@/lib/board-studio/types';
import { storageService } from '@/lib/board-studio/storage-service';
import { fontManager } from '@/lib/board-studio/font-manager';
import { getStoredUser, setStoredUser, clearAuth, AUTH_CHANGE_EVENT, CurrentUser, getSiteSettings } from '@/lib/api';
import { userGet, verifyPayment, type StoreOrder } from '@/lib/store-api';
import { Tv } from 'lucide-react';

import { HomePage } from '@/components/board-studio/home-gallery';
import { UserBoardEditor } from '@/components/board-studio/user-board-editor';
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
  const [unlockedIds, setUnlockedIds] = useState<string[]>([]);
  const [savedCount, setSavedCount] = useState<number>(0);
  const [studioEnabled, setStudioEnabled] = useState<boolean | null>(null);

  // Modals
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [purchaseTarget, setPurchaseTarget] = useState<BoardTemplate | null>(null);

  const targetTemplateIdRef = useRef<string | null>(null);

  // 1. Sync authentication with MSTS Production Store
  const syncUserAuth = useCallback(async () => {
    if (typeof window === 'undefined') return;
    const stored = getStoredUser();
    if (stored) {
      setCurrentUser(stored);
    }

    const token = localStorage.getItem('accessToken');
    if (token) {
      try {
        const fresh = await userGet<CurrentUser>('/auth/me/');
        setStoredUser(fresh);
        setCurrentUser(fresh);
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
            if (
              order.asset?.board_template?.id &&
              (order.asset.bundle_board_template_free || (order.asset.board_template as any).is_bundled_free) &&
              (order.download_enabled || order.status === 'PAID' || order.status === 'APPROVED')
            ) {
              unlockSet.add(order.asset.board_template.id);
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

    getSiteSettings()
      .then((s) => setStudioEnabled(s?.board_studio_enabled !== false))
      .catch(() => setStudioEnabled(true));

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
  }, [loadTemplates, updateSavedCount, viewMode]);

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

  // If Board Studio is disabled by admin and user is not staff, show offline maintenance screen
  if (studioEnabled === false && !currentUser?.is_staff) {
    return (
      <div className="gjs-board-studio-root" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', padding: '24px' }}>
        <div style={{ maxWidth: '520px', width: '100%', textAlign: 'center', background: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '16px', padding: '40px 24px', backdropFilter: 'blur(16px)', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: 'rgba(239, 59, 45, 0.12)', border: '1px solid rgba(239, 59, 45, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto', color: '#ef3b2d' }}>
            <Tv size={32} />
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Depot Maintenance in Progress
          </h2>
          <p style={{ fontSize: '0.9rem', color: '#94a3b8', lineHeight: 1.6, marginBottom: '24px' }}>
            The Railway Nameboard & LED Texture Studio is currently undergoing depot upgrades and maintenance. Check back soon for new train templates and features!
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <a
              href="/assets"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: 'linear-gradient(135deg, #ef3b2d, #ff8a1f)',
                color: '#fff',
                fontWeight: 700,
                fontSize: '0.85rem',
                padding: '10px 22px',
                borderRadius: '8px',
                textDecoration: 'none',
                boxShadow: '0 4px 15px rgba(239, 59, 45, 0.4)'
              }}
            >
              Browse Store Assets →
            </a>
            <a
              href="/"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: 'rgba(255, 255, 255, 0.08)',
                color: '#cbd5e1',
                fontWeight: 600,
                fontSize: '0.85rem',
                padding: '10px 20px',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                textDecoration: 'none'
              }}
            >
              Return to Home
            </a>
          </div>
        </div>
      </div>
    );
  }

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
        {/* If user is staff admin, provide a quick direct link to the Admin Panel */}
        {currentUser?.is_staff && (
          <div
            style={{
              background: studioEnabled === false
                ? 'linear-gradient(90deg, rgba(239, 68, 68, 0.2), rgba(185, 28, 28, 0.2))'
                : 'linear-gradient(90deg, rgba(239, 59, 45, 0.15), rgba(255, 138, 31, 0.15))',
              borderBottom: studioEnabled === false ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid rgba(239, 59, 45, 0.3)',
              padding: '8px 16px',
              fontSize: '0.8rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              color: '#f8fafc',
              flexWrap: 'wrap',
              gap: '8px'
            }}
          >
            <span>
              🛡️ <strong>Admin Session Active</strong> · Public Studio Status: <strong style={{ color: studioEnabled === false ? '#f87171' : '#4ade80' }}>{studioEnabled === false ? 'HIDDEN / OFFLINE' : 'LIVE / VISIBLE'}</strong> (Manage board templates and visibility in Admin Panel)
            </span>
            <a
              href="/admin-dashboard/board-templates"
              style={{
                color: 'var(--rail-amber)',
                textDecoration: 'underline',
                fontWeight: 700,
                fontSize: '0.8rem'
              }}
            >
              Open Admin Board Manager →
            </a>
          </div>
        )}

        {viewMode === 'home' ? (
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

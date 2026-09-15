'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { BoardTemplate, BoardCategory, SavedUserBoard, UserBoardValues } from '@/lib/board-studio/types';
import { exportBoardToDDS, exportBoardToPNG } from '@/lib/board-studio/export-utils';
import { storageService } from '@/lib/board-studio/storage-service';
import { getStoredUser } from '@/lib/api';
import {
  Search,
  Sparkles,
  FileCode,
  Layers,
  ArrowRight,
  Train,
  CheckCircle,
  SlidersHorizontal,
  Store,
  BookmarkPlus,
  Download,
  Edit3,
  Trash2,
  Clock,
  Zap,
  Tag,
  Lock,
  Unlock,
  ShoppingCart,
  ShieldCheck,
  UserCheck
} from 'lucide-react';

interface HomePageProps {
  templates: BoardTemplate[];
  activeStoreTab?: 'store' | 'my-store';
  onTabChange?: (tab: 'store' | 'my-store') => void;
  onSelectTemplate: (template: BoardTemplate, initialValues?: UserBoardValues, customBackground?: string) => void;
  onOpenPurchaseModal?: (template: BoardTemplate) => void;
  unlockedTemplateIds?: string[];
}

export const HomePage: React.FC<HomePageProps> = ({
  templates,
  activeStoreTab = 'store',
  onTabChange,
  onSelectTemplate,
  onOpenPurchaseModal,
  unlockedTemplateIds = []
}) => {
  const currentUser = typeof window !== 'undefined' ? getStoredUser() : null;
  const isTemplateUnlocked = (id: string, isPaid?: boolean) => !isPaid || unlockedTemplateIds.includes(id);
  const openPurchaseModal = (tpl: BoardTemplate) => {
    if (onOpenPurchaseModal) onOpenPurchaseModal(tpl);
  };
  const openGoogleModal = (_mode?: string) => {
    window.location.href = '/login?redirect=/board-studio';
  };
  const [currentTab, setCurrentTab] = useState<'store' | 'my-store'>(activeStoreTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [savedBoards, setSavedBoards] = useState<SavedUserBoard[]>([]);
  const [downloadingCardId, setDownloadingCardId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Sync external tab prop if parent updates it
  useEffect(() => {
    setCurrentTab(activeStoreTab);
  }, [activeStoreTab]);

  // Load saved boards from browser storage
  useEffect(() => {
    loadSavedBoards();
  }, []);

  const loadSavedBoards = () => {
    const boards = storageService.getUserBoards();
    setSavedBoards(boards);
  };

  const handleSwitchTab = (tab: 'store' | 'my-store') => {
    setCurrentTab(tab);
    if (onTabChange) onTabChange(tab);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Filter only published templates for public home page
  const publishedTemplates = useMemo(() => {
    return templates.filter((t) => t.published !== false);
  }, [templates]);

  // Categories list with counts
  const categories = useMemo(() => {
    return ['All', 'LED Texture Sheet', 'Coach Board', 'Station Board', 'SLR Board'];
  }, []);

  // Filtered store templates
  const filteredTemplates = useMemo(() => {
    return publishedTemplates.filter((tpl) => {
      const matchesCat = selectedCategory === 'All' || tpl.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        tpl.name.toLowerCase().includes(q) ||
        tpl.category.toLowerCase().includes(q) ||
        tpl.description.toLowerCase().includes(q) ||
        tpl.fields.some((f) => f.label.toLowerCase().includes(q) || f.defaultValue.toLowerCase().includes(q));

      return matchesCat && matchesSearch;
    });
  }, [publishedTemplates, selectedCategory, searchQuery]);

  // Filtered saved user boards
  const filteredSavedBoards = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return savedBoards;
    return savedBoards.filter((b) => {
      const tpl = templates.find((t) => t.id === b.templateId);
      const matchesTitle = b.title.toLowerCase().includes(q);
      const matchesTpl = tpl?.name.toLowerCase().includes(q) || tpl?.category.toLowerCase().includes(q);
      const matchesValues = Object.values(b.values).some((v) => v.toLowerCase().includes(q));
      return matchesTitle || matchesTpl || matchesValues;
    });
  }, [savedBoards, searchQuery, templates]);

  // Purchased templates unlocked by current user
  const unlockedPaidTemplates = useMemo(() => {
    return templates.filter((t) => t.isPaid && isTemplateUnlocked(t.id, true));
  }, [templates, currentUser, isTemplateUnlocked]);

  // 1-Click Instant DDS Download directly from Store Card
  const handleDirectDDS = async (
    e: React.MouseEvent,
    tpl: BoardTemplate,
    customValues?: UserBoardValues,
    customBg?: string
  ) => {
    e.stopPropagation();
    const actionKey = `${tpl.id}_dds`;
    setDownloadingCardId(actionKey);
    try {
      const vals = customValues || tpl.fields.reduce<Record<string, string>>((acc, f) => {
        acc[f.id] = f.defaultValue || f.imageUrl || '';
        return acc;
      }, {});
      await exportBoardToDDS(tpl, vals, 'bgra8', customBg || undefined);
      showToast(`Downloaded DDS texture for "${tpl.name}"!`);
    } catch (err) {
      alert('Error downloading DDS: ' + err);
    } finally {
      setDownloadingCardId(null);
    }
  };

  // 1-Click Instant PNG Download directly from Store Card
  const handleDirectPNG = async (
    e: React.MouseEvent,
    tpl: BoardTemplate,
    customValues?: UserBoardValues,
    customBg?: string
  ) => {
    e.stopPropagation();
    const actionKey = `${tpl.id}_png`;
    setDownloadingCardId(actionKey);
    try {
      const vals = customValues || tpl.fields.reduce<Record<string, string>>((acc, f) => {
        acc[f.id] = f.defaultValue || f.imageUrl || '';
        return acc;
      }, {});
      await exportBoardToPNG(tpl, vals, 1, customBg || undefined);
      showToast(`Downloaded PNG image for "${tpl.name}"!`);
    } catch (err) {
      alert('Error downloading PNG: ' + err);
    } finally {
      setDownloadingCardId(null);
    }
  };

  // Delete saved board from My Store
  const handleDeleteSavedBoard = (e: React.MouseEvent, id: string, title: string) => {
    e.stopPropagation();
    if (window.confirm(`Delete "${title}" from My Store?`)) {
      storageService.deleteUserBoard(id);
      loadSavedBoards();
      showToast(`Removed "${title}" from My Store`);
    }
  };

  return (
    <div className="home-page-container">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="notification-toast">
          <CheckCircle size={15} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Hero Banner with Store Branding */}
      <section className="home-hero">
        <div className="hero-content">
          <div className="hero-badge">
            <Train size={15} />
            <span>MSTS & OPEN RAILS · SIMULATOR TEXTURE STUDIO</span>
          </div>

          <h1 className="hero-title">
            Indian Railways Name Board & Texture Studio
          </h1>
          <p className="hero-description">
            Authentic 1024×1024 locked UV mapping, Indian Railways LED amber matrix fonts, and universal <strong>DirectDraw Surface (.dds) & PNG</strong> exports for MSTS, Open Rails, and Trainz.
          </p>

          {/* User ID & Profile Status Pill */}
          <div className="hero-user-strip">
            {currentUser ? (
              <div className="hero-user-pill">
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #ef3b2d, #ff8a1f)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#fff', fontSize: 13, boxShadow: '0 0 12px rgba(239, 59, 45, 0.4)' }}>
                  {(currentUser.username || 'U').charAt(0).toUpperCase()}
                </div>
                <div className="hero-user-details">
                  <span className="hero-user-title">
                    Logged in as <strong>{currentUser.username || currentUser.email}</strong>
                  </span>
                  <span className="hero-user-id-tag">
                    User ID: <strong>USR-{currentUser.id}</strong>
                  </span>
                </div>
                <div className="hero-user-count">
                  <ShieldCheck size={13} style={{ color: 'var(--rail-amber)' }} />
                  <span>{unlockedPaidTemplates.length} Purchased Templates</span>
                </div>
              </div>
            ) : (
              <div className="hero-guest-pill">
                <div className="guest-info">
                  <Lock size={13} style={{ color: 'var(--rail-yellow)' }} />
                  <span>Sign in or create an account to get your permanent <strong>User ID</strong> and keep your unlocked templates safe!</span>
                </div>
                <button type="button" className="btn-hero-google-login" onClick={() => openGoogleModal('login')}>
                  <svg width="12" height="12" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span>Sign In / Register</span>
                </button>
              </div>
            )}
          </div>

          {/* Main Store Tabs Switcher */}
          <div className="store-main-tabs">
            <button
              type="button"
              className={`store-tab-btn ${currentTab === 'store' ? 'active' : ''}`}
              onClick={() => handleSwitchTab('store')}
            >
              <Store size={16} />
              <span>Template Store</span>
              <span className="tab-pill">{publishedTemplates.length}</span>
            </button>

            <button
              type="button"
              className={`store-tab-btn ${currentTab === 'my-store' ? 'active' : ''}`}
              onClick={() => handleSwitchTab('my-store')}
            >
              <BookmarkPlus size={16} />
              <span>My Store</span>
              <span className="tab-pill">{savedBoards.length + unlockedPaidTemplates.length}</span>
            </button>
          </div>

          {/* Search & Filter Bar */}
          <div className="hero-filter-bar">
            <div className="search-input-wrapper">
              <Search size={18} className="search-icon" />
              <input
                type="text"
                className="search-input"
                placeholder={
                  currentTab === 'store'
                    ? 'Search templates (e.g. Amrit Bharat, LED, Rajdhani, Station)...'
                    : 'Search your saved boards in My Store...'
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  type="button"
                  className="btn-clear-search"
                  onClick={() => setSearchQuery('')}
                >
                  Clear
                </button>
              )}
            </div>

            {/* Categories (Only in Store tab) */}
            {currentTab === 'store' && (
              <div className="home-category-chips">
                {categories.map((cat) => {
                  const count =
                    cat === 'All'
                      ? publishedTemplates.length
                      : publishedTemplates.filter((t) => t.category === cat).length;

                  return (
                    <button
                      key={cat}
                      type="button"
                      className={`home-cat-chip ${selectedCategory === cat ? 'active' : ''}`}
                      onClick={() => setSelectedCategory(cat)}
                    >
                      <span>{cat}</span>
                      <small className="cat-count">({count})</small>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Feature Highlights Bar */}
      <div className="home-features-ribbon">
        <div className="feature-item">
          <FileCode size={16} className="feature-icon" />
          <span><strong>DDS Texture Export</strong> for Trainz TRS19/22 & Open Rails</span>
        </div>
        <div className="feature-item">
          <Sparkles size={16} className="feature-icon" />
          <span><strong>Amber LED Glowing Fonts</strong> matching real IR coaches</span>
        </div>
        <div className="feature-item">
          <Layers size={16} className="feature-icon" />
          <span><strong>1-Click Quick Downloads</strong> directly from store cards</span>
        </div>
      </div>

      {/* =========================================================================
          TAB 1: OFFICIAL TEMPLATE STORE
          ========================================================================= */}
      {currentTab === 'store' && (
        <section className="home-gallery-section">
          <div className="gallery-section-header">
            <div className="header-titles">
              <h2>
                <Store size={18} style={{ color: 'var(--rail-accent)', marginRight: 6 }} />
                Available Templates in Store ({filteredTemplates.length})
              </h2>
              <span className="gallery-section-sub">
                Click <strong>"Customize"</strong> to re-enter text, or click <strong>"Direct DDS"</strong> for instant 1-click download.
              </span>
            </div>
          </div>

          {filteredTemplates.length === 0 ? (
            <div className="home-empty-state">
              <SlidersHorizontal size={40} />
              <h3>No templates found matching "{searchQuery}"</h3>
              <p>Try searching for different keywords or reset the category filters.</p>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('All');
                }}
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="home-templates-grid">
              {filteredTemplates.map((template) => {
                const isDdsDownloading = downloadingCardId === `${template.id}_dds`;
                const isPngDownloading = downloadingCardId === `${template.id}_png`;
                const isUnlocked = isTemplateUnlocked(template.id, template.isPaid);
                const price = template.price || 99;

                return (
                  <div
                    key={template.id}
                    className={`template-card store-card ${!isUnlocked ? 'template-card-locked' : ''}`}
                    onClick={() => {
                      if (!isUnlocked) {
                        openPurchaseModal(template);
                      } else {
                        onSelectTemplate(template);
                      }
                    }}
                  >
                    {/* Card Visual Preview */}
                    <div
                      className="card-preview-container"
                      style={{
                        backgroundColor:
                          template.backgroundType === 'transparent'
                            ? '#0d1117'
                            : template.backgroundColor,
                        backgroundImage: template.backgroundImageUrl
                          ? `url("${template.backgroundImageUrl}")`
                          : undefined,
                        backgroundSize: '100% 100%',
                        backgroundRepeat: 'no-repeat'
                      }}
                    >
                      {/* Visual Overlay elements */}
                      <div className="card-preview-overlay">
                        {template.fields.slice(0, 2).map((field) => (
                          <div
                            key={field.id}
                            className="preview-field-pill"
                            style={{
                              color: field.color || '#ffbe0b',
                              textShadow: field.ledGlow
                                ? '0 0 6px rgba(255,159,28,0.8)'
                                : undefined,
                              fontFamily: field.fontFamily
                            }}
                          >
                            {field.defaultValue || field.label}
                          </div>
                        ))}
                      </div>

                      {/* Format Badges & Price Tag */}
                      <div className="card-top-badges">
                        <span className="card-cat-badge">{template.category}</span>
                        {template.isTextureSheet && (
                          <span className="card-dds-badge">
                            <FileCode size={11} /> DDS Ready
                          </span>
                        )}
                        {/* Price Badge */}
                        {template.isPaid ? (
                          isUnlocked ? (
                            <span className="card-price-badge unlocked" title="Template unlocked for editing and downloads">
                              <CheckCircle size={10} /> Unlocked
                            </span>
                          ) : (
                            <span className="card-price-badge paid" title={`Purchase required: ₹${price}`}>
                              <Lock size={10} /> ₹{price}
                            </span>
                          )
                        ) : (
                          <span className="card-price-badge free" title="Free Template">
                            FREE
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Card Body Information */}
                    <div className="card-body">
                      <h3 className="card-title">{template.name}</h3>
                      <p className="card-desc">{template.description}</p>

                      <div className="card-specs-row">
                        <span className="spec-item">
                          <strong>Resolution:</strong> {template.baseWidth}×{template.baseHeight}px
                        </span>
                        <span className="spec-item">
                          <strong>Access:</strong> {template.isPaid ? (isUnlocked ? '✓ Unlocked' : `₹${price}`) : 'Free'}
                        </span>
                      </div>

                      {/* Easy Access Action Buttons */}
                      <div className="store-card-actions">
                        {isUnlocked ? (
                          <button
                            type="button"
                            className="btn-store-primary"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectTemplate(template);
                            }}
                            title="Open editor to re-enter text content"
                          >
                            <Zap size={13} />
                            <span>Customize</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="btn-store-primary btn-store-buy"
                            onClick={(e) => {
                              e.stopPropagation();
                              openPurchaseModal(template);
                            }}
                            title={`Buy to unlock editing access for ₹${price}`}
                          >
                            <ShoppingCart size={13} />
                            <span>Buy to Edit (₹{price})</span>
                          </button>
                        )}

                        <button
                          type="button"
                          className="btn-store-action dds-action"
                          onClick={(e) => {
                            if (!isUnlocked) {
                              e.stopPropagation();
                              openPurchaseModal(template);
                            } else {
                              handleDirectDDS(e, template);
                            }
                          }}
                          disabled={isDdsDownloading}
                          title={isUnlocked ? "1-Click download DDS texture" : `Unlock template to download DDS (₹${price})`}
                        >
                          <FileCode size={13} />
                          <span>{isDdsDownloading ? '...' : isUnlocked ? 'DDS' : '🔒 DDS'}</span>
                        </button>

                        <button
                          type="button"
                          className="btn-store-action"
                          onClick={(e) => {
                            if (!isUnlocked) {
                              e.stopPropagation();
                              openPurchaseModal(template);
                            } else {
                              handleDirectPNG(e, template);
                            }
                          }}
                          disabled={isPngDownloading}
                          title={isUnlocked ? "1-Click download PNG image" : `Unlock template to download PNG (₹${price})`}
                        >
                          <Download size={13} />
                          <span>{isPngDownloading ? '...' : isUnlocked ? 'PNG' : '🔒 PNG'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* =========================================================================
          TAB 2: MY STORE (PURCHASED TEMPLATES & USER SAVED CREATIONS)
          ========================================================================= */}
      {currentTab === 'my-store' && (
        <section className="home-gallery-section">
          <div className="gallery-section-header">
            <div className="header-titles">
              <h2>
                <BookmarkPlus size={18} style={{ color: 'var(--rail-yellow)', marginRight: 6 }} />
                My Store — Library & Purchases ({filteredSavedBoards.length + unlockedPaidTemplates.length})
              </h2>
              <span className="gallery-section-sub">
                Your personal library of purchased templates and customized nameboard creations. Linked to User ID: <strong>{currentUser ? `USR-${currentUser.id}` : 'Guest'}</strong>.
              </span>
            </div>

            <button
              type="button"
              className="btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}
              onClick={() => handleSwitchTab('store')}
            >
              <Store size={14} /> Browse Template Store
            </button>
          </div>

          {/* Section A: Purchased & Unlocked Templates */}
          {unlockedPaidTemplates.length > 0 && (
            <div className="my-store-unlocked-section" style={{ marginBottom: 32 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ShieldCheck size={18} style={{ color: 'var(--rail-green)' }} />
                  <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                    Purchased Templates ({unlockedPaidTemplates.length})
                  </h3>
                </div>
                <span style={{ background: 'rgba(34, 197, 94, 0.15)', color: 'var(--rail-green)', padding: '4px 10px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600 }}>
                  ✓ Unlocked for {currentUser ? `USR-${currentUser.id}` : 'Guest'}
                </span>
              </div>

              <div className="home-templates-grid">
                {unlockedPaidTemplates.map((template) => {
                  const isDdsDownloading = downloadingCardId === `${template.id}_dds`;
                  const isPngDownloading = downloadingCardId === `${template.id}_png`;

                  return (
                    <div
                      key={template.id}
                      className="template-card store-card purchased-store-card"
                      onClick={() => onSelectTemplate(template)}
                    >
                      <div
                        className="card-preview-container"
                        style={{
                          backgroundColor:
                            template.backgroundType === 'transparent'
                              ? '#0d1117'
                              : template.backgroundColor,
                          backgroundImage: template.backgroundImageUrl
                            ? `url("${template.backgroundImageUrl}")`
                            : undefined,
                          backgroundSize: '100% 100%',
                          backgroundRepeat: 'no-repeat'
                        }}
                      >
                        <div className="card-preview-overlay">
                          {template.fields.slice(0, 2).map((field) => (
                            <div
                              key={field.id}
                              className="preview-field-pill"
                              style={{
                                color: field.color || '#ffbe0b',
                                textShadow: field.ledGlow
                                  ? '0 0 6px rgba(255,159,28,0.8)'
                                  : undefined,
                                fontFamily: field.fontFamily
                              }}
                            >
                              {field.defaultValue || field.label}
                            </div>
                          ))}
                        </div>

                        <div className="card-top-badges">
                          <span className="card-price-badge unlocked">
                            <CheckCircle size={10} /> Purchased
                          </span>
                          <span className="card-cat-badge">{template.category}</span>
                        </div>
                      </div>

                      <div className="card-body">
                        <h3 className="card-title">{template.name}</h3>
                        <p className="card-desc">{template.description}</p>

                        <div className="card-specs-row">
                          <span className="spec-item">
                            <strong>Resolution:</strong> {template.baseWidth}×{template.baseHeight}px
                          </span>
                          <span className="spec-item">
                            <strong>Status:</strong> Unlocked
                          </span>
                        </div>

                        <div className="store-card-actions">
                          <button
                            type="button"
                            className="btn-store-primary"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectTemplate(template);
                            }}
                            title="Open editor to customize content"
                          >
                            <Zap size={13} />
                            <span>Customize</span>
                          </button>

                          <button
                            type="button"
                            className="btn-store-action dds-action"
                            onClick={(e) => handleDirectDDS(e, template)}
                            disabled={isDdsDownloading}
                            title="1-Click download DDS texture"
                          >
                            <FileCode size={13} />
                            <span>{isDdsDownloading ? '...' : 'DDS'}</span>
                          </button>

                          <button
                            type="button"
                            className="btn-store-action"
                            onClick={(e) => handleDirectPNG(e, template)}
                            disabled={isPngDownloading}
                            title="1-Click download PNG image"
                          >
                            <Download size={13} />
                            <span>{isPngDownloading ? '...' : 'PNG'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section B: Customized Saved Boards */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <BookmarkPlus size={18} style={{ color: 'var(--rail-yellow)' }} />
              <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                Customized Saved Boards ({filteredSavedBoards.length})
              </h3>
            </div>
          </div>

          {filteredSavedBoards.length === 0 && unlockedPaidTemplates.length === 0 ? (
            <div className="home-empty-state">
              <BookmarkPlus size={44} style={{ color: 'var(--rail-yellow)', opacity: 0.8 }} />
              <h3>Your personal store is currently empty</h3>
              <p>
                Browse any template in the <strong>Template Store</strong>, customize the train numbers and route text, then click <strong>"Save to My Store"</strong> or purchase a template to keep it here!
              </p>
              <button
                type="button"
                className="btn-primary"
                style={{ marginTop: 10 }}
                onClick={() => handleSwitchTab('store')}
              >
                <Store size={15} /> Go to Template Store
              </button>
            </div>
          ) : filteredSavedBoards.length === 0 ? (
            <div className="home-empty-state" style={{ padding: '24px 16px', marginBottom: 20 }}>
              <p style={{ margin: 0, color: 'var(--text-muted)' }}>
                No customized creations saved yet. Click "Customize" on any template above to edit and save boards!
              </p>
            </div>
          ) : (
            <div className="home-templates-grid">
              {filteredSavedBoards.map((board) => {
                const parentTpl = templates.find((t) => t.id === board.templateId) || templates[0];
                const isDdsDownloading = downloadingCardId === `${board.id}_dds`;
                const isPngDownloading = downloadingCardId === `${board.id}_png`;

                return (
                  <div
                    key={board.id}
                    className="template-card my-store-card"
                    onClick={() => onSelectTemplate(parentTpl, board.values, board.customBackground)}
                  >
                    {/* Card Visual Preview */}
                    <div
                      className="card-preview-container"
                      style={{
                        backgroundColor:
                          parentTpl.backgroundType === 'transparent'
                            ? '#0d1117'
                            : parentTpl.backgroundColor,
                        backgroundImage: board.customBackground
                          ? `url("${board.customBackground}")`
                          : parentTpl.backgroundImageUrl
                          ? `url("${parentTpl.backgroundImageUrl}")`
                          : undefined,
                        backgroundSize: '100% 100%',
                        backgroundRepeat: 'no-repeat'
                      }}
                    >
                      {/* Visual Overlay of user's saved text */}
                      <div className="card-preview-overlay">
                        {parentTpl.fields.slice(0, 2).map((field) => {
                          const val = board.values[field.id] || field.defaultValue;
                          return (
                            <div
                              key={field.id}
                              className="preview-field-pill"
                              style={{
                                color: field.color || '#ffbe0b',
                                textShadow: field.ledGlow
                                  ? '0 0 6px rgba(255,159,28,0.8)'
                                  : undefined,
                                fontFamily: field.fontFamily
                              }}
                            >
                              {val}
                            </div>
                          );
                        })}
                      </div>

                      <div className="card-top-badges">
                        <span className="card-cat-badge saved-tag">
                          <BookmarkPlus size={10} /> Saved in My Store
                        </span>
                        <span className="card-dds-badge">
                          <FileCode size={11} /> {parentTpl.baseWidth}×{parentTpl.baseHeight}
                        </span>
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="card-body">
                      <div className="my-store-title-row">
                        <h3 className="card-title">{board.title}</h3>
                        <button
                          type="button"
                          className="btn-delete-saved"
                          onClick={(e) => handleDeleteSavedBoard(e, board.id, board.title)}
                          title="Remove from My Store"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>

                      <p className="card-desc">
                        Template: <strong>{parentTpl.name}</strong> ({parentTpl.category})
                      </p>

                      <div className="card-specs-row">
                        <span className="spec-item">
                          <Clock size={12} style={{ marginRight: 4 }} />
                          {new Date(board.savedAt).toLocaleDateString()}
                        </span>
                      </div>

                      {/* Action buttons */}
                      <div className="store-card-actions">
                        <button
                          type="button"
                          className="btn-store-primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectTemplate(parentTpl, board.values, board.customBackground);
                          }}
                          title="Open this board in the editor"
                        >
                          <Edit3 size={13} />
                          <span>Open Editor</span>
                        </button>

                        <button
                          type="button"
                          className="btn-store-action dds-action"
                          onClick={(e) => handleDirectDDS(e, parentTpl, board.values, board.customBackground)}
                          disabled={isDdsDownloading}
                          title="Download customized DDS texture"
                        >
                          <FileCode size={13} />
                          <span>{isDdsDownloading ? '...' : 'DDS'}</span>
                        </button>

                        <button
                          type="button"
                          className="btn-store-action"
                          onClick={(e) => handleDirectPNG(e, parentTpl, board.values, board.customBackground)}
                          disabled={isPngDownloading}
                          title="Download customized PNG image"
                        >
                          <Download size={13} />
                          <span>{isPngDownloading ? '...' : 'PNG'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}
    </div>
  );
};

'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import confetti from 'canvas-confetti';
import {
  Layers,
  Sparkles,
  ShoppingBag,
  FolderHeart,
  ShieldCheck,
  Download,
  Lock,
  ExternalLink,
  Edit3,
  Trash2,
  Tv,
  ArrowRight
} from 'lucide-react';
import { PageShell } from '@/components/page-shell';
import NmTopNav from '@/components/board-studio/nm-top-nav';
import NmSidebar from '@/components/board-studio/nm-sidebar';
import NmCanvasViewport from '@/components/board-studio/nm-canvas-viewport';
import LiveryPatcherModal from '@/components/board-studio/livery-patcher-modal';
import ExportTemplateModal from '@/components/board-studio/export-template-modal';
import { AdminTemplateStudio } from '@/components/board-studio/admin-template-studio';

import { TEMPLATES } from '@/lib/nm-editor/templates';
import { TemplateStorage } from '@/lib/nm-editor/template-storage';
import { AtlasTemplate, BoardState, WeatheringState } from '@/lib/nm-editor/types';
import {
  type BoardTemplate,
  type UserCustomBoard,
  getBoardTemplates,
  getUserCustomBoards,
  saveUserCustomBoard,
  deleteUserCustomBoard,
  createBoardOrder
} from '@/lib/board-studio-api';
import { getStoredUser, isLoggedIn, type CurrentUser } from '@/lib/api';
import { exportCanvasAsDDS } from '@/lib/dds-generator';
import { load } from '@cashfreepayments/cashfree-js';

const cashfreeMode = process.env.NEXT_PUBLIC_CASHFREE_MODE === 'production' ? 'production' : 'sandbox';

type MainStudioTab = 'studio' | 'store' | 'my-boards' | 'admin';

export default function BoardStudioPage() {
  const [mainTab, setMainTab] = useState<MainStudioTab>('studio');
  const [sidebarTab, setSidebarTab] = useState('quick');
  const [zoom, setZoom] = useState(0.18);
  const [showUvGuides, setShowUvGuides] = useState(true);
  const [selectedPart, setSelectedPart] = useState<string | null>('longBoard');
  const [isTemplateLocked, setIsTemplateLocked] = useState(true);

  const [isPatcherOpen, setIsPatcherOpen] = useState(false);
  const [isExportTemplateModalOpen, setIsExportTemplateModalOpen] = useState(false);
  const [installedTemplates, setInstalledTemplates] = useState<AtlasTemplate[]>([]);

  // Current active template
  const [selectedTemplate, setSelectedTemplate] = useState<AtlasTemplate>(TEMPLATES[0]);

  // Store backend integration states
  const [apiTemplates, setApiTemplates] = useState<BoardTemplate[]>([]);
  const [userBoards, setUserBoards] = useState<UserCustomBoard[]>([]);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [isSavingToAccount, setIsSavingToAccount] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Full Nameboard Content & 4K Atlas State
  const [boardState, setBoardState] = useState<BoardState>({
    boardMode: "multi_rsa",
    trainNo: "12626",
    trainName: "Kerala Express",
    sourceEn: "MYSURU",
    sourceHi: "मैसूरु",
    sourceReg: "ಮೈಸೂರು",
    destEn: "CHENNAI",
    destHi: "चेन्नई",
    destReg: "சென்னை",
    zone: "SR",
    baseDepot: "TVC / SR",
    coachClass: "3A",
    customBoardColor: null,
    customTextColor: null,
    rsaSegments: [
      { station: "MYSURU", upNo: "56210", downNo: "56209" },
      { station: "CHAMRAJANAGAR", upNo: "16219", downNo: "16220" },
      { station: "THIRUPATI", upNo: "16204", downNo: "16203" },
      { station: "CHENNAI" }
    ],
    slrLuggage: {
      hindiText: "सामान",
      englishText: "LUGGAGE",
      smallBoardName: "VISAKHA EXPRESS",
      smallBoardHi: "विशाखा एक्सप्रेस",
      smallBoardReg: "విశాఖ ఎక్స్ ప్రెస్",
      smallBoardEndpoints: "SECUNDERABAD    BHUBANESWAR",
      liveryType: "utkrisht"
    },
    atlasParts: {
      showLongBoard: true,
      showSlrLuggage: true,
      showDoorPlates: true,
      showDepotStencils: true
    },
    parts: {
      longBoard: { x: 128, y: 128, width: 3840, height: 720 },
      slrLuggage: { x: 128, y: 1000, width: 1800, height: 1450 },
      doorPlates: { x: 2080, y: 1000, width: 1888, height: 1450 },
      depotStencils: { x: 128, y: 2600, width: 3840, height: 1368 }
    },
    layers: {
      showBackgroundCoach: true,
      showBoardBase: true,
      showTrainNoBox: true,
      showStationHindi: true,
      showStationEnglish: true,
      showStationRegional: true,
      showViaStrip: true,
      showZoneEmblem: true,
      showScrewsAndRivets: true,
      showDepotMarking: true
    }
  });

  // Weathering
  const [weathering, setWeathering] = useState<WeatheringState>({
    grime: 10,
    rust: 5,
    sunFade: 0,
    ledBloom: 40
  });

  // Dynamic Auto-Fit calculation so 4096x4096 is always visible
  const handleFitToScreen = useCallback(() => {
    const sidebarWidth = 384;
    const topbarHeight = 56;
    const padding = 64;
    const availW = Math.max(300, window.innerWidth - sidebarWidth - padding);
    const availH = Math.max(300, window.innerHeight - topbarHeight - padding);
    const targetW = selectedTemplate?.width || 4096;
    const targetH = selectedTemplate?.height || 4096;
    const fitZoom = Math.min(availW / targetW, availH / targetH);
    setZoom(Math.max(0.05, Math.min(1.0, Number((fitZoom * 0.95).toFixed(3)))));
  }, [selectedTemplate]);

  useEffect(() => {
    handleFitToScreen();
    window.addEventListener('resize', handleFitToScreen);
    return () => window.removeEventListener('resize', handleFitToScreen);
  }, [handleFitToScreen]);

  // Load custom templates and API data on mount
  const loadApiData = useCallback(async () => {
    try {
      setLoadingData(true);
      const user = getStoredUser();
      setCurrentUser(user);

      const [templatesData, userBoardsData] = await Promise.all([
        getBoardTemplates(),
        getUserCustomBoards().catch(() => [])
      ]);

      setApiTemplates(templatesData);
      setUserBoards(userBoardsData);
    } catch (err) {
      console.error('Failed to load store templates', err);
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    setInstalledTemplates(TemplateStorage.getInstalledTemplates());

    const savedStandard = typeof window !== 'undefined' ? localStorage.getItem('gjs_custom_asset_standard') : null;
    if (savedStandard) {
      try {
        const parsed = JSON.parse(savedStandard);
        setBoardState(prev => ({ ...prev, parts: parsed }));
      } catch (e) {
        console.error('Error loading saved asset standard', e);
      }
    }

    loadApiData();
  }, [loadApiData]);

  // Import a creator .gjs-template package file
  const handleImportTemplateFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const res = TemplateStorage.parseTemplateFile(evt.target?.result as string);
      if (res.success && res.template) {
        TemplateStorage.saveTemplate(res.template);
        const updatedList = TemplateStorage.getInstalledTemplates();
        setInstalledTemplates(updatedList);
        setSelectedTemplate(res.template);

        if (res.template.defaultParts) {
          setBoardState(prev => ({ ...prev, parts: { ...res.template!.defaultParts! } }));
        }
        if (res.template.defaultBoardState) {
          setBoardState(prev => ({ ...prev, ...res.template!.defaultBoardState }));
        }

        setIsTemplateLocked(res.template.lockedByDefault ?? true);
        confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
        alert(`Template "${res.template.name}" imported successfully!\nBuyer Mode is ${res.template.lockedByDefault ? 'ACTIVE (UV slots locked to protect 3D mesh)' : 'UNLOCKED'}.`);
      } else {
        alert(`Failed to import template: ${res.error}`);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleDeleteCustomTemplate = (templateId: string) => {
    TemplateStorage.deleteTemplate(templateId);
    const updated = TemplateStorage.getInstalledTemplates();
    setInstalledTemplates(updated);
    if (selectedTemplate.id === templateId) {
      setSelectedTemplate(TEMPLATES[0]);
      if (TEMPLATES[0].defaultParts) {
        setBoardState(prev => ({ ...prev, parts: { ...TEMPLATES[0].defaultParts! } }));
      }
    }
  };

  // Export 4096×4096 Master PNG
  const handleExportPng = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const fileName = `IR_4096_ATLAS_${boardState.sourceEn}_${boardState.destEn}.png`;
    const link = document.createElement('a');
    link.download = fileName;
    link.href = canvas.toDataURL('image/png');
    link.click();
    confetti({ particleCount: 90, spread: 80, origin: { y: 0.6 } });
  };

  // Export Simulator Binary DDS
  const handleExportDds = (format: 'RGBA32' | 'DXT5' = 'RGBA32') => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const fileName = `IR_${boardState.sourceEn}_${boardState.destEn}_${format.toUpperCase()}.dds`;
    exportCanvasAsDDS(canvas, fileName, format);
    confetti({ particleCount: 90, spread: 80, origin: { y: 0.6 } });
  };

  // Save design to user account in PostgreSQL
  const handleSaveToAccount = async () => {
    if (!isLoggedIn()) {
      window.location.href = '/login?redirect=/board-studio';
      return;
    }
    const canvas = canvasRef.current;
    try {
      setIsSavingToAccount(true);
      const previewImage = canvas ? canvas.toDataURL('image/jpeg', 0.8) : undefined;
      const title = `${boardState.trainNo} ${boardState.trainName || boardState.sourceEn + ' - ' + boardState.destEn}`;

      await saveUserCustomBoard({
        template_id: selectedTemplate.id,
        title,
        custom_field_values: {
          boardState,
          weathering,
          templateId: selectedTemplate.id
        },
        preview_image: previewImage
      });

      confetti({ particleCount: 70, spread: 70, origin: { y: 0.6 } });
      alert('Success! Your 4K custom board texture has been saved to your account.');
      loadApiData();
    } catch (err: any) {
      alert(err.message || 'Failed to save board to account.');
    } finally {
      setIsSavingToAccount(false);
    }
  };

  // Quick Unlock via Cashfree
  const handleQuickUnlock = async (template: BoardTemplate) => {
    if (!isLoggedIn()) {
      window.location.href = '/login?redirect=/board-studio';
      return;
    }
    try {
      const order = await createBoardOrder(template.id);
      if (order.status === 'APPROVED' || order.download_enabled) {
        await loadApiData();
        handleOpenStoreTemplateInStudio(template);
        return;
      }
      if (order.payment_session_id) {
        const cashfree = await load({ mode: cashfreeMode });
        await cashfree.checkout({
          paymentSessionId: order.payment_session_id,
          redirectTarget: '_self'
        });
      }
    } catch (err: any) {
      alert(err.message || 'Payment initiation failed.');
    }
  };

  // Open a store template in the Studio
  const handleOpenStoreTemplateInStudio = (t: BoardTemplate) => {
    const matched = TEMPLATES.find(built => built.id === t.id);
    if (matched) {
      setSelectedTemplate(matched);
      if (matched.defaultParts) setBoardState(prev => ({ ...prev, parts: { ...matched.defaultParts! } }));
    } else {
      const adapted: AtlasTemplate = {
        id: t.id,
        name: t.name,
        category: t.category,
        coachType: t.name,
        description: t.description,
        bgTheme: 'custom',
        boardColor: '#f7b118',
        boardBorderColor: '#9c1d1e',
        textColor: '#111111',
        accentColor: '#9c1d1e',
        width: t.base_width || 4096,
        height: t.base_height || 4096,
        fontFamily: "'Inter', sans-serif",
        layout: t.base_width === 4096 ? 'full_atlas' : 'three_tier',
        defaultParts: {
          longBoard: { x: 128, y: 128, width: 3840, height: 720 },
          slrLuggage: { x: 128, y: 1000, width: 1800, height: 1450 },
          doorPlates: { x: 2080, y: 1000, width: 1888, height: 1450 },
          depotStencils: { x: 128, y: 2600, width: 3840, height: 1368 }
        }
      };
      setSelectedTemplate(adapted);
    }
    setMainTab('studio');
  };

  // Open saved user custom board in studio
  const handleOpenSavedBoardInStudio = (board: UserCustomBoard) => {
    const customValues = (board.custom_field_values as any) || {};
    if (customValues.boardState && typeof customValues.boardState === 'object') {
      setBoardState(customValues.boardState);
    }
    if (customValues.weathering && typeof customValues.weathering === 'object') {
      setWeathering(customValues.weathering);
    }
    const templateId = customValues.templateId || board.template;
    const found = TEMPLATES.find(t => t.id === templateId) || TEMPLATES[0];
    setSelectedTemplate(found);
    setMainTab('studio');
  };

  const handleDeleteSavedBoard = async (id: number) => {
    if (!confirm('Are you sure you want to delete this custom board from your account?')) return;
    try {
      await deleteUserCustomBoard(id);
      setUserBoards(prev => prev.filter(b => b.id !== id));
    } catch (err: any) {
      alert(err.message || 'Failed to delete board.');
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100 font-sans">
      {/* Top Header Navigation Tabs */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-2 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="font-black text-amber-400 text-lg tracking-tight">GJS RAILWAY</span>
            <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">4K STUDIO</span>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setMainTab('studio')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
              mainTab === 'studio'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Tv className="w-3.5 h-3.5" />
            <span>4K Studio</span>
          </button>

          <button
            onClick={() => setMainTab('store')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
              mainTab === 'store'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Template Store</span>
          </button>

          <button
            onClick={() => setMainTab('my-boards')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
              mainTab === 'my-boards'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <FolderHeart className="w-3.5 h-3.5" />
            <span>My Saved Boards ({userBoards.length})</span>
          </button>

          {currentUser?.is_staff && (
            <button
              onClick={() => setMainTab('admin')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                mainTab === 'admin'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                  : 'text-purple-400 hover:text-purple-200'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Staff Studio</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Tab 1: Full 4K Studio */}
      {mainTab === 'studio' && (
        <div className="flex-1 flex flex-col overflow-hidden h-[calc(100vh-49px)]">
          <NmTopNav
            zoom={zoom}
            setZoom={setZoom}
            onFitScreen={handleFitToScreen}
            onExportPng={handleExportPng}
            onOpenPatcher={() => setIsPatcherOpen(true)}
            template={selectedTemplate}
            showUvGuides={showUvGuides}
            setShowUvGuides={setShowUvGuides}
            isTemplateLocked={isTemplateLocked}
            setIsTemplateLocked={setIsTemplateLocked}
            onOpenExportTemplate={() => setIsExportTemplateModalOpen(true)}
            onImportTemplateFile={handleImportTemplateFile}
          />

          <div className="flex-1 flex overflow-hidden">
            <NmSidebar
              activeTab={sidebarTab}
              setActiveTab={setSidebarTab}
              selectedTemplate={selectedTemplate}
              setSelectedTemplate={setSelectedTemplate}
              boardState={boardState}
              setBoardState={setBoardState}
              weathering={weathering}
              setWeathering={setWeathering}
              onExportPng={handleExportPng}
              onExportDds={handleExportDds}
              onSaveToAccount={handleSaveToAccount}
              isSavingToAccount={isSavingToAccount}
              onOpenPatcher={() => setIsPatcherOpen(true)}
              showUvGuides={showUvGuides}
              setShowUvGuides={setShowUvGuides}
              selectedPart={selectedPart}
              setSelectedPart={setSelectedPart}
              isTemplateLocked={isTemplateLocked}
              setIsTemplateLocked={setIsTemplateLocked}
              installedTemplates={installedTemplates}
              onDeleteCustomTemplate={handleDeleteCustomTemplate}
            />

            <NmCanvasViewport
              template={selectedTemplate}
              boardState={boardState}
              setBoardState={setBoardState}
              weathering={weathering}
              zoom={zoom}
              canvasRef={canvasRef}
              showUvGuides={showUvGuides}
              selectedPart={selectedPart}
              onSelectPart={setSelectedPart}
              isTemplateLocked={isTemplateLocked}
              setIsTemplateLocked={setIsTemplateLocked}
            />
          </div>
        </div>
      )}

      {/* Main Tab 2: Store Templates Catalog */}
      {mainTab === 'store' && (
        <div className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-6 overflow-y-auto">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-black text-white uppercase tracking-tight">Name Board Template Library</h2>
              <p className="text-xs text-slate-400">Authentic Indian Railways 4K Master Atlases & Single Strips</p>
            </div>
            <div className="flex gap-2">
              {['ALL', 'ICF', 'LHB', 'Digiboards'].map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    selectedCategory === cat
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {TEMPLATES.filter(t => selectedCategory === 'ALL' || t.category === selectedCategory).map(tmpl => {
              const apiMatch = apiTemplates.find(at => at.id === tmpl.id);
              const isPaid = apiMatch?.is_paid;
              const canCustomize = apiMatch?.can_customize ?? true;

              return (
                <div
                  key={tmpl.id}
                  className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden flex flex-col shadow-xl hover:border-slate-700 transition"
                >
                  <div className="h-44 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 relative flex items-center justify-center border-b border-slate-800">
                    <div className="text-center space-y-2">
                      <span className="text-xs px-2.5 py-1 rounded-full font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        {tmpl.category} 4096×4096
                      </span>
                      <h3 className="text-sm font-bold text-white line-clamp-1">{tmpl.name}</h3>
                      <p className="text-[11px] text-slate-400 line-clamp-2 px-2">{tmpl.description}</p>
                    </div>
                  </div>

                  <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-1">
                      <div className="text-[11px] text-slate-400">Coach Compatibility</div>
                      <div className="text-xs font-bold text-slate-200">{tmpl.coachType}</div>
                    </div>

                    <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                      {isPaid && !canCustomize ? (
                        <div className="text-amber-400 font-bold text-sm">
                          ₹{apiMatch?.price}
                        </div>
                      ) : (
                        <div className="text-emerald-400 font-bold text-xs flex items-center gap-1">
                          <span>UNLOCKED</span>
                        </div>
                      )}

                      {isPaid && !canCustomize ? (
                        <button
                          onClick={() => handleQuickUnlock(apiMatch!)}
                          className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow"
                        >
                          <Lock className="w-3.5 h-3.5" />
                          <span>Unlock via Cashfree</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setSelectedTemplate(tmpl);
                            if (tmpl.defaultParts) setBoardState(prev => ({ ...prev, parts: { ...tmpl.defaultParts! } }));
                            setMainTab('studio');
                          }}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold text-xs rounded-xl border border-slate-700 transition flex items-center gap-1.5"
                        >
                          <span>Open in 4K Studio</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Tab 3: My Saved Boards */}
      {mainTab === 'my-boards' && (
        <div className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-6 overflow-y-auto">
          <div>
            <h2 className="text-2xl font-black text-white uppercase tracking-tight">My Saved Custom Boards</h2>
            <p className="text-xs text-slate-400">Your custom train nameboards saved to your account</p>
          </div>

          {userBoards.length === 0 ? (
            <div className="p-12 text-center rounded-3xl border border-dashed border-slate-800 bg-slate-900/50 space-y-3">
              <FolderHeart className="w-12 h-12 text-slate-600 mx-auto" />
              <div className="text-sm font-bold text-slate-300">No Custom Boards Saved Yet</div>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Customize any Indian Railways LED destination board in the 4K Studio, then click &quot;Save Design to My Account&quot; to keep it here.
              </p>
              <button
                onClick={() => setMainTab('studio')}
                className="mt-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition shadow"
              >
                Go to 4K Studio
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {userBoards.map(board => (
                <div
                  key={board.id}
                  className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden flex flex-col shadow-xl"
                >
                  <div className="h-44 bg-slate-950 p-2 relative flex items-center justify-center border-b border-slate-800">
                    {board.preview_image_url ? (
                      <img
                        src={board.preview_image_url}
                        alt={board.title}
                        className="max-h-full max-w-full object-contain rounded"
                      />
                    ) : (
                      <Tv className="w-12 h-12 text-slate-700" />
                    )}
                  </div>

                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                      <h3 className="text-sm font-bold text-white line-clamp-1">{board.title}</h3>
                      <div className="text-[11px] text-slate-400">
                        Template: <strong className="text-amber-400">{board.template}</strong>
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Saved: {new Date(board.saved_at).toLocaleDateString()}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                      <button
                        onClick={() => handleDeleteSavedBoard(board.id)}
                        className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg transition"
                        title="Delete board"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleOpenSavedBoardInStudio(board)}
                        className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Open & Edit</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Main Tab 4: Staff Studio */}
      {mainTab === 'admin' && currentUser?.is_staff && (
        <div className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-6 overflow-y-auto">
          <AdminTemplateStudio templates={apiTemplates} onRefresh={loadApiData} />
        </div>
      )}

      {/* Modals */}
      <LiveryPatcherModal
        isOpen={isPatcherOpen}
        onClose={() => setIsPatcherOpen(false)}
        nameboardCanvasRef={canvasRef}
      />

      <ExportTemplateModal
        isOpen={isExportTemplateModalOpen}
        onClose={() => setIsExportTemplateModalOpen(false)}
        currentTemplate={selectedTemplate}
        boardState={boardState}
      />
    </div>
  );
}

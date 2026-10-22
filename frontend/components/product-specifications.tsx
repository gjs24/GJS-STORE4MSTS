"use client";

import React, { useState } from "react";
import {
  FileText,
  Cpu,
  DownloadCloud,
  History,
  Video,
  CheckCircle,
  Copy,
  Check,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import type { Asset } from "@/lib/api";
import { MarkdownContent } from "@/components/markdown-content";

interface ProductSpecificationsProps {
  asset: Asset;
}

function getYouTubeEmbedUrl(url: string) {
  try {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11
      ? `https://www.youtube-nocookie.com/embed/${match[2]}?rel=0`
      : url;
  } catch {
    return url;
  }
}

export function ProductSpecifications({ asset }: ProductSpecificationsProps) {
  const hasDescription = Boolean(asset.description && asset.description.trim());
  const hasRequirements = Boolean(asset.requirements && asset.requirements.trim());
  const hasInstallation = Boolean(asset.installation_steps && asset.installation_steps.trim());
  const hasChangelog = Boolean(
    (asset.changelog && asset.changelog.trim()) ||
    (asset.updates && asset.updates.length > 0)
  );
  const hasVideo = Boolean(asset.preview_video_url && asset.preview_video_url.trim());

  // Determine available tabs
  const tabs = [
    {
      id: "overview",
      label: "Product Overview & Features",
      icon: FileText,
      available: true,
      badge: "Detailed",
    },
    ...(hasVideo
      ? [
          {
            id: "video",
            label: "Trailer & Gameplay",
            icon: Video,
            available: true,
            badge: "Watch",
          },
        ]
      : []),
    {
      id: "requirements",
      label: "System Requirements",
      icon: Cpu,
      available: hasRequirements,
      badge: asset.simulator_type.replace("_", " "),
    },
    {
      id: "installation",
      label: "Installation Guide",
      icon: DownloadCloud,
      available: hasInstallation,
      badge: "Easy Steps",
    },
    {
      id: "changelog",
      label: "Changelog & Updates",
      icon: History,
      available: hasChangelog,
      badge: `v${asset.version}`,
    },
  ].filter((t) => t.available);

  const [activeTab, setActiveTab] = useState(tabs[0]?.id || "overview");
  const [copiedPath, setCopiedPath] = useState(false);

  const copyTrainsetPath = () => {
    navigator.clipboard.writeText("MSTS\\TRAINS\\TRAINSET");
    setCopiedPath(true);
    setTimeout(() => setCopiedPath(false), 2000);
  };

  return (
    <div className="mt-14 max-w-7xl mx-auto w-full">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-rail-amber mb-1.5">
            <Sparkles size={14} className="text-rail-amber" />
            <span>Specifications & Documentation</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white">
            Product Details & Guide
          </h2>
        </div>
        <div className="text-xs text-slate-400">
          Package Version <span className="text-white font-mono font-semibold">v{asset.version}</span> • Compatible with{" "}
          <span className="text-rail-amber font-semibold">{asset.simulator_type.replace("_", " ")}</span>
        </div>
      </div>

      {/* Modern Desktop & Mobile Tab Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-white/10 mb-8">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2.5 px-4 py-3 rounded-xl font-semibold text-xs sm:text-sm whitespace-nowrap transition-all duration-150 ${
                isActive
                  ? "bg-rail-amber text-black shadow-lg shadow-amber-950/30 font-bold scale-[1.02]"
                  : "bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] hover:text-white border border-white/5"
              }`}
            >
              <Icon size={16} className={isActive ? "text-black" : "text-rail-amber"} />
              <span>{tab.label}</span>
              {tab.badge && (
                <span
                  className={`text-[10px] uppercase font-mono px-1.5 py-0.5 rounded ${
                    isActive
                      ? "bg-black/20 text-black font-bold"
                      : "bg-white/10 text-slate-400"
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      <div className="rounded-2xl border border-white/10 bg-slate-900/40 backdrop-blur-sm p-6 sm:p-8 shadow-xl">
        {/* TAB 1: PRODUCT OVERVIEW & FEATURES */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/10">
              <h3 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                <FileText className="text-rail-amber" size={20} />
                <span>Complete Description & Feature Highlights</span>
              </h3>
              <span className="text-xs text-slate-400">
                Official release notes by GJS Production
              </span>
            </div>

            {hasDescription ? (
              <MarkdownContent content={asset.description} className="max-w-4xl" />
            ) : (
              <div className="p-6 text-center text-slate-400">
                <p className="text-base text-slate-300 font-medium">{asset.short_description}</p>
                <p className="text-sm text-slate-500 mt-2">
                  No additional markdown description provided for this item.
                </p>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: PREVIEW VIDEO */}
        {activeTab === "video" && hasVideo && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/10">
              <h3 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                <Video className="text-rail-amber" size={20} />
                <span>Official Gameplay & Audio Showcase</span>
              </h3>
              <span className="text-xs text-slate-400">Watch in high definition</span>
            </div>

            <div className="aspect-video w-full max-w-4xl rounded-2xl overflow-hidden border border-white/10 bg-black shadow-2xl">
              <iframe
                src={getYouTubeEmbedUrl(asset.preview_video_url!)}
                title={`${asset.title} Preview Trailer`}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
            <p className="text-xs text-slate-400 flex items-center gap-1.5">
              <span>💡</span>
              <span>
                Tip: Watch in 1080p60 with headphones on for realistic traction motor and track sound immersion.
              </span>
            </p>
          </div>
        )}

        {/* TAB 3: SYSTEM REQUIREMENTS */}
        {activeTab === "requirements" && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/10">
              <h3 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                <Cpu className="text-rail-amber" size={20} />
                <span>Simulator & Hardware Requirements</span>
              </h3>
              <span className="text-xs text-slate-400">
                Optimized for smooth framerates
              </span>
            </div>

            {/* Quick Spec Highlights */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="p-4 rounded-xl border border-white/10 bg-white/[0.02]">
                <p className="text-xs text-slate-400 font-medium">Recommended Simulator</p>
                <p className="text-base font-bold text-white mt-1">Open Rails 1.6 / 1.6.1</p>
                <p className="text-[11px] text-emerald-400 mt-1">✓ Door animations & night lighting verified</p>
              </div>
              <div className="p-4 rounded-xl border border-white/10 bg-white/[0.02]">
                <p className="text-xs text-slate-400 font-medium">Package Download Size</p>
                <p className="text-base font-bold text-cyan-300 mt-1">{asset.file_size || "Standard"}</p>
                <p className="text-[11px] text-slate-400 mt-1">~2 GB free disk space recommended</p>
              </div>
              <div className="p-4 rounded-xl border border-white/10 bg-white/[0.02]">
                <p className="text-xs text-slate-400 font-medium">Operating System</p>
                <p className="text-base font-bold text-white mt-1">Windows 10 / 11</p>
                <p className="text-[11px] text-slate-400 mt-1">64-bit recommended</p>
              </div>
            </div>

            <MarkdownContent
              content={asset.requirements}
              fallbackText="Standard MSTS / Open Rails system requirements apply."
            />
          </div>
        )}

        {/* TAB 4: INSTALLATION GUIDE */}
        {activeTab === "installation" && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/10">
              <h3 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                <DownloadCloud className="text-rail-amber" size={20} />
                <span>Step-by-Step Installation Guide</span>
              </h3>
              <button
                onClick={copyTrainsetPath}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/20 bg-white/5 hover:bg-white/10 text-xs font-mono text-cyan-300 transition-colors"
                title="Copy trainset directory path"
              >
                {copiedPath ? (
                  <>
                    <Check size={13} className="text-emerald-400" />
                    <span className="text-emerald-300">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy size={13} />
                    <span>Copy Path: MSTS\TRAINS\TRAINSET</span>
                  </>
                )}
              </button>
            </div>

            {/* Quick Helper Banner */}
            <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-4 text-xs sm:text-sm text-slate-300 flex items-start gap-3">
              <span className="text-lg">💡</span>
              <div>
                <p className="font-semibold text-amber-300">Quick Installation Tip:</p>
                <p className="mt-0.5 text-slate-300 leading-relaxed">
                  Extract the downloaded archive using 7-Zip or WinRAR. Copy the entire trainset folder directly into your simulator&apos;s <code className="bg-black/60 text-cyan-300 px-1 py-0.5 rounded font-mono">TRAINS\TRAINSET</code> directory. If consists are provided in a <code className="bg-black/60 text-cyan-300 px-1 py-0.5 rounded font-mono">CONSISTS</code> folder, copy those into <code className="bg-black/60 text-cyan-300 px-1 py-0.5 rounded font-mono">TRAINS\CONSISTS</code>.
                </p>
              </div>
            </div>

            <MarkdownContent
              content={asset.installation_steps}
              fallbackText="1. Extract the downloaded archive.\n2. Copy into your MSTS/Open Rails TRAINSET directory.\n3. Launch Open Rails and select the trainset consist."
            />
          </div>
        )}

        {/* TAB 5: CHANGELOG & UPDATES */}
        {activeTab === "changelog" && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/10">
              <h3 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                <History className="text-rail-amber" size={20} />
                <span>Version History & Update Changelog</span>
              </h3>
              <span className="rounded bg-rail-amber/20 border border-rail-amber/40 px-2.5 py-0.5 text-xs font-mono font-bold text-rail-yellow">
                Current: v{asset.version}
              </span>
            </div>

            {asset.changelog ? (
              <MarkdownContent content={asset.changelog} />
            ) : null}

            {asset.updates && asset.updates.length > 0 && (
              <div className="space-y-4 pt-4 border-t border-white/10">
                <h4 className="text-sm font-bold uppercase tracking-wider text-slate-400">
                  Release History
                </h4>
                <div className="space-y-3">
                  {asset.updates.map((update) => (
                    <div
                      key={update.id}
                      className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white font-mono">
                          Version {update.version}
                        </span>
                        <span className="text-xs text-slate-400">
                          {new Date(update.created_at).toLocaleDateString("en-IN", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </div>
                      <p className="text-sm text-slate-300 whitespace-pre-line leading-relaxed">
                        {update.changelog}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!asset.changelog && (!asset.updates || asset.updates.length === 0) && (
              <p className="text-sm text-slate-400 italic">
                Initial release version v{asset.version}.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}


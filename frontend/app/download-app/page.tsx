"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Cpu,
  Download,
  ExternalLink,
  HardDrive,
  Info,
  Laptop,
  Monitor,
  Package,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Zap
} from "lucide-react";
import { fallbackSiteSettings, getSiteSettings, type SiteSettings } from "@/lib/api";

const APP_FEATURES = [
  {
    icon: Zap,
    title: "Zero Browser Overhead",
    description: "Enjoy a dedicated, responsive gaming environment without consuming RAM needed by MSTS or Open Rails."
  },
  {
    icon: HardDrive,
    title: "Direct Depot Downloads",
    description: "Easily download route packs, WAP-7 / WAG-9 locos, coach sets, and horn sound archives directly to your PC."
  },
  {
    icon: ShieldCheck,
    title: "Persistent Secure Login",
    description: "Remain securely authenticated. Access your purchased orders, invoices, and re-download links with one click."
  },
  {
    icon: RefreshCw,
    title: "Offline Resilient Screen",
    description: "Custom launcher screen with automatic reconnect alerts when your connection resumes or maintenance concludes."
  }
];

const INSTALL_STEPS = [
  {
    step: "01",
    title: "Download Installer",
    detail: "Click the download button above to save 'MSTS-GJS Production Store Setup 1.0.0.exe' (~100.9 MB) onto your computer."
  },
  {
    step: "02",
    title: "Windows SmartScreen",
    detail: "On first launch, Windows SmartScreen may show 'Windows protected your PC'. Click 'More info' and then select 'Run anyway'."
  },
  {
    step: "03",
    title: "Run & Pin Shortcut",
    detail: "Follow the prompt to install. A GJS Production chrome shortcut will appear on your desktop and start menu for instant access."
  }
];

const FAQS = [
  {
    q: "Why does Windows SmartScreen display 'Windows protected your PC'?",
    a: "Windows SmartScreen displays this alert for newly published software that hasn't built up months of algorithmic download telemetry yet. The app is 100% safe, clean, and built strictly from our verified open-source repository. Simply click 'More info' -> 'Run anyway' to proceed."
  },
  {
    q: "Can I use the app to download my previous web purchases?",
    a: "Yes! Simply sign in with your existing store account in the desktop app, and all your past orders, active licenses, and download links will be instantly accessible."
  },
  {
    q: "What are the minimum system requirements?",
    a: "Any PC running Windows 10 (64-bit, 1903 or newer) or Windows 11, with an Intel/AMD 64-bit CPU, 4 GB of RAM, and at least 250 MB of free hard drive space."
  },
  {
    q: "Are Mac, Linux, or Mobile versions available?",
    a: "The standalone installer is specifically tailored for Windows PC (the native operating system for MSTS and Open Rails). Mac and mobile users can install the store as a Progressive Web App (PWA) directly from their web browser."
  }
];

export default function DownloadAppPage() {
  const [settings, setSettings] = useState<SiteSettings>(fallbackSiteSettings);
  const [downloadStarted, setDownloadStarted] = useState(false);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  useEffect(() => {
    getSiteSettings()
      .then((data) => setSettings((prev) => ({ ...prev, ...data })))
      .catch(() => {});
  }, []);

  const downloadUrl =
    settings.desktop_app_download_url?.trim() ||
    "https://github.com/gjs24/msts-gjs-desktop-releases/releases/download/v1.0.0/MSTS-GJS.Production.Store.Setup.1.0.0.exe";
  const appVersion = settings.desktop_app_version?.trim() || "1.0.0";

  function handleDownloadClick() {
    setDownloadStarted(true);
    setTimeout(() => setDownloadStarted(false), 8000);
  }

  if (!settings.desktop_app_enabled) {
    return (
      <div className="min-h-screen bg-rail-black text-slate-100 flex items-center justify-center px-4 py-16">
        <div className="relative mx-auto max-w-lg text-center rounded-2xl border border-white/10 bg-white/[0.02] p-8 sm:p-10 backdrop-blur-xl">
          <div className="flex justify-center">
            <div className="relative flex h-24 w-24 items-center justify-center rounded-full border border-white/20 bg-neutral-950 p-2 shadow-2xl">
              <Image
                src="/desktop-app-icon.png"
                alt="GJS Production Desktop App"
                width={96}
                height={96}
                priority
                className="rounded-full object-cover"
              />
            </div>
          </div>
          <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-rail-amber/30 bg-rail-amber/10 px-3 py-1 text-xs font-semibold text-rail-amber">
            <span>Private Testing • Launching Soon</span>
          </div>
          <h1 className="mt-4 text-2xl sm:text-3xl font-black uppercase text-white">
            Desktop App Coming Soon
          </h1>
          <p className="mt-3 text-xs sm:text-sm leading-relaxed text-slate-400">
            The MSTS-GJS Windows Desktop Launcher is currently undergoing final security optimizations and private testing. Public downloads will be activated soon!
          </p>
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/assets"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-rail-red px-6 py-3 text-sm font-bold text-white shadow hover:bg-rail-red/90 transition"
            >
              <span>Explore Web Store</span>
            </Link>
            <Link
              href="/contact"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-semibold text-slate-300 hover:bg-white/10 hover:text-white transition"
            >
              <span>Contact Support</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-rail-black text-slate-100">
      {/* Background Accent Gradients */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden opacity-30">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-rail-red/25 blur-[120px] rounded-full" />
        <div className="absolute top-1/3 -left-40 w-[500px] h-[500px] bg-rail-amber/15 blur-[140px] rounded-full" />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-20">
        {/* HERO SECTION */}
        <section className="text-center">
          {/* Release Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-rail-amber/30 bg-rail-amber/10 px-3.5 py-1 text-xs font-semibold text-rail-amber backdrop-blur-md">
            <Sparkles size={14} />
            <span>Official Desktop Release • v{appVersion} for Windows</span>
          </div>

          {/* App Emblem & Title */}
          <div className="mt-8 flex justify-center">
            <div className="relative group">
              <div className="absolute -inset-2 rounded-full bg-gradient-to-r from-rail-red via-rail-amber to-rail-red opacity-50 blur-xl transition-all duration-500 group-hover:opacity-80 animate-pulse" />
              <div className="relative flex h-28 w-28 sm:h-36 sm:w-36 items-center justify-center rounded-full border-2 border-white/20 bg-neutral-950 p-2 shadow-2xl">
                <Image
                  src="/desktop-app-icon.png"
                  alt="GJS Production Desktop App"
                  width={144}
                  height={144}
                  priority
                  className="rounded-full object-cover shadow-inner"
                />
              </div>
            </div>
          </div>

          <h1 className="mt-6 text-3xl font-black uppercase tracking-tight sm:text-5xl lg:text-6xl text-white">
            MSTS-GJS Production <span className="text-rail-red">Store</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm sm:text-base leading-relaxed text-slate-300">
            The dedicated Windows desktop launcher for Train Simulator fans. Download locomotives, routes,
            custom sounds, and liveries with blazing speed, direct access, and zero browser distraction.
          </p>

          {/* Specifications Pills */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-xs text-slate-400">
            <span className="rounded-md border border-white/10 bg-white/5 px-3 py-1 font-medium text-slate-200">
              Windows 10 / 11 (64-bit)
            </span>
            <span className="rounded-md border border-white/10 bg-white/5 px-3 py-1 font-medium text-slate-200">
              Setup Installer (.exe)
            </span>
            <span className="rounded-md border border-white/10 bg-white/5 px-3 py-1 font-medium text-slate-200">
              File Size: ~100.9 MB
            </span>
            <span className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 font-medium text-emerald-400">
              Free & Official
            </span>
          </div>

          {/* Primary Action Buttons */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
            <a
              href={downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleDownloadClick}
              className="group flex w-full sm:w-auto items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-rail-red to-orange-600 px-8 py-4 text-base font-bold text-white shadow-lg shadow-rail-red/30 transition-all duration-300 hover:scale-[1.02] hover:shadow-rail-red/50 focus:outline-none"
            >
              <Download size={22} className="transition-transform group-hover:translate-y-0.5" />
              <span>Download for Windows (.exe)</span>
            </a>

            <Link
              href="/assets"
              className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-6 py-4 text-sm font-semibold text-slate-200 backdrop-blur-sm transition-all hover:bg-white/10 hover:text-white"
            >
              <Package size={18} />
              <span>Explore Store Assets</span>
            </Link>
          </div>

          {/* Download Initiated Banner */}
          {downloadStarted && (
            <div className="mx-auto mt-5 max-w-md animate-in fade-in slide-in-from-top-2 duration-300 rounded-xl border border-emerald-500/30 bg-emerald-950/40 p-4 text-xs text-emerald-300 backdrop-blur-md">
              <div className="flex items-center justify-center gap-2 font-semibold">
                <CheckCircle2 size={16} className="text-emerald-400" />
                <span>Your download is beginning!</span>
              </div>
              <p className="mt-1 text-slate-300">
                Check your browser downloads folder for <code className="font-mono text-white">MSTS-GJS Production Store Setup {appVersion}.exe</code>.
              </p>
            </div>
          )}
        </section>

        {/* WINDOWS SMARTSCREEN & INSTALLATION GUIDE */}
        <section className="mt-16 sm:mt-24">
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 sm:p-10 backdrop-blur-xl">
            <div className="text-center">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                How to Install on Windows
              </h2>
              <p className="mt-2 text-xs sm:text-sm text-slate-400">
                Quick 3-step setup to launch the GJS Production launcher on your machine.
              </p>
            </div>

            {/* Steps Grid */}
            <div className="mt-8 grid gap-6 md:grid-cols-3">
              {INSTALL_STEPS.map((item) => (
                <div
                  key={item.step}
                  className="relative flex flex-col justify-between rounded-xl border border-white/10 bg-black/40 p-6 transition-colors hover:border-white/20"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-2xl font-black text-rail-red/80">{item.step}</span>
                      <Monitor size={20} className="text-slate-500" />
                    </div>
                    <h3 className="mt-4 text-base font-bold text-white">{item.title}</h3>
                    <p className="mt-2 text-xs leading-relaxed text-slate-400">{item.detail}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* SmartScreen Visual Callout */}
            <div className="mt-8 rounded-xl border border-amber-500/30 bg-amber-500/10 p-5 sm:p-6 text-slate-200">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-rail-amber">
                  <ShieldAlert size={26} />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-rail-amber uppercase tracking-wider">
                    Notice for Windows Defender SmartScreen
                  </h4>
                  <p className="text-xs leading-relaxed text-slate-300">
                    Because this is an independent simulation community build, Windows SmartScreen may show{" "}
                    <span className="font-semibold text-white">&quot;Windows protected your PC&quot;</span> on first launch.
                    This is completely normal. Click{" "}
                    <span className="rounded bg-white/10 px-1.5 py-0.5 font-bold text-white">More info</span> and then click{" "}
                    <span className="rounded bg-white/10 px-1.5 py-0.5 font-bold text-white">Run anyway</span> to proceed.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* KEY FEATURES */}
        <section className="mt-16 sm:mt-24">
          <div className="text-center">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Engineered for Train Sim Enthusiasts
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-slate-400">
              Why use the desktop application over a standard browser tab?
            </p>
          </div>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {APP_FEATURES.map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <div
                  key={idx}
                  className="group rounded-xl border border-white/10 bg-white/[0.03] p-6 transition-all duration-300 hover:border-rail-red/50 hover:bg-white/[0.05]"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rail-red/10 text-rail-red transition-colors group-hover:bg-rail-red group-hover:text-white">
                    <Icon size={22} />
                  </div>
                  <h3 className="mt-5 text-sm sm:text-base font-bold text-white">{feature.title}</h3>
                  <p className="mt-2 text-xs leading-relaxed text-slate-400">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* SYSTEM REQUIREMENTS */}
        <section className="mt-16 sm:mt-24">
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-xl">
            <div className="border-b border-white/10 px-6 py-5">
              <h3 className="text-lg font-bold text-white flex items-center gap-2.5">
                <Cpu size={20} className="text-rail-amber" />
                <span>System Requirements</span>
              </h3>
            </div>
            <div className="divide-y divide-white/10 text-xs sm:text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-3 p-4 sm:px-6">
                <span className="font-semibold text-slate-400">Operating System</span>
                <span className="sm:col-span-2 text-slate-200">Windows 10 (version 1903+) or Windows 11 (64-bit)</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 p-4 sm:px-6">
                <span className="font-semibold text-slate-400">Processor</span>
                <span className="sm:col-span-2 text-slate-200">Intel Core i3 / AMD Ryzen 3 or higher (x64)</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 p-4 sm:px-6">
                <span className="font-semibold text-slate-400">System Memory (RAM)</span>
                <span className="sm:col-span-2 text-slate-200">4 GB Minimum (8 GB recommended for Open Rails)</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 p-4 sm:px-6">
                <span className="font-semibold text-slate-400">Disk Space</span>
                <span className="sm:col-span-2 text-slate-200">~250 MB free space for launcher and local cache</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 p-4 sm:px-6">
                <span className="font-semibold text-slate-400">Internet Connection</span>
                <span className="sm:col-span-2 text-slate-200">Required for browsing assets, auth, and updates</span>
              </div>
            </div>
          </div>
        </section>

        {/* FAQS ACCORDION */}
        <section className="mt-16 sm:mt-24">
          <div className="text-center">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Frequently Asked Questions
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-slate-400">
              Need help with the desktop installation or setup?
            </p>
          </div>

          <div className="mt-8 space-y-3">
            {FAQS.map((faq, index) => {
              const isOpen = activeFaq === index;
              return (
                <div
                  key={index}
                  className="rounded-xl border border-white/10 bg-white/[0.02] transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => setActiveFaq(isOpen ? null : index)}
                    className="flex w-full items-center justify-between p-5 text-left text-sm font-semibold text-slate-200 hover:text-white"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown
                      size={18}
                      className={`text-slate-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 text-xs sm:text-sm leading-relaxed text-slate-400 border-t border-white/5 pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* BOTTOM CTA BAR */}
        <section className="mt-16 sm:mt-24 text-center">
          <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-black/60 p-8 sm:p-12">
            <h2 className="text-2xl sm:text-4xl font-black uppercase text-white">
              Ready to Upgrade Your Depot?
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-xs sm:text-sm text-slate-400">
              Download the official MSTS-GJS Production Store launcher now and enjoy instant access to Indian railway simulators.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-4">
              <a
                href={downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleDownloadClick}
                className="inline-flex items-center gap-2.5 rounded-xl bg-rail-red px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-rail-red/30 transition hover:bg-rail-red/90"
              >
                <Download size={18} />
                <span>Download App v{appVersion}</span>
              </a>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-6 py-3.5 text-sm font-semibold text-slate-300 hover:bg-white/10 hover:text-white"
              >
                <span>Need Support? Contact Us</span>
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}


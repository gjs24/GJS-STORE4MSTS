"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles } from "lucide-react";
import type { SiteSettings } from "@/lib/api";

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rotation: number;
  vRot: number;
  shape: "rect" | "circle" | "spark";
  opacity: number;
};

const CONFETTI_COLORS = [
  "#f59e0b", // Gold
  "#ef4444", // Red
  "#3b82f6", // Blue
  "#10b981", // Emerald
  "#a855f7", // Purple
  "#fbbf24", // Yellow
  "#ec4899", // Pink
];

const GOLD_SPARKLE_COLORS = ["#fef08a", "#fde047", "#f59e0b", "#fbbf24", "#d97706"];
const SNOW_COLORS = ["#ffffff", "#e2e8f0", "#cbd5e1", "#f8fafc"];
const FIREWORK_COLORS = ["#38bdf8", "#fb7185", "#facc15", "#4ade80", "#c084fc"];

export function FestivalEffects({ settings }: { settings?: SiteSettings | null }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [enabled, setEnabled] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const stored = localStorage.getItem("gjs_festival_effects_enabled");
      if (stored === "false") setEnabled(false);
    } catch {
      // ignore
    }
  }, []);

  const toggleEffects = () => {
    const next = !enabled;
    setEnabled(next);
    try {
      localStorage.setItem("gjs_festival_effects_enabled", String(next));
    } catch {
      // ignore
    }
  };

  const effectType = settings?.festival_effect || "confetti";
  const isThemeActive = Boolean(settings?.festival_theme_enabled && effectType !== "none");

  useEffect(() => {
    if (!mounted || !isThemeActive || !enabled) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const onResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", onResize);

    const particles: Particle[] = [];
    const count = effectType === "snow" ? 45 : effectType === "sparkles" || effectType === "diyas" ? 35 : 50;

    const palette =
      effectType === "snow"
        ? SNOW_COLORS
        : effectType === "sparkles" || effectType === "diyas"
        ? GOLD_SPARKLE_COLORS
        : effectType === "fireworks"
        ? FIREWORK_COLORS
        : CONFETTI_COLORS;

    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * (effectType === "snow" ? 0.8 : 2),
        vy:
          effectType === "snow"
            ? 0.6 + Math.random() * 1.2
            : effectType === "sparkles" || effectType === "diyas"
            ? -(0.4 + Math.random() * 0.8) // rise gently like embers
            : 1.2 + Math.random() * 2.2, // fall like confetti
        size:
          effectType === "snow"
            ? 2 + Math.random() * 3.5
            : effectType === "sparkles" || effectType === "diyas"
            ? 1.5 + Math.random() * 3
            : 4 + Math.random() * 6,
        color: palette[Math.floor(Math.random() * palette.length)],
        rotation: Math.random() * 360,
        vRot: (Math.random() - 0.5) * 4,
        shape:
          effectType === "snow"
            ? "circle"
            : effectType === "sparkles" || effectType === "diyas"
            ? "spark"
            : Math.random() > 0.4
            ? "rect"
            : "circle",
        opacity: 0.3 + Math.random() * 0.5,
      });
    }

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.vRot;

        // Wrap around
        if (p.vy > 0 && p.y > height + 20) {
          p.y = -20;
          p.x = Math.random() * width;
        } else if (p.vy < 0 && p.y < -20) {
          p.y = height + 20;
          p.x = Math.random() * width;
        }
        if (p.x > width + 20) p.x = -20;
        if (p.x < -20) p.x = width + 20;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = p.color;

        if (p.shape === "rect") {
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 1.6);
        } else if (p.shape === "circle") {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Sparkle diamond shape
          ctx.beginPath();
          ctx.moveTo(0, -p.size);
          ctx.lineTo(p.size / 2, 0);
          ctx.lineTo(0, p.size);
          ctx.lineTo(-p.size / 2, 0);
          ctx.closePath();
          ctx.fill();
        }

        ctx.restore();
      });

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", onResize);
    };
  }, [mounted, isThemeActive, effectType, enabled]);

  if (!mounted || !isThemeActive) return null;

  return (
    <>
      {enabled ? (
        <canvas
          ref={canvasRef}
          className="pointer-events-none fixed inset-0 z-30 h-full w-full opacity-65"
          aria-hidden="true"
        />
      ) : null}

      {/* Floating Subtle Toggle in Bottom Corner */}
      <button
        type="button"
        onClick={toggleEffects}
        title={enabled ? "Mute celebratory visual effects" : "Turn on celebratory visual effects"}
        className="fixed bottom-4 left-4 z-40 flex items-center gap-1.5 rounded-full border border-white/15 bg-black/70 px-2.5 py-1 text-[11px] font-semibold text-slate-300 backdrop-blur-md transition-all hover:bg-black/90 hover:text-white hover:border-amber-400/50 shadow-md"
      >
        <Sparkles size={12} className={enabled ? "text-amber-400" : "text-slate-500"} />
        <span>{enabled ? "Effects On" : "Effects Off"}</span>
      </button>
    </>
  );
}

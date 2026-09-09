"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles } from "lucide-react";
import type { SiteSettings } from "@/lib/api";

type StandardParticle = {
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

// ==========================================
// SKY SHOTS & CRACKERS TYPES & PALETTES
// ==========================================

type Rocket = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  targetY: number;
  color: string;
  palette: string[];
  style: "peony" | "willow" | "crackle" | "ring" | "double";
  trail: { x: number; y: number }[];
};

type CrackerSpark = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  alpha: number;
  decay: number;
  size: number;
  gravity: number;
  friction: number;
  history: { x: number; y: number }[];
  twinkle: boolean;
  crackle?: boolean;
  popOnDie?: boolean;
};

type TailSpark = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  decay: number;
  color: string;
  size: number;
};

type FlashRing = {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  color: string;
  alpha: number;
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

// Authentic Indian Festival & Celebration Sky Shot Color Palettes
const SKYSHOT_PALETTES = [
  // Royal Crimson & Gold Salute
  ["#ff0055", "#ffd700", "#ff9100", "#ffffff", "#ff2a5f"],
  // Electric Cyan & Royal Violet
  ["#00f5d4", "#7b2cbf", "#00bbf9", "#ffffff", "#d946ef"],
  // Deepavali Emerald & Golden Amber
  ["#00e676", "#ffea00", "#10b981", "#ffffff", "#f59e0b"],
  // Multicolor Festival Sky Shot
  ["#ff007f", "#00f0ff", "#ffe600", "#00ff66", "#b026ff", "#ffffff"],
  // Golden Willow Brocade (Glittering Weeping Willow)
  ["#ffd700", "#ffaa00", "#ffe082", "#ffffff", "#f59e0b"],
  // Silver Strobe & Electric Azure
  ["#ffffff", "#38bdf8", "#818cf8", "#f8fafc", "#60a5fa"],
  // Fiery Tangerine & Red Flame
  ["#ff4800", "#ff0055", "#ffaa00", "#ffff00", "#ffffff"],
];

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
  const isSkyShots = effectType === "skyshots" || effectType === "fireworks";

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

    // ==========================================
    // 1. SKY SHOTS & CRACKERS ENGINE
    // ==========================================
    if (isSkyShots) {
      const rockets: Rocket[] = [];
      const sparks: CrackerSpark[] = [];
      const tailSparks: TailSpark[] = [];
      const flashes: FlashRing[] = [];

      let frameCounter = 0;
      let nextLaunchFrames = 25; // initial quick first launch
      let lastClickLaunch = 0;

      const launchRocket = (customX?: number, customTargetY?: number) => {
        const x = customX ?? (0.12 * width + Math.random() * 0.76 * width);
        const y = height + 10;
        const targetY = customTargetY ?? (height * (0.12 + Math.random() * 0.38));

        // Physics: calculate initial upward velocity to reach roughly targetY against gravity
        const distance = Math.max(100, y - targetY);
        const vy = -Math.min(18.5, Math.max(12.5, Math.sqrt(2 * 0.17 * distance)));
        const vx = (Math.random() - 0.5) * 2.2;

        const palette = SKYSHOT_PALETTES[Math.floor(Math.random() * SKYSHOT_PALETTES.length)];
        const styles: ("peony" | "willow" | "crackle" | "ring" | "double")[] = [
          "peony",
          "willow",
          "crackle",
          "ring",
          "double",
        ];
        const style = styles[Math.floor(Math.random() * styles.length)];

        rockets.push({
          x,
          y,
          vx,
          vy,
          targetY,
          color: palette[0],
          palette,
          style,
          trail: [],
        });
      };

      const createSpark = (
        x: number,
        y: number,
        vx: number,
        vy: number,
        palette: string[],
        twinkle: boolean,
        crackle: boolean,
        decay: number,
        willow = false
      ): CrackerSpark => {
        const color = palette[Math.floor(Math.random() * palette.length)];
        return {
          x,
          y,
          vx,
          vy,
          color,
          alpha: 1,
          decay,
          size: willow ? 1.8 + Math.random() * 1.4 : 2.2 + Math.random() * 1.6,
          gravity: willow ? 0.07 : 0.062,
          friction: willow ? 0.962 : 0.968,
          history: [{ x, y }],
          twinkle,
          crackle,
          popOnDie: crackle && Math.random() > 0.45,
        };
      };

      const explodeRocket = (r: Rocket) => {
        // Flash shockwave ring
        flashes.push({
          x: r.x,
          y: r.y,
          radius: 8,
          maxRadius: r.style === "double" ? 65 : 50,
          color: r.color,
          alpha: 0.9,
        });

        const sparkCount = r.style === "willow" ? 65 : r.style === "crackle" ? 60 : 70;

        if (r.style === "ring") {
          // Ring burst
          const ringCount = 38;
          const spd = 4.2 + Math.random() * 1.5;
          for (let i = 0; i < ringCount; i++) {
            const angle = (i / ringCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.12;
            const speed = spd * (0.92 + Math.random() * 0.16);
            sparks.push(
              createSpark(
                r.x,
                r.y,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                r.palette,
                false,
                false,
                0.015
              )
            );
          }
          // Center fiery burst
          for (let i = 0; i < 14; i++) {
            const a = Math.random() * Math.PI * 2;
            const s = Math.random() * 2.2;
            sparks.push(
              createSpark(
                r.x,
                r.y,
                Math.cos(a) * s,
                Math.sin(a) * s,
                r.palette,
                true,
                true,
                0.02
              )
            );
          }
        } else if (r.style === "willow") {
          // Weeping golden willow with sparkling long trails
          for (let i = 0; i < sparkCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const spd = 1.8 + Math.random() * 4.8;
            sparks.push(
              createSpark(
                r.x,
                r.y,
                Math.cos(angle) * spd,
                Math.sin(angle) * spd,
                r.palette,
                true,
                false,
                0.010,
                true
              )
            );
          }
        } else if (r.style === "crackle") {
          // Crackling Palm Cracker
          for (let i = 0; i < sparkCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const spd = 2.2 + Math.random() * 5.2;
            sparks.push(
              createSpark(
                r.x,
                r.y,
                Math.cos(angle) * spd,
                Math.sin(angle) * spd,
                r.palette,
                true,
                true,
                0.017
              )
            );
          }
        } else if (r.style === "double") {
          // Multi-break: Initial blast now, secondary satellite bursts in 130ms!
          for (let i = 0; i < 42; i++) {
            const angle = Math.random() * Math.PI * 2;
            const spd = 3.0 + Math.random() * 4.4;
            sparks.push(
              createSpark(
                r.x,
                r.y,
                Math.cos(angle) * spd,
                Math.sin(angle) * spd,
                r.palette,
                false,
                false,
                0.015
              )
            );
          }
          const posX = r.x;
          const posY = r.y;
          const pal = r.palette;
          setTimeout(() => {
            if (!canvasRef.current) return;
            for (let offset of [-28, 28]) {
              flashes.push({
                x: posX + offset,
                y: posY - 10,
                radius: 5,
                maxRadius: 35,
                color: "#ffffff",
                alpha: 0.8,
              });
              for (let j = 0; j < 22; j++) {
                const a = Math.random() * Math.PI * 2;
                const s = 1.6 + Math.random() * 3.4;
                sparks.push(
                  createSpark(
                    posX + offset,
                    posY - 10,
                    Math.cos(a) * s,
                    Math.sin(a) * s,
                    pal,
                    true,
                    true,
                    0.022
                  )
                );
              }
            }
          }, 130);
        } else {
          // Classic Peony Starburst (Spherical blossom)
          for (let i = 0; i < sparkCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const spd = 2.2 + Math.random() * 5.6;
            sparks.push(
              createSpark(
                r.x,
                r.y,
                Math.cos(angle) * spd,
                Math.sin(angle) * spd,
                r.palette,
                Math.random() > 0.4,
                false,
                0.014 + Math.random() * 0.008
              )
            );
          }
        }
      };

      // Interactive Click-to-Launch celebratory sky shot
      const handleUserClick = (e: MouseEvent) => {
        const now = Date.now();
        if (now - lastClickLaunch < 280) return;
        lastClickLaunch = now;
        launchRocket(e.clientX, Math.max(80, e.clientY));
      };
      window.addEventListener("click", handleUserClick);

      // Render Loop for Sky Shots
      const render = () => {
        ctx.clearRect(0, 0, width, height);

        // Schedule automated rocket launches
        frameCounter++;
        if (frameCounter >= nextLaunchFrames) {
          frameCounter = 0;
          // Randomize next launch: between 45 and 95 frames (~0.75s to 1.5s)
          nextLaunchFrames = Math.floor(45 + Math.random() * 50);

          launchRocket();

          // 25% chance of a dual sky shot salute volley!
          if (Math.random() < 0.25) {
            setTimeout(() => {
              if (canvasRef.current) launchRocket();
            }, 120);
          }
        }

        // Set Additive Blending for realistic incandescent pyrotechnic glow
        ctx.globalCompositeOperation = "lighter";

        // ----------------------------------------
        // 1. Update & Render Rockets
        // ----------------------------------------
        for (let i = rockets.length - 1; i >= 0; i--) {
          const r = rockets[i];

          // Save trail
          r.trail.unshift({ x: r.x, y: r.y });
          if (r.trail.length > 5) r.trail.pop();

          // Emit fiery rocket engine tail sparks
          for (let k = 0; k < 2; k++) {
            tailSparks.push({
              x: r.x + (Math.random() - 0.5) * 3,
              y: r.y + 4,
              vx: r.vx * 0.2 + (Math.random() - 0.5) * 0.8,
              vy: 1.5 + Math.random() * 2.5,
              alpha: 0.85,
              decay: 0.038,
              color: Math.random() > 0.3 ? "#ffaa00" : "#ffffff",
              size: 1.5 + Math.random() * 1.5,
            });
          }

          // Physics
          r.x += r.vx;
          r.y += r.vy;
          r.vy += 0.17; // gravity pulling rocket down

          // Detonation check: reached target altitude or upward speed stalled
          if (r.y <= r.targetY || r.vy >= -1.2) {
            explodeRocket(r);
            rockets.splice(i, 1);
            continue;
          }

          // Draw ascending rocket head
          ctx.beginPath();
          ctx.arc(r.x, r.y, 2.6, 0, Math.PI * 2);
          ctx.fillStyle = "#ffffff";
          ctx.fill();

          // Draw rocket tip glow
          ctx.beginPath();
          ctx.arc(r.x, r.y, 6, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(255, 220, 100, 0.4)";
          ctx.fill();
        }

        // ----------------------------------------
        // 2. Update & Render Ascending Tail Sparks
        // ----------------------------------------
        for (let i = tailSparks.length - 1; i >= 0; i--) {
          const t = tailSparks[i];
          t.x += t.vx;
          t.y += t.vy;
          t.alpha -= t.decay;

          if (t.alpha <= 0) {
            tailSparks.splice(i, 1);
            continue;
          }

          ctx.beginPath();
          ctx.arc(t.x, t.y, t.size * t.alpha, 0, Math.PI * 2);
          ctx.fillStyle = t.color;
          ctx.globalAlpha = t.alpha * 0.8;
          ctx.fill();
        }

        // ----------------------------------------
        // 3. Update & Render Detonation Flashes
        // ----------------------------------------
        for (let i = flashes.length - 1; i >= 0; i--) {
          const f = flashes[i];
          f.radius += (f.maxRadius - f.radius) * 0.28;
          f.alpha -= 0.07;

          if (f.alpha <= 0 || f.radius >= f.maxRadius - 2) {
            flashes.splice(i, 1);
            continue;
          }

          ctx.save();
          ctx.beginPath();
          ctx.arc(f.x, f.y, f.radius, 0, Math.PI * 2);
          ctx.strokeStyle = f.color;
          ctx.lineWidth = 2.5 * f.alpha;
          ctx.globalAlpha = f.alpha * 0.6;
          ctx.stroke();
          ctx.restore();
        }

        // ----------------------------------------
        // 4. Update & Render Explosion Cracker Sparks
        // ----------------------------------------
        for (let i = sparks.length - 1; i >= 0; i--) {
          const s = sparks[i];

          // Save trail history
          s.history.unshift({ x: s.x, y: s.y });
          if (s.history.length > 4) s.history.pop();

          // Physics: air resistance deceleration + gentle gravity
          s.vx *= s.friction;
          s.vy *= s.friction;
          s.vy += s.gravity;
          s.x += s.vx;
          s.y += s.vy;
          s.alpha -= s.decay;

          // Micro-pop on extinguish for crackling crackers
          if (s.alpha <= 0.04 && s.popOnDie) {
            s.popOnDie = false;
            tailSparks.push({
              x: s.x,
              y: s.y,
              vx: (Math.random() - 0.5) * 1.5,
              vy: (Math.random() - 0.5) * 1.5,
              color: "#ffffff",
              alpha: 0.9,
              decay: 0.07,
              size: 1.4,
            });
          }

          if (s.alpha <= 0) {
            sparks.splice(i, 1);
            continue;
          }

          // Twinkle / crackle intensity flicker
          const renderAlpha = s.twinkle
            ? s.alpha * (0.65 + Math.random() * 0.35)
            : s.alpha;

          // Draw radiant spark tail streak
          if (s.history.length > 1) {
            ctx.beginPath();
            ctx.moveTo(s.history[0].x, s.history[0].y);
            for (let h = 1; h < s.history.length; h++) {
              ctx.lineTo(s.history[h].x, s.history[h].y);
            }
            ctx.strokeStyle = s.color;
            ctx.lineWidth = Math.max(0.6, s.size * renderAlpha);
            ctx.lineCap = "round";
            ctx.globalAlpha = renderAlpha;
            ctx.stroke();
          }

          // Draw spark head
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.size * 0.65 * renderAlpha, 0, Math.PI * 2);
          ctx.fillStyle = s.color;
          ctx.globalAlpha = renderAlpha;
          ctx.fill();
        }

        // Reset globalAlpha & composite operation for next frame
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = "source-over";

        animId = requestAnimationFrame(render);
      };

      render();

      return () => {
        cancelAnimationFrame(animId);
        window.removeEventListener("resize", onResize);
        window.removeEventListener("click", handleUserClick);
      };
    }

    // ==========================================
    // 2. STANDARD PARTICLES (CONFETTI / SNOW / SPARKLES / DIYAS)
    // ==========================================
    const particles: StandardParticle[] = [];
    const count =
      effectType === "snow"
        ? 45
        : effectType === "sparkles" || effectType === "diyas"
        ? 35
        : 50;

    const palette =
      effectType === "snow"
        ? SNOW_COLORS
        : effectType === "sparkles" || effectType === "diyas"
        ? GOLD_SPARKLE_COLORS
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

        // Wrap around screen boundaries
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
  }, [mounted, isThemeActive, effectType, enabled, isSkyShots]);

  if (!mounted || !isThemeActive) return null;

  return (
    <>
      {enabled ? (
        <canvas
          ref={canvasRef}
          className={`pointer-events-none fixed inset-0 z-30 h-full w-full ${
            isSkyShots ? "opacity-95" : "opacity-65"
          }`}
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


"use client";

import * as React from "react";
import { Sparkles, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { raffleSound, type RaffleSoundLoop } from "@/lib/raffle-sound";

export type PrizeType = "HP" | "E-Money" | "Tumbler";

export interface WheelSegment {
  id: number;
  label: string;
  type: PrizeType;
  color: string;
  textColor: string;
  gradient: [string, string];
}

// 10 segmen: 5 Tumbler, 1 HP, 4 E-Money (Tumbler sebagai penengah di setiap posisi genap)
export const WHEEL_SEGMENTS: WheelSegment[] = [
  {
    id: 0,
    label: "Tumbler",
    type: "Tumbler",
    color: "#ffffff",
    textColor: "#0f172a",
    gradient: ["#ffffff", "#f1f5f9"],
  },
  {
    id: 1,
    label: "1 HP",
    type: "HP",
    color: "#d946ef",
    textColor: "#ffffff",
    gradient: ["#ec4899", "#c026d3"],
  },
  {
    id: 2,
    label: "Tumbler",
    type: "Tumbler",
    color: "#ffffff",
    textColor: "#0f172a",
    gradient: ["#ffffff", "#f1f5f9"],
  },
  {
    id: 3,
    label: "E-Money",
    type: "E-Money",
    color: "#0284c7",
    textColor: "#ffffff",
    gradient: ["#38bdf8", "#0284c7"],
  },
  {
    id: 4,
    label: "Tumbler",
    type: "Tumbler",
    color: "#ffffff",
    textColor: "#0f172a",
    gradient: ["#ffffff", "#f1f5f9"],
  },
  {
    id: 5,
    label: "E-Money",
    type: "E-Money",
    color: "#2563eb",
    textColor: "#ffffff",
    gradient: ["#60a5fa", "#2563eb"],
  },
  {
    id: 6,
    label: "Tumbler",
    type: "Tumbler",
    color: "#ffffff",
    textColor: "#0f172a",
    gradient: ["#ffffff", "#f1f5f9"],
  },
  {
    id: 7,
    label: "E-Money",
    type: "E-Money",
    color: "#0284c7",
    textColor: "#ffffff",
    gradient: ["#38bdf8", "#0284c7"],
  },
  {
    id: 8,
    label: "Tumbler",
    type: "Tumbler",
    color: "#ffffff",
    textColor: "#0f172a",
    gradient: ["#ffffff", "#f1f5f9"],
  },
  {
    id: 9,
    label: "E-Money",
    type: "E-Money",
    color: "#2563eb",
    textColor: "#ffffff",
    gradient: ["#60a5fa", "#2563eb"],
  },
];

interface SpinWheelProps {
  mode?: string; // "ALWAYS_TUMBLER" | "ALWAYS_E_MONEY" | "ALWAYS_HP" | "RANDOM"
  onSpinStart?: () => void;
  onSpinEnd?: (segment: WheelSegment) => void;
  disabled?: boolean;
}

export function SpinWheel({
  mode = "ALWAYS_TUMBLER",
  onSpinStart,
  onSpinEnd,
  disabled = false,
}: SpinWheelProps) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [spinning, setSpinning] = React.useState(false);
  const [pointerWiggle, setPointerWiggle] = React.useState(false);
  const rotationRef = React.useRef<number>(0);
  const animFrameRef = React.useRef<number | null>(null);
  // Bunyi klik roda selama berputar; dihentikan saat roda berhenti/unmount.
  const spinSoundRef = React.useRef<RaffleSoundLoop | null>(null);

  // Tentukan segmen target berdasarkan mode setting
  const getTargetSegment = React.useCallback((): WheelSegment => {
    let eligible: WheelSegment[] = [];
    if (mode === "ALWAYS_HP") {
      eligible = WHEEL_SEGMENTS.filter((s) => s.type === "HP");
    } else if (mode === "ALWAYS_E_MONEY") {
      eligible = WHEEL_SEGMENTS.filter((s) => s.type === "E-Money");
    } else if (mode === "ALWAYS_TUMBLER") {
      eligible = WHEEL_SEGMENTS.filter((s) => s.type === "Tumbler");
    } else {
      // RANDOM
      eligible = WHEEL_SEGMENTS;
    }
    if (eligible.length === 0) eligible = WHEEL_SEGMENTS;
    return eligible[Math.floor(Math.random() * eligible.length)];
  }, [mode]);

  // Gambar Spin Wheel pada Canvas
  const drawWheel = React.useCallback((angleInRad: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(centerX, centerY) - 12;

    ctx.clearRect(0, 0, width, height);

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(angleInRad);

    const total = WHEEL_SEGMENTS.length;
    const arc = (Math.PI * 2) / total;

    // 1. Gambar Segmen Roda
    for (let i = 0; i < total; i++) {
      const seg = WHEEL_SEGMENTS[i];
      const startAngle = i * arc;
      const endAngle = startAngle + arc;

      // Slice path
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, radius, startAngle, endAngle);
      ctx.closePath();

      // Radial Gradient per slice
      const midAngle = startAngle + arc / 2;
      const gx = Math.cos(midAngle) * radius;
      const gy = Math.sin(midAngle) * radius;
      const grad = ctx.createLinearGradient(0, 0, gx, gy);
      grad.addColorStop(0, seg.gradient[0]);
      grad.addColorStop(1, seg.gradient[1]);

      ctx.fillStyle = grad;
      ctx.fill();

      // Divider lines (Emas halus)
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = "rgba(251, 191, 36, 0.6)";
      ctx.stroke();

      // Render Text Label (Besar, Bold, Sangat Jelas)
      ctx.save();
      ctx.rotate(startAngle + arc / 2);
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";

      ctx.fillStyle = seg.textColor;
      ctx.font =
        seg.type === "HP"
          ? "900 19px system-ui, -apple-system, BlinkMacSystemFont, sans-serif"
          : "900 17px system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
      
      // Shadow & kontras tinggi agar teks sangat jelas terbaca
      if (seg.textColor === "#ffffff") {
        ctx.shadowColor = "rgba(0, 0, 0, 0.85)";
        ctx.shadowBlur = 6;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 1;
      } else {
        ctx.shadowColor = "rgba(255, 255, 255, 0.9)";
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
      }

      ctx.fillText(seg.label, radius - 16, 0);
      ctx.restore();
    }

    // 2. Ring Emas Dalam (Inner Gold Ring)
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.lineWidth = 5;
    ctx.strokeStyle = "#fbbf24"; // Gold
    ctx.stroke();

    // 3. Ring Luar Biru Pekat (Outer Rim)
    ctx.beginPath();
    ctx.arc(0, 0, radius + 6, 0, Math.PI * 2);
    ctx.lineWidth = 10;
    ctx.strokeStyle = "#1d4ed8"; // Royal Blue
    ctx.stroke();

    // Shadow pada Rim Luar
    ctx.beginPath();
    ctx.arc(0, 0, radius + 11, 0, Math.PI * 2);
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = "#f59e0b"; // Accent Gold outer border
    ctx.stroke();

    // 4. Pin Tengah (Center Hub Cap)
    ctx.beginPath();
    ctx.arc(0, 0, 22, 0, Math.PI * 2);
    ctx.fillStyle = "#1d4ed8";
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#fbbf24";
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, 0, 9, 0, Math.PI * 2);
    ctx.fillStyle = "#fbbf24";
    ctx.fill();

    ctx.restore();
  }, []);

  // Sync canvas size & initial render
  React.useEffect(() => {
    drawWheel(rotationRef.current);
  }, [drawWheel]);

  // Fungsi Putar Roda
  const spin = React.useCallback(() => {
    if (spinning || disabled) return;

    setSpinning(true);
    if (onSpinStart) onSpinStart();

    const targetSeg = getTargetSegment();
    const totalSegs = WHEEL_SEGMENTS.length;
    const arcDeg = 360 / totalSegs;

    // Sudut tengah segmen target (dalam derajat, dari 0..360)
    const targetMidDeg = targetSeg.id * arcDeg + arcDeg / 2;

    // Top pointer berada di jam 12 (-90 derajat atau 270 derajat)
    // Untuk membuat segmen target mendarat di jam 12:
    // targetRotation = (270 - targetMidDeg) + randomOffset
    const randomOffset = (Math.random() - 0.5) * (arcDeg * 0.5); // sisa variasi acak agar tidak selalu di tengah milimeter
    const targetAngleDegInCircle = (270 - targetMidDeg + randomOffset + 360) % 360;

    // Rotasi minimal 5-8 lap penuh (360 * 6 = 2160 deg)
    const currentRotDeg = (rotationRef.current * 180) / Math.PI;
    const currentBase = Math.ceil(currentRotDeg / 360) * 360;
    const fullSpins = 360 * 6;
    const finalRotDeg = currentBase + fullSpins + targetAngleDegInCircle;

    const startRotRad = rotationRef.current;
    const finalRotRad = (finalRotDeg * Math.PI) / 180;
    const duration = 5200; // 5.2 detik
    const startTime = performance.now();

    spinSoundRef.current?.stop();
    spinSoundRef.current = raffleSound.wheelSpin(duration);

    let lastPassedSeg = -1;

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing easeOutQuart
      const ease = 1 - Math.pow(1 - progress, 4);
      const currentRad = startRotRad + (finalRotRad - startRotRad) * ease;
      rotationRef.current = currentRad;

      drawWheel(currentRad);

      // Hitung segmen yang sedang dilewati pointer di atas
      const curDeg = ((currentRad * 180) / Math.PI) % 360;
      const pointerDeg = (270 - (curDeg % 360) + 360) % 360;
      const curSegIdx = Math.floor(pointerDeg / arcDeg) % totalSegs;

      if (curSegIdx !== lastPassedSeg) {
        lastPassedSeg = curSegIdx;
        setPointerWiggle(true);
        setTimeout(() => setPointerWiggle(false), 80);
      }

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        setSpinning(false);
        spinSoundRef.current?.stop();
        spinSoundRef.current = null;
        raffleSound.wheelStop();
        if (onSpinEnd) {
          onSpinEnd(targetSeg);
        }
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);
  }, [spinning, disabled, getTargetSegment, onSpinStart, onSpinEnd, drawWheel]);

  React.useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      spinSoundRef.current?.stop();
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center gap-3 sm:gap-4">
      {/* Container Spin Wheel */}
      <div className="relative flex items-center justify-center p-1.5">
        {/* Glow halo Effect */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-amber-400 via-primary to-pink-500 opacity-25 blur-xl animate-pulse pointer-events-none" />

        {/* Top Pointer Flag (Penunjuk Atas Emas) */}
        <div
          className={cn(
            "absolute -top-2.5 z-30 transition-transform duration-75 origin-top",
            pointerWiggle ? "-rotate-12 scale-110" : "rotate-0"
          )}
          style={{ filter: "drop-shadow(0 3px 5px rgba(0,0,0,0.35))" }}
        >
          <svg width="34" height="42" viewBox="0 0 44 52" fill="none">
            <path
              d="M22 52L2 12C0 8 3 0 8 0H36C41 0 44 8 42 12L22 52Z"
              fill="url(#gold-grad)"
              stroke="#b45309"
              strokeWidth="2"
            />
            <circle cx="22" cy="14" r="5" fill="#ffffff" />
            <defs>
              <linearGradient id="gold-grad" x1="0" y1="0" x2="44" y2="52">
                <stop offset="0%" stopColor="#fef08a" />
                <stop offset="50%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#b45309" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Canvas Roda (Responsive Max Dimensions) */}
        <canvas
          ref={canvasRef}
          width={340}
          height={340}
          className="relative z-10 max-w-[260px] sm:max-w-[300px] max-h-[38vh] w-auto h-auto drop-shadow-xl rounded-full"
        />
      </div>

      {/* Tombol Putar Roda */}
      <button
        onClick={spin}
        disabled={spinning || disabled}
        className={cn(
          "relative flex h-11 min-w-[200px] items-center justify-center gap-2.5 rounded-full px-8 text-base font-black uppercase tracking-wider text-white transition-all duration-200 cursor-pointer",
          "bg-gradient-to-r from-amber-400 via-orange-500 to-pink-500",
          "shadow-[0_6px_0_-2px_rgb(190,24,93),0_12px_20px_-8px_rgba(236,72,153,0.5)]",
          "hover:brightness-105 active:translate-y-1 active:shadow-[0_3px_0_-2px_rgb(190,24,93)]",
          "disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-[0_3px_0_-2px_rgb(190,24,93)]"
        )}
      >
        <span className="pointer-events-none absolute inset-x-3 top-0.5 h-3 rounded-full bg-white/35 blur-[2px]" />
        {spinning ? (
          <Sparkles className="h-5 w-5 animate-spin" />
        ) : (
          <Trophy className="h-5 w-5" />
        )}
        <span>{spinning ? "Memutar Roda..." : "Putar Roda Hadiah"}</span>
      </button>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";

const COLORS = ["#ff6847", "#ffc93c", "#4fc59f", "#66c2ff", "#b49cff", "#ffb5c2"];
const SHAPES = ["●", "■", "▲", "★", "♥", "✿"];

export function Confetti({ count = 70 }: { count?: number }) {
  const [pieces, setPieces] = useState<{ left: number; dx: number; rot: number; delay: number; dur: number; color: string; shape: string; size: number }[]>([]);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setPieces(
      Array.from({ length: count }, () => ({
        left: Math.random() * 100,
        dx: (Math.random() - 0.5) * 200,
        rot: (Math.random() - 0.5) * 1080,
        delay: Math.random() * 0.6,
        dur: 2.2 + Math.random() * 1.8,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        shape: SHAPES[Math.floor(Math.random() * SHAPES.length)],
        size: 10 + Math.random() * 14,
      })),
    );
    const t = setTimeout(() => setPieces([]), 4800);
    return () => clearTimeout(t);
  }, [count]);
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-40 overflow-hidden">
      {pieces.map((p, i) => (
        <span
          key={i}
          style={{
            left: `${p.left}%`,
            color: p.color,
            fontSize: p.size,
            animation: `confetti-fall ${p.dur}s ${p.delay}s cubic-bezier(.25,.6,.4,1) forwards`,
            ["--dx" as string]: `${p.dx}px`,
            ["--rot" as string]: `${p.rot}deg`,
          }}
          className="absolute top-0"
        >
          {p.shape}
        </span>
      ))}
    </div>
  );
}

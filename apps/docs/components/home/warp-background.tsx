"use client";

import { useCallback, useEffect, useRef } from "react";

const COLORS = [
  "#22d3ee", // cyan
  "#a78bfa", // violet
  "#34d399", // emerald
  "#fb923c", // orange
  "#f472b6", // pink
  "#60a5fa", // blue
  "#a3e635", // lime
  "#e879f9", // fuchsia
];

type Star = {
  x: number;
  y: number;
  z: number;
  color: string;
};

function alphaHex(a: number) {
  return Math.round(Math.min(1, Math.max(0, a)) * 255)
    .toString(16)
    .padStart(2, "0");
}

export function WarpBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const starsRef = useRef<Star[]>([]);
  const rafRef = useRef<number>(0);

  const spawnStar = useCallback((): Star => {
    return {
      x: (Math.random() - 0.5) * 2,
      y: (Math.random() - 0.5) * 2,
      z: 1,
      color: COLORS[Math.floor(Math.random() * COLORS.length)]!,
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = 0;
    let h = 0;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    starsRef.current = [];

    const speed = 0.004;
    const maxStars = 200;
    const rampUp = 2000;
    const steadyEnd = 4000;
    const fadeOut = 6000;
    const start = performance.now();

    const draw = () => {
      const elapsed = performance.now() - start;
      const stars = starsRef.current;

      // after fadeOut, let remaining stars fly out then stop
      if (elapsed > fadeOut && stars.length === 0) return;

      const cx = w / 2;
      const cy = h / 2;

      ctx.clearRect(0, 0, w, h);

      // spawn new stars based on phase
      if (elapsed < steadyEnd) {
        const target =
          elapsed < rampUp
            ? Math.floor((elapsed / rampUp) * maxStars)
            : maxStars;
        const toSpawn = Math.min(target - stars.length, 8);
        for (let i = 0; i < toSpawn; i++) {
          stars.push(spawnStar());
        }
      }

      // update and draw, remove dead stars after fadeOut
      for (let i = stars.length - 1; i >= 0; i--) {
        const star = stars[i]!;
        star.z -= speed;
        if (star.z <= 0) {
          if (elapsed > steadyEnd) {
            stars.splice(i, 1);
            continue;
          }
          Object.assign(star, spawnStar());
        }

        const sx = (star.x / star.z) * cx + cx;
        const sy = (star.y / star.z) * cy + cy;

        const prevZ = star.z + speed * 12;
        const px = (star.x / prevZ) * cx + cx;
        const py = (star.y / prevZ) * cy + cy;

        const t = 1 - star.z;
        const opacity = t ** 0.6;
        const lineWidth = 0.3 + t * t * 4;

        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(sx, sy);
        ctx.strokeStyle = star.color + alphaHex(opacity);
        ctx.lineWidth = lineWidth;
        ctx.lineCap = "round";
        ctx.stroke();
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  }, [spawnStar]);

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 h-[500px] overflow-hidden">
      <canvas ref={canvasRef} className="absolute inset-0 size-full" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-background to-transparent" />
    </div>
  );
}

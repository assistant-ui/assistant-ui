"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Line } from "diagrammatic";

const WINDOW = 30;
const REDUCED = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void) {
  const query = window.matchMedia(REDUCED);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function next(prev: number[], t: number): number[] {
  const last = prev[prev.length - 1] ?? 40;
  const noise = Math.abs(Math.sin(t * 12.9898) * 43758.5453) % 1;
  const drift = Math.sin(t / 6) * 3 + noise * 4 - 2;
  return [...prev.slice(1), Math.max(5, Math.min(95, last + drift))];
}

export default function LiveCpuChart() {
  const [data, setData] = useState(() =>
    Array.from({ length: WINDOW }, (_, i) => 40 + Math.sin(i / 4) * 8),
  );
  const reduced = useSyncExternalStore(
    subscribe,
    () => window.matchMedia(REDUCED).matches,
    () => false,
  );
  const [choice, setChoice] = useState<boolean | null>(null);
  const running = choice ?? !reduced;

  useEffect(() => {
    if (!running) return;
    let t = 0;
    const id = setInterval(() => {
      t += 1;
      setData((prev) => next(prev, t));
    }, 1000);
    return () => clearInterval(id);
  }, [running]);

  return (
    <div data-dg-motion={running ? "" : undefined}>
      <Line
        title="CPU, last 30 seconds"
        data={data}
        yMax={100}
        yTicks={[
          { at: 0, label: "0%" },
          { at: 50, label: "50%" },
          { at: 100, label: "100%" },
        ]}
        format={(v) => `${Math.round(v)}%`}
      />
      <button
        type="button"
        onClick={() => setChoice(!running)}
        className="text-muted-foreground hover:text-foreground mt-3 text-xs"
      >
        {running ? "Pause" : "Resume"}
      </button>
    </div>
  );
}

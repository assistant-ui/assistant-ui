"use client";

import { cn } from "@/lib/utils";
import { SampleFrame } from "@/components/docs/samples/sample-frame";

const RING_SIZE = 24;
const RING_STROKE = 3;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
const MODEL_CONTEXT_WINDOW = 128_000;

const USAGE_LEVELS = [
  { label: "Low", percent: 42 },
  { label: "Warning", percent: 72 },
  { label: "Critical", percent: 91 },
];

const getStrokeColor = (percent: number): string => {
  if (percent > 85) return "stroke-red-500";
  if (percent >= 65) return "stroke-amber-500";
  return "stroke-emerald-500";
};

const getBarColor = (percent: number): string => {
  if (percent > 85) return "bg-red-500";
  if (percent >= 65) return "bg-amber-500";
  return "bg-emerald-500";
};

const formatTokenCount = (tokens: number): string => {
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`;
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}k`;
  return `${tokens}`;
};

export function ContextDisplaySample() {
  return (
    <SampleFrame className="flex h-auto flex-wrap items-start justify-center gap-10 p-8">
      {/* Ring variants */}
      <div className="flex flex-col items-center gap-3">
        <span className="text-muted-foreground text-xs">Ring</span>
        <div className="flex flex-col gap-2">
          {USAGE_LEVELS.map(({ label, percent }) => (
            <div key={label} className="flex items-center gap-2">
              <div className="inline-flex items-center rounded-md p-1 transition-colors">
                <svg
                  width={RING_SIZE}
                  height={RING_SIZE}
                  viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
                  className="-rotate-90"
                >
                  <circle
                    cx={RING_SIZE / 2}
                    cy={RING_SIZE / 2}
                    r={RING_RADIUS}
                    fill="none"
                    strokeWidth={RING_STROKE}
                    className="stroke-muted"
                  />
                  <circle
                    cx={RING_SIZE / 2}
                    cy={RING_SIZE / 2}
                    r={RING_RADIUS}
                    fill="none"
                    strokeWidth={RING_STROKE}
                    strokeLinecap="round"
                    strokeDasharray={RING_CIRCUMFERENCE}
                    strokeDashoffset={
                      RING_CIRCUMFERENCE - (percent / 100) * RING_CIRCUMFERENCE
                    }
                    className={getStrokeColor(percent)}
                  />
                </svg>
              </div>
              <span className="text-muted-foreground text-xs tabular-nums">
                {label} ({percent}%)
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Bar variants */}
      <div className="flex flex-col items-center gap-3">
        <span className="text-muted-foreground text-xs">Bar</span>
        <div className="flex flex-col gap-2">
          {USAGE_LEVELS.map(({ label, percent }) => {
            const totalTokens = Math.round(
              (percent / 100) * MODEL_CONTEXT_WINDOW,
            );
            return (
              <div
                key={label}
                className="inline-flex items-center rounded-md px-2 py-1 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn(
                        "h-full rounded-full",
                        getBarColor(percent),
                      )}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground tabular-nums">
                    {formatTokenCount(totalTokens)} ({percent}%)
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Text variants */}
      <div className="flex flex-col items-center gap-3">
        <span className="text-muted-foreground text-xs">Text</span>
        <div className="flex flex-col gap-2">
          {USAGE_LEVELS.map(({ label, percent }) => {
            const totalTokens = Math.round(
              (percent / 100) * MODEL_CONTEXT_WINDOW,
            );
            return (
              <div
                key={label}
                className="inline-flex items-center rounded-md px-2 py-1 font-mono text-muted-foreground text-xs tabular-nums transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                {formatTokenCount(totalTokens)} /{" "}
                {formatTokenCount(MODEL_CONTEXT_WINDOW)}
              </div>
            );
          })}
        </div>
      </div>

      {/* Tooltip popover example */}
      <div className="flex flex-col items-center gap-3">
        <span className="text-muted-foreground text-xs">On hover</span>
        <div className="grid min-w-40 gap-1.5 rounded-lg border bg-popover px-3 py-2 text-popover-foreground text-xs shadow-md">
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">Usage</span>
            <span className="font-mono tabular-nums">72%</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">Input</span>
            <span className="font-mono tabular-nums">72.3k</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">Cached</span>
            <span className="font-mono tabular-nums">41.2k</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">Output</span>
            <span className="font-mono tabular-nums">12.7k</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">Reasoning</span>
            <span className="font-mono tabular-nums">8.4k</span>
          </div>
          <div className="mt-0.5 border-t pt-1.5">
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Total</span>
              <span className="font-mono tabular-nums">92.2k / 128.0k</span>
            </div>
          </div>
        </div>
      </div>
    </SampleFrame>
  );
}

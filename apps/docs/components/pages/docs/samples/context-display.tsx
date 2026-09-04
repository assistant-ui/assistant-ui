"use client";

import { Fragment } from "react";
import { cn } from "@/lib/utils";
import { SampleFrame } from "@/components/pages/docs/samples/sample-frame";

const RING_SIZE = 24;
const RING_STROKE = 3;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
const MODEL_CONTEXT_WINDOW = 128_000;

const POPOVER_SEGMENTS = [
  { label: "Input", tokens: 71_300 },
  { label: "Cached input", tokens: 41_200 },
  { label: "Output", tokens: 20_900 },
  { label: "Reasoning", tokens: 8_400 },
];

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
    <SampleFrame className="flex h-auto flex-wrap items-center justify-center gap-10 p-8">
      {/* One row per severity, one column per inline variant, so the same
          reading is comparable across the three forms. */}
      <div className="grid grid-cols-[auto_auto_auto_auto] items-center gap-x-6 gap-y-3 text-xs">
        <span />
        <span className="text-muted-foreground justify-self-center">Ring</span>
        <span className="text-muted-foreground justify-self-center">Bar</span>
        <span className="text-muted-foreground justify-self-center">Text</span>
        {USAGE_LEVELS.map(({ label, percent }) => {
          const totalTokens = Math.round(
            (percent / 100) * MODEL_CONTEXT_WINDOW,
          );
          return (
            <Fragment key={label}>
              <span className="text-muted-foreground tabular-nums">
                {label} ({percent}%)
              </span>
              <svg
                aria-hidden="true"
                width={RING_SIZE}
                height={RING_SIZE}
                viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
                className="-rotate-90 justify-self-center"
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
              <div className="bg-muted h-1.5 w-16 justify-self-center overflow-hidden rounded-full">
                <div
                  className={cn("h-full rounded-full", getBarColor(percent))}
                  style={{ width: `${percent}%` }}
                />
              </div>
              <span className="text-muted-foreground justify-self-end font-mono tabular-nums">
                {formatTokenCount(totalTokens)} /{" "}
                {formatTokenCount(MODEL_CONTEXT_WINDOW)}
              </span>
            </Fragment>
          );
        })}
      </div>

      {/* Tooltip popover example */}
      <div className="flex flex-col items-center gap-3">
        <span className="text-muted-foreground text-xs">On hover</span>
        <div className="bg-popover text-popover-foreground w-56 rounded-lg border p-3 text-xs">
          <div className="flex items-baseline justify-between gap-6 whitespace-nowrap">
            <span className="text-amber-500">72% full</span>
            <span className="font-mono tabular-nums">92.2k / 128k</span>
          </div>
          <div className="bg-muted mt-2.5 h-1 overflow-hidden rounded-full">
            <div
              className="h-full rounded-full bg-amber-500"
              style={{ width: "72%" }}
            />
          </div>
          <div className="mt-3 grid gap-1.5">
            {POPOVER_SEGMENTS.map(({ label, tokens }) => (
              <div
                key={label}
                className="flex items-baseline justify-between gap-6"
              >
                <span className="text-muted-foreground">{label}</span>
                <span className="font-mono tabular-nums">
                  {formatTokenCount(tokens)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </SampleFrame>
  );
}

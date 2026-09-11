"use client";

import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
import { mono, paper } from "./surfaces";
import { announced, pct, take } from "../utils/range";

export interface ScoreCriterion {
  label: string;
  score: number;
  weight: number;
  note?: string;
}

export function ScoreBreakdown({
  verdict,
  total,
  outOf,
  criteria,
  visibleCount,
  className,
  ...props
}: Omit<
  ComponentProps<"div">,
  "children" | "verdict" | "total" | "outOf" | "criteria" | "visibleCount"
> & {
  verdict: string;
  total: number;
  outOf: number;
  criteria: readonly ScoreCriterion[];
  visibleCount: number;
}) {
  const ratio = outOf === 0 ? 0 : total / outOf;

  return (
    <div
      data-slot="score-breakdown"
      className={cn(
        paper,
        "flex w-full max-w-sm flex-col gap-3 rounded-2xl p-4",
        className,
      )}

      {...props}
    >
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-medium tracking-tight tabular-nums">
          {total.toFixed(1)}
        </span>
        <span className={cn(mono, "text-foreground/30 tabular-nums")}>
          / {outOf}
        </span>
        <span
          className={cn(
            "ms-auto rounded-full px-2 py-0.5 text-xs font-medium",
            ratio >= 0.75
              ? "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300"
              : ratio >= 0.5
                ? "bg-amber-500/12 text-amber-700 dark:text-amber-300"
                : "bg-red-500/12 text-red-700 dark:text-red-300",
          )}
        >
          {verdict}
        </span>
      </div>

      <div className="flex flex-col gap-2">
        {take(criteria, visibleCount).map((criterion) => (
          <div
            key={criterion.label}
            className="fade-in slide-in-from-bottom-1 animate-in fill-mode-both flex flex-col gap-1 duration-300"
          >
            <div className="flex items-baseline gap-2">
              <span className="text-foreground/75 min-w-0 flex-1 truncate text-[13px]">
                {criterion.label}
              </span>
              <span className={cn(mono, "text-foreground/25 shrink-0")}>
                ×{criterion.weight}
              </span>
              <span
                className={cn(mono, "text-foreground/55 shrink-0 tabular-nums")}
              >
                {criterion.score.toFixed(1)}
              </span>
            </div>
            <span
              role="meter"
              aria-label={`${criterion.label} score`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={announced(pct(criterion.score, outOf))}
              aria-valuetext={`${criterion.score.toFixed(1)} of ${outOf}`}
              className="bg-foreground/[0.06] h-[3px] w-full overflow-hidden rounded-full"
            >
              <span
                className="block h-full rounded-full bg-blue-500 transition-[width] duration-500 motion-reduce:transition-none dark:bg-blue-400"
                style={{
                  width: `${pct(criterion.score, outOf)}%`,
                }}
              />
            </span>
            {criterion.note && (
              <span className="text-foreground/40 text-xs leading-relaxed break-words">
                {criterion.note}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

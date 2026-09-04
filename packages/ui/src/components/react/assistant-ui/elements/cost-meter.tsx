"use client";

import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
import { mono, paper } from "./surfaces";
import { announced, pct } from "../utils/range";

export interface CostLine {
  model: string;
  inputTokens: number;
  outputTokens: number;
  cost: string;
  share: number;
}

export function CostMeter({
  runCost,
  sessionCost,
  lines,
  className,
  ...props
}: Omit<
  ComponentProps<"div">,
  "children" | "runCost" | "sessionCost" | "lines"
> & {
  runCost: string;
  sessionCost: string;
  lines: readonly CostLine[];
}) {
  return (
    <div
      data-slot="cost-meter"
      className={cn(
        paper,
        "flex w-full max-w-sm flex-col gap-3 rounded-2xl p-4",
        className,
      )}

      {...props}
    >
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-medium tracking-tight tabular-nums">
          {runCost}
        </span>
        <span className={cn(mono, "text-foreground/30")}>this run</span>
        <span className={cn(mono, "text-foreground/35 ms-auto tabular-nums")}>
          {sessionCost} session
        </span>
      </div>

      <div className="bg-foreground/[0.06] flex h-1.5 w-full overflow-hidden rounded-full">
        {lines.map((line, i) => {
          const width = pct(line.share, 1);
          if (announced(width) === 0) return null;
          return (
            <span
              key={line.model}
              role="meter"
              aria-label={`${line.model} cost share`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={announced(width)}
              className={cn(
                "h-full transition-[width] duration-500 motion-reduce:transition-none",
                i === 0
                  ? "bg-blue-500 dark:bg-blue-400"
                  : i === 1
                    ? "bg-blue-500/55 dark:bg-blue-400/55"
                    : "bg-foreground/25",
              )}
              style={{ width: `${width}%` }}
            />
          );
        })}
      </div>

      <div className="flex flex-col gap-1.5">
        {lines.map((line) => (
          <div key={line.model} className="flex items-baseline gap-2">
            <span className="text-foreground/75 min-w-0 flex-1 truncate text-[13px]">
              {line.model}
            </span>
            <span
              className={cn(mono, "text-foreground/25 shrink-0 tabular-nums")}
            >
              {(line.inputTokens / 1000).toFixed(1)}k in ·{" "}
              {(line.outputTokens / 1000).toFixed(1)}k out
            </span>
            <span
              className={cn(mono, "text-foreground/55 shrink-0 tabular-nums")}
            >
              {line.cost}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

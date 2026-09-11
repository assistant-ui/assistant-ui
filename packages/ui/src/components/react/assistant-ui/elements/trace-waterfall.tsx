"use client";

import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
import { mono, paper } from "./surfaces";
import { pct, take } from "../utils/range";

export type SpanStatus = "running" | "completed" | "failed";

export interface TraceSpan {
  id: string;
  name: string;
  depth: number;
  startMs: number;
  durationMs: number;
  status: SpanStatus;
}

const TONE: Record<SpanStatus, string> = {
  running: "bg-blue-500 dark:bg-blue-400",
  completed: "bg-foreground/35",
  failed: "bg-red-500/80",
};

export function TraceWaterfall({
  spans,
  totalMs,
  visibleCount,
  className,
  ...props
}: Omit<
  ComponentProps<"div">,
  "children" | "spans" | "totalMs" | "visibleCount"
> & {
  spans: readonly TraceSpan[];
  totalMs: number;
  visibleCount: number;
}) {
  const span = totalMs || 1;

  return (
    <div
      data-slot="trace-waterfall"
      className={cn(
        paper,
        "flex w-full max-w-md flex-col gap-2 rounded-2xl p-4",
        className,
      )}

      {...props}
    >
      <div className="flex items-baseline justify-between">
        <span className="text-[13.5px] font-medium">Trace</span>
        <span className={cn(mono, "text-foreground/35 tabular-nums")}>
          {totalMs}ms
        </span>
      </div>

      <div className="flex flex-col gap-1">
        {take(spans, visibleCount).map((item) => {
          const left = pct(item.startMs, span);
          const width = Math.max(1.5, pct(item.durationMs, span));
          return (
            <div
              key={item.id}
              className="fade-in slide-in-from-left-1 animate-in fill-mode-both grid grid-cols-[7.5rem_1fr_2.5rem] items-center gap-2 duration-300"
            >
              <span
                className="text-foreground/70 min-w-0 truncate text-xs"
                style={{ paddingInlineStart: `${item.depth * 0.75}rem` }}
              >
                {item.name}
              </span>
              <span
                role="img"
                aria-label={`${item.status}, starts at ${item.startMs}ms, runs ${item.durationMs}ms`}
                className="relative flex h-4 min-w-0 items-center"
              >
                <span
                  className={cn(
                    "absolute h-[7px] rounded-full transition-[width] duration-500 ease-out motion-reduce:transition-none",
                    TONE[item.status],
                    item.status === "running" && "animate-pulse",
                  )}
                  style={{ insetInlineStart: `${left}%`, width: `${width}%` }}
                />
              </span>
              <span
                className={cn(mono, "text-foreground/30 text-end tabular-nums")}
              >
                {item.durationMs}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

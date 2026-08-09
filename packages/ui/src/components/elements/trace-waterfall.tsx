"use client";

import { cn } from "@/lib/utils";
import { mono, paper } from "./surfaces";

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
}: {
  spans: readonly TraceSpan[];
  totalMs: number;
  visibleCount: number;
  className?: string;
}) {
  const span = totalMs || 1;

  return (
    <div
      className={cn(
        paper,
        "flex w-full max-w-md flex-col gap-2 rounded-2xl p-4",
        className,
      )}
    >
      <div className="flex items-baseline justify-between">
        <span className="text-[13.5px] font-medium">Trace</span>
        <span className={cn(mono, "text-foreground/35 tabular-nums")}>
          {totalMs}ms
        </span>
      </div>

      <div className="flex flex-col gap-1">
        {spans.slice(0, visibleCount).map((item) => {
          const left = (item.startMs / span) * 100;
          const width = Math.max(1.5, (item.durationMs / span) * 100);
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
              <span className="relative flex h-4 min-w-0 items-center">
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

"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ShimmerLabel } from "@/components/assistant-ui/elements/surfaces";
import { cn } from "@/lib/utils";

/**
 * The mark every trace line carries. A disclosure rotates it and a plain line
 * does not, so the two read as the same grammar rather than two symbols; it
 * stays a glyph rather than an icon because an icon on a line that cannot open
 * reads as an affordance.
 */
export function TraceMarker({
  live,
  className,
}: {
  live: boolean;
  className?: string;
}): ReactNode {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-block shrink-0 transition-transform",
        live ? "text-blue-500" : "text-muted-foreground/50",
        className,
      )}
    >
      {">"}
    </span>
  );
}

export function useToolDuration(isRunning: boolean): number | null {
  const startTimeRef = useRef<number | null>(null);
  const [duration, setDuration] = useState<number | null>(null);

  useEffect(() => {
    if (isRunning && startTimeRef.current === null) {
      startTimeRef.current = Date.now();
      setDuration(null);
    } else if (!isRunning && startTimeRef.current !== null) {
      setDuration(Date.now() - startTimeRef.current);
      startTimeRef.current = null;
    }
  }, [isRunning]);

  return duration;
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export function TraceLine({
  live,
  label,
  detail,
  meta,
}: {
  live: boolean;
  label: string;
  detail?: string;
  meta?: string;
}): ReactNode {
  return (
    <div className="my-1 flex items-baseline gap-2 font-mono text-[12px] [font-variant-ligatures:none]">
      <TraceMarker live={live} />
      <span className="text-muted-foreground min-w-0 flex-1 truncate">
        {live ? (
          <ShimmerLabel>
            {label}
            {detail ? ` ${detail}` : null}
          </ShimmerLabel>
        ) : (
          <>
            {label}
            {detail ? ` ${detail}` : null}
          </>
        )}
      </span>
      {meta ? (
        <span className="text-muted-foreground/50 shrink-0">{meta}</span>
      ) : null}
    </div>
  );
}

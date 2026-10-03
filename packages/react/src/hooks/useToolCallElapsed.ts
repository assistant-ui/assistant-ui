"use client";

import { useLayoutEffect, useState } from "react";
import { useAuiState } from "@assistant-ui/store";

/**
 * Hook that returns the elapsed wall-clock time of the current tool call in
 * milliseconds, ticking once per second while the call runs.
 *
 * Reads `part.timing`. Returns `undefined` when the part is not a tool call,
 * carries no timing, ended without a recorded completion (the duration is
 * unknown), or when no message part scope is available (so kit components
 * stay renderable standalone, e.g. in docs previews). A running call also
 * returns `undefined` until the component mounts, so a server render never
 * reads the clock.
 *
 * @example
 * ```tsx
 * function ToolDuration() {
 *   const elapsedMs = useToolCallElapsed();
 *   if (elapsedMs === undefined) return null;
 *   return <span>{(elapsedMs / 1000).toFixed(1)}s</span>;
 * }
 * ```
 */
export const useToolCallElapsed = (): number | undefined => {
  const timing = useAuiState((s) => {
    const part = s.optional.part;
    return part?.type === "tool-call" ? part.timing : undefined;
  });
  const partRunning = useAuiState((s) => {
    const part = s.optional.part;
    return part?.type === "tool-call" && part.status.type === "running";
  });
  const running =
    timing !== undefined && timing.completedAt === undefined && partRunning;
  const [now, setNow] = useState<number | undefined>(undefined);

  useLayoutEffect(() => {
    if (!running) return undefined;
    // The clock is read only after mount so a prerender never reads it; the
    // layout effect still catches the elapsed value up before the first paint.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [running]);

  if (timing === undefined) return undefined;
  if (timing.completedAt !== undefined)
    return Math.max(0, timing.completedAt - timing.startedAt);
  if (!running || now === undefined) return undefined;
  return Math.max(0, now - timing.startedAt);
};

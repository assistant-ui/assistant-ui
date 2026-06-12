"use client";

import { useEffect, useState } from "react";
import { useAuiState } from "@assistant-ui/store";

/**
 * Hook that returns the elapsed wall-clock time of the current tool call in
 * milliseconds, ticking once per second while the call runs.
 *
 * Reads `part.timing`. Returns `undefined` when the part is not a tool call
 * or carries no timing. Must be used inside a message part scope.
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
  const timing = useAuiState((s) =>
    s.part.type === "tool-call" ? s.part.timing : undefined,
  );
  const running = timing !== undefined && timing.completedAt === undefined;
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!running) return undefined;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [running]);

  if (timing === undefined) return undefined;
  if (timing.completedAt !== undefined)
    return timing.completedAt - timing.startedAt;
  return Math.max(0, now - timing.startedAt);
};

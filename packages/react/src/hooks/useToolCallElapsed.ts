"use client";

import { useEffect, useState } from "react";
import { useAui, useAuiState } from "@assistant-ui/store";

/**
 * Hook that returns the elapsed wall-clock time of the current tool call in
 * milliseconds, ticking once per second while the call runs.
 *
 * Reads `part.timing`. Returns `undefined` when the part is not a tool call,
 * carries no timing, or when no message part scope is available (so kit
 * components stay renderable standalone, e.g. in docs previews).
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
  const aui = useAui();
  const hasPart = aui.part.source !== null;
  const timing = useAuiState((s) =>
    hasPart && s.part.type === "tool-call" ? s.part.timing : undefined,
  );
  const partRunning = useAuiState(
    (s) =>
      hasPart &&
      s.part.type === "tool-call" &&
      s.part.status.type === "running",
  );
  const running =
    timing !== undefined && timing.completedAt === undefined && partRunning;
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!running) return undefined;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [running]);

  if (timing === undefined) return undefined;
  return Math.max(0, (timing.completedAt ?? now) - timing.startedAt);
};

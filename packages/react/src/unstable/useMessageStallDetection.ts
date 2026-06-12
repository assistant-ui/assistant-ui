"use client";

import { useEffect, useRef, useState } from "react";
import { useAuiState } from "@assistant-ui/store";

export type Unstable_MessageStallDetectionOptions = {
  /**
   * Milliseconds of unchanged message content before the message counts as
   * stalled.
   * @default 2000
   */
  thresholdMs?: number | undefined;
};

export type Unstable_MessageStallDetection = {
  /** True while the message is running and its content has not changed for at least `thresholdMs`. */
  stalled: boolean;
  /** Milliseconds since the last observed content change. `0` while not stalled. */
  stalledForMs: number;
};

/**
 * @deprecated Under active development and might change without notice.
 *
 * Detects mid-run output stalls on the current message: while the message is
 * running, watches a fingerprint of its content (part count plus text,
 * argument, and result sizes) and reports a stall once the fingerprint stops
 * changing for `thresholdMs`. Useful for re-surfacing a "still working"
 * indicator during tool think-time or provider stalls, after the first
 * tokens have already streamed.
 *
 * Must be used inside a message scope.
 */
export function unstable_useMessageStallDetection(
  options?: Unstable_MessageStallDetectionOptions,
): Unstable_MessageStallDetection {
  const thresholdMs = options?.thresholdMs ?? 2000;

  const fingerprint = useAuiState((s) => {
    if (s.message.status?.type !== "running") return undefined;
    let size = 0;
    for (const part of s.message.content) {
      if (part.type === "text" || part.type === "reasoning") {
        size += part.text.length;
      } else if (part.type === "tool-call") {
        size += part.argsText.length + (part.result !== undefined ? 1 : 0);
      }
    }
    return `${s.message.content.length}:${size}`;
  });

  const running = fingerprint !== undefined;
  const lastActivityRef = useRef(Date.now());
  const [stalled, setStalled] = useState(false);
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!running) {
      setStalled(false);
      return undefined;
    }

    lastActivityRef.current = Date.now();
    setStalled(false);
    const id = setTimeout(() => setStalled(true), thresholdMs);
    return () => clearTimeout(id);
  }, [running, fingerprint, thresholdMs]);

  useEffect(() => {
    if (!stalled) return undefined;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [stalled]);

  if (!stalled) return { stalled: false, stalledForMs: 0 };
  return {
    stalled: true,
    stalledForMs: Math.max(0, Date.now() - lastActivityRef.current),
  };
}

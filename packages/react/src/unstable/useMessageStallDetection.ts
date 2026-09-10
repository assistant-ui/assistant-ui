"use client";

import { useEffect, useRef, useState } from "react";
import { useAuiState } from "@assistant-ui/store";
import { useShallowSelector } from "@assistant-ui/store/internal";

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
 * running, watches its text, argument, and result content and reports a stall
 * once that content stops changing for `thresholdMs`. Useful for re-surfacing
 * a "still working" indicator during tool think-time or provider stalls,
 * after the first tokens have already streamed.
 *
 * Must be used inside a message scope.
 */
export function unstable_useMessageStallDetection(
  options?: Unstable_MessageStallDetectionOptions,
): Unstable_MessageStallDetection {
  const thresholdMs = options?.thresholdMs ?? 2000;

  const activity = useAuiState(
    useShallowSelector((s) => {
      const running = s.message.status?.type === "running";
      const values: unknown[] = [running, s.message.content.length];
      if (!running) return values;

      for (const part of s.message.content) {
        if (part.type === "text" || part.type === "reasoning") {
          values.push(part.type, part.text);
        } else if (part.type === "tool-call") {
          values.push(part.type, part.argsText, part.result !== undefined);
        } else {
          values.push(part.type);
        }
      }
      return values;
    }),
  );

  const running = activity[0] === true;
  const lastActivityRef = useRef(Date.now());
  const [stalled, setStalled] = useState(false);
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!running) return undefined;
    lastActivityRef.current = Date.now();
    return undefined;
  }, [running, activity]);

  useEffect(() => {
    if (!running) {
      setStalled(false);
      return undefined;
    }

    const sinceActivity = Date.now() - lastActivityRef.current;
    if (sinceActivity >= thresholdMs) {
      setStalled(true);
      return undefined;
    }

    setStalled(false);
    const id = setTimeout(() => setStalled(true), thresholdMs - sinceActivity);
    return () => clearTimeout(id);
  }, [running, activity, thresholdMs]);

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

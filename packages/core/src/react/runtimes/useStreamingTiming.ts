"use client";

import { useEffect, useRef, useState } from "react";
import type { MessageTiming } from "../../types/message";
import {
  stepStreamingTiming,
  type StreamingTimingAccessors,
  type StreamingTimingOptions,
  type StreamingTimingState,
} from "../../runtime/utils/streaming-timing";

export type {
  StreamingTimingAccessors,
  StreamingTimingOptions,
  StreamingTimingState,
};

/**
 * Tracks per-message streaming timing client-side and returns finalized
 * `MessageTiming` keyed by message id.
 *
 * Observes `isRunning` transitions and content growth through the provided
 * `accessors`, which adapt the hook to a runtime's message shape. Timing is
 * finalized when streaming ends; adapters thread the result into
 * `useExternalMessageConverter` metadata as `messageTiming`.
 *
 * @example
 * ```ts
 * const messageTiming = useStreamingTiming(messages, isRunning, {
 *   getAssistantMessageId: (msgs) => msgs.findLast((m) => m.role === "assistant")?.id,
 *   getTextLength: (msgs, id) => msgs.find((m) => m.id === id)?.content?.length ?? 0,
 *   getToolCallCount: (msgs, id) => msgs.find((m) => m.id === id)?.tool_calls?.length ?? 0,
 * });
 * ```
 */
export const useStreamingTiming = <TMessage>(
  messages: readonly TMessage[],
  isRunning: boolean,
  accessors: StreamingTimingAccessors<TMessage>,
  options?: StreamingTimingOptions,
): Record<string, MessageTiming> => {
  const [timings, setTimings] = useState<Record<string, MessageTiming>>({});
  const stateRef = useRef<StreamingTimingState | null>(null);
  // Read the latest accessors/options from refs so the effect keeps the
  // original `[messages, isRunning]` reactivity of the adapter hooks this
  // replaces (a stable timings object while streaming, a single new reference
  // at finalize).
  const accessorsRef = useRef(accessors);
  accessorsRef.current = accessors;
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    const result = stepStreamingTiming(
      stateRef.current,
      messages,
      isRunning,
      accessorsRef.current,
      optionsRef.current,
    );
    stateRef.current = result.state;
    if (Object.keys(result.timings).length > 0) {
      setTimings((prev) => ({ ...prev, ...result.timings }));
    }
  }, [messages, isRunning]);

  return timings;
};

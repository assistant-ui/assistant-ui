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

const getContentKey = <TMessage>(
  messages: readonly TMessage[],
  messageId: string,
  accessors: StreamingTimingAccessors<TMessage>,
): string | undefined => {
  const content = accessors.getMessageContent?.(messages, messageId);
  try {
    return JSON.stringify(content);
  } catch {
    return undefined;
  }
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
 *   getMessageContent: (msgs, id) => {
 *     const message = msgs.find((m) => m.id === id);
 *     return message ? { content: message.content, tool_calls: message.tool_calls } : undefined;
 *   },
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
  const idleMessagesRef = useRef<readonly TMessage[] | null>(null);
  const idleMessageRef = useRef<{
    id: string;
    contentKey: string;
  } | null>(null);
  // Read the latest accessors/options from refs so the effect keeps the
  // original `[messages, isRunning]` reactivity of the adapter hooks this
  // replaces (a stable timings object while streaming, a single new reference
  // at finalize).
  const accessorsRef = useRef(accessors);
  accessorsRef.current = accessors;
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    const currentAccessors = accessorsRef.current;
    const id = currentAccessors.getAssistantMessageId(messages);
    if (
      isRunning &&
      id !== undefined &&
      stateRef.current?.messageId !== id &&
      idleMessageRef.current?.id !== id
    ) {
      const previousMessages = idleMessagesRef.current;
      const previousKey =
        previousMessages === null
          ? undefined
          : getContentKey(previousMessages, id, currentAccessors);
      idleMessageRef.current =
        previousKey === undefined ? null : { id, contentKey: previousKey };
    }
    const idleMessage = idleMessageRef.current;
    const contentKey =
      id !== undefined && (!isRunning || id === idleMessage?.id)
        ? getContentKey(messages, id, currentAccessors)
        : undefined;
    if (
      idleMessage !== null &&
      id === idleMessage.id &&
      contentKey !== idleMessage.contentKey
    ) {
      idleMessageRef.current = null;
    }

    if (!isRunning) {
      if (stateRef.current?.messageId === idleMessageRef.current?.id) {
        stateRef.current = null;
      }

      idleMessageRef.current =
        id === undefined || contentKey === undefined
          ? null
          : { id, contentKey };
      idleMessagesRef.current = messages;
    }

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

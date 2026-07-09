"use client";

import { useMemo } from "react";
import type { MessageTiming } from "@assistant-ui/react";
import {
  useStreamingTiming,
  type StreamingTimingAccessors,
} from "@assistant-ui/core/react";
import type { OpenCodeThreadState } from "./types";

export function getMessageTextLength(
  state: OpenCodeThreadState,
  messageId: string,
): number {
  const message = state.messagesById[messageId];
  if (!message?.info || message.info.role !== "assistant") return 0;
  let len = 0;
  for (const part of message.parts) {
    if (
      (part.type === "text" || part.type === "reasoning") &&
      typeof part.text === "string"
    ) {
      len += part.text.length;
    }
  }
  return len;
}

export function getMessageToolCallCount(
  state: OpenCodeThreadState,
  messageId: string,
): number {
  const message = state.messagesById[messageId];
  if (!message?.info || message.info.role !== "assistant") return 0;
  return message.parts.filter((p) => p.type === "tool").length;
}

export function getLastAssistantId(
  state: OpenCodeThreadState,
): string | undefined {
  for (let i = state.messageOrder.length - 1; i >= 0; i--) {
    const messageId = state.messageOrder[i];
    if (!messageId) continue;
    const message = state.messagesById[messageId];
    if (message?.info?.role === "assistant") {
      return messageId;
    }
  }
  return undefined;
}

// OpenCode tracks timing off a single thread-state snapshot rather than a
// message list, so the snapshot is wrapped in a one-element array to satisfy
// the shared primitive's `readonly TMessage[]` contract. The wrapper is
// memoized on `state` so the primitive's effect keeps the original
// `[state, isRunning]` reactivity (runs on state change, not every render).
const stateOf = (messages: readonly OpenCodeThreadState[]) => messages[0];

const openCodeStreamingTimingAccessors: StreamingTimingAccessors<OpenCodeThreadState> =
  {
    getAssistantMessageId: (messages) => {
      const state = stateOf(messages);
      return state ? getLastAssistantId(state) : undefined;
    },
    getTextLength: (messages, messageId) => {
      const state = stateOf(messages);
      return state ? getMessageTextLength(state, messageId) : 0;
    },
    getToolCallCount: (messages, messageId) => {
      const state = stateOf(messages);
      return state ? getMessageToolCallCount(state, messageId) : 0;
    },
  };

/**
 * Tracks per-message streaming timing for OpenCode messages. Delegates to
 * the shared `useStreamingTiming` primitive in `@assistant-ui/core/react`,
 * adapted to the `OpenCodeThreadState` snapshot shape (`messagesById` +
 * `messageOrder`). Timing is finalized when streaming ends and stored per
 * message id.
 */
export const useOpenCodeStreamingTiming = (
  state: OpenCodeThreadState,
  isRunning: boolean,
): Record<string, MessageTiming> => {
  const messages = useMemo(() => [state], [state]);
  return useStreamingTiming(
    messages,
    isRunning,
    openCodeStreamingTimingAccessors,
  );
};

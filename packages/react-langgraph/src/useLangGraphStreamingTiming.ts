"use client";

import type { LangChainMessage } from "./types";
import type { MessageTiming } from "@assistant-ui/core";
import {
  useStreamingTiming,
  type StreamingTimingAccessors,
} from "@assistant-ui/core/react";

const getMessageTextLength = (
  messages: readonly LangChainMessage[],
  messageId: string,
): number => {
  const m = messages.find((msg) => msg.type === "ai" && msg.id === messageId);
  if (!m) return 0;
  const content = m.content;
  if (typeof content === "string") return content.length;
  if (!Array.isArray(content)) return 0;
  let len = 0;
  for (const part of content) {
    if ("text" in part && typeof part.text === "string")
      len += part.text.length;
    if ("thinking" in part && typeof part.thinking === "string")
      len += part.thinking.length;
  }
  return len;
};

const getMessageToolCallCount = (
  messages: readonly LangChainMessage[],
  messageId: string,
): number => {
  const m = messages.find((msg) => msg.type === "ai" && msg.id === messageId);
  if (!m || m.type !== "ai") return 0;
  return m.tool_calls?.length ?? 0;
};

const getLastAssistantId = (
  messages: readonly LangChainMessage[],
): string | undefined => {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i]?.type === "ai" && messages[i]?.id) {
      return messages[i]!.id;
    }
  }
  return undefined;
};

const langGraphStreamingTimingAccessors: StreamingTimingAccessors<LangChainMessage> =
  {
    getAssistantMessageId: getLastAssistantId,
    getTextLength: getMessageTextLength,
    getToolCallCount: getMessageToolCallCount,
  };

/**
 * Tracks per-message streaming timing for LangGraph messages. Delegates to
 * the shared `useStreamingTiming` primitive in `@assistant-ui/core/react`,
 * adapted to the LangGraph message shape via the accessors above.
 */
export const useLangGraphStreamingTiming = (
  messages: readonly LangChainMessage[],
  isRunning: boolean,
): Record<string, MessageTiming> =>
  useStreamingTiming(messages, isRunning, langGraphStreamingTimingAccessors);

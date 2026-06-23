"use client";

import type { MessageTiming } from "@assistant-ui/core";
import {
  useStreamingTiming,
  type StreamingTimingAccessors,
} from "@assistant-ui/core/react";
import type { LangChainBaseMessage, LangChainContentBlock } from "./types";
import { getMessageType } from "./convertMessages";

const findAiMessage = (
  messages: readonly LangChainBaseMessage[],
  messageId: string,
): LangChainBaseMessage | undefined =>
  messages.find((m) => getMessageType(m) === "ai" && m.id === messageId);

const reasoningTextLength = (part: {
  readonly summary?: ReadonlyArray<{ readonly text?: string }>;
  readonly reasoning?: string;
}): number => {
  if (part.summary && part.summary.length > 0)
    return part.summary.map((s) => s?.text ?? "").join("\n\n\n").length;
  return part.reasoning?.length ?? 0;
};

const getTextLength = (
  messages: readonly LangChainBaseMessage[],
  messageId: string,
): number => {
  const m = findAiMessage(messages, messageId);
  if (!m) return 0;
  const content = m.content;
  if (typeof content === "string") return content.length;
  if (!Array.isArray(content)) return 0;
  let len = 0;
  for (const part of content as readonly LangChainContentBlock[]) {
    switch (part.type) {
      case "text":
      case "text_delta":
        if (typeof part.text === "string") len += part.text.length;
        break;
      case "thinking":
        if (typeof part.thinking === "string") len += part.thinking.length;
        break;
      case "reasoning":
        len += reasoningTextLength(part);
        break;
    }
  }
  return len;
};

const getToolCallCount = (
  messages: readonly LangChainBaseMessage[],
  messageId: string,
): number => findAiMessage(messages, messageId)?.tool_calls?.length ?? 0;

const getAssistantMessageId = (
  messages: readonly LangChainBaseMessage[],
): string | undefined => {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m && getMessageType(m) === "ai" && m.id) return m.id;
  }
  return undefined;
};

export const langChainStreamingTimingAccessors: StreamingTimingAccessors<LangChainBaseMessage> =
  {
    getAssistantMessageId,
    getTextLength,
    getToolCallCount,
  };

/**
 * Tracks per-message streaming timing for LangChain messages. Delegates to
 * the shared `useStreamingTiming` primitive in `@assistant-ui/core/react`,
 * adapted to the `LangChainBaseMessage` shape (`_getType() -> "ai"`, content
 * blocks including text/thinking/reasoning, `tool_calls`).
 */
export const useLangChainStreamingTiming = (
  messages: readonly LangChainBaseMessage[],
  isRunning: boolean,
): Record<string, MessageTiming> =>
  useStreamingTiming(messages, isRunning, langChainStreamingTimingAccessors);

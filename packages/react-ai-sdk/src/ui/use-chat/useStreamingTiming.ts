"use client";

import type { UIMessage } from "@ai-sdk/react";
import { isToolUIPart } from "ai";
import type { MessageTiming } from "@assistant-ui/core";
import {
  useStreamingTiming as useStreamingTimingPrimitive,
  type StreamingTimingAccessors,
} from "@assistant-ui/core/react";

const findAssistant = (
  messages: readonly UIMessage[],
  messageId: string,
): UIMessage | undefined => messages.find((m) => m.id === messageId);

const getTextLength = (
  messages: readonly UIMessage[],
  messageId: string,
): number => {
  const message = findAssistant(messages, messageId);
  if (!message?.parts) return 0;
  let len = 0;
  for (const part of message.parts) {
    if (part.type === "text") len += part.text.length;
  }
  return len;
};

const getToolCallCount = (
  messages: readonly UIMessage[],
  messageId: string,
): number => {
  const message = findAssistant(messages, messageId);
  if (!message?.parts) return 0;
  let count = 0;
  for (const part of message.parts) {
    if (isToolUIPart(part)) count++;
  }
  return count;
};

const getAssistantMessageId = (
  messages: readonly UIMessage[],
): string | undefined => messages.findLast((m) => m.role === "assistant")?.id;

export const aiSdkStreamingTimingAccessors: StreamingTimingAccessors<UIMessage> =
  {
    getAssistantMessageId,
    getTextLength,
    getToolCallCount,
  };

/**
 * Tracks streaming timing for AI SDK messages client-side. Delegates to the
 * shared `useStreamingTiming` primitive in `@assistant-ui/core/react`,
 * adapted to the `UIMessage` shape. Timing is finalized when streaming ends
 * and stored per message id.
 */
export const useStreamingTiming = (
  messages: UIMessage[],
  isRunning: boolean,
): Record<string, MessageTiming> =>
  useStreamingTimingPrimitive(
    messages,
    isRunning,
    aiSdkStreamingTimingAccessors,
  );

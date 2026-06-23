"use client";

import { useEffect, useRef, useState } from "react";
import type { MessageTiming } from "@assistant-ui/core";
import type { LangChainBaseMessage, LangChainContentBlock } from "./types";
import { getMessageType } from "./convertMessages";

type TrackingState = {
  messageId: string;
  startTime: number;
  firstTokenTime?: number;
  lastContentLength: number;
  totalChunks: number;
};

const findAiMessage = (
  messages: readonly LangChainBaseMessage[],
  messageId: string,
): LangChainBaseMessage | undefined =>
  messages.find((m) => getMessageType(m) === "ai" && m.id === messageId);

const getMessageTextLength = (
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
    if ("text" in part && typeof part.text === "string")
      len += part.text.length;
    if ("thinking" in part && typeof part.thinking === "string")
      len += part.thinking.length;
  }
  return len;
};

const getMessageToolCallCount = (
  messages: readonly LangChainBaseMessage[],
  messageId: string,
): number => findAiMessage(messages, messageId)?.tool_calls?.length ?? 0;

const getLastAssistantId = (
  messages: readonly LangChainBaseMessage[],
): string | undefined => {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m && getMessageType(m) === "ai" && m.id) return m.id;
  }
  return undefined;
};

export const useStreamingTiming = (
  messages: readonly LangChainBaseMessage[],
  isRunning: boolean,
): Record<string, MessageTiming> => {
  const [timings, setTimings] = useState<Record<string, MessageTiming>>({});
  const trackRef = useRef<TrackingState | null>(null);

  useEffect(() => {
    const lastId = getLastAssistantId(messages);

    if (isRunning && lastId) {
      if (!trackRef.current || trackRef.current.messageId !== lastId) {
        trackRef.current = {
          messageId: lastId,
          startTime: Date.now(),
          lastContentLength: 0,
          totalChunks: 0,
        };
      }

      const t = trackRef.current;
      const len = getMessageTextLength(messages, t.messageId);
      if (len > t.lastContentLength) {
        if (t.firstTokenTime === undefined) {
          t.firstTokenTime = Date.now() - t.startTime;
        }
        t.totalChunks++;
        t.lastContentLength = len;
      }
    } else if (!isRunning && trackRef.current) {
      const t = trackRef.current;
      const totalStreamTime = Date.now() - t.startTime;
      const tokenCount = Math.ceil(t.lastContentLength / 4);
      const toolCallCount = getMessageToolCallCount(messages, t.messageId);

      const timing: MessageTiming = {
        streamStartTime: t.startTime,
        totalStreamTime,
        totalChunks: t.totalChunks,
        toolCallCount,
        ...(t.firstTokenTime !== undefined && {
          firstTokenTime: t.firstTokenTime,
        }),
        ...(tokenCount > 0 && { tokenCount }),
        ...(totalStreamTime > 0 &&
          tokenCount > 0 && {
            tokensPerSecond: tokenCount / (totalStreamTime / 1000),
          }),
      };
      setTimings((prev) => ({ ...prev, [t.messageId]: timing }));
      trackRef.current = null;
    }
  }, [messages, isRunning]);

  return timings;
};

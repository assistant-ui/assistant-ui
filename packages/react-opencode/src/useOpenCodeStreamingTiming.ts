"use client";

import { useEffect, useRef, useState } from "react";
import type { MessageTiming } from "@assistant-ui/react";
import type { OpenCodeThreadState } from "./types";

type TrackingState = {
  messageId: string;
  startTime: number;
  firstTokenTime?: number;
  lastContentLength: number;
  totalChunks: number;
};

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

export const useOpenCodeStreamingTiming = (
  state: OpenCodeThreadState,
  isRunning: boolean,
): Record<string, MessageTiming> => {
  const [timings, setTimings] = useState<Record<string, MessageTiming>>({});
  const trackRef = useRef<TrackingState | null>(null);

  useEffect(() => {
    const lastId = getLastAssistantId(state);

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
      const len = getMessageTextLength(state, t.messageId);
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
      const toolCallCount = getMessageToolCallCount(state, t.messageId);

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
  }, [state, isRunning]);

  return timings;
};

"use client";

import { useEffect, useRef, useState } from "react";
import type { UIMessage } from "@ai-sdk/react";
import { isToolUIPart } from "ai";
import type { MessageTiming } from "@assistant-ui/react";

type TrackingState = {
  messageId: string;
  startTime: number;
  firstTokenTime?: number;
  lastContentLength: number;
  totalChunks: number;
};

function getTextLength(message: UIMessage | undefined): number {
  if (!message?.parts) return 0;
  let len = 0;
  for (const part of message.parts) {
    if (part.type === "text") len += part.text.length;
  }
  return len;
}

function getToolCallCount(message: UIMessage | undefined): number {
  if (!message?.parts) return 0;
  let count = 0;
  for (const part of message.parts) {
    if (isToolUIPart(part)) count++;
  }
  return count;
}

/**
 * Tracks streaming timing for AI SDK messages client-side.
 *
 * Observes `isRunning` transitions and content changes to estimate
 * timing metrics (TTFT, duration, tok/s). Timing is finalized when
 * streaming ends and stored per message ID.
 */
export const useStreamingTiming = (
  messages: UIMessage[],
  isRunning: boolean,
): Record<string, MessageTiming> => {
  const [timings, setTimings] = useState<Record<string, MessageTiming>>({});
  const trackRef = useRef<TrackingState | null>(null);

  useEffect(() => {
    const lastAssistant = messages.findLast((m) => m.role === "assistant");

    if (isRunning && lastAssistant) {
      // Start tracking if not already or if message changed
      if (
        !trackRef.current ||
        trackRef.current.messageId !== lastAssistant.id
      ) {
        trackRef.current = {
          messageId: lastAssistant.id,
          startTime: Date.now(),
          lastContentLength: 0,
          totalChunks: 0,
        };
      }

      // Track content changes
      const t = trackRef.current;
      const len = getTextLength(lastAssistant);
      if (len > t.lastContentLength) {
        if (t.firstTokenTime === undefined) {
          t.firstTokenTime = Date.now() - t.startTime;
        }
        t.totalChunks++;
        t.lastContentLength = len;
      }
    } else if (!isRunning && trackRef.current) {
      // Streaming ended — finalize timing
      const t = trackRef.current;
      const totalStreamTime = Date.now() - t.startTime;
      const tokenCount = Math.ceil(t.lastContentLength / 4);
      const toolCallCount = getToolCallCount(lastAssistant);

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

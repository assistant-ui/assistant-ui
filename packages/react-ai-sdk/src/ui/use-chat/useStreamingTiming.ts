"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import type { UIMessage } from "@ai-sdk/react";
import type { MessageTiming } from "@assistant-ui/react";

type MessageTimingTracker = {
  streamStartTime: number;
  firstChunkTime?: number;
  firstTokenTime?: number;
  endTime?: number;
  chunkCount: number;
};

type ChatStatus = "submitted" | "streaming" | "ready" | "error";

export function useStreamingTiming(
  status: ChatStatus,
  messages: UIMessage[],
): Record<string, MessageTiming> {
  const trackersRef = useRef<Record<string, MessageTimingTracker>>({});
  const prevStatusRef = useRef<ChatStatus>("ready");
  const pendingStreamStartRef = useRef<number | null>(null);
  const [timings, setTimings] = useState<Record<string, MessageTiming>>({});

  const addTiming = useCallback((messageId: string, timing: MessageTiming) => {
    setTimings((prev) => ({ ...prev, [messageId]: timing }));
  }, []);

  useEffect(() => {
    const prevStatus = prevStatusRef.current;

    if (status === "submitted" && prevStatus !== "submitted") {
      pendingStreamStartRef.current = Date.now();
    }

    if (status === "streaming") {
      const lastAssistantMsg = findLastAssistantMessage(messages);
      if (lastAssistantMsg) {
        let tracker = trackersRef.current[lastAssistantMsg.id];

        if (!tracker) {
          const streamStartTime = pendingStreamStartRef.current ?? Date.now();
          tracker = {
            streamStartTime,
            chunkCount: 0,
            firstChunkTime: Date.now(),
          };
          trackersRef.current[lastAssistantMsg.id] = tracker;
          pendingStreamStartRef.current = null;
        }

        if (!tracker.firstTokenTime) {
          const hasTextContent = lastAssistantMsg.parts?.some(
            (part) => part.type === "text" && part.text.length > 0,
          );
          if (hasTextContent) {
            tracker.firstTokenTime = Date.now();
          }
        }

        tracker.chunkCount++;
      }
    }

    if (
      (status === "ready" || status === "error") &&
      (prevStatus === "streaming" || prevStatus === "submitted")
    ) {
      const lastAssistantMsg = findLastAssistantMessage(messages);
      if (lastAssistantMsg) {
        const tracker = trackersRef.current[lastAssistantMsg.id];
        if (tracker && !tracker.endTime) {
          tracker.endTime = Date.now();

          const timing = calculateTiming(tracker, lastAssistantMsg);
          addTiming(lastAssistantMsg.id, timing);
        }
      }
      pendingStreamStartRef.current = null;
    }

    prevStatusRef.current = status;
  }, [status, messages, addTiming]);

  return timings;
}

function findLastAssistantMessage(
  messages: UIMessage[],
): UIMessage | undefined {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i]!.role === "assistant") {
      return messages[i];
    }
  }
  return undefined;
}

function calculateTiming(
  tracker: MessageTimingTracker,
  message: UIMessage,
): MessageTiming {
  const { streamStartTime, firstChunkTime, firstTokenTime, endTime } = tracker;

  const totalStreamTime = endTime ? endTime - streamStartTime : null;

  let estimatedTokens = 0;
  if (message.parts) {
    for (const part of message.parts) {
      if (part.type === "text") {
        estimatedTokens += Math.ceil(part.text.length / 4);
      }
    }
  }

  const tokensPerSecond =
    totalStreamTime && estimatedTokens > 0
      ? (estimatedTokens / totalStreamTime) * 1000
      : null;

  const timeToFirstChunk = firstChunkTime
    ? firstChunkTime - streamStartTime
    : null;
  const timeToFirstToken = firstTokenTime
    ? firstTokenTime - streamStartTime
    : null;
  const totalChunks = tracker.chunkCount > 0 ? tracker.chunkCount : null;

  return {
    streamStartTime,
    ...(timeToFirstChunk !== null && { timeToFirstChunk }),
    ...(timeToFirstToken !== null && { timeToFirstToken }),
    ...(totalStreamTime !== null && { totalStreamTime }),
    ...(totalChunks !== null && { totalChunks }),
    ...(tokensPerSecond !== null && { tokensPerSecond }),
  };
}

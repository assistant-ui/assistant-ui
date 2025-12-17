"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import type { UIMessage } from "@ai-sdk/react";
import { isToolUIPart } from "ai";
import type { MessageTiming } from "@assistant-ui/react";

type MessageTimingTracker = {
  streamStartTime: number;
  firstChunkTime?: number;
  firstTokenTime?: number;
  endTime?: number;
  chunkCount: number;
  toolCallStartTimes: Map<string, number>;
  toolCallTotalTime: number;
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

        if (!tracker || tracker.endTime !== undefined) {
          const streamStartTime = pendingStreamStartRef.current ?? Date.now();
          tracker = {
            streamStartTime,
            chunkCount: 0,
            firstChunkTime: Date.now(),
            toolCallStartTimes: new Map(),
            toolCallTotalTime: 0,
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

        if (lastAssistantMsg.parts) {
          for (const part of lastAssistantMsg.parts) {
            if (isToolUIPart(part)) {
              const toolCallId = part.toolCallId;
              const hasResult =
                part.state === "output-available" ||
                part.state === "output-error";

              if (!tracker.toolCallStartTimes.has(toolCallId)) {
                tracker.toolCallStartTimes.set(toolCallId, Date.now());
              } else if (hasResult) {
                const startTime = tracker.toolCallStartTimes.get(toolCallId);
                if (startTime !== undefined && startTime > 0) {
                  tracker.toolCallTotalTime += Date.now() - startTime;
                  tracker.toolCallStartTimes.set(toolCallId, -1);
                }
              }
            }
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

  const toolCallCount =
    message.parts?.filter((part) => isToolUIPart(part)).length ?? 0;

  const toolCallTotalTime =
    tracker.toolCallTotalTime > 0 ? tracker.toolCallTotalTime : null;

  const metadata = message.metadata as
    | { totalUsage?: { completionTokens?: number } }
    | undefined;
  const serverTokens = metadata?.totalUsage?.completionTokens;

  let tokenCount: number;
  if (serverTokens !== undefined && serverTokens > 0) {
    tokenCount = serverTokens;
  } else {
    tokenCount = 0;
    if (message.parts) {
      for (const part of message.parts) {
        if (part.type === "text") {
          tokenCount += Math.ceil(part.text.length / 4);
        }
      }
    }
  }

  const tokensPerSecond =
    totalStreamTime && tokenCount > 0
      ? (tokenCount / totalStreamTime) * 1000
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
    ...(toolCallCount > 0 && { toolCallCount }),
    ...(toolCallTotalTime !== null && { toolCallTotalTime }),
  };
}

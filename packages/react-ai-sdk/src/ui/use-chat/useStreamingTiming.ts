"use client";

import { useRef, useEffect, useState, useCallback, useMemo } from "react";
import type { UIMessage } from "@ai-sdk/react";
import { isToolUIPart } from "ai";
import type { MessageTiming } from "@assistant-ui/react";

// Maximum number of message timings to retain to prevent memory leaks
const MAX_RETAINED_TIMINGS = 100;

type MessageTimingTracker = {
  streamStartTime: number;
  lastChunkTime: number;
  firstChunkTime?: number;
  firstTokenTime?: number;
  endTime?: number;
  chunkCount: number;
  largestChunkGap: number;
  lastContentSnapshot: string;
  toolCallStartTimes: Map<string, number>;
  completedToolCalls: Set<string>;
  toolCallTotalTime: number;
  toolCallCount: number;
};

/**
 * Generate a content snapshot to detect actual content changes (real chunks).
 * This allows us to distinguish between re-renders and actual data arrival.
 */
function getContentSnapshot(message: UIMessage | undefined): string {
  if (!message?.parts) return "";
  return message.parts
    .map((part) => {
      if (part.type === "text") return `text:${part.text}`;
      if (isToolUIPart(part)) return `tool:${part.toolCallId}:${part.state}`;
      if (part.type === "reasoning") return `reasoning:${part.text}`;
      return "";
    })
    .join("|");
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

function createTracker(streamStartTime: number): MessageTimingTracker {
  return {
    streamStartTime,
    lastChunkTime: streamStartTime,
    chunkCount: 0,
    largestChunkGap: 0,
    lastContentSnapshot: "",
    toolCallStartTimes: new Map(),
    completedToolCalls: new Set(),
    toolCallTotalTime: 0,
    toolCallCount: 0,
  };
}

/**
 * Clears internal Maps and Sets in a tracker to free memory.
 */
function clearTrackerResources(tracker: MessageTimingTracker): void {
  tracker.toolCallStartTimes.clear();
  tracker.completedToolCalls.clear();
}

function recordChunk(tracker: MessageTimingTracker): void {
  const now = Date.now();
  tracker.chunkCount++;

  const gap = now - tracker.lastChunkTime;
  if (gap > tracker.largestChunkGap) {
    tracker.largestChunkGap = gap;
  }
  tracker.lastChunkTime = now;

  if (tracker.firstChunkTime === undefined) {
    tracker.firstChunkTime = now - tracker.streamStartTime;
  }
}

function recordFirstToken(tracker: MessageTimingTracker): void {
  if (tracker.firstTokenTime === undefined) {
    tracker.firstTokenTime = Date.now() - tracker.streamStartTime;
  }
}

function recordToolCallStart(
  tracker: MessageTimingTracker,
  toolCallId: string,
): void {
  if (
    !tracker.toolCallStartTimes.has(toolCallId) &&
    !tracker.completedToolCalls.has(toolCallId)
  ) {
    tracker.toolCallStartTimes.set(toolCallId, Date.now());
    tracker.toolCallCount++;
  }
}

function recordToolCallEnd(
  tracker: MessageTimingTracker,
  toolCallId: string,
): void {
  const startTime = tracker.toolCallStartTimes.get(toolCallId);
  if (startTime !== undefined) {
    tracker.toolCallTotalTime += Date.now() - startTime;
    tracker.toolCallStartTimes.delete(toolCallId);
    tracker.completedToolCalls.add(toolCallId);
  }
}

type ServerTiming = {
  processingTime?: number;
  queueTime?: number;
  custom?: Record<string, unknown>;
};

function extractServerTiming(message: UIMessage): ServerTiming | undefined {
  const metadata = message.metadata as
    | {
        timing?: { server?: ServerTiming };
        serverTiming?: ServerTiming;
      }
    | undefined;

  return metadata?.timing?.server ?? metadata?.serverTiming;
}

function calculateTiming(
  tracker: MessageTimingTracker,
  message: UIMessage,
): MessageTiming {
  const { streamStartTime, firstChunkTime, firstTokenTime, endTime } = tracker;

  const totalStreamTime = endTime ? endTime - streamStartTime : null;

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

  const totalChunks = tracker.chunkCount > 0 ? tracker.chunkCount : null;
  const largestChunkGap =
    tracker.largestChunkGap > 0 ? tracker.largestChunkGap : null;

  const serverTiming = extractServerTiming(message);

  const timing: MessageTiming = {
    streamStartTime,
    ...(firstChunkTime !== undefined && { timeToFirstChunk: firstChunkTime }),
    ...(firstTokenTime !== undefined && { timeToFirstToken: firstTokenTime }),
    ...(totalStreamTime !== null && { totalStreamTime }),
    ...(totalChunks !== null && { totalChunks }),
    ...(tokensPerSecond !== null && { tokensPerSecond }),
    ...(largestChunkGap !== null && { largestChunkGap }),
    ...(tracker.toolCallCount > 0 && { toolCallCount: tracker.toolCallCount }),
    ...(toolCallTotalTime !== null && { toolCallTotalTime }),
    ...(serverTiming !== undefined && { server: serverTiming }),
  };

  return timing;
}

export function useStreamingTiming(
  messages: UIMessage[],
  isRunning: boolean,
): Record<string, MessageTiming> {
  const trackersRef = useRef<Record<string, MessageTimingTracker>>({});
  const prevIsRunningRef = useRef<boolean>(false);
  const pendingStreamStartRef = useRef<number | null>(null);
  const [timings, setTimings] = useState<Record<string, MessageTiming>>({});

  const addTiming = useCallback((messageId: string, timing: MessageTiming) => {
    setTimings((prev) => {
      const newTimings = { ...prev, [messageId]: timing };
      const keys = Object.keys(newTimings);

      // Prune oldest timings if exceeding limit
      if (keys.length > MAX_RETAINED_TIMINGS) {
        const keysToKeep = keys.slice(-MAX_RETAINED_TIMINGS);
        const pruned: Record<string, MessageTiming> = {};
        for (const key of keysToKeep) {
          pruned[key] = newTimings[key]!;
        }
        return pruned;
      }

      return newTimings;
    });
  }, []);

  const lastAssistantMsg = useMemo(
    () => findLastAssistantMessage(messages),
    [messages],
  );
  const lastMessageId = lastAssistantMsg?.id;
  const contentSnapshot = useMemo(
    () => getContentSnapshot(lastAssistantMsg),
    [lastAssistantMsg],
  );

  useEffect(() => {
    const prevIsRunning = prevIsRunningRef.current;

    if (isRunning && !prevIsRunning) {
      pendingStreamStartRef.current = Date.now();
    }

    if (isRunning && lastAssistantMsg) {
      let tracker = trackersRef.current[lastAssistantMsg.id];

      // Create new tracker if none exists or previous one is finalized
      if (!tracker || tracker.endTime !== undefined) {
        const streamStartTime = pendingStreamStartRef.current ?? Date.now();
        tracker = createTracker(streamStartTime);
        trackersRef.current[lastAssistantMsg.id] = tracker;
        pendingStreamStartRef.current = null;

        // Clean up old finalized trackers to prevent memory leaks
        const messageIds = new Set(messages.map((m) => m.id));
        for (const id of Object.keys(trackersRef.current)) {
          const t = trackersRef.current[id];
          if (t && t.endTime !== undefined && !messageIds.has(id)) {
            clearTrackerResources(t);
            delete trackersRef.current[id];
          }
        }
      }

      // Detect actual content change by comparing snapshots
      if (contentSnapshot !== tracker.lastContentSnapshot) {
        recordChunk(tracker);
        tracker.lastContentSnapshot = contentSnapshot;

        const hasTextContent = lastAssistantMsg.parts?.some(
          (part) => part.type === "text" && part.text.length > 0,
        );
        if (hasTextContent) {
          recordFirstToken(tracker);
        }
      }

      if (lastAssistantMsg.parts) {
        for (const part of lastAssistantMsg.parts) {
          if (isToolUIPart(part)) {
            const toolCallId = part.toolCallId;
            const hasResult =
              part.state === "output-available" ||
              part.state === "output-error";

            recordToolCallStart(tracker, toolCallId);

            if (hasResult) {
              recordToolCallEnd(tracker, toolCallId);
            }
          }
        }
      }
    }

    // Finalize timing when stream ends (normal completion or error/abort)
    if (!isRunning && prevIsRunning) {
      pendingStreamStartRef.current = null;

      if (lastAssistantMsg) {
        const tracker = trackersRef.current[lastAssistantMsg.id];
        if (tracker && !tracker.endTime) {
          tracker.endTime = Date.now();
          const timing = calculateTiming(tracker, lastAssistantMsg);
          addTiming(lastAssistantMsg.id, timing);
          clearTrackerResources(tracker);
        }
      }
    }

    prevIsRunningRef.current = isRunning;
  }, [isRunning, lastMessageId, contentSnapshot, lastAssistantMsg, addTiming]);

  return timings;
}

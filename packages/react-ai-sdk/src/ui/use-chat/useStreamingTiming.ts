"use client";

import { useRef, useEffect, useState, useCallback, useMemo } from "react";
import type { UIMessage } from "@ai-sdk/react";
import { isToolUIPart } from "ai";
import type { MessageTiming } from "@assistant-ui/react";

/** Maximum number of message timings to retain to prevent memory leaks */
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
 * Generate a content snapshot to detect actual content changes.
 * This distinguishes between re-renders and actual data arrival.
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

/** Clears internal Maps and Sets in a tracker to free memory */
function clearTrackerResources(tracker: MessageTimingTracker): void {
  tracker.toolCallStartTimes.clear();
  tracker.completedToolCalls.clear();
}

/** Remove finalized trackers for messages that no longer exist */
function cleanupOldTrackers(
  trackers: Record<string, MessageTimingTracker>,
  currentMessageIds: Set<string>,
): void {
  for (const id of Object.keys(trackers)) {
    const tracker = trackers[id];
    if (tracker?.endTime !== undefined && !currentMessageIds.has(id)) {
      clearTrackerResources(tracker);
      delete trackers[id];
    }
  }
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

type ServerTiming = NonNullable<MessageTiming["server"]>;

function extractServerTiming(message: UIMessage): ServerTiming | undefined {
  const metadata = message.metadata as
    | {
        timing?: { server?: ServerTiming };
        serverTiming?: ServerTiming;
      }
    | undefined;

  return metadata?.timing?.server ?? metadata?.serverTiming;
}

function extractTimingFromAnnotations(
  message: UIMessage,
): MessageTiming | undefined {
  const annotations = (message as { annotations?: unknown[] }).annotations;
  if (!annotations) return undefined;

  const timingAnnotation = annotations.find(
    (a): a is { type: string } & MessageTiming =>
      typeof a === "object" &&
      a !== null &&
      (a as { type?: string }).type === "aui-timing",
  );

  if (!timingAnnotation) return undefined;

  const { type: _, ...timing } = timingAnnotation;
  return timing;
}

function estimateTokenCount(message: UIMessage): number {
  const metadata = message.metadata as
    | { totalUsage?: { completionTokens?: number } }
    | undefined;
  const serverTokens = metadata?.totalUsage?.completionTokens;

  if (serverTokens !== undefined && serverTokens > 0) {
    return serverTokens;
  }

  let count = 0;
  if (message.parts) {
    for (const part of message.parts) {
      if (part.type === "text") {
        count += Math.ceil(part.text.length / 4);
      }
    }
  }
  return count;
}

function calculateClientTiming(
  tracker: MessageTimingTracker,
  message: UIMessage,
): MessageTiming {
  const { streamStartTime, firstChunkTime, firstTokenTime, endTime } = tracker;
  const totalStreamTime = endTime ? endTime - streamStartTime : null;
  const tokenCount = estimateTokenCount(message);
  const serverTiming = extractServerTiming(message);

  const tokensPerSecond =
    totalStreamTime && tokenCount > 0
      ? (tokenCount / totalStreamTime) * 1000
      : null;

  // Build timing object - use type assertion for mutable construction
  const timing = {
    streamStartTime,
    ...(firstChunkTime !== undefined && { timeToFirstChunk: firstChunkTime }),
    ...(firstTokenTime !== undefined && { timeToFirstToken: firstTokenTime }),
    ...(totalStreamTime !== null && { totalStreamTime }),
    ...(tracker.chunkCount > 0 && { totalChunks: tracker.chunkCount }),
    ...(tokensPerSecond !== null && { tokensPerSecond }),
    ...(tracker.largestChunkGap > 0 && {
      largestChunkGap: tracker.largestChunkGap,
    }),
    ...(tracker.toolCallCount > 0 && { toolCallCount: tracker.toolCallCount }),
    ...(tracker.toolCallTotalTime > 0 && {
      toolCallTotalTime: tracker.toolCallTotalTime,
    }),
    ...(serverTiming && { server: serverTiming }),
  } satisfies MessageTiming;

  return timing;
}

function calculateTiming(
  tracker: MessageTimingTracker,
  message: UIMessage,
): MessageTiming {
  const annotationTiming = extractTimingFromAnnotations(message);

  if (annotationTiming) {
    return {
      ...annotationTiming,
      streamStartTime: tracker.streamStartTime,
    };
  }

  return calculateClientTiming(tracker, message);
}

/** Process tool call parts and update tracker */
function processToolCalls(
  tracker: MessageTimingTracker,
  message: UIMessage,
): void {
  if (!message.parts) return;

  for (const part of message.parts) {
    if (isToolUIPart(part)) {
      const toolCallId = part.toolCallId;
      recordToolCallStart(tracker, toolCallId);

      const hasResult =
        part.state === "output-available" || part.state === "output-error";
      if (hasResult) {
        recordToolCallEnd(tracker, toolCallId);
      }
    }
  }
}

/** Prune oldest timings if exceeding the limit */
function pruneTimings(
  timings: Record<string, MessageTiming>,
): Record<string, MessageTiming> {
  const keys = Object.keys(timings);
  if (keys.length <= MAX_RETAINED_TIMINGS) {
    return timings;
  }

  const keysToKeep = keys.slice(-MAX_RETAINED_TIMINGS);
  const pruned: Record<string, MessageTiming> = {};
  for (const key of keysToKeep) {
    pruned[key] = timings[key]!;
  }
  return pruned;
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
    setTimings((prev) => pruneTimings({ ...prev, [messageId]: timing }));
  }, []);

  const lastAssistantMsg = useMemo(
    () => findLastAssistantMessage(messages),
    [messages],
  );

  const contentSnapshot = useMemo(
    () => getContentSnapshot(lastAssistantMsg),
    [lastAssistantMsg],
  );

  useEffect(() => {
    const prevIsRunning = prevIsRunningRef.current;

    // Mark stream start time
    if (isRunning && !prevIsRunning) {
      pendingStreamStartRef.current = Date.now();
    }

    // Handle active streaming
    if (isRunning && lastAssistantMsg) {
      let tracker = trackersRef.current[lastAssistantMsg.id];

      // Create new tracker if none exists or previous one is finalized
      if (!tracker || tracker.endTime !== undefined) {
        const streamStartTime = pendingStreamStartRef.current ?? Date.now();
        tracker = createTracker(streamStartTime);
        trackersRef.current[lastAssistantMsg.id] = tracker;
        pendingStreamStartRef.current = null;

        // Clean up old finalized trackers
        const messageIds = new Set(messages.map((m) => m.id));
        cleanupOldTrackers(trackersRef.current, messageIds);
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

      processToolCalls(tracker, lastAssistantMsg);
    }

    // Finalize timing when stream ends
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
  }, [isRunning, contentSnapshot, lastAssistantMsg, addTiming, messages]);

  return timings;
}

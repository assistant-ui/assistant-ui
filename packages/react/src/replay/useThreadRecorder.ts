"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAui, useAuiState } from "@assistant-ui/store";
import type { ThreadRecording, ThreadRecordingEvent } from "@assistant-ui/core";
import { diffMessages, serializeMessages } from "@assistant-ui/core";
import type { ThreadMessage } from "@assistant-ui/core";

export type UseThreadRecorderOptions = {
  onUpdate?: (recording: ThreadRecording) => void;
};

const createEmptyRecording = (createdAt: number): ThreadRecording => ({
  version: 1,
  metadata: {
    createdAt: new Date(createdAt).toISOString(),
    duration: 0,
    messageCount: 0,
  },
  events: [],
});

export const useThreadRecorder = (options: UseThreadRecorderOptions = {}) => {
  const { onUpdate } = options;
  const aui = useAui();
  const runtime = useAuiState(() =>
    aui.thread.source ? (aui.thread().__internal_getRuntime?.() ?? null) : null,
  );
  const [isRecording, setIsRecording] = useState(false);
  const eventsRef = useRef<ThreadRecordingEvent[]>([]);
  const prevMessagesRef = useRef<readonly ThreadMessage[]>([]);
  const startTimeRef = useRef<number>(Date.now());
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  const getTimestamp = useCallback(() => Date.now() - startTimeRef.current, []);

  const buildRecording = useCallback((): ThreadRecording => {
    if (!runtime) {
      return createEmptyRecording(startTimeRef.current);
    }

    const events = eventsRef.current;
    const messageCount = prevMessagesRef.current.length;
    return {
      version: 1,
      metadata: {
        createdAt: new Date(startTimeRef.current).toISOString(),
        duration: Date.now() - startTimeRef.current,
        messageCount,
      },
      events,
    };
  }, [runtime]);

  const scheduleUpdate = useCallback(
    (immediate: boolean) => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      if (immediate) {
        onUpdateRef.current?.(buildRecording());
      } else {
        debounceTimerRef.current = setTimeout(() => {
          onUpdateRef.current?.(buildRecording());
        }, 100);
      }
    },
    [buildRecording],
  );

  useEffect(() => {
    if (!runtime) {
      setIsRecording(false);
      eventsRef.current = [];
      prevMessagesRef.current = [];
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      return;
    }

    startTimeRef.current = Date.now();
    setIsRecording(true);

    const initialMessages = runtime.getState().messages;
    prevMessagesRef.current = initialMessages;
    eventsRef.current = [
      {
        type: "snapshot",
        timestamp: 0,
        messages: serializeMessages(initialMessages),
      },
    ];

    const unsubState = runtime.subscribe(() => {
      const nextMessages = runtime.getState().messages;
      const diffs = diffMessages(prevMessagesRef.current, nextMessages);

      for (const diff of diffs) {
        if (diff.type === "reset") {
          eventsRef.current.push({
            type: "snapshot",
            timestamp: getTimestamp(),
            messages: diff.messages,
          });
        } else {
          eventsRef.current.push({
            type: "message-update",
            timestamp: getTimestamp(),
            messageId: diff.messageId,
            message: diff.message,
          });
        }
      }

      prevMessagesRef.current = nextMessages;
      if (diffs.length > 0) scheduleUpdate(false);
    });

    const unsubRunStart = runtime.unstable_on("runStart", () => {
      eventsRef.current.push({
        type: "run-start",
        timestamp: getTimestamp(),
      });
    });

    const unsubRunEnd = runtime.unstable_on("runEnd", () => {
      eventsRef.current.push({
        type: "run-end",
        timestamp: getTimestamp(),
      });
      scheduleUpdate(true);
    });

    return () => {
      unsubState();
      unsubRunStart();
      unsubRunEnd();
      setIsRecording(false);
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [runtime, getTimestamp, scheduleUpdate]);

  const reset = useCallback(() => {
    if (!runtime) return;

    startTimeRef.current = Date.now();
    const messages = runtime.getState().messages;
    prevMessagesRef.current = messages;
    eventsRef.current = [
      {
        type: "snapshot",
        timestamp: 0,
        messages: serializeMessages(messages),
      },
    ];
  }, [runtime]);

  return {
    isRecording,
    export: buildRecording,
    reset,
  };
};

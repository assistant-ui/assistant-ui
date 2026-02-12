"use client";

import {
  AssistantRuntime,
  ThreadHistoryAdapter,
  ThreadMessage,
  MessageFormatAdapter,
  getExternalStoreMessages,
  MessageFormatRepository,
  ExportedMessageRepository,
  INTERNAL,
  useAui,
} from "@assistant-ui/react";
import { useRef, useEffect, useState, RefObject, useCallback } from "react";

const { MessageRepository } = INTERNAL;

export const toExportedMessageRepository = <TMessage,>(
  toThreadMessages: (messages: TMessage[]) => ThreadMessage[],
  messages: MessageFormatRepository<TMessage>,
): ExportedMessageRepository => {
  return {
    headId: messages.headId!,
    messages: messages.messages.map((m) => {
      const message = toThreadMessages([m.message])[0]!;
      return {
        ...m,
        message,
      };
    }),
  };
};

export const useExternalHistory = <TMessage,>(
  runtimeRef: RefObject<AssistantRuntime>,
  historyAdapter: ThreadHistoryAdapter | undefined,
  toThreadMessages: (messages: TMessage[]) => ThreadMessage[],
  storageFormatAdapter: MessageFormatAdapter<TMessage, any>,
  onSetMessages: (messages: TMessage[]) => void,
) => {
  const loadedRef = useRef(false);

  const aui = useAui();
  const optionalThreadListItem = useCallback(
    () => (aui.threadListItem.source ? aui.threadListItem() : null),
    [aui],
  );

  const [isLoading, setIsLoading] = useState(false);

  const historyIds = useRef(new Set<string>());

  const onSetMessagesRef = useRef(onSetMessages);
  useEffect(() => {
    onSetMessagesRef.current = onSetMessages;
  });

  useEffect(() => {
    if (!historyAdapter || loadedRef.current) return;

    const loadHistory = async () => {
      setIsLoading(true);
      try {
        const repo = await historyAdapter
          .withFormat?.(storageFormatAdapter)
          .load();
        if (repo && repo.messages.length > 0) {
          const converted = toExportedMessageRepository(toThreadMessages, repo);
          runtimeRef.current.thread.import(converted);

          const tempRepo = new MessageRepository();
          tempRepo.import(converted);
          const messages = tempRepo.getMessages();

          onSetMessagesRef.current(
            messages.map(getExternalStoreMessages<TMessage>).flat(),
          );

          historyIds.current = new Set(
            converted.messages.map((m) => m.message.id),
          );
        }
      } catch (error) {
        console.error("Failed to load message history:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadedRef.current = true;

    if (!optionalThreadListItem()?.getState().remoteId) {
      setIsLoading(false);
      return;
    }

    loadHistory();
  }, [
    historyAdapter,
    storageFormatAdapter,
    toThreadMessages,
    runtimeRef,
    optionalThreadListItem,
  ]);

  const runStartRef = useRef<number | null>(null);
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stepBoundariesRef = useRef<number[]>([]);
  const wasRunningRef = useRef(false);
  const toolCallCountRef = useRef(0);

  useEffect(() => {
    const unsubscribe = runtimeRef.current.thread.subscribe(() => {
      const { isRunning } = runtimeRef.current.thread.getState();
      const wasRunning = wasRunningRef.current;
      wasRunningRef.current = isRunning;

      // Track step boundaries by content changes (more reliable than isRunning)
      if (runStartRef.current != null) {
        const lastMsg = runtimeRef.current.thread.getState().messages.at(-1);
        if (lastMsg?.role === "assistant") {
          const currentToolCallCount = lastMsg.content.filter(
            (p) => p.type === "tool-call",
          ).length;
          while (toolCallCountRef.current < currentToolCallCount) {
            stepBoundariesRef.current.push(Date.now() - runStartRef.current);
            toolCallCountRef.current++;
          }
        }
      }

      if (isRunning) {
        if (runStartRef.current == null) {
          runStartRef.current = Date.now();
          stepBoundariesRef.current = [];
          toolCallCountRef.current = 0;
        }
        // Cancel any pending persist — isRunning went back to true
        if (persistTimerRef.current) {
          clearTimeout(persistTimerRef.current);
          persistTimerRef.current = null;
        }
        return;
      }

      // Only act on the true→false transition
      if (!wasRunning) return;

      // Record step boundary offset (synchronous for accuracy)
      if (runStartRef.current != null) {
        stepBoundariesRef.current.push(Date.now() - runStartRef.current);
      }

      // Debounce: wait one macrotask so agentic step flickers are absorbed
      if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
      persistTimerRef.current = setTimeout(async () => {
        persistTimerRef.current = null;

        // Re-read latest state — may have changed since the timeout was scheduled
        const latest = runtimeRef.current.thread.getState();
        if (latest.isRunning) return; // was just a flicker

        // Derive durationMs from the last boundary (covers all steps)
        const boundaries = stepBoundariesRef.current;
        const durationMs =
          boundaries.length > 0 ? boundaries.at(-1) : undefined;

        // Fallback: if only 1 boundary but message has multiple steps, distribute evenly
        if (boundaries.length === 1 && durationMs != null) {
          const lastAssistant = latest.messages.findLast(
            (m) => m.role === "assistant",
          );
          if (lastAssistant) {
            const tcCount = lastAssistant.content.filter(
              (p) => p.type === "tool-call",
            ).length;
            if (tcCount > 0) {
              const totalSteps = tcCount + 1;
              const stepDur = durationMs / totalSteps;
              boundaries.length = 0;
              for (let i = 0; i < totalSteps; i++) {
                boundaries.push(Math.round((i + 1) * stepDur));
              }
            }
          }
        }

        // Build per-step timestamps when there are multiple steps
        const stepTimestamps =
          boundaries.length > 1
            ? boundaries.map((endMs, i) => ({
                start_ms: i === 0 ? 0 : boundaries[i - 1]!,
                end_ms: endMs,
              }))
            : undefined;

        runStartRef.current = null;
        stepBoundariesRef.current = [];

        const telemetryOptions = {
          ...(durationMs != null ? { durationMs } : undefined),
          ...(stepTimestamps != null ? { stepTimestamps } : undefined),
        };

        const { messages } = latest;
        let lastInnerMessageId: string | null = null;

        const getLastInnerId = (msgs: TMessage[]): string | null =>
          msgs.length > 0 ? storageFormatAdapter.getId(msgs.at(-1)!) : null;

        const toBatchItems = (msgs: TMessage[]) =>
          msgs.map((msg, idx) => ({
            parentId:
              idx === 0
                ? lastInnerMessageId
                : storageFormatAdapter.getId(msgs[idx - 1]!),
            message: msg,
          }));

        for (const message of messages) {
          const innerMessages = getExternalStoreMessages<TMessage>(message);

          const isReady =
            message.status === undefined ||
            message.status.type === "complete" ||
            message.status.type === "incomplete";

          if (!isReady) {
            lastInnerMessageId =
              getLastInnerId(innerMessages) ?? lastInnerMessageId;
            continue;
          }

          if (historyIds.current.has(message.id)) {
            if (durationMs !== undefined) {
              const formatAdapter =
                historyAdapter?.withFormat?.(storageFormatAdapter);
              let parentId = lastInnerMessageId;
              for (const innerMessage of innerMessages) {
                try {
                  await formatAdapter?.update?.(
                    { parentId, message: innerMessage },
                    storageFormatAdapter.getId(innerMessage),
                  );
                } catch {
                  // ignore update failures to avoid breaking the message processing loop
                }
                parentId = storageFormatAdapter.getId(innerMessage);
              }
            }
            lastInnerMessageId =
              getLastInnerId(innerMessages) ?? lastInnerMessageId;
            continue;
          }
          historyIds.current.add(message.id);

          const formatAdapter =
            historyAdapter?.withFormat?.(storageFormatAdapter);

          const batchItems = toBatchItems(innerMessages);
          for (const item of batchItems) {
            await formatAdapter?.append(item);
          }

          lastInnerMessageId =
            getLastInnerId(innerMessages) ?? lastInnerMessageId;

          formatAdapter?.reportTelemetry?.(batchItems, telemetryOptions);
        }
      }, 0);
    });

    return () => {
      unsubscribe();
      if (persistTimerRef.current) {
        clearTimeout(persistTimerRef.current);
        persistTimerRef.current = null;
      }
    };
  }, [historyAdapter, storageFormatAdapter, runtimeRef]);

  return isLoading;
};

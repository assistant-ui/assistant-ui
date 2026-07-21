"use client";

import type {
  AssistantRuntime,
  ThreadHistoryAdapter,
  ThreadMessage,
  MessageFormatAdapter,
  MessageFormatRepository,
  ExportedMessageRepository,
} from "@assistant-ui/core";
import { getExternalStoreMessages } from "@assistant-ui/core";
import { MessageRepository } from "@assistant-ui/core/internal";
import { useAui } from "@assistant-ui/store";
import {
  useRef,
  useEffect,
  useState,
  type RefObject,
  useCallback,
  useMemo,
} from "react";

export const toExportedMessageRepository = <TMessage>(
  toThreadMessages: (messages: TMessage[]) => ThreadMessage[],
  messages: MessageFormatRepository<TMessage>,
): ExportedMessageRepository => {
  const survivingIds = new Set<string>();
  const survivors = messages.messages.flatMap((m) => {
    const message = toThreadMessages([m.message])[0];
    if (!message) {
      console.warn("Skipping a stored message that could not be loaded.");
      return [];
    }
    if (m.parentId && !survivingIds.has(m.parentId)) return [];
    survivingIds.add(message.id);
    return [{ ...m, message }];
  });

  return {
    headId:
      messages.headId && survivingIds.has(messages.headId)
        ? messages.headId
        : null,
    messages: survivors,
  };
};

const isAwaitingToolApproval = (message: ThreadMessage) =>
  message.status?.type === "requires-action" &&
  message.status.reason === "tool-calls";

const snapshotExternalMessages = <TMessage>(
  messages: readonly ThreadMessage[],
) =>
  new Map<string, TMessage[]>(
    messages.map((message) => [
      message.id,
      [...getExternalStoreMessages<TMessage>(message)],
    ]),
  );

export const useExternalHistory = <TMessage>(
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
  const persistedInnerIds = useRef(new Set<string>());
  const deferredTelemetryIds = useRef(new Set<string>());
  const persistedExternalMessages = useRef(new Map<string, TMessage[]>());

  const onSetMessagesRef = useRef(onSetMessages);
  useEffect(() => {
    onSetMessagesRef.current = onSetMessages;
  });

  const formatAdapter = useMemo(() => {
    if (!historyAdapter) return undefined;
    if (!historyAdapter.withFormat) {
      throw new Error(
        "useAISDKRuntime: ThreadHistoryAdapter is missing the required `withFormat` method.",
      );
    }
    return historyAdapter.withFormat<TMessage, any>(storageFormatAdapter);
  }, [historyAdapter, storageFormatAdapter]);

  useEffect(() => {
    if (!formatAdapter || loadedRef.current) return;

    const loadHistory = async () => {
      setIsLoading(true);
      try {
        const repo = await formatAdapter.load();
        if (repo && repo.messages.length > 0) {
          for (const m of repo.messages) {
            persistedInnerIds.current.add(
              storageFormatAdapter.getId(m.message),
            );
          }
          const converted = toExportedMessageRepository(toThreadMessages, repo);
          runtimeRef.current.thread.import(converted);

          const tempRepo = new MessageRepository();
          tempRepo.import(converted);
          const messages = tempRepo.getMessages();

          onSetMessagesRef.current(
            messages.flatMap(getExternalStoreMessages<TMessage>),
          );

          historyIds.current = new Set();
          for (const m of converted.messages) {
            historyIds.current.add(m.message.id);
            if (isAwaitingToolApproval(m.message)) {
              deferredTelemetryIds.current.add(m.message.id);
            }
          }
          persistedExternalMessages.current =
            snapshotExternalMessages<TMessage>(
              converted.messages.map((m) => m.message),
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
    formatAdapter,
    toThreadMessages,
    runtimeRef,
    optionalThreadListItem,
    storageFormatAdapter,
  ]);

  const runStartRef = useRef<number | null>(null);
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const persistInFlightRef = useRef<Promise<void>>(Promise.resolve());
  const stepBoundariesRef = useRef<number[]>([]);
  const wasRunningRef = useRef(false);
  const toolCallCountRef = useRef(0);

  useEffect(() => {
    if (!formatAdapter) return;

    let disposed = false;
    const unsubscribe = runtimeRef.current.thread.subscribe(() => {
      const threadState = runtimeRef.current.thread.getState();
      const { isRunning } = threadState;
      const wasRunning = wasRunningRef.current;
      wasRunningRef.current = isRunning;

      // Track step boundaries by content changes (more reliable than isRunning)
      if (runStartRef.current != null) {
        const lastMsg = threadState.messages.at(-1);
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
      persistTimerRef.current = setTimeout(() => {
        persistTimerRef.current = null;

        const latest = runtimeRef.current.thread.getState();
        if (latest.isRunning) return;

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

        persistInFlightRef.current = persistInFlightRef.current
          .then(async () => {
            if (disposed) return;

            const changedRunMessageIds = new Set<string>();
            for (const message of latest.messages) {
              const externalMessages =
                getExternalStoreMessages<TMessage>(message);
              const previous = persistedExternalMessages.current.get(
                message.id,
              );
              if (
                previous === undefined ||
                previous.length !== externalMessages.length ||
                externalMessages.some((item, index) => item !== previous[index])
              ) {
                changedRunMessageIds.add(message.id);
              }
            }

            const { messages } = latest;
            let lastInnerMessageId: string | null = null;
            const failedUpdateIds = new Set<string>();

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

              const isTerminal =
                message.status === undefined ||
                message.status.type === "complete" ||
                message.status.type === "incomplete";
              const isAwaitingToolCalls = isAwaitingToolApproval(message);
              // A paused message's later content can only reach storage via update, so it is persisted early only when the adapter supports update.
              const isReady =
                isTerminal ||
                (isAwaitingToolCalls && formatAdapter.update !== undefined);

              if (!isReady) {
                lastInnerMessageId =
                  getLastInnerId(innerMessages) ?? lastInnerMessageId;
                continue;
              }

              const isPersistedMessage = historyIds.current.has(message.id);
              if (isPersistedMessage && !changedRunMessageIds.has(message.id)) {
                lastInnerMessageId =
                  getLastInnerId(innerMessages) ?? lastInnerMessageId;
                continue;
              }
              if (!isPersistedMessage) {
                historyIds.current.add(message.id);
                deferredTelemetryIds.current.add(message.id);
              }

              const batchItems = toBatchItems(innerMessages);
              for (const item of batchItems) {
                const innerId = storageFormatAdapter.getId(item.message);
                if (!persistedInnerIds.current.has(innerId)) {
                  await formatAdapter.append(item);
                  persistedInnerIds.current.add(innerId);
                } else if (durationMs !== undefined) {
                  try {
                    await formatAdapter.update?.(item, innerId);
                  } catch {
                    // A failed update drops the message from the refreshed baseline so it retries on the next run stop.
                    failedUpdateIds.add(message.id);
                  }
                }
              }

              lastInnerMessageId =
                getLastInnerId(innerMessages) ?? lastInnerMessageId;

              if (deferredTelemetryIds.current.has(message.id) && isTerminal) {
                deferredTelemetryIds.current.delete(message.id);
                formatAdapter.reportTelemetry?.(batchItems, telemetryOptions);
              }
            }

            const nextSnapshot = snapshotExternalMessages<TMessage>(
              latest.messages,
            );
            for (const id of failedUpdateIds) {
              nextSnapshot.delete(id);
            }
            persistedExternalMessages.current = nextSnapshot;
          })
          .catch((error) => {
            console.error("Failed to persist message history:", error);
          });
      }, 0);
    });

    return () => {
      disposed = true;
      unsubscribe();
      if (persistTimerRef.current) {
        clearTimeout(persistTimerRef.current);
        persistTimerRef.current = null;
      }
    };
  }, [formatAdapter, storageFormatAdapter, runtimeRef]);

  const deleteMessage = useCallback(
    async (messageId: string) => {
      if (!formatAdapter?.delete) return;

      const messages = runtimeRef.current.thread.getState().messages;
      const messageIndex = messages.findIndex((m) => m.id === messageId);
      if (messageIndex === -1) return;

      const previousInnerMessages = messages
        .slice(0, messageIndex)
        .flatMap(getExternalStoreMessages<TMessage>);
      let parentId = previousInnerMessages.at(-1)
        ? storageFormatAdapter.getId(previousInnerMessages.at(-1)!)
        : null;
      const itemsToDelete = getExternalStoreMessages<TMessage>(
        messages[messageIndex]!,
      ).map((message) => {
        const item = { parentId, message };
        parentId = storageFormatAdapter.getId(message);
        return item;
      });

      await formatAdapter.delete(itemsToDelete);

      historyIds.current.delete(messageId);
      deferredTelemetryIds.current.delete(messageId);
      persistedExternalMessages.current.delete(messageId);
      for (const item of itemsToDelete) {
        persistedInnerIds.current.delete(
          storageFormatAdapter.getId(item.message),
        );
      }
    },
    [formatAdapter, runtimeRef, storageFormatAdapter],
  );

  return { isLoading, deleteMessage };
};

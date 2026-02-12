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

  const onSetMessagesRef = useRef<typeof onSetMessages>(() => onSetMessages);
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

    if (!loadedRef.current) {
      loadedRef.current = true;
      if (!optionalThreadListItem()?.getState().remoteId) {
        setIsLoading(false);
        return;
      }

      loadHistory();
    }
  }, [
    historyAdapter,
    storageFormatAdapter,
    toThreadMessages,
    runtimeRef,
    optionalThreadListItem,
  ]);

  const runStartRef = useRef<number | null>(null);

  useEffect(() => {
    return runtimeRef.current.thread.subscribe(async () => {
      const { messages, isRunning } = runtimeRef.current.thread.getState();

      if (isRunning) {
        if (runStartRef.current == null) {
          runStartRef.current = Date.now();
        }
        return;
      }

      const durationMs =
        runStartRef.current != null
          ? Date.now() - runStartRef.current
          : undefined;
      runStartRef.current = null;

      let lastInnerMessageId: string | null = null;

      for (let i = 0; i < messages.length; i++) {
        const message = messages[i]!;
        const innerMessages = getExternalStoreMessages<TMessage>(message);

        const isReady =
          message.status === undefined ||
          message.status.type === "complete" ||
          message.status.type === "incomplete";

        if (!isReady) {
          if (innerMessages.length > 0) {
            lastInnerMessageId = storageFormatAdapter.getId(
              innerMessages[innerMessages.length - 1]!,
            );
          }
          continue;
        }

        if (historyIds.current.has(message.id)) {
          const formatAdapter =
            historyAdapter?.withFormat?.(storageFormatAdapter);
          for (const innerMessage of innerMessages) {
            const localId = storageFormatAdapter.getId(innerMessage);
            await formatAdapter?.update?.(
              { parentId: lastInnerMessageId, message: innerMessage },
              localId,
            );
          }
          if (innerMessages.length > 0) {
            lastInnerMessageId = storageFormatAdapter.getId(
              innerMessages[innerMessages.length - 1]!,
            );
          }
          continue;
        }
        historyIds.current.add(message.id);

        const formatAdapter =
          historyAdapter?.withFormat?.(storageFormatAdapter);

        const batchItems: { parentId: string | null; message: TMessage }[] = [];
        let parentId = lastInnerMessageId;
        for (const innerMessage of innerMessages) {
          const item = { parentId, message: innerMessage };
          batchItems.push(item);
          await formatAdapter?.append(item);
          parentId = storageFormatAdapter.getId(innerMessage);
        }

        if (innerMessages.length > 0) {
          lastInnerMessageId = storageFormatAdapter.getId(
            innerMessages[innerMessages.length - 1]!,
          );
        }

        formatAdapter?.reportTelemetry?.(batchItems, {
          ...(durationMs != null ? { durationMs } : undefined),
        });
      }
    });
  }, [historyAdapter, storageFormatAdapter, runtimeRef]);

  return isLoading;
};

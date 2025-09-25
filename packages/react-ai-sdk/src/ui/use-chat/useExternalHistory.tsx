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
} from "@assistant-ui/react";
import { useRef, useEffect, useState, RefObject } from "react";

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
  const [isLoading, setIsLoading] = useState(true);
  const historyIds = useRef(new Set<string>());

  const onSetMessagesRef = useRef<typeof onSetMessages>(() => onSetMessages);
  useEffect(() => {
    onSetMessagesRef.current = onSetMessages;
  });

  // Load messages from history adapter on mount
  useEffect(() => {
    if (!historyAdapter || loadedRef.current) return;

    const loadHistory = async () => {
      setIsLoading(true);
      try {
        const formatAdapter = historyAdapter.withFormat?.(storageFormatAdapter);
        if (formatAdapter) {
          // Use withFormat adapter if available
          const repo = await formatAdapter.load();
          if (repo && repo.messages.length > 0) {
            const converted = toExportedMessageRepository(
              toThreadMessages,
              repo,
            );
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
        } else {
          // Use base adapter without withFormat
          const repo = await historyAdapter.load();
          if (repo && repo.messages.length > 0) {
            runtimeRef.current.thread.import(repo);

            const tempRepo = new MessageRepository();
            tempRepo.import(repo);
            const messages = tempRepo.getMessages();

            onSetMessagesRef.current(
              messages.map(getExternalStoreMessages<TMessage>).flat(),
            );

            historyIds.current = new Set(
              repo.messages.map((m) => m.message.id),
            );
          }
        }
      } catch (error) {
        console.error("Failed to load message history:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (!loadedRef.current) {
      loadedRef.current = true;
      loadHistory();
    }
  }, [historyAdapter, storageFormatAdapter, toThreadMessages, runtimeRef]);

  useEffect(() => {
    return runtimeRef.current.thread.subscribe(async () => {
      const { messages, isRunning } = runtimeRef.current.thread.getState();
      if (isRunning) return;

      for (let i = 0; i < messages.length; i++) {
        const message = messages[i]!;
        if (
          message.status === undefined ||
          message.status.type === "complete" ||
          message.status.type === "incomplete"
        ) {
          if (historyIds.current.has(message.id)) continue;
          historyIds.current.add(message.id);

          const parentId = i > 0 ? messages[i - 1]!.id : null;
          const formatAdapter =
            historyAdapter?.withFormat?.(storageFormatAdapter);
          if (formatAdapter) {
            await formatAdapter.append({
              parentId,
              message: getExternalStoreMessages<TMessage>(message)[0]!,
            });
          } else if (historyAdapter) {
            await historyAdapter.append({
              parentId,
              message,
            });
          }
        }
      }
    });
  }, [historyAdapter, storageFormatAdapter, runtimeRef]);

  return isLoading;
};

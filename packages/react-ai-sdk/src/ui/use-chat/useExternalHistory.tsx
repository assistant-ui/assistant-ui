"use client";

import {
  AssistantRuntime,
  ThreadHistoryAdapter,
  ThreadMessage,
  MessageFormatAdapter,
  getExternalStoreMessages,
  MessageFormatRepository,
  ExportedMessageRepository,
} from "@assistant-ui/react";
import { useRef, useEffect } from "react";

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
  runtime: AssistantRuntime,
  historyAdapter: ThreadHistoryAdapter | undefined,
  toThreadMessages: (messages: TMessage[]) => ThreadMessage[],
  storageFormatAdapter: MessageFormatAdapter<TMessage, any>,
  onSetMessages: (messages: TMessage[]) => void,
) => {
  const isLoadingRef = useRef(false);
  const historyIds = useRef(new Set<string>());

  const onSetMessagesRef = useRef(onSetMessages);
  useEffect(() => {
    onSetMessagesRef.current = onSetMessages;
  });

  // Load messages from history adapter on mount
  useEffect(() => {
    if (!historyAdapter || isLoadingRef.current) return;

    const loadHistory = async () => {
      isLoadingRef.current = true;
      try {
        const repo = await historyAdapter
          .withFormat?.(storageFormatAdapter)
          .load();
        if (repo && repo.messages.length > 0) {
          const converted = toExportedMessageRepository(toThreadMessages, repo);
          runtime.thread.import(converted);
          onSetMessagesRef.current(
            runtime.thread
              .getState()
              .messages.map(getExternalStoreMessages<TMessage>)
              .flat(),
          );
          historyIds.current = new Set(
            converted.messages.map((m) => m.message.id),
          );
        }
      } catch (error) {
        console.error("Failed to load message history:", error);
      } finally {
        isLoadingRef.current = false;
      }
    };

    loadHistory();
  }, [runtime, historyAdapter, storageFormatAdapter, toThreadMessages]);

  useEffect(() => {
    return runtime.thread.subscribe(() => {
      const { messages, isRunning } = runtime.thread.getState();
      if (isRunning) return;
      for (let i = 0; i < messages.length; i++) {
        const message = messages[i]!;
        if (
          message.status?.type === "complete" ||
          message.status?.type === "incomplete"
        ) {
          if (historyIds.current.has(message.id)) return;
          historyIds.current.add(message.id);

          const parentId = i > 0 ? messages[i - 1]!.id : null;
          historyAdapter?.withFormat?.(storageFormatAdapter).append({
            parentId,
            message: getExternalStoreMessages<TMessage>(message)[0]!,
          });
        }
      }
    });
  }, [runtime]);
};

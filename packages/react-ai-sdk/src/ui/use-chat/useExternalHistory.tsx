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
  useAssistantApi,
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

  const api = useAssistantApi();
  const optionalThreadListItem = useCallback(
    () => (api.threadListItem.source ? api.threadListItem() : null),
    [api],
  );

  const [isLoading, setIsLoading] = useState(
    // we only load history if there is a remote id
    () => optionalThreadListItem()?.getState().remoteId !== undefined,
  );

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
        const repo = await historyAdapter
          .withFormat?.(storageFormatAdapter)
          .load();
        if (repo && repo.messages.length > 0) {
          // Convert to ThreadMessages and import (enables branching)
          const converted = toExportedMessageRepository(toThreadMessages, repo);
          runtimeRef.current.thread.import(converted);

          // Use MessageRepository to compute the correct branch
          const tempRepo = new MessageRepository();
          tempRepo.import(converted);
          const branchedMessages = tempRepo.getMessages();

          // Extract original UIMessages - metadata is preserved via symbolInnerMessage
          const uiMessages = branchedMessages.map(
            (threadMsg) => getExternalStoreMessages<TMessage>(threadMsg)[0]!,
          );

          onSetMessagesRef.current(uiMessages);

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
    api,
    historyAdapter,
    storageFormatAdapter,
    toThreadMessages,
    runtimeRef,
    optionalThreadListItem,
  ]);

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
          const originalUIMessage =
            getExternalStoreMessages<TMessage>(message)[0]!;

          // Write durations to UIMessage.metadata for persistence
          if (
            message.role === "assistant" &&
            message.metadata?.custom?.["reasoningDurations"]
          ) {
            const durations = message.metadata.custom[
              "reasoningDurations"
            ] as Record<string, number>;

            // Enhance UIMessage with metadata using AI SDK v5's native field
            const enhancedMessage: TMessage = {
              ...originalUIMessage,
              metadata: {
                ...(originalUIMessage as any).metadata,
                reasoningDurations: durations,
              },
            } as TMessage;

            await historyAdapter?.withFormat?.(storageFormatAdapter).append({
              parentId,
              message: enhancedMessage,
            });
          } else {
            await historyAdapter?.withFormat?.(storageFormatAdapter).append({
              parentId,
              message: originalUIMessage,
            });
          }
        }
      }
    });
  }, [historyAdapter, storageFormatAdapter, runtimeRef]);

  return isLoading;
};

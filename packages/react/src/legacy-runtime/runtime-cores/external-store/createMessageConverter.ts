"use client";
import type { ThreadMessage } from "@assistant-ui/core";
import { ThreadState } from "../../runtime";
import { useAui, useAuiState } from "@assistant-ui/store";
import {
  useExternalMessageConverter,
  convertExternalMessages,
} from "./external-message-converter";
import { getExternalStoreMessages } from "./getExternalStoreMessage";

export const createMessageConverter = <T extends object>(
  callback: useExternalMessageConverter.Callback<T>,
) => {
  const result = {
    useThreadMessages: ({
      messages,
      isRunning,
      joinStrategy,
      metadata,
    }: {
      messages: T[];
      isRunning: boolean;
      joinStrategy?: "concat-content" | "none" | undefined;
      metadata?: useExternalMessageConverter.Metadata;
    }) => {
      return useExternalMessageConverter<T>({
        callback,
        messages,
        isRunning,
        joinStrategy,
        metadata,
      });
    },
    toThreadMessages: (
      messages: T[],
      isRunning = false,
      metadata: useExternalMessageConverter.Metadata = {},
    ) => {
      return convertExternalMessages(messages, callback, isRunning, metadata);
    },
    toOriginalMessages: (
      input: ThreadState | ThreadMessage | ThreadMessage["content"][number],
    ) => {
      const messages = getExternalStoreMessages(input);
      if (messages.length === 0) throw new Error("No original messages found");
      return messages;
    },
    toOriginalMessage: (
      input: ThreadState | ThreadMessage | ThreadMessage["content"][number],
    ) => {
      const messages = result.toOriginalMessages(input);
      return messages[0]!;
    },
    useOriginalMessage: () => {
      const messageMessages = result.useOriginalMessages();
      const first = messageMessages[0]!;
      return first;
    },
    useOriginalMessages: () => {
      const aui = useAui();
      const partMessages = useAuiState((s) => {
        if (aui.part.source) return getExternalStoreMessages(s.part);
        return undefined;
      });

      const messageMessages = useAuiState<T[]>((s) =>
        getExternalStoreMessages(s.message),
      );

      const messages = partMessages ?? messageMessages;
      if (messages.length === 0) throw new Error("No original messages found");
      return messages;
    },
  };

  return result;
};

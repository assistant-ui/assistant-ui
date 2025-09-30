"use client";
import { ThreadState } from "../../runtime";
import { useAssistantApi, useAssistantState } from "../../../context";
import { ThreadMessage } from "../../../types";
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
      const api = useAssistantApi();
      const partMessages = useAssistantState((s) => {
        if (api.part.source) return getExternalStoreMessages(s.part);
        return undefined;
      });

      const messageMessages = useAssistantState<T[]>(({ message }) =>
        getExternalStoreMessages(message),
      );

      const messages = partMessages ?? messageMessages;
      if (messages.length === 0) throw new Error("No original messages found");
      return messages;
    },
  };

  return result;
};

"use client";

import { type FC, type PropsWithChildren, useEffect, useState } from "react";
import { StoreApi, create } from "zustand";
import type {
  CoreUserContentPart,
  ThreadMessage,
} from "../../types/AssistantTypes";
import { getMessageText } from "../../utils/getMessageText";
import { MessageContext } from "../react/MessageContext";
import type { MessageContextValue } from "../react/MessageContext";
import { useThreadContext } from "../react/ThreadContext";
import type { MessageState } from "../stores/Message";
import { makeEditComposerStore } from "../stores/EditComposer";
import { makeMessageUtilsStore } from "../stores/MessageUtils";
import { ThreadMessagesState } from "../stores/ThreadMessages";

type MessageProviderProps = PropsWithChildren<{
  messageIndex: number;
}>;

const getIsLast = (messages: ThreadMessagesState, message: ThreadMessage) => {
  return messages[messages.length - 1]?.id === message.id;
};

const syncMessage = (
  messages: ThreadMessagesState,
  getBranches: (messageId: string) => readonly string[],
  useMessage: MessageContextValue["useMessage"],
  messageIndex: number,
) => {
  const parentId = messages[messageIndex - 1]?.id ?? null;
  const message = messages[messageIndex];
  if (!message) return;

  const isLast = getIsLast(messages, message);
  const branches = getBranches(message.id);

  // if the message is the same, don't update
  const currentState = useMessage.getState();
  if (
    currentState.message === message &&
    currentState.parentId === parentId &&
    currentState.branches === branches &&
    currentState.isLast === isLast
  )
    return;

  // sync useMessage
  (useMessage as unknown as StoreApi<MessageState>).setState({
    message,
    parentId,
    branches,
    isLast,
  });
};

const useMessageContext = (messageIndex: number) => {
  const { useThreadMessages, useThreadActions } = useThreadContext();

  const [context] = useState<MessageContextValue>(() => {
    const useMessage = create<MessageState>(() => ({}) as MessageState);
    const useMessageUtils = makeMessageUtilsStore();
    const useEditComposer = makeEditComposerStore({
      onEdit: () => {
        const message = useMessage.getState().message;
        if (message.role !== "user")
          throw new Error(
            "Tried to edit a non-user message. Editing is only supported for user messages. This is likely an internal bug in assistant-ui.",
          );

        const text = getMessageText(message);

        return text;
      },
      onSend: (text) => {
        const { message, parentId } = useMessage.getState();
        if (message.role !== "user")
          throw new Error(
            "Tried to edit a non-user message. Editing is only supported for user messages. This is likely an internal bug in assistant-ui.",
          );

        const nonTextParts = message.content.filter(
          (part): part is CoreUserContentPart =>
            part.type !== "text" && part.type !== "ui",
        );
        useThreadActions.getState().append({
          parentId,
          role: "user",
          content: [{ type: "text", text }, ...nonTextParts],
        });
      },
    });

    syncMessage(
      useThreadMessages.getState(),
      useThreadActions.getState().getBranches,
      useMessage,
      messageIndex,
    );

    return { useMessage, useMessageUtils, useEditComposer };
  });

  useEffect(() => {
    return useThreadMessages.subscribe((thread) => {
      syncMessage(
        thread,
        useThreadActions.getState().getBranches,
        context.useMessage,
        messageIndex,
      );
    });
  }, [useThreadMessages, useThreadActions, context, messageIndex]);

  return context;
};

export const MessageProvider: FC<MessageProviderProps> = ({
  messageIndex,
  children,
}) => {
  const context = useMessageContext(messageIndex);

  return (
    <MessageContext.Provider value={context}>
      {children}
    </MessageContext.Provider>
  );
};

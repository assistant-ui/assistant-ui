"use client";

import { type FC, type PropsWithChildren, useEffect, useState } from "react";
import { StoreApi, create } from "zustand";
import type {
  AppendContentPart,
  ThreadMessage,
} from "../../types/AssistantTypes";
import { getMessageText } from "../../utils/getMessageText";
import { MessageContext } from "../react/MessageContext";
import type { MessageContextValue } from "../react/MessageContext";
import { useThreadContext } from "../react/ThreadContext";
import type { MessageState } from "../stores/Message";
import { makeEditComposerStore } from "../stores/EditComposer";
import type { ThreadState } from "../stores/Thread";
import { makeMessageUtilsStore } from "../stores/MessageUtils";

type MessageProviderProps = PropsWithChildren<{
  messageIndex: number;
}>;

const getIsLast = (thread: ThreadState, message: ThreadMessage) => {
  return thread.messages[thread.messages.length - 1]?.id === message.id;
};

const syncMessage = (
  thread: ThreadState,
  getBranches: (messageId: string) => readonly string[],
  useMessage: MessageContextValue["useMessage"],
  messageIndex: number,
) => {
  const parentId = thread.messages[messageIndex - 1]?.id ?? null;
  const message = thread.messages[messageIndex];
  if (!message) return;

  const isLast = getIsLast(thread, message);
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
  const { useThread, useThreadActions } = useThreadContext();

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
          (part): part is AppendContentPart =>
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
      useThread.getState(),
      useThreadActions.getState().getBranches,
      useMessage,
      messageIndex,
    );

    return { useMessage, useMessageUtils, useEditComposer };
  });

  useEffect(() => {
    return useThread.subscribe((thread) => {
      syncMessage(
        thread,
        useThreadActions.getState().getBranches,
        context.useMessage,
        messageIndex,
      );
    });
  }, [useThread, useThreadActions, context, messageIndex]);

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

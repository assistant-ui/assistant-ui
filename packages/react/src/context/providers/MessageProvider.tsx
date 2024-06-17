"use client";

import { type FC, type PropsWithChildren, useEffect, useState } from "react";
import { create } from "zustand";
import type {
  AppendContentPart,
  ThreadMessage,
} from "../../utils/AssistantTypes";
import { getMessageText } from "../../utils/getMessageText";
import { MessageContext } from "../MessageContext";
import type { MessageContextValue } from "../MessageContext";
import { useThreadContext } from "../ThreadContext";
import type { MessageState } from "../stores/Message";
import { makeEditComposerStore } from "../stores/MessageComposer";
import type { ThreadState } from "../stores/Thread";

type MessageProviderProps = PropsWithChildren<{
  messageIndex: number;
}>;

const getIsLast = (thread: ThreadState, message: ThreadMessage) => {
  return thread.messages[thread.messages.length - 1]?.id === message.id;
};

const syncMessage = (
  thread: ThreadState,
  useMessage: MessageContextValue["useMessage"],
  messageIndex: number,
) => {
  const parentId = thread.messages[messageIndex - 1]?.id ?? null;
  const message = thread.messages[messageIndex];
  if (!message) return;

  const isLast = getIsLast(thread, message);
  const branches = thread.getBranches(message.id);

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
  useMessage.setState({
    message,
    parentId,
    branches,
    isLast,
  });
};

const useMessageContext = (messageIndex: number) => {
  const { useThread } = useThreadContext();

  const [context] = useState<MessageContextValue>(() => {
    const useMessage = create<MessageState>((set) => ({
      message: null as unknown as ThreadMessage,
      parentId: null,
      branches: [],
      isLast: false,
      inProgressIndicator: null,
      isCopied: false,
      isHovering: false,
      setInProgressIndicator: (value) => {
        set({ inProgressIndicator: value });
      },
      setIsCopied: (value) => {
        set({ isCopied: value });
      },
      setIsHovering: (value) => {
        set({ isHovering: value });
      },
    }));

    const useComposer = makeEditComposerStore({
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
        useThread.getState().append({
          parentId,
          content: [{ type: "text", text }, ...nonTextParts],
        });
      },
    });

    syncMessage(useThread.getState(), useMessage, messageIndex);

    return { useMessage, useComposer };
  });

  useEffect(() => {
    return useThread.subscribe((thread) => {
      syncMessage(thread, context.useMessage, messageIndex);
    });
  }, [context, useThread, messageIndex]);

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

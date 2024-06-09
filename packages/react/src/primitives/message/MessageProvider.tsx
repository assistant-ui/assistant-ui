"use client";

import { type FC, type PropsWithChildren, useMemo, useState } from "react";
import { create } from "zustand";
import { useAssistantContext } from "../../context/AssistantContext";
import { MessageContext } from "../../context/MessageContext";
import type { MessageContextValue } from "../../context/MessageContext";
import type { MessageState } from "../../context/stores/Message";
import { makeMessageComposerStore } from "../../context/stores/MessageComposer";
import type { ThreadState } from "../../context/stores/Thread";
import type {
  AppendContentPart,
  ThreadMessage,
} from "../../utils/AssistantTypes";
import { getMessageText } from "../../utils/getMessageText";

type MessageProviderProps = PropsWithChildren<{
  message: ThreadMessage;
  parentId: string | null;
}>;

const getIsLast = (thread: ThreadState, message: ThreadMessage) => {
  return thread.messages[thread.messages.length - 1]?.id === message.id;
};

const useMessageContext = () => {
  const { useThread } = useAssistantContext();
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

    const useComposer = makeMessageComposerStore({
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

    return { useMessage, useComposer };
  });
  return context;
};

export const MessageProvider: FC<MessageProviderProps> = ({
  message,
  parentId,
  children,
}) => {
  const { useThread } = useAssistantContext();
  const context = useMessageContext();

  const isLast = useThread((thread) => getIsLast(thread, message));
  const branches = useThread((thread) => thread.getBranches(message.id));

  // sync useMessage
  useMemo(() => {
    context.useMessage.setState({
      message,
      parentId,
      branches,
      isLast,
    });
  }, [context, message, parentId, branches, isLast]);

  return (
    <MessageContext.Provider value={context}>
      {children}
    </MessageContext.Provider>
  );
};

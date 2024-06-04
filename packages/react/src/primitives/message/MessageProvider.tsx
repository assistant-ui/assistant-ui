"use client";

import { type FC, type PropsWithChildren, useMemo, useState } from "react";
import { create } from "zustand";
import { useAssistantContext } from "../../utils/context/AssistantContext";
import { getMessageText } from "../../utils/context/getMessageText";
import type {
  AppendContentPart,
  ThreadMessage,
  ThreadState,
} from "../../utils/context/stores/AssistantTypes";
import { makeMessageComposerStore } from "../../utils/context/stores/ComposerStore";
import type {
  MessageState,
  MessageStore,
} from "../../utils/context/stores/MessageTypes";
import { MessageContext } from "../../utils/context/useMessageContext";

type MessageProviderProps = PropsWithChildren<{
  message: ThreadMessage;
  parentId: string | null;
}>;

const getIsLast = (thread: ThreadState, message: ThreadMessage) => {
  return thread.messages[thread.messages.length - 1]?.id === message.id;
};

const useMessageContext = () => {
  const { useThread } = useAssistantContext();
  const [context] = useState<MessageStore>(() => {
    const useMessage = create<MessageState>(() => ({
      message: null as unknown as ThreadMessage,
      parentId: null,
      branches: [],
      isLast: false,
      isCopied: false,
      isHovering: false,
      setIsCopied: () => {},
      setIsHovering: () => {},
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

  // TODO move to useMessageContext
  const [isCopied, setIsCopied] = useState(false);
  const [isHovering, setIsHovering] = useState(false);

  // sync useMessage
  useMemo(() => {
    context.useMessage.setState(
      {
        message,
        parentId,
        branches,
        isLast,
        isCopied,
        isHovering,
        setIsCopied,
        setIsHovering,
      } satisfies MessageState,
      true,
    );
  }, [context, message, parentId, branches, isLast, isCopied, isHovering]);

  return (
    <MessageContext.Provider value={context}>
      {children}
    </MessageContext.Provider>
  );
};

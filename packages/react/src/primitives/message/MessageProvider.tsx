"use client";

import { type FC, type ReactNode, useMemo, useState } from "react";
import { create } from "zustand";
import { useAssistantContext } from "../../utils/context/AssistantContext";
import type {
  ThreadMessage,
  ThreadState,
} from "../../utils/context/stores/AssistantTypes";
import { makeMessageComposerStore } from "../../utils/context/stores/ComposerStore";
import type {
  MessageState,
  MessageStore,
} from "../../utils/context/stores/MessageTypes";
import { MessageContext } from "../../utils/context/useMessageContext";

type MessageProviderProps = {
  children?: ReactNode;
  message: ThreadMessage;
};

const getIsLast = (thread: ThreadState, message: ThreadMessage) => {
  return thread.messages[thread.messages.length - 1]?.id === message.id;
};

const useMessageContext = () => {
  const { useThread } = useAssistantContext();
  const [context] = useState<MessageStore>(() => {
    const useMessage = create<MessageState>(() => ({
      message: null as unknown as ThreadMessage,
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
          throw new Error("Editing is only supported for user messages");

        // TODO image/ui support
        if (message.content[0]?.type !== "text")
          throw new Error("Editing is only supported for text-only messages");

        return message.content[0].text;
      },
      onSend: (text) => {
        const message = useMessage.getState().message;
        useThread.getState().append({
          parentId: message.parentId,
          content: [{ type: "text", text }],
        });
      },
    });

    return { useMessage, useComposer };
  });
  return context;
};

export const MessageProvider: FC<MessageProviderProps> = ({
  message,
  children,
}) => {
  const { useThread } = useAssistantContext();
  const context = useMessageContext();

  const isLast = useThread((thread) => getIsLast(thread, message));
  const branches = useThread((thread) => thread.getBranches(message.id));

  const [isCopied, setIsCopied] = useState(false);
  const [isHovering, setIsHovering] = useState(false);

  // sync useMessage
  useMemo(() => {
    context.useMessage.setState(
      {
        message,
        branches,
        isLast,
        isCopied,
        isHovering,
        setIsCopied,
        setIsHovering,
      },
      true,
    );
  }, [context, message, branches, isLast, isCopied, isHovering]);

  return (
    <MessageContext.Provider value={context}>
      {children}
    </MessageContext.Provider>
  );
};

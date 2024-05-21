"use client";

import { type FC, useMemo, useState } from "react";
import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";
import { useAssistantContext } from "../../utils/context/AssistantContext";
import type {
  ThreadMessage,
  ThreadState,
} from "../../utils/context/AssistantTypes";
import type { ComposerState } from "../../utils/context/ComposerTypes";
import {
  MessageContext,
  type MessageState,
  type MessageStore,
} from "../../utils/context/MessageContext";
import {
  UPCOMING_MESSAGE_ID,
  hasUpcomingMessage,
} from "../../vercel/useVercelAIBranches";

type MessageProviderProps = {
  children?: React.ReactNode;
  message: ThreadMessage;
};

const getIsLast = (thread: ThreadState, message: ThreadMessage) => {
  const hasUpcoming = hasUpcomingMessage(thread);
  return hasUpcoming
    ? message.id === UPCOMING_MESSAGE_ID
    : thread.messages[thread.messages.length - 1]?.id === message.id;
};

const useMessageContext = () => {
  const { useBranchObserver } = useAssistantContext();
  const [context] = useState<MessageStore>(() => {
    const useMessage = create<MessageState>(() => ({
      message: null as unknown as ThreadMessage,
      isLast: false,
      isCopied: false,
      isHovering: false,
      setIsCopied: () => {},
      setIsHovering: () => {},
      branchState: {
        branchId: 0,
        branchCount: 0,
      },
    }));

    const useComposer = create<ComposerState>((set, get) => ({
      isEditing: false,
      canCancel: true,
      edit: () => {
        const message = useMessage.getState().message;
        if (message.role !== "user")
          throw new Error("Editing is only supported for user messages");

        // TODO image/ui support
        if (message.content[0]?.type !== "text")
          throw new Error("Editing is only supported for text-only messages");

        return set({
          isEditing: true,
          value: message.content[0].text,
        });
      },
      cancel: () => set({ isEditing: false }),
      send: () => {
        const message = useMessage.getState().message;
        if (message.role !== "user")
          throw new Error("Editing is only supported for user messages");
        useBranchObserver.getState().editAt(message, {
          role: "user",
          content: [{ type: "text", text: get().value }],
        });
        set({ isEditing: false });
      },
      value: "",
      setValue: (value) => set({ value }),
    }));

    return { useMessage, useComposer };
  });
  return context;
};

export const MessageProvider: FC<MessageProviderProps> = ({
  message,
  children,
}) => {
  const { useThread, useBranchObserver } = useAssistantContext();
  const context = useMessageContext();

  const branchState = useBranchObserver(
    useShallow((b) => b.getBranchState(message)),
  );
  const isLast = useThread((thread) => getIsLast(thread, message));

  const [isCopied, setIsCopied] = useState(false);
  const [isHovering, setIsHovering] = useState(false);

  // sync useMessage
  useMemo(() => {
    context.useMessage.setState(
      {
        message,
        isLast,
        isCopied,
        isHovering,
        setIsCopied,
        setIsHovering,
        branchState,
      },
      true,
    );
  }, [context, message, isLast, isCopied, isHovering, branchState]);

  return (
    <MessageContext.Provider value={context}>
      {children}
    </MessageContext.Provider>
  );
};

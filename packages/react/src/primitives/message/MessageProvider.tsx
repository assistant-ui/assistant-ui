"use client";

import type { Message } from "ai";
import { type FC, useMemo, useState } from "react";
import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";
import {
  type ThreadState,
  useAssistantContext,
} from "../../utils/context/AssistantContext";
import type { ComposerState } from "../../utils/context/ComposerState";
import {
  MessageContext,
  type MessageState,
  type MessageStore,
} from "../../utils/context/MessageContext";
import {
  UPCOMING_MESSAGE_ID,
  hasUpcomingMessage,
} from "../../utils/hooks/useBranches";

type MessageProviderProps = {
  children?: React.ReactNode;
  message: Message;
};

const getIsLast = (thread: ThreadState, message: Message) => {
  const hasUpcoming = hasUpcomingMessage(thread);
  return hasUpcoming
    ? message.id === UPCOMING_MESSAGE_ID
    : thread.messages[thread.messages.length - 1]?.id === message.id;
};

const useMessageContext = () => {
  const { useBranchObserver } = useAssistantContext();
  const [context] = useState<MessageStore>(() => {
    const useMessage = create<MessageState>(() => ({
      message: null as unknown as Message,
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
      edit: () =>
        set({
          isEditing: true,
          value: useMessage.getState().message.content,
        }),
      cancel: () => set({ isEditing: false }),
      send: () => {
        const message = useMessage.getState().message;
        useBranchObserver.getState().editAt(message, {
          ...message,
          id: undefined as unknown as string, // remove id to create a new message
          content: get().value,
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

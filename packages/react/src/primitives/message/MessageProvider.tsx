"use client";

import { type FC, useMemo, useState } from "react";
import type { Message } from "ai";
import {
  MessageContextProvider,
  type MessageEditState,
} from "../../utils/context/MessageContext";
import { useThreadContext } from "../../utils/context/ThreadContext";

type MessageProviderProps = {
  children?: React.ReactNode;
  message: Message;
};

export const MessageProvider: FC<MessageProviderProps> = ({
  message,
  children,
}) => {
  const getBranchState = useThreadContext(
    "Message.Provider",
    (s) => s.chat.getBranchState,
  );
  const [editState, setEditState] = useState<MessageEditState>({
    isEditing: false,
  });

  const [isCopied, setIsCopied] = useState(false);
  const [isHovering, setIsHovering] = useState(false);

  const branchState = useMemo(
    () => getBranchState(message),
    [getBranchState, message],
  );

  return (
    <MessageContextProvider
      message={message}
      editState={editState}
      setEditState={setEditState}
      branchState={branchState}
      isCopied={isCopied}
      setIsCopied={setIsCopied}
      isHovering={isHovering}
      setIsHovering={setIsHovering}
    >
      {children}
    </MessageContextProvider>
  );
};

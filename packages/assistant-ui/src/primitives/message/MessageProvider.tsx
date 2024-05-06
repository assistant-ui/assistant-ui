"use client";

import { FC, useMemo, useState } from "react";
import { Message } from "ai";
import {
  MessageContextProvider,
  MessageEditState,
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
    >
      {children}
    </MessageContextProvider>
  );
};

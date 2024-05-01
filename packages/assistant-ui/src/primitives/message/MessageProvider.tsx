"use client";

import { FC, useState } from "react";
import {
  IsEditingContext,
  MessageContext,
} from "../../utils/context/MessageContext";
import { Message } from "ai";

type MessageProviderProps = {
  children?: React.ReactNode;
  message: Message;
};

export const MessageProvider: FC<MessageProviderProps> = ({
  message,
  children,
}) => {
  const isEditingValue = useState<false | string>(false);
  return (
    <MessageContext.Provider value={message}>
      <IsEditingContext.Provider value={isEditingValue}>
        {children}
      </IsEditingContext.Provider>
    </MessageContext.Provider>
  );
};

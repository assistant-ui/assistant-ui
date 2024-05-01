"use client";

import { useContext } from "react";
import { ThreadContext } from "./ThreadContext";
import { IsEditingContext, MessageContext } from "./MessageContext";

export const useThreadContext = () => {
  const chat = useContext(ThreadContext);
  if (!chat) throw new Error("useChat must be used within <Chat />");
  return chat;
};

export const useMessageContext = () => {
  const message = useContext(MessageContext);
  if (!message) throw new Error("useMessage must be used within <Message />");
  return message;
};

export const useIsEditingContext = () => {
  return useContext(IsEditingContext);
};

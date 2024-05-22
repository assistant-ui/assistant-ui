import { createContext, useContext } from "react";
import type { MessageStore } from "./stores/MessageTypes";

export const MessageContext = createContext<MessageStore | null>(null);

export const useMessageContext = () => {
  const context = useContext(MessageContext);
  if (!context)
    throw new Error("useMessageContext must be used within a MessageProvider");
  return context;
};

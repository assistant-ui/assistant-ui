import { createContext, useContext } from "react";
import type { StoreApi, UseBoundStore } from "zustand";
import type { MessageState } from "./stores/Message";
import type { MessageComposerState } from "./stores/MessageComposer";

export type MessageContextValue = {
  useMessage: UseBoundStore<StoreApi<MessageState>>;
  useComposer: UseBoundStore<StoreApi<MessageComposerState>>;
};

export const MessageContext = createContext<MessageContextValue | null>(null);

export const useMessageContext = () => {
  const context = useContext(MessageContext);
  if (!context)
    throw new Error(
      "This component must be used within a MessagePrimitive.Provider.",
    );
  return context;
};

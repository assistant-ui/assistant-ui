import { createContext, useContext } from "react";
import type { StoreApi, UseBoundStore } from "zustand";
import type { MessageState } from "./stores/Message";
import type { EditComposerState } from "./stores/MessageComposer";

export type MessageContextValue = {
  useMessage: UseBoundStore<StoreApi<MessageState>>;
  useComposer: UseBoundStore<StoreApi<EditComposerState>>;
};

export const MessageContext = createContext<MessageContextValue | null>(null);

export const useMessageContext = () => {
  const context = useContext(MessageContext);
  if (!context)
    throw new Error(
      "This component can only be used inside a component passed to <ThreadPrimitive.Messages components={...} />.",
    );
  return context;
};

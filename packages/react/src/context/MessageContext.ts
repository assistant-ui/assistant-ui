import { createContext, useContext } from "react";
import type { MessageState } from "./stores/Message";
import type { EditComposerState } from "./stores/MessageComposer";
import { ReadonlyStore } from "./ReadonlyStore";
import { MessageUtilsState } from "./stores/MessageUtils";

export type MessageContextValue = {
  useMessage: ReadonlyStore<MessageState>;
  useMessageUtils: ReadonlyStore<MessageUtilsState>;
  useComposer: ReadonlyStore<EditComposerState>;
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

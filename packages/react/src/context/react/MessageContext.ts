"use client";

import { createContext, useContext } from "react";
import type { MessageState } from "../stores/Message";
import type { EditComposerState } from "../stores/EditComposer";
import { ReadonlyStore } from "../ReadonlyStore";
import { MessageUtilsState } from "../stores/MessageUtils";

export type MessageContextValue = {
  useMessage: ReadonlyStore<MessageState>;
  useMessageUtils: ReadonlyStore<MessageUtilsState>;
  useEditComposer: ReadonlyStore<EditComposerState>;
};

export const MessageContext = createContext<MessageContextValue | null>(null);

export function useMessageContext(): MessageContextValue;
export function useMessageContext(options: {
  optional: true;
}): MessageContextValue | null;
export function useMessageContext(options?: { optional: true }) {
  const context = useContext(MessageContext);
  if (!options?.optional && !context)
    throw new Error(
      "This component can only be used inside a component passed to <ThreadPrimitive.Messages components={...} />.",
    );
  return context;
}

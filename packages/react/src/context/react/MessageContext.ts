"use client";

import { createContext } from "react";
import type { MessageState } from "../stores/Message";
import type { EditComposerState } from "../stores/EditComposer";
import { ReadonlyStore } from "../ReadonlyStore";
import { MessageUtilsState } from "../stores/MessageUtils";
import { createContextHook } from "./utils/createContextHook";
import { createContextStoreHook } from "./utils/createContextStoreHook";
import { UseBoundStore } from "zustand";

export type MessageContextValue = {
  useMessage: UseBoundStore<ReadonlyStore<MessageState>>;
  useMessageUtils: UseBoundStore<ReadonlyStore<MessageUtilsState>>;
  useEditComposer: UseBoundStore<ReadonlyStore<EditComposerState>>;
};

export const MessageContext = createContext<MessageContextValue | null>(null);

export const useMessageContext = createContextHook(
  MessageContext,
  "a component passed to <ThreadPrimitive.Messages components={...} />",
);

// TODO make this only return the message itself?
export const { useMessage, useMessageStore } = createContextStoreHook(
  useMessageContext,
  "useMessage",
);

export const { useMessageUtils, useMessageUtilsStore } = createContextStoreHook(
  useMessageContext,
  "useMessageUtils",
);

export const { useEditComposer, useEditComposerStore } = createContextStoreHook(
  useMessageContext,
  "useEditComposer",
);
